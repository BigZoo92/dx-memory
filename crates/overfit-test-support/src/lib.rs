//! # overfit-test-support
//!
//! Test helpers shared across the crates: fixture builders, a booted `Application` factory and a
//! tiny JSON snapshot helper. Having a dedicated test-support crate for a demo backend is itself
//! part of the over-investment.

use overfit_application::Application;
use overfit_domain::entities::Signal;
use overfit_domain::enums::{RiskTrend, Severity, SignalSource, SignalStatus};
use overfit_domain::value_objects::{Confidence, RiskScore, SignalId};

/// Boot a full application instance for integration tests.
pub fn booted_app() -> Application {
    Application::bootstrap()
}

/// A deterministic sample signal for unit tests.
pub fn sample_signal(id: &str) -> Signal {
    Signal {
        id: SignalId(id.to_string()),
        title: "Unusual authentication pattern detected".to_string(),
        description: "sample".to_string(),
        severity: Severity::High,
        status: SignalStatus::Triaged,
        source: SignalSource::Partner,
        confidence: Confidence::some(0.72),
        risk_score: RiskScore::new(84),
        risk_trend: Some(RiskTrend::Up),
        region: "EU-West".to_string(),
        assigned_to: Some("ana_001".to_string()),
        created_at: "2026-06-01T10:00:00.000Z".to_string(),
        updated_at: "2026-06-03T09:30:00.000Z".to_string(),
        tags: vec!["auth".to_string(), "anomaly".to_string()],
        has_linked_incident: true,
    }
}

/// Serialize any value to pretty JSON for snapshot comparisons.
pub fn snapshot<T: serde::Serialize>(value: &T) -> String {
    serde_json::to_string_pretty(value).expect("serializable")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn sample_signal_has_risk_trend() {
        assert!(sample_signal("sig_00001").risk_trend.is_some());
    }

    #[test]
    fn booted_app_serves_dashboard() {
        let app = booted_app();
        let d = app.dashboard_summary();
        assert_eq!(d.severity_breakdown.len(), 4);
    }
}
