//! Aggregates. In a CRUD design these would not exist — the fixtures are read-only. Overfit models
//! them anyway so that every state transition is expressed as `command -> invariant check ->
//! domain event`, even though nothing is persisted beyond the in-memory event store.

use crate::entities::{Incident, Signal};
use crate::enums::RiskTrend;
use crate::events::{IncidentDomainEvent, SignalDomainEvent};
use crate::validation::DomainError;

/// Write-side consistency boundary around a single signal.
#[derive(Debug, Clone)]
pub struct SignalAggregate {
    signal: Signal,
    version: u64,
}

impl SignalAggregate {
    pub fn hydrate(signal: Signal) -> SignalAggregate {
        SignalAggregate { signal, version: 0 }
    }

    pub fn version(&self) -> u64 {
        self.version
    }

    pub fn signal(&self) -> &Signal {
        &self.signal
    }

    pub fn into_signal(self) -> Signal {
        self.signal
    }

    /// Assign the signal to an analyst. Invariant: cannot assign a resolved signal.
    pub fn assign(&mut self, analyst_id: &str) -> Result<SignalDomainEvent, DomainError> {
        if !self.signal.status.is_open() {
            return Err(DomainError::InvalidTransition {
                what: "assign",
                reason: "signal is not open",
            });
        }
        self.signal.assigned_to = Some(analyst_id.to_string());
        self.version += 1;
        Ok(SignalDomainEvent::SignalAssigned {
            signal_id: self.signal.id.clone(),
            analyst_id: analyst_id.to_string(),
        })
    }

    /// Record a recomputed risk trend (the AI-task capability).
    pub fn set_risk_trend(&mut self, trend: RiskTrend) -> SignalDomainEvent {
        self.signal.risk_trend = Some(trend);
        self.version += 1;
        SignalDomainEvent::RiskTrendComputed {
            signal_id: self.signal.id.clone(),
            trend,
        }
    }
}

/// Write-side consistency boundary around a single incident.
#[derive(Debug, Clone)]
pub struct IncidentAggregate {
    incident: Incident,
    version: u64,
}

impl IncidentAggregate {
    pub fn hydrate(incident: Incident) -> IncidentAggregate {
        IncidentAggregate {
            incident,
            version: 0,
        }
    }

    pub fn incident(&self) -> &Incident {
        &self.incident
    }

    pub fn link_signal(&mut self, signal_id: &str) -> IncidentDomainEvent {
        if !self
            .incident
            .linked_signal_ids
            .iter()
            .any(|s| s == signal_id)
        {
            self.incident.linked_signal_ids.push(signal_id.to_string());
            self.version += 1;
        }
        IncidentDomainEvent::IncidentSignalLinked {
            incident_id: self.incident.id.clone(),
            signal_id: crate::value_objects::SignalId(signal_id.to_string()),
        }
    }
}
