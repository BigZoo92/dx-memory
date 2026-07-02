//! Deterministic dataset generator. Reproduces the shared TypeScript algorithm (seed, RNG call
//! order, distributions and volumes) so Overfit serves the same product data as Flow and Friction.
//! `risk_trend` is DERIVED from the generated risk score rather than consuming extra randomness, so
//! the base dataset stays identical while the AI-task capability is present on every signal.

use overfit_domain::entities::{Analyst, AnalystRole, Incident, Signal, Source, TimelineEvent};
use overfit_domain::enums::{
    IncidentImpact, IncidentStatus, RiskTrend, Severity, SignalSource, SignalStatus,
    TimelineEventType,
};
use overfit_domain::ids::format_id;
use overfit_domain::value_objects::{Confidence, RiskScore, SignalId};

use crate::datetime::{ms_to_iso, DAY_MS, REFERENCE_NOW_MS, WINDOW_DAYS};
use crate::rng::Rng;

pub const SEED: u32 = 20260629;

struct Counts {
    signals: usize,
    incidents: usize,
    analysts: usize,
    sources: usize,
    events: usize,
}
const COUNTS: Counts = Counts {
    signals: 10_000,
    incidents: 300,
    analysts: 25,
    sources: 12,
    events: 50_000,
};

const REGIONS: [&str; 10] = [
    "EU-West",
    "EU-Central",
    "US-East",
    "US-West",
    "APAC",
    "LATAM",
    "MEA",
    "UK",
    "Nordics",
    "DACH",
];

const TAGS: [&str; 15] = [
    "auth",
    "export",
    "latency",
    "partner-api",
    "data-leak",
    "anomaly",
    "compliance",
    "pii",
    "rate-limit",
    "geo-mismatch",
    "automation",
    "manual-review",
    "escalation",
    "fraud",
    "integrity",
];

const SIGNAL_TITLES: [&str; 16] = [
    "Unusual authentication pattern detected",
    "Partner API latency spike",
    "Suspicious document access",
    "Unexpected data export volume",
    "Critical workflow failure",
    "Manual review required",
    "Repeated failed exports from same region",
    "High-risk source correlation detected",
    "Anomalous login velocity",
    "Sensitive record accessed off-hours",
    "Spike in rate-limit rejections",
    "Possible PII leak in export batch",
    "Geo mismatch on partner session",
    "Automation job exceeded error budget",
    "Escalation threshold reached for source",
    "Integrity check mismatch on ingest",
];

const INCIDENT_TITLES: [&str; 8] = [
    "Coordinated authentication abuse",
    "Partner data pipeline degradation",
    "Mass export anomaly under investigation",
    "Suspected insider document exfiltration",
    "Cascading workflow failure",
    "Cross-region fraud cluster",
    "Compliance breach review",
    "Rate-limit saturation incident",
];

const ANALYST_NAMES: [&str; 25] = [
    "Amelia Stone",
    "Noah Bennett",
    "Priya Nair",
    "Lucas Moreau",
    "Sofia Rossi",
    "Mateo Garcia",
    "Hana Suzuki",
    "Olivier Dubois",
    "Emma Larsson",
    "Daniel Cohen",
    "Aisha Khan",
    "Liam Murphy",
    "Yuki Tanaka",
    "Clara Schmidt",
    "Diego Fernandez",
    "Maya Patel",
    "Tomas Novak",
    "Ines Costa",
    "Jonas Weber",
    "Leila Haddad",
    "Erik Johansson",
    "Nadia Petrova",
    "Samuel Adeyemi",
    "Chloe Martin",
    "Viktor Ivanov",
];

const SOURCE_DEFINITIONS: [(&str, SignalSource); 12] = [
    ("Public Web Crawler", SignalSource::Web),
    ("Brand Mentions Feed", SignalSource::Web),
    ("Social Listening Stream", SignalSource::Social),
    ("Community Reports", SignalSource::Social),
    ("Internal Audit Log", SignalSource::Internal),
    ("Employee Activity Monitor", SignalSource::Internal),
    ("Partner Webhook Gateway", SignalSource::Partner),
    ("Partner Data Exchange", SignalSource::Partner),
    ("Detection API v1", SignalSource::Api),
    ("Detection API v2", SignalSource::Api),
    ("Analyst Manual Entry", SignalSource::Manual),
    ("Escalation Desk", SignalSource::Manual),
];

const SEVERITY_WEIGHTS: [(Severity, i64); 4] = [
    (Severity::Low, 40),
    (Severity::Medium, 33),
    (Severity::High, 19),
    (Severity::Critical, 8),
];
const STATUS_WEIGHTS: [(SignalStatus, i64); 5] = [
    (SignalStatus::New, 28),
    (SignalStatus::Triaged, 24),
    (SignalStatus::Investigating, 22),
    (SignalStatus::Resolved, 18),
    (SignalStatus::Dismissed, 8),
];
const INCIDENT_SEVERITY_WEIGHTS: [(Severity, i64); 4] = [
    (Severity::Low, 10),
    (Severity::Medium, 30),
    (Severity::High, 35),
    (Severity::Critical, 25),
];
const INCIDENT_STATUS_WEIGHTS: [(IncidentStatus, i64); 3] = [
    (IncidentStatus::Open, 35),
    (IncidentStatus::InProgress, 30),
    (IncidentStatus::Resolved, 35),
];
const INCIDENT_IMPACT_WEIGHTS: [(IncidentImpact, i64); 4] = [
    (IncidentImpact::User, 30),
    (IncidentImpact::System, 30),
    (IncidentImpact::Security, 25),
    (IncidentImpact::Business, 15),
];
const EVENT_TYPE_WEIGHTS: [(TimelineEventType, i64); 6] = [
    (TimelineEventType::Created, 10),
    (TimelineEventType::Updated, 30),
    (TimelineEventType::Assigned, 15),
    (TimelineEventType::Commented, 25),
    (TimelineEventType::Escalated, 8),
    (TimelineEventType::Resolved, 12),
];

fn risk_range(severity: Severity) -> (i64, i64) {
    match severity {
        Severity::Low => (0, 39),
        Severity::Medium => (30, 69),
        Severity::High => (55, 89),
        Severity::Critical => (80, 100),
    }
}

/// Derive the AI-task capability from the generated risk score. Deterministic, no extra RNG, so the
/// base dataset is unchanged from Flow/Friction.
pub fn derive_risk_trend(risk_score: u8) -> RiskTrend {
    if risk_score >= 80 {
        RiskTrend::Up
    } else if risk_score <= 35 {
        RiskTrend::Down
    } else {
        RiskTrend::Stable
    }
}

fn iso_between(rng: &mut Rng, from_ms: i64, to_ms: i64) -> String {
    let span = (to_ms - from_ms).max(0);
    ms_to_iso(from_ms + rng.int(0, span))
}

fn analyst_email(name: &str) -> String {
    let lowered = name.to_lowercase();
    let mut out = String::new();
    let mut in_sep = false;
    for ch in lowered.chars() {
        if ch.is_ascii_lowercase() {
            out.push(ch);
            in_sep = false;
        } else if !in_sep {
            out.push('.');
            in_sep = true;
        }
    }
    format!("{out}@signalops.example")
}

fn event_label(kind: TimelineEventType, actor: &str) -> String {
    match kind {
        TimelineEventType::Created => "Signal created".to_string(),
        TimelineEventType::Updated => "Signal fields updated".to_string(),
        TimelineEventType::Assigned => format!("Assigned to {actor}"),
        TimelineEventType::Commented => "Comment added".to_string(),
        TimelineEventType::Escalated => "Escalated for review".to_string(),
        TimelineEventType::Resolved => "Marked as resolved".to_string(),
    }
}

pub struct Dataset {
    pub analysts: Vec<Analyst>,
    pub sources: Vec<Source>,
    pub signals: Vec<Signal>,
    pub incidents: Vec<Incident>,
    pub events: Vec<TimelineEvent>,
}

fn build_analysts(rng: &mut Rng) -> Vec<Analyst> {
    (0..COUNTS.analysts)
        .map(|i| {
            let name = ANALYST_NAMES[i % ANALYST_NAMES.len()];
            let role = if i == 0 {
                AnalystRole::Admin
            } else if i % 6 == 0 {
                AnalystRole::Lead
            } else {
                AnalystRole::Analyst
            };
            let email = analyst_email(name);
            let region = (*rng.pick(&REGIONS)).to_string();
            Analyst {
                id: format_id("ana", i + 1, 3),
                name: name.to_string(),
                email,
                role,
                region,
            }
        })
        .collect()
}

fn build_sources(rng: &mut Rng) -> Vec<Source> {
    SOURCE_DEFINITIONS
        .iter()
        .take(COUNTS.sources)
        .enumerate()
        .map(|(i, (name, category))| Source {
            id: format_id("src", i + 1, 2),
            name: name.to_string(),
            category: *category,
            trust_score: rng.int(40, 99) as u8,
        })
        .collect()
}

fn build_signals(
    rng: &mut Rng,
    analysts: &[Analyst],
    sources: &[Source],
) -> (Vec<Signal>, Vec<i64>) {
    let mut signals = Vec::with_capacity(COUNTS.signals);
    let mut created_ms = Vec::with_capacity(COUNTS.signals);
    for i in 0..COUNTS.signals {
        let severity = rng.weighted(&SEVERITY_WEIGHTS);
        let status = rng.weighted(&STATUS_WEIGHTS);
        let source = rng.pick(sources).clone();
        let region = (*rng.pick(&REGIONS)).to_string();
        let (risk_min, risk_max) = risk_range(severity);

        let created = REFERENCE_NOW_MS - rng.int(0, WINDOW_DAYS * DAY_MS);
        let created_at = ms_to_iso(created);
        let updated_at = iso_between(rng, created, REFERENCE_NOW_MS);

        let assign_probability = if status == SignalStatus::New {
            0.3
        } else {
            0.8
        };
        let assigned_to = if rng.boolean(assign_probability) {
            Some(rng.pick(analysts).id.clone())
        } else {
            None
        };

        // Object-literal evaluation order below mirrors the TypeScript generator exactly.
        let title = (*rng.pick(&SIGNAL_TITLES)).to_string();
        let description = format!(
            "{} observed on \"{}\" ({}). Automated qualification pending analyst review.",
            rng.pick(&SIGNAL_TITLES),
            source.name,
            region
        );
        let confidence = if rng.boolean(0.05) {
            Confidence::unavailable()
        } else {
            Confidence::some(rng.float(0.0, 1.0, 2))
        };
        let risk_raw = rng.int(risk_min, risk_max);
        let risk_score = RiskScore::new(risk_raw);
        let tag_count = rng.int(1, 4) as usize;
        let tags = rng
            .sample_unique(&TAGS, tag_count)
            .into_iter()
            .map(|t| t.to_string())
            .collect();

        signals.push(Signal {
            id: SignalId(format_id("sig", i + 1, 5)),
            title,
            description,
            severity,
            status,
            source: source.category,
            confidence,
            risk_score,
            risk_trend: Some(derive_risk_trend(risk_score.get())),
            region,
            assigned_to,
            created_at,
            updated_at,
            tags,
            has_linked_incident: false,
        });
        created_ms.push(created);
    }
    (signals, created_ms)
}

fn build_incidents(rng: &mut Rng, signals: &mut [Signal], analysts: &[Analyst]) -> Vec<Incident> {
    let mut incidents = Vec::with_capacity(COUNTS.incidents);
    for i in 0..COUNTS.incidents {
        let severity = rng.weighted(&INCIDENT_SEVERITY_WEIGHTS);
        let status = rng.weighted(&INCIDENT_STATUS_WEIGHTS);
        let impact = rng.weighted(&INCIDENT_IMPACT_WEIGHTS);

        let link_count = rng.int(1, 5) as usize;
        let indices = sample_unique_indices(rng, signals.len(), link_count);
        let mut linked_ids = Vec::with_capacity(indices.len());
        for &idx in &indices {
            signals[idx].has_linked_incident = true;
            linked_ids.push(signals[idx].id.0.clone());
        }

        let created = REFERENCE_NOW_MS - rng.int(0, WINDOW_DAYS * DAY_MS);
        let created_at = ms_to_iso(created);
        let resolved_at = if status == IncidentStatus::Resolved {
            Some(iso_between(rng, created, REFERENCE_NOW_MS))
        } else {
            None
        };

        let title = (*rng.pick(&INCIDENT_TITLES)).to_string();
        let owner = rng.pick(analysts).id.clone();

        incidents.push(Incident {
            id: format_id("inc", i + 1, 3),
            title,
            severity,
            status,
            linked_signal_ids: linked_ids,
            owner,
            created_at,
            resolved_at,
            impact,
        });
    }
    incidents
}

/// Index-only variant of `sample_unique`, consuming the identical RNG sequence (the RNG only
/// depends on the shrinking pool length) while avoiding cloning the 10,000-signal pool per incident.
fn sample_unique_indices(rng: &mut Rng, len: usize, count: usize) -> Vec<usize> {
    let n = count.min(len);
    let mut pool: Vec<usize> = (0..len).collect();
    let mut out = Vec::with_capacity(n);
    for _ in 0..n {
        let idx = rng.int(0, pool.len() as i64 - 1) as usize;
        out.push(pool.remove(idx));
    }
    out
}

fn build_events(
    rng: &mut Rng,
    signals: &[Signal],
    signal_created_ms: &[i64],
    analysts: &[Analyst],
) -> Vec<TimelineEvent> {
    let mut events = Vec::with_capacity(COUNTS.events);
    for i in 0..COUNTS.events {
        let sig_idx = rng.int(0, signals.len() as i64 - 1) as usize;
        let kind = rng.weighted(&EVENT_TYPE_WEIGHTS);
        let actor = if rng.boolean(0.8) {
            rng.pick(analysts).name.clone()
        } else {
            "system".to_string()
        };
        let created_at = iso_between(rng, signal_created_ms[sig_idx], REFERENCE_NOW_MS);
        events.push(TimelineEvent {
            id: format_id("evt", i + 1, 5),
            signal_id: signals[sig_idx].id.0.clone(),
            kind,
            label: event_label(kind, &actor),
            actor,
            created_at,
        });
    }
    events
}

/// Build the whole coherent dataset from the fixed seed.
pub fn generate_all() -> Dataset {
    let mut rng = Rng::new(SEED);
    let analysts = build_analysts(&mut rng);
    let sources = build_sources(&mut rng);
    let (mut signals, created_ms) = build_signals(&mut rng, &analysts, &sources);
    let incidents = build_incidents(&mut rng, &mut signals, &analysts);
    let events = build_events(&mut rng, &signals, &created_ms, &analysts);
    Dataset {
        analysts,
        sources,
        signals,
        incidents,
        events,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_expected_volumes() {
        let ds = generate_all();
        assert_eq!(ds.signals.len(), 10_000);
        assert_eq!(ds.incidents.len(), 300);
        assert_eq!(ds.analysts.len(), 25);
        assert_eq!(ds.sources.len(), 12);
        assert_eq!(ds.events.len(), 50_000);
    }

    #[test]
    fn every_signal_has_a_risk_trend() {
        let ds = generate_all();
        assert!(ds.signals.iter().all(|s| s.risk_trend.is_some()));
    }

    #[test]
    fn ids_are_zero_padded() {
        let ds = generate_all();
        assert_eq!(ds.signals[0].id.0, "sig_00001");
        assert_eq!(ds.incidents[0].id, "inc_001");
    }
}
