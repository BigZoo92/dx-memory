//! # overfit-schema-registry
//!
//! A registry describing every endpoint: its route, method, request/response schema names, schema
//! version and owning feature. In a lean variant this metadata does not exist — the types *are* the
//! contract. Overfit maintains it as a separate governed artifact so schema drift can be "detected"
//! by the quality gates.

use serde::{Deserialize, Serialize};

pub const REGISTRY_VERSION: &str = "1.4.0";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaEntry {
    pub method: &'static str,
    pub route: &'static str,
    pub request_schema: Option<&'static str>,
    pub response_schema: &'static str,
    pub schema_version: &'static str,
    pub owner_feature: &'static str,
}

/// The full endpoint -> schema map. Kept in lockstep with `overfit-contracts` by the schema-drift
/// quality gate.
pub fn entries() -> Vec<SchemaEntry> {
    vec![
        e("GET", "/api/health", None, "HealthResponse", "ops"),
        e("GET", "/api/health/deep", None, "DeepHealthResponse", "ops"),
        e(
            "GET",
            "/api/health/dependencies",
            None,
            "DependencyHealth",
            "ops",
        ),
        e(
            "GET",
            "/api/signals",
            Some("SignalsQuery"),
            "PaginatedSignalDto",
            "signals",
        ),
        e(
            "GET",
            "/api/signals/:id",
            None,
            "SignalDetailResponse",
            "signal-detail",
        ),
        e(
            "GET",
            "/api/signals/:id/events",
            None,
            "TimelineEventDtoList",
            "signal-detail",
        ),
        e(
            "GET",
            "/api/incidents",
            Some("IncidentsQuery"),
            "PaginatedIncidentDto",
            "incidents",
        ),
        e(
            "GET",
            "/api/dashboard/summary",
            None,
            "DashboardSummary",
            "dashboard",
        ),
        e(
            "GET",
            "/api/compare/:id",
            None,
            "CompareResponse",
            "compare",
        ),
        e(
            "GET",
            "/api/dx-metrics",
            None,
            "DxMetricsResponse",
            "dx-metrics",
        ),
        e("POST", "/api/simulate-error", None, "ApiError", "ops"),
        e("GET", "/api/logs", None, "LogRecordList", "ops"),
        e("POST", "/api/logs", Some("ClientLog"), "LogAck", "ops"),
        e(
            "GET",
            "/api/telemetry/traces",
            None,
            "TraceRecordList",
            "ops",
        ),
        e(
            "GET",
            "/api/telemetry/metrics",
            None,
            "MetricPointList",
            "ops",
        ),
        e("GET", "/api/audit-events", None, "AuditEventList", "ops"),
        e("GET", "/api/schema-registry", None, "SchemaRegistry", "ops"),
        e("GET", "/api/feature-flags", None, "FeatureFlagList", "ops"),
        e(
            "POST",
            "/api/policy/check",
            Some("PolicyCheckRequest"),
            "PolicyDecision",
            "ops",
        ),
        e("GET", "/api/diagnostic-pack", None, "DiagnosticPack", "ops"),
    ]
}

fn e(
    method: &'static str,
    route: &'static str,
    request_schema: Option<&'static str>,
    response_schema: &'static str,
    owner_feature: &'static str,
) -> SchemaEntry {
    SchemaEntry {
        method,
        route,
        request_schema,
        response_schema,
        schema_version: "1.0.0",
        owner_feature,
    }
}

/// The `/api/schema-registry` payload.
pub fn registry_payload() -> serde_json::Value {
    serde_json::json!({
        "registryVersion": REGISTRY_VERSION,
        "envelopeSchemaVersion": 1,
        "entryCount": entries().len(),
        "entries": entries(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_covers_all_endpoints() {
        assert_eq!(entries().len(), 20);
    }
}
