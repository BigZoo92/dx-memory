//! # overfit-adapters-fixtures
//!
//! The single concrete implementation of every repository port: a deterministic in-memory dataset
//! (10,000 signals, 300 incidents, 25 analysts, 12 sources, 50,000 timeline events) generated from
//! a fixed seed. Because it is the only adapter, the port abstraction in `overfit-repositories`
//! buys nothing at runtime — which is the cost Overfit is demonstrating.

mod datetime;
mod generate;
mod rng;

pub use datetime::{ms_to_iso, DAY_MS, REFERENCE_NOW_MS, WINDOW_DAYS};
pub use generate::{derive_risk_trend, generate_all, Dataset, SEED};

use std::collections::HashMap;

use overfit_domain::entities::{Analyst, Incident, Signal, Source, TimelineEvent};
use overfit_repositories::{
    AnalystRepository, IncidentRepository, SignalRepository, SourceRepository, TimelineRepository,
    UnitOfWork,
};

/// Holds the generated dataset and secondary indexes for O(1) id lookups.
pub struct FixtureStore {
    dataset: Dataset,
    signal_index: HashMap<String, usize>,
    incident_index: HashMap<String, usize>,
}

impl FixtureStore {
    /// Generate the full dataset once. Call at boot.
    pub fn bootstrap() -> FixtureStore {
        let dataset = generate_all();
        let signal_index = dataset
            .signals
            .iter()
            .enumerate()
            .map(|(i, s)| (s.id.0.clone(), i))
            .collect();
        let incident_index = dataset
            .incidents
            .iter()
            .enumerate()
            .map(|(i, inc)| (inc.id.clone(), i))
            .collect();
        FixtureStore {
            dataset,
            signal_index,
            incident_index,
        }
    }

    pub fn dataset(&self) -> &Dataset {
        &self.dataset
    }
}

impl SignalRepository for FixtureStore {
    fn snapshot(&self) -> &[Signal] {
        &self.dataset.signals
    }
    fn find(&self, id: &str) -> Option<&Signal> {
        self.signal_index.get(id).map(|&i| &self.dataset.signals[i])
    }
}

impl IncidentRepository for FixtureStore {
    fn snapshot(&self) -> &[Incident] {
        &self.dataset.incidents
    }
    fn find(&self, id: &str) -> Option<&Incident> {
        self.incident_index
            .get(id)
            .map(|&i| &self.dataset.incidents[i])
    }
}

impl TimelineRepository for FixtureStore {
    fn snapshot(&self) -> &[TimelineEvent] {
        &self.dataset.events
    }
}

impl AnalystRepository for FixtureStore {
    fn snapshot(&self) -> &[Analyst] {
        &self.dataset.analysts
    }
}

impl SourceRepository for FixtureStore {
    fn snapshot(&self) -> &[Source] {
        &self.dataset.sources
    }
}

impl UnitOfWork for FixtureStore {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn find_signal_by_id() {
        let store = FixtureStore::bootstrap();
        assert!(SignalRepository::find(&store, "sig_00001").is_some());
        assert!(SignalRepository::find(&store, "sig_99999").is_none());
    }

    #[test]
    fn linked_incident_lookup_is_coherent() {
        let store = FixtureStore::bootstrap();
        // Any incident links at least one signal, and that signal is flagged.
        let inc = &store.dataset().incidents[0];
        let sid = &inc.linked_signal_ids[0];
        assert!(
            SignalRepository::find(&store, sid)
                .unwrap()
                .has_linked_incident
        );
    }
}
