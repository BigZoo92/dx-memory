//! # overfit-repositories
//!
//! Repository *ports* — the interfaces the application layer depends on, so it never names a
//! concrete data source. The only implementation is the in-memory fixtures adapter, which makes
//! the abstraction pure ceremony. A `UnitOfWork` transaction boundary is modelled too, even though
//! nothing is ever written. This is intentional: it is the cost of "ports and adapters" applied to
//! a read-only dataset.

use overfit_domain::entities::{Analyst, Incident, Signal, Source, TimelineEvent};

/// Read port for signals. Returns borrowed slices to avoid cloning the 10,000-row fixture set.
pub trait SignalRepository: Send + Sync {
    fn snapshot(&self) -> &[Signal];
    fn find(&self, id: &str) -> Option<&Signal>;
    fn count(&self) -> usize {
        self.snapshot().len()
    }
}

pub trait IncidentRepository: Send + Sync {
    fn snapshot(&self) -> &[Incident];
    fn find(&self, id: &str) -> Option<&Incident>;
    fn linked_to_signal(&self, signal_id: &str) -> Option<&Incident> {
        self.snapshot()
            .iter()
            .find(|i| i.linked_signal_ids.iter().any(|s| s == signal_id))
    }
}

pub trait TimelineRepository: Send + Sync {
    fn snapshot(&self) -> &[TimelineEvent];
    fn for_signal(&self, signal_id: &str) -> Vec<&TimelineEvent> {
        let mut out: Vec<&TimelineEvent> = self
            .snapshot()
            .iter()
            .filter(|e| e.signal_id == signal_id)
            .collect();
        out.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        out
    }
}

pub trait AnalystRepository: Send + Sync {
    fn snapshot(&self) -> &[Analyst];
    fn name_of(&self, id: &str) -> Option<&str> {
        self.snapshot()
            .iter()
            .find(|a| a.id == id)
            .map(|a| a.name.as_str())
    }
}

pub trait SourceRepository: Send + Sync {
    fn snapshot(&self) -> &[Source];
}

/// A no-op transaction boundary. `commit()` must be called or `Drop` records an "abandoned"
/// transaction — mimicking a real unit-of-work even though there is nothing to roll back.
#[derive(Debug)]
pub struct TransactionGuard {
    committed: bool,
    pub id: String,
}

impl TransactionGuard {
    pub fn commit(mut self) {
        self.committed = true;
    }
}

impl Drop for TransactionGuard {
    fn drop(&mut self) {
        if !self.committed {
            // In a real system this would roll back. Here it is a breadcrumb of wasted ceremony.
            debug_assert!(true, "transaction {} dropped without commit", self.id);
        }
    }
}

pub trait UnitOfWork: Send + Sync {
    fn begin(&self, id: &str) -> TransactionGuard {
        TransactionGuard {
            committed: false,
            id: id.to_string(),
        }
    }
}
