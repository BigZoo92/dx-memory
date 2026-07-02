//! # overfit-contracts
//!
//! The transport contract for the Overfit API: DTOs, the `ApiError` envelope, pagination, query
//! filters and the domain->DTO mappers. The wire shape is camelCase and matches the shared product
//! contract (and `packages/overfit/contracts-generated`) exactly. The OpenAPI document under
//! `generated/overfit/openapi.json` is derived from these types (see ADR-0003).

pub mod entities;
pub mod error;
pub mod pagination;
pub mod query;
pub mod views;

pub use entities::{IncidentDto, SignalDetailResponse, SignalDto, TimelineEventDto};
pub use error::ApiError;
pub use pagination::Paginated;
pub use query::{SignalsQuery, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, UNASSIGNED};
pub use views::{
    CompareAttribute, CompareDelta, CompareImpactMetric, CompareResponse, DashboardKpis,
    DashboardSummary, DxMetric, DxMetricsResponse, HealthResponse, ServiceStatus,
    SeverityBreakdownEntry, SignalsOverTimePoint, SummaryKpi,
};

#[cfg(test)]
mod tests {
    use super::*;
    use overfit_domain::entities::Signal;
    use overfit_domain::enums::{RiskTrend, Severity, SignalSource, SignalStatus};
    use overfit_domain::value_objects::{Confidence, RiskScore, SignalId};

    fn sample_signal() -> Signal {
        Signal {
            id: SignalId("sig_00001".into()),
            title: "Unusual authentication pattern detected".into(),
            description: "desc".into(),
            severity: Severity::Critical,
            status: SignalStatus::New,
            source: SignalSource::Partner,
            confidence: Confidence::some(0.8),
            risk_score: RiskScore::new(91),
            risk_trend: Some(RiskTrend::Up),
            region: "EU-West".into(),
            assigned_to: None,
            created_at: "2026-06-01T00:00:00.000Z".into(),
            updated_at: "2026-06-02T00:00:00.000Z".into(),
            tags: vec!["auth".into()],
            has_linked_incident: false,
        }
    }

    #[test]
    fn signal_dto_serializes_camel_case_with_risk_trend() {
        let dto = SignalDto::from(&sample_signal());
        let json = serde_json::to_value(&dto).unwrap();
        assert_eq!(json["riskScore"], 91);
        assert_eq!(json["riskTrend"], "up");
        assert_eq!(json["severity"], "critical");
        assert_eq!(json["assignedTo"], serde_json::Value::Null);
        assert_eq!(json["hasLinkedIncident"], false);
    }

    #[test]
    fn paginated_computes_total_pages() {
        let p = Paginated::new(vec![1, 2, 3], 1, 50, 10_000);
        assert_eq!(p.total_pages, 200);
    }

    #[test]
    fn compare_delta_serializes_kebab_case() {
        let json = serde_json::to_string(&CompareDelta::NoChange).unwrap();
        assert_eq!(json, "\"no-change\"");
    }
}
