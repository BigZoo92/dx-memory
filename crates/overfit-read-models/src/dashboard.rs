//! Dashboard summary read model. Precomputes KPIs, severity breakdown, a 14-day time series, the
//! most-critical list, static system status and recent incidents — matching the shared product.

use overfit_contracts::entities::{IncidentDto, SignalDto};
use overfit_contracts::views::{
    DashboardKpis, DashboardSummary, ServiceStatus, SeverityBreakdownEntry, SignalsOverTimePoint,
    SummaryKpi,
};
use overfit_domain::entities::{Incident, Signal};
use overfit_domain::enums::{IncidentStatus, Severity};

use crate::datetime::{format_duration, iso_to_ms, start_of_utc_day, DAY_MS, REFERENCE_NOW_MS};
use crate::wire::severity_wire;

fn kpi(
    label: &str,
    value: i64,
    trend: &str,
    trend_label: &str,
    display: Option<String>,
) -> SummaryKpi {
    SummaryKpi {
        label: label.to_string(),
        value,
        display,
        trend: trend.to_string(),
        trend_label: trend_label.to_string(),
    }
}

fn system_status() -> Vec<ServiceStatus> {
    [
        ("Ingestion pipeline", "operational"),
        ("Signal scoring", "operational"),
        ("Partner API connector", "degraded"),
        ("Notification service", "operational"),
        ("Export worker", "down"),
    ]
    .iter()
    .map(|(name, status)| ServiceStatus {
        name: name.to_string(),
        status: status.to_string(),
    })
    .collect()
}

fn signals_over_time(signals: &[Signal], now: i64, days: i64) -> Vec<SignalsOverTimePoint> {
    let start_day = start_of_utc_day(now - (days - 1) * DAY_MS);
    let mut points: Vec<SignalsOverTimePoint> = (0..days)
        .map(|i| {
            let day_ms = start_day + i * DAY_MS;
            SignalsOverTimePoint {
                date: iso_date_key(day_ms),
                total: 0,
                critical: 0,
            }
        })
        .collect();
    for s in signals {
        let key = start_of_utc_day(iso_to_ms(&s.created_at));
        if key >= start_day && key <= start_day + (days - 1) * DAY_MS {
            let idx = ((key - start_day) / DAY_MS) as usize;
            if let Some(p) = points.get_mut(idx) {
                p.total += 1;
                if s.severity == Severity::Critical {
                    p.critical += 1;
                }
            }
        }
    }
    points
}

fn iso_date_key(day_ms: i64) -> String {
    crate::datetime::iso_date(day_ms)
}

pub fn build_dashboard(signals: &[Signal], incidents: &[Incident]) -> DashboardSummary {
    let mut open_signals = 0i64;
    let mut critical_signals = 0i64;
    let mut qualified_count = 0i64;
    let mut qualified_total_ms = 0i64;
    for s in signals {
        if s.status.is_open() {
            open_signals += 1;
            if s.severity == Severity::Critical {
                critical_signals += 1;
            }
        }
        if !matches!(s.status, overfit_domain::enums::SignalStatus::New) {
            let delta = iso_to_ms(&s.updated_at) - iso_to_ms(&s.created_at);
            if delta > 0 {
                qualified_total_ms += delta;
                qualified_count += 1;
            }
        }
    }
    let active_incidents = incidents
        .iter()
        .filter(|i| i.status != IncidentStatus::Resolved)
        .count() as i64;
    let avg_qualification_time_ms = if qualified_count == 0 {
        0
    } else {
        (qualified_total_ms as f64 / qualified_count as f64).round() as i64
    };

    let mut severity_counts = [0i64; 4];
    for s in signals {
        if s.status.is_open() {
            severity_counts[s.severity.rank() as usize] += 1;
        }
    }
    // Ordered critical -> low (severity rank descending), matching the reference UI.
    let severity_breakdown: Vec<SeverityBreakdownEntry> = Severity::ALL
        .iter()
        .rev()
        .map(|sev| SeverityBreakdownEntry {
            severity: severity_wire(*sev).to_string(),
            count: severity_counts[sev.rank() as usize],
        })
        .collect();

    let mut most_critical: Vec<&Signal> = signals
        .iter()
        .filter(|s| s.status.is_open() && matches!(s.severity, Severity::Critical | Severity::High))
        .collect();
    most_critical.sort_by(|a, b| {
        b.risk_score
            .get()
            .cmp(&a.risk_score.get())
            .then_with(|| b.severity.rank().cmp(&a.severity.rank()))
            .then_with(|| a.id.0.cmp(&b.id.0))
    });
    let most_critical_signals: Vec<SignalDto> = most_critical
        .iter()
        .take(8)
        .map(|s| SignalDto::from(*s))
        .collect();

    let mut recent: Vec<&Incident> = incidents.iter().collect();
    recent.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    let recent_incidents: Vec<IncidentDto> = recent
        .iter()
        .take(5)
        .map(|i| IncidentDto::from(*i))
        .collect();

    DashboardSummary {
        kpis: DashboardKpis {
            open_signals: kpi("Open signals", open_signals, "up", "vs last week", None),
            critical_signals: kpi(
                "Critical signals",
                critical_signals,
                "up",
                "new today",
                None,
            ),
            active_incidents: kpi(
                "Active incidents",
                active_incidents,
                "down",
                "vs yesterday",
                None,
            ),
            avg_qualification_time_ms: kpi(
                "Avg qualification time",
                avg_qualification_time_ms,
                "down",
                "faster than avg",
                Some(format_duration(avg_qualification_time_ms)),
            ),
        },
        severity_breakdown,
        signals_over_time: signals_over_time(signals, REFERENCE_NOW_MS, 14),
        most_critical_signals,
        system_status: system_status(),
        recent_incidents,
    }
}
