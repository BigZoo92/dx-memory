//! Entity DTOs and their domain->DTO mappers. The DTO restates every field in camelCase and
//! unwraps the domain value objects. In Flow this mapping does not exist (one shared type); in
//! Overfit it is a mandatory, separately-tested translation step.

use serde::{Deserialize, Serialize};

use overfit_domain::entities::{Incident, Signal, TimelineEvent};
use overfit_domain::enums::{
    IncidentImpact, IncidentStatus, RiskTrend, Severity, SignalSource, SignalStatus,
    TimelineEventType,
};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignalDto {
    pub id: String,
    pub title: String,
    pub description: String,
    pub severity: Severity,
    pub status: SignalStatus,
    pub source: SignalSource,
    pub confidence: Option<f64>,
    pub risk_score: u8,
    /// Always present in Overfit (the AI-task capability). Serialized even when the domain value is
    /// `None`, so the wire shape is stable for the frontend runtime validator.
    pub risk_trend: Option<RiskTrend>,
    pub region: String,
    pub assigned_to: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub tags: Vec<String>,
    pub has_linked_incident: bool,
}

impl From<&Signal> for SignalDto {
    fn from(s: &Signal) -> SignalDto {
        SignalDto {
            id: s.id.0.clone(),
            title: s.title.clone(),
            description: s.description.clone(),
            severity: s.severity,
            status: s.status,
            source: s.source,
            confidence: s.confidence.value(),
            risk_score: s.risk_score.get(),
            risk_trend: s.risk_trend,
            region: s.region.clone(),
            assigned_to: s.assigned_to.clone(),
            created_at: s.created_at.clone(),
            updated_at: s.updated_at.clone(),
            tags: s.tags.clone(),
            has_linked_incident: s.has_linked_incident,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncidentDto {
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

impl From<&Incident> for IncidentDto {
    fn from(i: &Incident) -> IncidentDto {
        IncidentDto {
            id: i.id.clone(),
            title: i.title.clone(),
            severity: i.severity,
            status: i.status,
            linked_signal_ids: i.linked_signal_ids.clone(),
            owner: i.owner.clone(),
            created_at: i.created_at.clone(),
            resolved_at: i.resolved_at.clone(),
            impact: i.impact,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TimelineEventDto {
    pub id: String,
    pub signal_id: String,
    #[serde(rename = "type")]
    pub kind: TimelineEventType,
    pub label: String,
    pub actor: String,
    pub created_at: String,
}

impl From<&TimelineEvent> for TimelineEventDto {
    fn from(e: &TimelineEvent) -> TimelineEventDto {
        TimelineEventDto {
            id: e.id.clone(),
            signal_id: e.signal_id.clone(),
            kind: e.kind,
            label: e.label.clone(),
            actor: e.actor.clone(),
            created_at: e.created_at.clone(),
        }
    }
}

/// `GET /api/signals/:id`
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignalDetailResponse {
    pub signal: SignalDto,
    pub linked_incident: Option<IncidentDto>,
}
