//! Domain entities. Field names are Rust-idiomatic snake_case; the camelCase transport shape lives
//! in `overfit-contracts`. Timestamps are ISO-8601 UTC strings, matching the shared product
//! contract and the deterministic fixtures.

use serde::{Deserialize, Serialize};

use crate::enums::{
    IncidentImpact, IncidentStatus, RiskTrend, Severity, SignalSource, SignalStatus,
    TimelineEventType,
};
use crate::value_objects::{Confidence, RiskScore, SignalId};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Signal {
    pub id: SignalId,
    pub title: String,
    pub description: String,
    pub severity: Severity,
    pub status: SignalStatus,
    pub source: SignalSource,
    pub confidence: Confidence,
    pub risk_score: RiskScore,
    /// Optional in the domain because historical signals predate the AI-task capability.
    pub risk_trend: Option<RiskTrend>,
    pub region: String,
    pub assigned_to: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<String>,
    pub has_linked_incident: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Incident {
    pub id: String,
    pub title: String,
    pub severity: Severity,
    pub status: IncidentStatus,
    pub linked_signal_ids: Vec<String>,
    pub owner: String,
    pub created_at: String,
    pub resolved_at: Option<String>,
    pub impact: IncidentImpact,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TimelineEvent {
    pub id: String,
    pub signal_id: String,
    pub kind: TimelineEventType,
    pub label: String,
    pub actor: String,
    pub created_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AnalystRole {
    Admin,
    Lead,
    Analyst,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Analyst {
    pub id: String,
    pub name: String,
    pub email: String,
    pub role: AnalystRole,
    pub region: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Source {
    pub id: String,
    pub name: String,
    pub category: SignalSource,
    pub trust_score: u8,
}
