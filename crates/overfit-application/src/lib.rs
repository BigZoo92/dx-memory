//! # overfit-application
//!
//! The composition root and application services. It owns the in-memory state, seeds the event
//! store at boot, and exposes one method per endpoint. Each method runs the full pipeline ceremony
//! (`pipeline::begin` / `pipeline::finish`) around a query or command. The HTTP layer
//! (`overfit-adapters-http`) only maps these to Axum.

pub mod pipeline;

use std::time::Instant;

use serde_json::json;

use overfit_adapters_fixtures::FixtureStore;
use overfit_audit::{AuditEvent, AuditLog};
use overfit_commands::{Command, SimulatedFault, Validate};
use overfit_contracts::entities::{SignalDetailResponse, SignalDto, TimelineEventDto};
use overfit_contracts::pagination::Paginated;
use overfit_contracts::query::SignalsQuery;
use overfit_contracts::views::{
    CompareResponse, DashboardSummary, DxMetricsResponse, HealthResponse,
};
use overfit_contracts::{ApiError, IncidentDto};
use overfit_event_store::MemoryEventStore;
use overfit_events::EventMetadata;
use overfit_feature_flags::FeatureFlags;
use overfit_observability::{clock, Collector, LogRecord, MetricPoint, TraceRecord};
use overfit_policies as policies;
use overfit_queries as queries;
use overfit_read_models::wire::{severity_wire, source_wire};
use overfit_read_models::IncidentsQuery;

use overfit_domain::events::{DomainEvent, IncidentDomainEvent, SignalDomainEvent};

pub use pipeline::RequestContext;

pub const API_VERSION: &str = "0.1.0";
pub const DATASET_VERSION: &str = "v2.4.0";
pub const VARIANT_LABEL: &str = "Variant C \u{2014} Overfit";

pub struct Application {
    store: FixtureStore,
    event_store: MemoryEventStore,
    pub collector: Collector,
    pub audit: AuditLog,
    pub flags: FeatureFlags,
    started: Instant,
    boot_at: String,
}

impl Application {
    /// Bootstrap the whole backend: generate fixtures, seed the event store, prime gauges.
    pub fn bootstrap() -> Application {
        let store = FixtureStore::bootstrap();
        let event_store = MemoryEventStore::new();
        let collector = Collector::new();

        // Seed the event store by "ingesting" every fixture. Overkill event sourcing on a static
        // dataset: one SignalIngested + one RiskTrendComputed per signal, one IncidentOpened each.
        {
            use overfit_repositories::{IncidentRepository, SignalRepository};
            let meta = EventMetadata::system("boot");
            for s in SignalRepository::snapshot(&store) {
                event_store.append(
                    DomainEvent::Signal(SignalDomainEvent::SignalIngested {
                        signal_id: s.id.clone(),
                        severity: severity_wire(s.severity).to_string(),
                        source: source_wire(s.source).to_string(),
                    }),
                    &s.created_at,
                    meta.clone(),
                );
                if let Some(t) = s.risk_trend {
                    event_store.append(
                        DomainEvent::Signal(SignalDomainEvent::RiskTrendComputed {
                            signal_id: s.id.clone(),
                            trend: t,
                        }),
                        &s.updated_at,
                        meta.clone(),
                    );
                }
            }
            for i in IncidentRepository::snapshot(&store) {
                event_store.append(
                    DomainEvent::Incident(IncidentDomainEvent::IncidentOpened {
                        incident_id: i.id.clone(),
                        severity: severity_wire(i.severity).to_string(),
                    }),
                    &i.created_at,
                    meta.clone(),
                );
            }
        }

        {
            use overfit_repositories::{IncidentRepository, SignalRepository, TimelineRepository};
            collector.set_gauge("dataset.signals", SignalRepository::count(&store) as f64);
            collector.set_gauge(
                "dataset.incidents",
                IncidentRepository::snapshot(&store).len() as f64,
            );
            collector.set_gauge(
                "dataset.events",
                TimelineRepository::snapshot(&store).len() as f64,
            );
            collector.set_gauge("eventstore.events", event_store.len() as f64);
            collector.set_gauge("eventstore.streams", event_store.stream_count() as f64);
        }

        Application {
            store,
            event_store,
            collector,
            audit: AuditLog::new(),
            flags: FeatureFlags::all_enabled(),
            started: Instant::now(),
            boot_at: clock::ms_to_iso(clock::now_ms()),
        }
    }

    fn uptime_seconds(&self) -> u64 {
        self.started.elapsed().as_secs()
    }

    fn begin(&self, method: &str, route: &str, input: serde_json::Value) -> RequestContext {
        pipeline::begin(&self.collector, &self.audit, method, route, input)
    }

    fn finish(&self, ctx: &RequestContext, status: u16) {
        pipeline::finish(&self.collector, ctx, status);
    }

    // ---- required product endpoints ----------------------------------------

    pub fn health(&self) -> HealthResponse {
        let ctx = self.begin("GET", "/api/health", json!({}));
        let out = HealthResponse {
            status: "ok".to_string(),
            version: API_VERSION.to_string(),
            variant: VARIANT_LABEL.to_string(),
            dataset_version: DATASET_VERSION.to_string(),
            uptime_seconds: self.uptime_seconds(),
        };
        self.finish(&ctx, 200);
        out
    }

    pub fn signals(&self, q: &SignalsQuery) -> Paginated<SignalDto> {
        let ctx = self.begin(
            "GET",
            "/api/signals",
            serde_json::to_value(q).unwrap_or(json!({})),
        );
        let out = queries::list_signals(&self.store, q);
        self.finish(&ctx, 200);
        out
    }

    pub fn signal_detail(&self, id: &str) -> Result<SignalDetailResponse, ApiError> {
        let ctx = self.begin("GET", "/api/signals/:id", json!({ "id": id }));
        let result = queries::signal_detail(&self.store, &self.store, id)
            .map_err(|_| ApiError::not_found("Signal", id, &ctx.request_id));
        self.finish(&ctx, if result.is_ok() { 200 } else { 404 });
        result
    }

    pub fn signal_events(&self, id: &str) -> Result<Vec<TimelineEventDto>, ApiError> {
        let ctx = self.begin("GET", "/api/signals/:id/events", json!({ "id": id }));
        let result = queries::signal_timeline(&self.store, &self.store, id)
            .map_err(|_| ApiError::not_found("Signal", id, &ctx.request_id));
        self.finish(&ctx, if result.is_ok() { 200 } else { 404 });
        result
    }

    pub fn incidents(&self, q: &IncidentsQuery) -> Paginated<IncidentDto> {
        let ctx = self.begin("GET", "/api/incidents", json!({}));
        let out = queries::list_incidents(&self.store, q);
        self.finish(&ctx, 200);
        out
    }

    pub fn dashboard_summary(&self) -> DashboardSummary {
        let ctx = self.begin("GET", "/api/dashboard/summary", json!({}));
        let out = queries::dashboard(&self.store, &self.store);
        self.finish(&ctx, 200);
        out
    }

    pub fn compare(&self, id: &str) -> Result<CompareResponse, ApiError> {
        let ctx = self.begin("GET", "/api/compare/:id", json!({ "id": id }));
        let result = queries::compare(&self.store, &self.store, &self.store, id)
            .map_err(|_| ApiError::not_found("Signal", id, &ctx.request_id));
        self.finish(&ctx, if result.is_ok() { 200 } else { 404 });
        result
    }

    pub fn dx_metrics(&self) -> DxMetricsResponse {
        let ctx = self.begin("GET", "/api/dx-metrics", json!({}));
        let out = queries::dx_metrics();
        self.finish(&ctx, 200);
        out
    }

    /// `POST /api/simulate-error` — always returns the ApiError envelope (HTTP 500).
    pub fn simulate_error(&self) -> ApiError {
        let ctx = self.begin("POST", "/api/simulate-error", json!({}));
        // Full command ceremony even though the outcome is a fixed fault.
        let cmd = Command::SimulateError;
        let _ = cmd.validate();
        let fault = SimulatedFault::new();
        self.collector.incr_counter("http.simulated_errors");
        self.finish(&ctx, 500);
        ApiError::new(fault.code, fault.message, &ctx.request_id)
    }

    // ---- logs ---------------------------------------------------------------

    pub fn logs_get(&self) -> Vec<LogRecord> {
        let ctx = self.begin("GET", "/api/logs", json!({}));
        let out = self.collector.logs(200);
        self.finish(&ctx, 200);
        out
    }

    pub fn logs_post(&self, body: serde_json::Value) -> serde_json::Value {
        let ctx = self.begin("POST", "/api/logs", body.clone());
        let level = body.get("level").and_then(|v| v.as_str()).unwrap_or("info");
        let message = body
            .get("message")
            .and_then(|v| v.as_str())
            .unwrap_or("(client log)");
        self.collector.log(
            level,
            message,
            &ctx.request_id,
            &ctx.correlation_id,
            body.get("fields").cloned().unwrap_or(json!({})),
        );
        self.finish(&ctx, 201);
        json!({ "accepted": true, "requestId": ctx.request_id })
    }

    // ---- technical / observability endpoints --------------------------------

    pub fn health_deep(&self) -> serde_json::Value {
        let ctx = self.begin("GET", "/api/health/deep", json!({}));
        use overfit_repositories::{IncidentRepository, SignalRepository, TimelineRepository};
        let out = json!({
            "status": "ok",
            "variant": VARIANT_LABEL,
            "version": API_VERSION,
            "uptimeSeconds": self.uptime_seconds(),
            "bootAt": self.boot_at,
            "checks": [
                { "name": "fixtures-store", "status": "ok", "detail": "deterministic in-memory dataset" },
                { "name": "event-store", "status": "ok", "detail": format!("{} events across {} streams", self.event_store.len(), self.event_store.stream_count()) },
                { "name": "collector", "status": "ok", "detail": "memory-only mock collector" },
                { "name": "policy-engine", "status": "ok", "detail": "5 policies loaded" },
                { "name": "schema-registry", "status": "ok", "detail": format!("{} entries", overfit_schema_registry::entries().len()) }
            ],
            "datasetVolumes": {
                "signals": SignalRepository::count(&self.store),
                "incidents": IncidentRepository::snapshot(&self.store).len(),
                "timelineEvents": TimelineRepository::snapshot(&self.store).len()
            }
        });
        self.finish(&ctx, 200);
        out
    }

    pub fn health_dependencies(&self) -> serde_json::Value {
        let ctx = self.begin("GET", "/api/health/dependencies", json!({}));
        let deps = [
            ("fixtures-store", "datastore"),
            ("event-store", "datastore"),
            ("mock-collector", "telemetry"),
            ("schema-registry", "governance"),
            ("policy-engine", "governance"),
            ("audit-log", "governance"),
            ("feature-flags", "config"),
        ];
        let list: Vec<serde_json::Value> = deps
            .iter()
            .enumerate()
            .map(|(i, (name, kind))| {
                json!({
                    "name": name,
                    "kind": kind,
                    "transport": "in-process",
                    "status": "operational",
                    "latencyMs": (i as f64) * 0.05
                })
            })
            .collect();
        let out = json!({ "status": "ok", "dependencies": list });
        self.finish(&ctx, 200);
        out
    }

    pub fn telemetry_traces(&self) -> Vec<TraceRecord> {
        let ctx = self.begin("GET", "/api/telemetry/traces", json!({}));
        let out = self.collector.traces(50);
        self.finish(&ctx, 200);
        out
    }

    pub fn telemetry_metrics(&self) -> Vec<MetricPoint> {
        let ctx = self.begin("GET", "/api/telemetry/metrics", json!({}));
        self.collector
            .set_gauge("eventstore.events", self.event_store.len() as f64);
        let out = self.collector.metrics();
        self.finish(&ctx, 200);
        out
    }

    pub fn audit_events(&self) -> Vec<AuditEvent> {
        let ctx = self.begin("GET", "/api/audit-events", json!({}));
        let out = self.audit.recent(100);
        self.finish(&ctx, 200);
        out
    }

    pub fn schema_registry(&self) -> serde_json::Value {
        let ctx = self.begin("GET", "/api/schema-registry", json!({}));
        let out = overfit_schema_registry::registry_payload();
        self.finish(&ctx, 200);
        out
    }

    pub fn feature_flags(&self) -> serde_json::Value {
        let ctx = self.begin("GET", "/api/feature-flags", json!({}));
        let out = self.flags.payload();
        self.finish(&ctx, 200);
        out
    }

    pub fn policy_check(&self, body: serde_json::Value) -> serde_json::Value {
        let ctx = self.begin("POST", "/api/policy/check", body.clone());
        let policy = body
            .get("policy")
            .and_then(|v| v.as_str())
            .unwrap_or("route_access");
        let input = body.get("input").cloned().unwrap_or(json!({}));
        let decision = policies::check(policy, &input);
        self.finish(&ctx, 200);
        serde_json::to_value(decision).unwrap_or(json!({}))
    }

    pub fn diagnostic_pack(&self) -> serde_json::Value {
        let ctx = self.begin("GET", "/api/diagnostic-pack", json!({}));
        let mut pack = self.collector.diagnostic_pack();
        if let serde_json::Value::Object(map) = &mut pack {
            map.insert("variant".to_string(), json!(VARIANT_LABEL));
            map.insert("version".to_string(), json!(API_VERSION));
            map.insert("uptimeSeconds".to_string(), json!(self.uptime_seconds()));
            map.insert(
                "eventStore".to_string(),
                json!({ "events": self.event_store.len(), "streams": self.event_store.stream_count() }),
            );
            map.insert("auditEvents".to_string(), json!(self.audit.recent(20)));
            map.insert(
                "schemaRegistry".to_string(),
                overfit_schema_registry::registry_payload(),
            );
            map.insert("featureFlags".to_string(), self.flags.payload());
        }
        self.finish(&ctx, 200);
        pack
    }
}

impl Default for Application {
    fn default() -> Self {
        Application::bootstrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn boots_and_serves_health() {
        let app = Application::bootstrap();
        let h = app.health();
        assert_eq!(h.variant, VARIANT_LABEL);
    }

    #[test]
    fn signals_are_paginated_and_have_risk_trend() {
        let app = Application::bootstrap();
        let page = app.signals(&SignalsQuery::default());
        assert_eq!(page.total, 10_000);
        assert!(page.items.iter().all(|s| s.risk_trend.is_some()));
    }

    #[test]
    fn missing_signal_is_not_found() {
        let app = Application::bootstrap();
        let err = app.signal_detail("sig_zzzzz").unwrap_err();
        assert_eq!(err.code, "not_found");
        assert!(!err.request_id.is_empty());
    }

    #[test]
    fn simulate_error_returns_envelope() {
        let app = Application::bootstrap();
        let err = app.simulate_error();
        assert_eq!(err.code, "simulated_error");
    }

    #[test]
    fn risk_trend_filter_works_end_to_end() {
        let app = Application::bootstrap();
        let q = SignalsQuery {
            risk_trend: Some("down".into()),
            ..Default::default()
        };
        let page = app.signals(&q);
        assert!(page.total > 0);
        assert!(page
            .items
            .iter()
            .all(|s| s.risk_trend == Some(overfit_domain::enums::RiskTrend::Down)));
    }
}
