//! # overfit-queries
//!
//! Typed query handlers. Each function is the read-side of one endpoint: it reads through the
//! repository *ports* (never a concrete store) and delegates the projection to `overfit-read-models`.
//! A leaner design would call the read model directly from the HTTP handler; Overfit inserts this
//! extra query-handler seam.

use overfit_contracts::entities::{SignalDetailResponse, SignalDto, TimelineEventDto};
use overfit_contracts::pagination::Paginated;
use overfit_contracts::query::SignalsQuery;
use overfit_contracts::views::{CompareResponse, DashboardSummary, DxMetricsResponse};
use overfit_contracts::IncidentDto;
use overfit_read_models as rm;
use overfit_repositories::{
    AnalystRepository, IncidentRepository, SignalRepository, TimelineRepository,
};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QueryError {
    NotFound { entity: &'static str, id: String },
}

/// `GET /api/signals`
pub fn list_signals(repo: &dyn SignalRepository, q: &SignalsQuery) -> Paginated<SignalDto> {
    rm::query_signals(repo.snapshot(), q)
}

/// `GET /api/signals/:id`
pub fn signal_detail(
    signals: &dyn SignalRepository,
    incidents: &dyn IncidentRepository,
    id: &str,
) -> Result<SignalDetailResponse, QueryError> {
    let signal = signals.find(id).ok_or(QueryError::NotFound {
        entity: "Signal",
        id: id.to_string(),
    })?;
    let linked = incidents.linked_to_signal(id);
    Ok(rm::signals::signal_detail(signal, linked))
}

/// `GET /api/signals/:id/events`
pub fn signal_timeline(
    signals: &dyn SignalRepository,
    timeline: &dyn TimelineRepository,
    id: &str,
) -> Result<Vec<TimelineEventDto>, QueryError> {
    if signals.find(id).is_none() {
        return Err(QueryError::NotFound {
            entity: "Signal",
            id: id.to_string(),
        });
    }
    let events = timeline.for_signal(id);
    Ok(rm::timeline_for(&events))
}

/// `GET /api/incidents`
pub fn list_incidents(
    repo: &dyn IncidentRepository,
    q: &rm::IncidentsQuery,
) -> Paginated<IncidentDto> {
    rm::query_incidents(repo.snapshot(), q)
}

/// `GET /api/dashboard/summary`
pub fn dashboard(
    signals: &dyn SignalRepository,
    incidents: &dyn IncidentRepository,
) -> DashboardSummary {
    rm::build_dashboard(signals.snapshot(), incidents.snapshot())
}

/// `GET /api/compare/:id`
pub fn compare(
    signals: &dyn SignalRepository,
    analysts: &dyn AnalystRepository,
    timeline: &dyn TimelineRepository,
    id: &str,
) -> Result<CompareResponse, QueryError> {
    let signal = signals.find(id).ok_or(QueryError::NotFound {
        entity: "Signal",
        id: id.to_string(),
    })?;
    let events = timeline.for_signal(id);
    Ok(rm::build_compare(signal, analysts.snapshot(), &events))
}

/// `GET /api/dx-metrics`
pub fn dx_metrics() -> DxMetricsResponse {
    rm::dx_metrics_response()
}
