//! # overfit-feature-flags
//!
//! Internal *platform* flags — distinct from the product's Settings toggles (which stay client-side
//! and identical across variants). These gate the internal machinery: schema validation, policy
//! enforcement, audit capture, telemetry export, risk-trend computation. All default ON so the
//! visible product never changes; the flag system itself is the over-investment.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureFlag {
    pub key: &'static str,
    pub label: &'static str,
    pub enabled: bool,
    pub owner: &'static str,
    pub description: &'static str,
}

pub struct FeatureFlags {
    flags: Vec<FeatureFlag>,
}

impl Default for FeatureFlags {
    fn default() -> Self {
        FeatureFlags::all_enabled()
    }
}

impl FeatureFlags {
    pub fn all_enabled() -> FeatureFlags {
        FeatureFlags {
            flags: vec![
                flag(
                    "platform.schema-validation",
                    "Schema validation",
                    "platform-team",
                ),
                flag(
                    "platform.policy-enforcement",
                    "Policy enforcement",
                    "governance-team",
                ),
                flag("platform.audit-capture", "Audit capture", "governance-team"),
                flag(
                    "platform.telemetry-export",
                    "Telemetry export",
                    "observability-team",
                ),
                flag(
                    "platform.request-correlation",
                    "Request correlation",
                    "observability-team",
                ),
                flag(
                    "scoring.risk-trend",
                    "Risk-trend computation",
                    "scoring-team",
                ),
                flag(
                    "scoring.experimental",
                    "Experimental scoring",
                    "scoring-team",
                ),
                flag(
                    "read-models.precompute",
                    "Read-model precompute",
                    "platform-team",
                ),
            ],
        }
    }

    pub fn is_enabled(&self, key: &str) -> bool {
        self.flags
            .iter()
            .find(|f| f.key == key)
            .map(|f| f.enabled)
            .unwrap_or(false)
    }

    pub fn all(&self) -> &[FeatureFlag] {
        &self.flags
    }

    pub fn payload(&self) -> serde_json::Value {
        serde_json::json!({
            "source": "in-process",
            "allEnabledForParity": self.flags.iter().all(|f| f.enabled),
            "flags": self.flags,
        })
    }
}

fn flag(key: &'static str, label: &'static str, owner: &'static str) -> FeatureFlag {
    FeatureFlag {
        key,
        label,
        enabled: true,
        owner,
        description: "Enabled by default so the visible product is identical to Flow/Friction.",
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn all_flags_enabled_for_parity() {
        let f = FeatureFlags::all_enabled();
        assert!(f.all().iter().all(|f| f.enabled));
        assert!(f.is_enabled("scoring.risk-trend"));
    }
}
