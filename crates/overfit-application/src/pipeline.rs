//! The per-request pipeline ceremony. Every endpoint runs through `begin` (mint request id, record
//! breadcrumb + counter, evaluate the policy gate, append an audit event) and `finish` (record the
//! canonical 7-span trace and a structured log). Auditing and tracing every read of a public,
//! read-only dataset is the deliberate over-investment.

use overfit_observability::{clock, Collector, SpanRecord, TraceRecord};
use overfit_policies as policies;

/// The canonical span names, in order. Every request produces exactly these — the "too lourd" flow
/// from the brief: transport -> schema -> policy -> dispatch -> project -> map -> export.
const SPAN_NAMES: [(&str, f64); 7] = [
    ("transport.decode", 0.12),
    ("schema.validate", 0.20),
    ("policy.check", 0.15),
    ("query.dispatch", 0.30),
    ("read-model.project", 0.55),
    ("response.map", 0.18),
    ("telemetry.export", 0.10),
];

pub struct RequestContext {
    pub request_id: String,
    pub correlation_id: String,
    pub method: String,
    pub route: String,
}

pub fn begin(
    collector: &Collector,
    audit: &overfit_audit::AuditLog,
    method: &str,
    route: &str,
    input: serde_json::Value,
) -> RequestContext {
    let request_id = collector.next_request_id();
    let correlation_id = request_id.clone();

    collector.incr_counter("http.requests.total");
    collector.incr_counter(&format!("http.route.{}", route_metric_key(route)));
    collector.breadcrumb("request", format!("{method} {route}"));

    // Policy gate (never denies a GET on the demo dataset; recorded for governance).
    let _access = policies::route_access(method, route, "system");
    let _redaction = policies::redaction(&input);

    let action = if method.eq_ignore_ascii_case("GET") {
        "read"
    } else {
        "write"
    };
    audit.record(action, route, "system", &request_id, &correlation_id, input);

    RequestContext {
        request_id,
        correlation_id,
        method: method.to_string(),
        route: route.to_string(),
    }
}

pub fn finish(collector: &Collector, ctx: &RequestContext, status: u16) {
    let spans: Vec<SpanRecord> = SPAN_NAMES
        .iter()
        .map(|(name, dur)| SpanRecord {
            span_id: collector.next_span_id(),
            parent_span_id: None,
            name: name.to_string(),
            duration_ms: *dur,
            attributes: serde_json::json!({ "route": ctx.route }),
        })
        .collect();
    let total: f64 = spans.iter().map(|s| s.duration_ms).sum();
    collector.record_trace(TraceRecord {
        trace_id: collector.next_trace_id(),
        request_id: ctx.request_id.clone(),
        root: format!("{} {}", ctx.method, ctx.route),
        at: clock::ms_to_iso(clock::now_ms()),
        duration_ms: total,
        spans,
    });
    collector.log(
        if status < 400 { "info" } else { "error" },
        format!("{} {} {}", ctx.method, ctx.route, status),
        &ctx.request_id,
        &ctx.correlation_id,
        serde_json::json!({ "status": status }),
    );
}

fn route_metric_key(route: &str) -> String {
    route.trim_start_matches("/api/").replace(['/', ':'], "_")
}
