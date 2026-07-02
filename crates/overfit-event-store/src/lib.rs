//! # overfit-event-store
//!
//! An append-only, in-memory event store with per-stream monotonic sequences and global replay.
//! There is no durability, no snapshotting that matters, and nothing reads these events back to
//! rebuild state in anger — the read models are projected once at boot. It exists to demonstrate
//! the machinery (and cost) of event sourcing on a dataset that never changes.

use std::collections::HashMap;
use std::sync::Mutex;

use overfit_events::{EventEnvelope, EventMetadata};

use overfit_domain::events::DomainEvent;

/// Deterministic, overkill stream id derived from the aggregate. Every signal and incident gets its
/// own stream, so a 10,000-signal fixture set produces 10,000 streams.
pub fn stream_id_for(event: &DomainEvent) -> String {
    match event {
        DomainEvent::Signal(se) => {
            use overfit_domain::events::SignalDomainEvent::*;
            let id = match se {
                SignalIngested { signal_id, .. } => &signal_id.0,
                RiskTrendComputed { signal_id, .. } => &signal_id.0,
                SignalAssigned { signal_id, .. } => &signal_id.0,
                SignalResolved { signal_id } => &signal_id.0,
            };
            format!("signal::{id}")
        }
        DomainEvent::Incident(ie) => {
            use overfit_domain::events::IncidentDomainEvent::*;
            let id = match ie {
                IncidentOpened { incident_id, .. } => incident_id,
                IncidentSignalLinked { incident_id, .. } => incident_id,
                IncidentResolved { incident_id } => incident_id,
            };
            format!("incident::{id}")
        }
    }
}

#[derive(Debug, Default)]
pub struct MemoryEventStore {
    inner: Mutex<Inner>,
}

#[derive(Debug, Default)]
struct Inner {
    /// The global, ordered log.
    log: Vec<EventEnvelope>,
    /// Next sequence per stream.
    sequences: HashMap<String, u64>,
    /// Monotonic global event counter used to mint event ids without an external RNG.
    counter: u64,
}

impl MemoryEventStore {
    pub fn new() -> MemoryEventStore {
        MemoryEventStore::default()
    }

    /// Append a domain event to its stream, minting the envelope. Returns the assigned sequence.
    pub fn append(&self, event: DomainEvent, occurred_at: &str, metadata: EventMetadata) -> u64 {
        let stream = stream_id_for(&event);
        let mut inner = self.inner.lock().expect("event store poisoned");
        inner.counter += 1;
        let event_id = format!("evt_{:08x}", inner.counter);
        let seq = {
            let slot = inner.sequences.entry(stream.clone()).or_insert(0);
            *slot += 1;
            *slot
        };
        let envelope = EventEnvelope::new(event_id, stream, seq, occurred_at, metadata, event);
        inner.log.push(envelope);
        seq
    }

    /// Number of events in the global log.
    pub fn len(&self) -> usize {
        self.inner.lock().expect("event store poisoned").log.len()
    }

    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Number of distinct streams.
    pub fn stream_count(&self) -> usize {
        self.inner
            .lock()
            .expect("event store poisoned")
            .sequences
            .len()
    }

    /// Replay the whole log in order (clone). Used by projectors and the diagnostic pack.
    pub fn replay_all(&self) -> Vec<EventEnvelope> {
        self.inner.lock().expect("event store poisoned").log.clone()
    }

    /// Replay a single stream in order.
    pub fn replay_stream(&self, stream_id: &str) -> Vec<EventEnvelope> {
        self.inner
            .lock()
            .expect("event store poisoned")
            .log
            .iter()
            .filter(|e| e.stream_id == stream_id)
            .cloned()
            .collect()
    }

    /// The last `n` events, newest last. Feeds the /api/telemetry and /ops views.
    pub fn tail(&self, n: usize) -> Vec<EventEnvelope> {
        let inner = self.inner.lock().expect("event store poisoned");
        let start = inner.log.len().saturating_sub(n);
        inner.log[start..].to_vec()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use overfit_domain::events::{DomainEvent, SignalDomainEvent};
    use overfit_domain::value_objects::SignalId;

    fn sig_event(id: &str) -> DomainEvent {
        DomainEvent::Signal(SignalDomainEvent::SignalResolved {
            signal_id: SignalId(id.into()),
        })
    }

    #[test]
    fn append_sequences_per_stream() {
        let store = MemoryEventStore::new();
        let m = EventMetadata::system("c1");
        assert_eq!(store.append(sig_event("sig_1"), "t", m.clone()), 1);
        assert_eq!(store.append(sig_event("sig_1"), "t", m.clone()), 2);
        assert_eq!(store.append(sig_event("sig_2"), "t", m), 1);
        assert_eq!(store.len(), 3);
        assert_eq!(store.stream_count(), 2);
        assert_eq!(store.replay_stream("signal::sig_1").len(), 2);
    }
}
