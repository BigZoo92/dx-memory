//! # overfit-audit
//!
//! An append-only audit trail. Every read request appends an audit event (who, what, which route,
//! correlation id), with a redaction pass that strips anything looking sensitive. Auditing GET
//! requests against a public demo dataset is pure ceremony — which is the point.

use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use overfit_observability::clock;

/// Field names that must never appear verbatim in an audit event's detail bag.
const REDACT_KEYS: [&str; 6] = [
    "authorization",
    "token",
    "password",
    "secret",
    "cookie",
    "apiKey",
];

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEvent {
    pub id: String,
    pub at: String,
    pub actor: String,
    pub action: String,
    pub resource: String,
    pub request_id: String,
    pub correlation_id: String,
    pub redacted_fields: Vec<String>,
    pub detail: serde_json::Value,
}

#[derive(Default)]
pub struct AuditLog {
    inner: Mutex<Vec<AuditEvent>>,
}

impl AuditLog {
    pub fn new() -> AuditLog {
        AuditLog::default()
    }

    /// Record an audit event, redacting any sensitive keys from `detail`.
    pub fn record(
        &self,
        action: &str,
        resource: &str,
        actor: &str,
        request_id: &str,
        correlation_id: &str,
        mut detail: serde_json::Value,
    ) {
        let redacted = redact(&mut detail);
        let mut inner = self.inner.lock().expect("audit poisoned");
        let id = format!("aud_{:08x}", inner.len() + 1);
        inner.push(AuditEvent {
            id,
            at: clock::ms_to_iso(clock::now_ms()),
            actor: actor.to_string(),
            action: action.to_string(),
            resource: resource.to_string(),
            request_id: request_id.to_string(),
            correlation_id: correlation_id.to_string(),
            redacted_fields: redacted,
            detail,
        });
        let len = inner.len();
        if len > 500 {
            inner.drain(0..len - 500);
        }
    }

    pub fn recent(&self, limit: usize) -> Vec<AuditEvent> {
        let inner = self.inner.lock().expect("audit poisoned");
        let start = inner.len().saturating_sub(limit);
        inner[start..].to_vec()
    }
}

/// Replace sensitive object values with "[redacted]"; return the list of keys touched.
fn redact(value: &mut serde_json::Value) -> Vec<String> {
    let mut touched = Vec::new();
    if let serde_json::Value::Object(map) = value {
        for (k, v) in map.iter_mut() {
            if REDACT_KEYS.iter().any(|r| r.eq_ignore_ascii_case(k)) {
                *v = serde_json::Value::String("[redacted]".to_string());
                touched.push(k.clone());
            }
        }
    }
    touched
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn redacts_sensitive_fields() {
        let log = AuditLog::new();
        log.record(
            "read",
            "/api/signals",
            "system",
            "req_1",
            "corr_1",
            json!({ "token": "abc", "page": 1 }),
        );
        let ev = &log.recent(1)[0];
        assert_eq!(ev.detail["token"], "[redacted]");
        assert_eq!(ev.detail["page"], 1);
        assert!(ev.redacted_fields.contains(&"token".to_string()));
    }
}
