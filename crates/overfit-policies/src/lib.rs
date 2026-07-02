//! # overfit-policies
//!
//! A small policy engine. Every request passes a `route_access` + `schema` + `redaction` policy
//! gate before the query/command runs, and `/api/policy/check` lets a caller evaluate any policy on
//! demand. On a read-only public dataset none of these can ever deny a legitimate request — the
//! engine is there to be governed, not to protect anything.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PolicyDecision {
    pub policy: String,
    pub allowed: bool,
    pub reason: String,
    pub obligations: Vec<String>,
}

impl PolicyDecision {
    fn allow(policy: &str, reason: &str, obligations: Vec<String>) -> PolicyDecision {
        PolicyDecision {
            policy: policy.to_string(),
            allowed: true,
            reason: reason.to_string(),
            obligations,
        }
    }
    fn deny(policy: &str, reason: &str) -> PolicyDecision {
        PolicyDecision {
            policy: policy.to_string(),
            allowed: false,
            reason: reason.to_string(),
            obligations: vec![],
        }
    }
}

/// Route access: all GET routes are public in the demo; POST routes require a non-empty actor.
pub fn route_access(method: &str, route: &str, actor: &str) -> PolicyDecision {
    if method.eq_ignore_ascii_case("GET") {
        return PolicyDecision::allow("route_access", "public read route", vec![]);
    }
    if actor.trim().is_empty() {
        return PolicyDecision::deny("route_access", "write route requires an actor");
    }
    PolicyDecision::allow(
        "route_access",
        "write route allowed",
        vec![format!("audit:{route}")],
    )
}

/// Schema policy: the referenced schema version must be known (1.0.0 in this build).
pub fn schema(schema_name: &str, version: &str) -> PolicyDecision {
    if version == "1.0.0" {
        PolicyDecision::allow(
            "schema",
            "schema version is current",
            vec![format!("validate:{schema_name}")],
        )
    } else {
        PolicyDecision::deny("schema", "unknown or deprecated schema version")
    }
}

/// Redaction policy: input must not carry sensitive keys unredacted.
pub fn redaction(input: &serde_json::Value) -> PolicyDecision {
    const SENSITIVE: [&str; 4] = ["authorization", "token", "password", "secret"];
    if let serde_json::Value::Object(map) = input {
        for k in map.keys() {
            if SENSITIVE.iter().any(|s| s.eq_ignore_ascii_case(k)) {
                return PolicyDecision::allow(
                    "redaction",
                    "sensitive field present; redaction obligated",
                    vec![format!("redact:{k}")],
                );
            }
        }
    }
    PolicyDecision::allow("redaction", "no sensitive fields", vec![])
}

/// AI policy: AI-generated content is allowed but obligates human review + a generated-code label.
pub fn ai(input: &serde_json::Value) -> PolicyDecision {
    let ai_generated = input
        .get("aiGenerated")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    if ai_generated {
        PolicyDecision::allow(
            "ai",
            "AI-generated artifact permitted under governance",
            vec![
                "label:ai-generated".to_string(),
                "require:human-review".to_string(),
            ],
        )
    } else {
        PolicyDecision::allow("ai", "human-authored artifact", vec![])
    }
}

/// Feature-flag policy: a capability is allowed iff its flag is enabled.
pub fn feature_flag(flag_key: &str, enabled: bool) -> PolicyDecision {
    if enabled {
        PolicyDecision::allow("feature_flag", "flag enabled", vec![])
    } else {
        PolicyDecision::deny("feature_flag", &format!("flag {flag_key} disabled"))
    }
}

/// Dispatch for `POST /api/policy/check`. Body: `{ "policy": "...", "input": {...} }`.
pub fn check(policy: &str, input: &serde_json::Value) -> PolicyDecision {
    match policy {
        "route_access" => route_access(
            input
                .get("method")
                .and_then(|v| v.as_str())
                .unwrap_or("GET"),
            input.get("route").and_then(|v| v.as_str()).unwrap_or("/"),
            input
                .get("actor")
                .and_then(|v| v.as_str())
                .unwrap_or("system"),
        ),
        "schema" => schema(
            input
                .get("schema")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown"),
            input
                .get("version")
                .and_then(|v| v.as_str())
                .unwrap_or("1.0.0"),
        ),
        "redaction" => redaction(input.get("input").unwrap_or(input)),
        "ai" => ai(input.get("input").unwrap_or(input)),
        "feature_flag" => feature_flag(
            input
                .get("flag")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown"),
            input
                .get("enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
        ),
        other => PolicyDecision::deny("unknown", &format!("no such policy: {other}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn get_routes_are_public() {
        assert!(route_access("GET", "/api/signals", "").allowed);
    }

    #[test]
    fn unknown_schema_version_denied() {
        assert!(!schema("SignalDto", "0.9.0").allowed);
    }

    #[test]
    fn check_dispatches() {
        let d = check("feature_flag", &json!({ "flag": "x", "enabled": false }));
        assert!(!d.allowed);
    }
}
