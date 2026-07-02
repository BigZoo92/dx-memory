//! # overfit-events
//!
//! Versioned event envelopes. Every domain event is wrapped with a stream id, a monotonic sequence,
//! a schema version and correlation/causation metadata — the full ceremony of an event-sourced
//! system, applied to a read-only demo dataset. This is deliberate over-investment.

use serde::{Deserialize, Serialize};

use overfit_domain::events::DomainEvent;

/// The current envelope schema version. Bumped whenever the envelope shape changes; consumers can
/// branch on it during replay (upcasting). We never actually need to, which is the point.
pub const ENVELOPE_SCHEMA_VERSION: u16 = 1;

/// Correlation metadata attached to every event. In a real system this threads a request id through
/// asynchronous boundaries; here it threads it through function calls in the same process.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EventMetadata {
    pub correlation_id: String,
    pub causation_id: String,
    pub actor: String,
    pub source: String,
}

impl EventMetadata {
    pub fn system(correlation_id: impl Into<String>) -> EventMetadata {
        let cid = correlation_id.into();
        EventMetadata {
            causation_id: cid.clone(),
            correlation_id: cid,
            actor: "system".to_string(),
            source: "overfit-api".to_string(),
        }
    }
}

/// A persisted, versioned event.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EventEnvelope {
    pub event_id: String,
    pub stream_id: String,
    pub sequence: u64,
    pub occurred_at: String,
    pub schema_version: u16,
    pub metadata: EventMetadata,
    pub event: DomainEvent,
}

impl EventEnvelope {
    pub fn new(
        event_id: impl Into<String>,
        stream_id: impl Into<String>,
        sequence: u64,
        occurred_at: impl Into<String>,
        metadata: EventMetadata,
        event: DomainEvent,
    ) -> EventEnvelope {
        EventEnvelope {
            event_id: event_id.into(),
            stream_id: stream_id.into(),
            sequence,
            occurred_at: occurred_at.into(),
            schema_version: ENVELOPE_SCHEMA_VERSION,
            metadata,
            event,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use overfit_domain::events::{DomainEvent, SignalDomainEvent};
    use overfit_domain::value_objects::SignalId;

    #[test]
    fn envelope_roundtrips() {
        let env = EventEnvelope::new(
            "evt_1",
            "signal-sig_00001",
            1,
            "2026-06-29T12:00:00.000Z",
            EventMetadata::system("corr_1"),
            DomainEvent::Signal(SignalDomainEvent::SignalResolved {
                signal_id: SignalId("sig_00001".into()),
            }),
        );
        let json = serde_json::to_string(&env).unwrap();
        let back: EventEnvelope = serde_json::from_str(&json).unwrap();
        assert_eq!(env, back);
        assert_eq!(back.schema_version, ENVELOPE_SCHEMA_VERSION);
    }
}
