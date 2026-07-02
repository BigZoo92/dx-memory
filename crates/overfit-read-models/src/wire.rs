//! Enum -> wire-string helpers, so read models can compare a domain enum against the string filter
//! values that arrive on the query DTO.

use overfit_domain::enums::{
    IncidentImpact, IncidentStatus, RiskTrend, Severity, SignalSource, SignalStatus,
};

pub fn severity_wire(s: Severity) -> &'static str {
    match s {
        Severity::Low => "low",
        Severity::Medium => "medium",
        Severity::High => "high",
        Severity::Critical => "critical",
    }
}

pub fn severity_label(s: Severity) -> &'static str {
    match s {
        Severity::Low => "Low",
        Severity::Medium => "Medium",
        Severity::High => "High",
        Severity::Critical => "Critical",
    }
}

pub fn status_wire(s: SignalStatus) -> &'static str {
    match s {
        SignalStatus::New => "new",
        SignalStatus::Triaged => "triaged",
        SignalStatus::Investigating => "investigating",
        SignalStatus::Resolved => "resolved",
        SignalStatus::Dismissed => "dismissed",
    }
}

pub fn status_label(s: SignalStatus) -> &'static str {
    match s {
        SignalStatus::New => "New",
        SignalStatus::Triaged => "Triaged",
        SignalStatus::Investigating => "Investigating",
        SignalStatus::Resolved => "Resolved",
        SignalStatus::Dismissed => "Dismissed",
    }
}

pub fn source_wire(s: SignalSource) -> &'static str {
    match s {
        SignalSource::Web => "web",
        SignalSource::Social => "social",
        SignalSource::Internal => "internal",
        SignalSource::Partner => "partner",
        SignalSource::Api => "api",
        SignalSource::Manual => "manual",
    }
}

pub fn trend_wire(t: RiskTrend) -> &'static str {
    match t {
        RiskTrend::Up => "up",
        RiskTrend::Stable => "stable",
        RiskTrend::Down => "down",
    }
}

pub fn incident_status_wire(s: IncidentStatus) -> &'static str {
    match s {
        IncidentStatus::Open => "open",
        IncidentStatus::InProgress => "in_progress",
        IncidentStatus::Resolved => "resolved",
    }
}

pub fn impact_wire(i: IncidentImpact) -> &'static str {
    match i {
        IncidentImpact::User => "user",
        IncidentImpact::System => "system",
        IncidentImpact::Security => "security",
        IncidentImpact::Business => "business",
    }
}
