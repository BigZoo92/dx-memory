//! Signals read model: filter, sort, paginate; plus the detail projection and the timeline.

use std::cmp::Ordering;

use overfit_contracts::entities::{SignalDetailResponse, SignalDto, TimelineEventDto};
use overfit_contracts::pagination::Paginated;
use overfit_contracts::query::{SignalsQuery, UNASSIGNED};
use overfit_domain::entities::{Incident, Signal, TimelineEvent};

use crate::wire::{severity_wire, source_wire, status_wire, trend_wire};

fn matches(signal: &Signal, q: &SignalsQuery) -> bool {
    if let Some(v) = q.severity.as_deref().filter(|v| !v.is_empty()) {
        if severity_wire(signal.severity) != v {
            return false;
        }
    }
    if let Some(v) = q.status.as_deref().filter(|v| !v.is_empty()) {
        if status_wire(signal.status) != v {
            return false;
        }
    }
    if let Some(v) = q.source.as_deref().filter(|v| !v.is_empty()) {
        if source_wire(signal.source) != v {
            return false;
        }
    }
    if let Some(v) = q.risk_trend.as_deref().filter(|v| !v.is_empty()) {
        match signal.risk_trend {
            Some(t) if trend_wire(t) == v => {}
            _ => return false,
        }
    }
    if let Some(v) = q.assigned_to.as_deref().filter(|v| !v.is_empty()) {
        if v == UNASSIGNED {
            if signal.assigned_to.is_some() {
                return false;
            }
        } else if signal.assigned_to.as_deref() != Some(v) {
            return false;
        }
    }
    if let Some(v) = q.date_from.as_deref().filter(|v| !v.is_empty()) {
        if signal.created_at.as_str() < v {
            return false;
        }
    }
    if let Some(v) = q.date_to.as_deref().filter(|v| !v.is_empty()) {
        if signal.created_at.as_str() > v {
            return false;
        }
    }
    if let Some(v) = q.search.as_deref() {
        let needle = v.trim().to_lowercase();
        if !needle.is_empty() {
            let haystack = format!(
                "{} {} {} {}",
                signal.title,
                signal.id.0,
                source_wire(signal.source),
                signal.assigned_to.as_deref().unwrap_or("")
            )
            .to_lowercase();
            if !haystack.contains(&needle) {
                return false;
            }
        }
    }
    true
}

fn compare(a: &Signal, b: &Signal, field: &str) -> Ordering {
    match field {
        "createdAt" => a.created_at.cmp(&b.created_at),
        "confidence" => {
            let av = a.confidence.value().unwrap_or(-1.0);
            let bv = b.confidence.value().unwrap_or(-1.0);
            av.partial_cmp(&bv).unwrap_or(Ordering::Equal)
        }
        "severity" => a.severity.rank().cmp(&b.severity.rank()),
        // default: riskScore
        _ => a.risk_score.get().cmp(&b.risk_score.get()),
    }
}

/// Filter + sort + paginate, returning DTOs. This is the `GET /api/signals` read model.
pub fn query_signals(all: &[Signal], q: &SignalsQuery) -> Paginated<SignalDto> {
    let mut filtered: Vec<&Signal> = all.iter().filter(|s| matches(s, q)).collect();
    let field = q.effective_sort_by();
    let ascending = q.effective_sort_direction() == "asc";
    filtered.sort_by(|a, b| {
        let ord = compare(a, b, field);
        let ord = if ascending { ord } else { ord.reverse() };
        ord.then_with(|| a.id.0.cmp(&b.id.0))
    });

    let page_size = q.effective_page_size();
    let total = filtered.len();
    let total_pages = if total == 0 {
        0
    } else {
        total.div_ceil(page_size)
    };
    let page = q.page.unwrap_or(1).clamp(1, total_pages.max(1));
    let start = (page - 1) * page_size;
    let items: Vec<SignalDto> = filtered
        .iter()
        .skip(start)
        .take(page_size)
        .map(|s| SignalDto::from(*s))
        .collect();
    Paginated {
        items,
        page,
        page_size,
        total,
        total_pages,
    }
}

/// `GET /api/signals/:id` — signal + its linked incident (if any).
pub fn signal_detail(signal: &Signal, linked: Option<&Incident>) -> SignalDetailResponse {
    SignalDetailResponse {
        signal: SignalDto::from(signal),
        linked_incident: linked.map(overfit_contracts::entities::IncidentDto::from),
    }
}

/// `GET /api/signals/:id/events` — chronological timeline DTOs.
pub fn timeline_for(events: &[&TimelineEvent]) -> Vec<TimelineEventDto> {
    events.iter().map(|e| TimelineEventDto::from(*e)).collect()
}
