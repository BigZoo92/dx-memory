//! Business enums. These are the closed vocabularies of the SignalOps domain. Each derives
//! `serde` so it can round-trip, but the *transport* representation is re-declared in
//! `overfit-contracts` on purpose (see the polyglot-cost doc) — the domain enum and the DTO enum
//! are separate types wired by explicit mappers.

use serde::{Deserialize, Serialize};

/// Signal / incident severity, ordered from least to most severe.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

impl Severity {
    /// Ordinal rank used for sorting. Kept in the domain so every layer agrees.
    pub fn rank(self) -> u8 {
        match self {
            Severity::Low => 0,
            Severity::Medium => 1,
            Severity::High => 2,
            Severity::Critical => 3,
        }
    }

    /// The "prior" severity used by the compare read model (one step down).
    pub fn prior(self) -> Severity {
        match self {
            Severity::Critical => Severity::High,
            Severity::High => Severity::Medium,
            Severity::Medium => Severity::Low,
            Severity::Low => Severity::Low,
        }
    }

    pub const ALL: [Severity; 4] = [
        Severity::Low,
        Severity::Medium,
        Severity::High,
        Severity::Critical,
    ];
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SignalStatus {
    New,
    Triaged,
    Investigating,
    Resolved,
    Dismissed,
}

impl SignalStatus {
    /// A signal is "open" unless it has been resolved or dismissed.
    pub fn is_open(self) -> bool {
        !matches!(self, SignalStatus::Resolved | SignalStatus::Dismissed)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SignalSource {
    Web,
    Social,
    Internal,
    Partner,
    Api,
    Manual,
}

/// The AI-task capability under demonstration: the trend of a signal's risk over time.
///
/// This enum is the domain root of the "add Risk trend" change surface. In Overfit, adding it here
/// forces coordinated edits across 20+ files (see docs/overfit/change-management/).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskTrend {
    Up,
    Stable,
    Down,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum IncidentStatus {
    Open,
    InProgress,
    Resolved,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum IncidentImpact {
    User,
    System,
    Security,
    Business,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TimelineEventType {
    Created,
    Updated,
    Assigned,
    Commented,
    Escalated,
    Resolved,
}
