//! # overfit-domain
//!
//! The pure domain layer for SignalOps Variant C (Overfit). No transport types, no serialization
//! contract for the API, no IO. Everything here is expressed as domain vocabulary so that the
//! surrounding layers (application, contracts, read-models) can each restate it in their own terms
//! — which is exactly the redundancy Overfit exists to measure.
//!
//! A balanced variant (Flow) keeps a single shared type per concept. Overfit keeps one per layer.

pub mod aggregates;
pub mod entities;
pub mod enums;
pub mod events;
pub mod ids;
pub mod validation;
pub mod value_objects;

// Curated prelude — downstream crates `use overfit_domain::prelude::*`.
pub mod prelude {
    pub use crate::aggregates::{IncidentAggregate, SignalAggregate};
    pub use crate::entities::{Analyst, AnalystRole, Incident, Signal, Source, TimelineEvent};
    pub use crate::enums::{
        IncidentImpact, IncidentStatus, RiskTrend, Severity, SignalSource, SignalStatus,
        TimelineEventType,
    };
    pub use crate::events::{DomainEvent, IncidentDomainEvent, SignalDomainEvent};
    pub use crate::validation::DomainError;
    pub use crate::value_objects::{Confidence, RiskScore, SignalId};
}

#[cfg(test)]
mod tests {
    use super::prelude::*;
    use crate::value_objects::{Confidence, RiskScore};

    #[test]
    fn risk_score_is_clamped() {
        assert_eq!(RiskScore::new(250).get(), 100);
        assert_eq!(RiskScore::new(-4).get(), 0);
        assert_eq!(RiskScore::new(57).get(), 57);
    }

    #[test]
    fn confidence_bands_match_product_spec() {
        assert_eq!(Confidence::some(0.9).label(), "High");
        assert_eq!(Confidence::some(0.5).label(), "Medium");
        assert_eq!(Confidence::some(0.1).label(), "Low");
        assert_eq!(Confidence::unavailable().label(), "Unavailable");
    }

    #[test]
    fn severity_prior_steps_down() {
        assert_eq!(Severity::Critical.prior(), Severity::High);
        assert_eq!(Severity::Low.prior(), Severity::Low);
    }

    #[test]
    fn risk_trend_serializes_lowercase() {
        let json = serde_json::to_string(&RiskTrend::Up).unwrap();
        assert_eq!(json, "\"up\"");
    }
}
