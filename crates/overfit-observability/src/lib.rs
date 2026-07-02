//! # overfit-observability
//!
//! A memory-only, OTel-shaped observability stack. Nothing is exported to a real collector; every
//! signal (logs, spans, traces, metrics, breadcrumbs) is kept in a bounded in-process buffer and
//! surfaced through the `/api/telemetry/*`, `/api/logs` and `/api/diagnostic-pack` endpoints. This
//! is the "too monitored" pillar of Overfit: full instrumentation ceremony for a demo that could
//! run with a single log line.

pub mod clock;

use std::collections::HashMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use serde_json::json;

const MAX_LOGS: usize = 500;
const MAX_TRACES: usize = 200;
const MAX_BREADCRUMBS: usize = 200;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogRecord {
    pub level: String,
    pub message: String,
    pub request_id: String,
    pub correlation_id: String,
    pub at: String,
    pub fields: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpanRecord {
    pub span_id: String,
    pub parent_span_id: Option<String>,
    pub name: String,
    pub duration_ms: f64,
    pub attributes: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraceRecord {
    pub trace_id: String,
    pub request_id: String,
    pub root: String,
    pub at: String,
    pub duration_ms: f64,
    pub spans: Vec<SpanRecord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MetricPoint {
    pub name: String,
    pub kind: String,
    pub value: f64,
    pub labels: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Breadcrumb {
    pub category: String,
    pub message: String,
    pub at: String,
}

#[derive(Debug, Default)]
struct Inner {
    logs: Vec<LogRecord>,
    traces: Vec<TraceRecord>,
    breadcrumbs: Vec<Breadcrumb>,
    counters: HashMap<String, u64>,
    gauges: HashMap<String, f64>,
}

/// The mock collector. One instance lives in the app state; handlers borrow it.
pub struct Collector {
    inner: Mutex<Inner>,
    request_seq: AtomicU64,
    trace_seq: AtomicU64,
    span_seq: AtomicU64,
}

impl Default for Collector {
    fn default() -> Self {
        Collector::new()
    }
}

impl Collector {
    pub fn new() -> Collector {
        Collector {
            inner: Mutex::new(Inner::default()),
            request_seq: AtomicU64::new(0),
            trace_seq: AtomicU64::new(0),
            span_seq: AtomicU64::new(0),
        }
    }

    pub fn next_request_id(&self) -> String {
        let n = self.request_seq.fetch_add(1, Ordering::Relaxed) + 1;
        format!("req_{n:08x}")
    }

    pub fn next_trace_id(&self) -> String {
        let n = self.trace_seq.fetch_add(1, Ordering::Relaxed) + 1;
        format!("trace_{n:012x}")
    }

    pub fn next_span_id(&self) -> String {
        let n = self.span_seq.fetch_add(1, Ordering::Relaxed) + 1;
        format!("span_{n:08x}")
    }

    pub fn log(
        &self,
        level: &str,
        message: impl Into<String>,
        request_id: &str,
        correlation_id: &str,
        fields: serde_json::Value,
    ) {
        let record = LogRecord {
            level: level.to_string(),
            message: message.into(),
            request_id: request_id.to_string(),
            correlation_id: correlation_id.to_string(),
            at: clock::ms_to_iso(clock::now_ms()),
            fields,
        };
        let mut inner = self.inner.lock().expect("collector poisoned");
        inner.logs.push(record);
        let len = inner.logs.len();
        if len > MAX_LOGS {
            inner.logs.drain(0..len - MAX_LOGS);
        }
    }

    pub fn record_trace(&self, trace: TraceRecord) {
        let mut inner = self.inner.lock().expect("collector poisoned");
        inner.traces.push(trace);
        let len = inner.traces.len();
        if len > MAX_TRACES {
            inner.traces.drain(0..len - MAX_TRACES);
        }
    }

    pub fn breadcrumb(&self, category: &str, message: impl Into<String>) {
        let crumb = Breadcrumb {
            category: category.to_string(),
            message: message.into(),
            at: clock::ms_to_iso(clock::now_ms()),
        };
        let mut inner = self.inner.lock().expect("collector poisoned");
        inner.breadcrumbs.push(crumb);
        let len = inner.breadcrumbs.len();
        if len > MAX_BREADCRUMBS {
            inner.breadcrumbs.drain(0..len - MAX_BREADCRUMBS);
        }
    }

    pub fn incr_counter(&self, name: &str) {
        let mut inner = self.inner.lock().expect("collector poisoned");
        *inner.counters.entry(name.to_string()).or_insert(0) += 1;
    }

    pub fn set_gauge(&self, name: &str, value: f64) {
        let mut inner = self.inner.lock().expect("collector poisoned");
        inner.gauges.insert(name.to_string(), value);
    }

    // ---- snapshots for the telemetry endpoints ----

    pub fn logs(&self, limit: usize) -> Vec<LogRecord> {
        let inner = self.inner.lock().expect("collector poisoned");
        let start = inner.logs.len().saturating_sub(limit);
        inner.logs[start..].to_vec()
    }

    pub fn traces(&self, limit: usize) -> Vec<TraceRecord> {
        let inner = self.inner.lock().expect("collector poisoned");
        let start = inner.traces.len().saturating_sub(limit);
        inner.traces[start..].to_vec()
    }

    pub fn breadcrumbs(&self) -> Vec<Breadcrumb> {
        self.inner
            .lock()
            .expect("collector poisoned")
            .breadcrumbs
            .clone()
    }

    pub fn metrics(&self) -> Vec<MetricPoint> {
        let inner = self.inner.lock().expect("collector poisoned");
        let mut out = Vec::new();
        for (name, value) in &inner.counters {
            out.push(MetricPoint {
                name: name.clone(),
                kind: "counter".to_string(),
                value: *value as f64,
                labels: json!({}),
            });
        }
        for (name, value) in &inner.gauges {
            out.push(MetricPoint {
                name: name.clone(),
                kind: "gauge".to_string(),
                value: *value,
                labels: json!({}),
            });
        }
        out.sort_by(|a, b| a.name.cmp(&b.name));
        out
    }

    /// Everything, bundled — the `/api/diagnostic-pack` payload.
    pub fn diagnostic_pack(&self) -> serde_json::Value {
        json!({
            "generatedAt": clock::ms_to_iso(clock::now_ms()),
            "logs": self.logs(100),
            "traces": self.traces(50),
            "metrics": self.metrics(),
            "breadcrumbs": self.breadcrumbs(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_ids_are_monotonic_and_unique() {
        let c = Collector::new();
        let a = c.next_request_id();
        let b = c.next_request_id();
        assert_ne!(a, b);
    }

    #[test]
    fn logs_are_bounded() {
        let c = Collector::new();
        for i in 0..(MAX_LOGS + 50) {
            c.log("info", format!("m{i}"), "req", "corr", json!({}));
        }
        assert_eq!(c.logs(usize::MAX).len(), MAX_LOGS);
    }

    #[test]
    fn counters_aggregate() {
        let c = Collector::new();
        c.incr_counter("http.requests");
        c.incr_counter("http.requests");
        let m = c.metrics();
        let p = m.iter().find(|p| p.name == "http.requests").unwrap();
        assert_eq!(p.value, 2.0);
    }
}
