//! Domain events — the facts an aggregate emits when its state changes. These are the *domain*
//! shape; `overfit-events` wraps them in versioned envelopes with metadata, and `overfit-event-store`
//! persists them. A leaner design would not event-source a read-only demo dataset at all.

use serde::{Deserialize, Serialize};

use crate::enums::RiskTrend;
use crate::value_objects::SignalId;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload", rename_all = "PascalCase")]
pub enum SignalDomainEvent {
    /// A signal was ingested into the system (replayed from fixtures at boot).
    SignalIngested {
        signal_id: SignalId,
        severity: String,
        source: String,
    },
    /// A signal's risk trend was (re)computed by the scoring model.
    RiskTrendComputed {
        signal_id: SignalId,
        trend: RiskTrend,
    },
    /// A signal was assigned to an analyst.
    SignalAssigned {
        signal_id: SignalId,
        analyst_id: String,
    },
    /// A signal was resolved.
    SignalResolved { signal_id: SignalId },
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", content = "payload", rename_all = "PascalCase")]
pub enum IncidentDomainEvent {
    IncidentOpened {
        incident_id: String,
        severity: String,
    },
    IncidentSignalLinked {
        incident_id: String,
        signal_id: SignalId,
    },
    IncidentResolved {
        incident_id: String,
    },
}

/// The union of everything the write side can emit. `overfit-events` envelopes this.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "aggregate", rename_all = "PascalCase")]
pub enum DomainEvent {
    Signal(SignalDomainEvent),
    Incident(IncidentDomainEvent),
}
