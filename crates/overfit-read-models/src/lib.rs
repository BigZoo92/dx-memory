//! # overfit-read-models
//!
//! The query side of CQRS: projectors that turn domain entities into the precomputed transport
//! views the API serves (signals page, signal detail, timeline, incidents page, dashboard, compare,
//! DX metrics). Each projector produces `overfit-contracts` DTOs directly.

pub mod compare;
pub mod dashboard;
pub mod datetime;
pub mod dx_metrics;
pub mod incidents;
pub mod signals;
pub mod wire;

pub use compare::build_compare;
pub use dashboard::build_dashboard;
pub use dx_metrics::{dx_metrics_response, dx_metrics_seed};
pub use incidents::{query_incidents, IncidentsQuery};
pub use signals::{query_signals, signal_detail, timeline_for};

#[cfg(test)]
mod tests {
    use super::*;
    use overfit_contracts::query::SignalsQuery;
    use overfit_domain::entities::Signal;
    use overfit_domain::enums::{RiskTrend, Severity, SignalSource, SignalStatus};
    use overfit_domain::value_objects::{Confidence, RiskScore, SignalId};

    fn sig(id: &str, risk: i64, trend: RiskTrend, sev: Severity) -> Signal {
        Signal {
            id: SignalId(id.into()),
            title: "t".into(),
            description: "d".into(),
            severity: sev,
            status: SignalStatus::New,
            source: SignalSource::Api,
            confidence: Confidence::some(0.5),
            risk_score: RiskScore::new(risk),
            risk_trend: Some(trend),
            region: "EU-West".into(),
            assigned_to: None,
            created_at: "2026-06-01T00:00:00.000Z".into(),
            updated_at: "2026-06-02T00:00:00.000Z".into(),
            tags: vec![],
            has_linked_incident: false,
        }
    }

    #[test]
    fn risk_trend_filter_narrows_results() {
        let data = vec![
            sig("sig_1", 90, RiskTrend::Up, Severity::Critical),
            sig("sig_2", 20, RiskTrend::Down, Severity::Low),
            sig("sig_3", 50, RiskTrend::Stable, Severity::Medium),
        ];
        let q = SignalsQuery {
            risk_trend: Some("up".into()),
            ..Default::default()
        };
        let page = query_signals(&data, &q);
        assert_eq!(page.total, 1);
        assert_eq!(page.items[0].id, "sig_1");
        assert_eq!(page.items[0].risk_trend, Some(RiskTrend::Up));
    }

    #[test]
    fn default_sort_is_risk_desc() {
        let data = vec![
            sig("sig_1", 30, RiskTrend::Down, Severity::Low),
            sig("sig_2", 95, RiskTrend::Up, Severity::Critical),
        ];
        let page = query_signals(&data, &SignalsQuery::default());
        assert_eq!(page.items[0].id, "sig_2");
    }
}
