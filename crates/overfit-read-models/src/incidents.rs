//! Incidents read model. Filter/sort/paginate, deliberately re-implemented separately from the
//! signals version (as in the other variants) rather than sharing a generic paginator.

use overfit_contracts::entities::IncidentDto;
use overfit_contracts::pagination::Paginated;
use overfit_domain::entities::Incident;

use crate::wire::{impact_wire, incident_status_wire, severity_wire};

#[derive(Debug, Default, Clone)]
pub struct IncidentsQuery {
    pub status: Option<String>,
    pub severity: Option<String>,
    pub impact: Option<String>,
    pub page: Option<usize>,
    pub page_size: Option<usize>,
}

pub fn query_incidents(all: &[Incident], q: &IncidentsQuery) -> Paginated<IncidentDto> {
    let mut filtered: Vec<&Incident> = all
        .iter()
        .filter(|i| {
            if let Some(v) = q.status.as_deref().filter(|v| !v.is_empty()) {
                if incident_status_wire(i.status) != v {
                    return false;
                }
            }
            if let Some(v) = q.severity.as_deref().filter(|v| !v.is_empty()) {
                if severity_wire(i.severity) != v {
                    return false;
                }
            }
            if let Some(v) = q.impact.as_deref().filter(|v| !v.is_empty()) {
                if impact_wire(i.impact) != v {
                    return false;
                }
            }
            true
        })
        .collect();

    // createdAt desc, tiebreak id asc.
    filtered.sort_by(|a, b| {
        b.created_at
            .cmp(&a.created_at)
            .then_with(|| a.id.cmp(&b.id))
    });

    let page_size = q.page_size.unwrap_or(50).clamp(1, 200);
    let total = filtered.len();
    let total_pages = if total == 0 {
        0
    } else {
        total.div_ceil(page_size)
    };
    let page = q.page.unwrap_or(1).clamp(1, total_pages.max(1));
    let start = (page - 1) * page_size;
    let items: Vec<IncidentDto> = filtered
        .iter()
        .skip(start)
        .take(page_size)
        .map(|i| IncidentDto::from(*i))
        .collect();
    Paginated {
        items,
        page,
        page_size,
        total,
        total_pages,
    }
}
