//! Compare read model. Fabricates a deterministic before/after diff for a signal, matching the
//! reference UI's semantics.

use overfit_contracts::entities::TimelineEventDto;
use overfit_contracts::views::{
    CompareAttribute, CompareDelta, CompareImpactMetric, CompareResponse,
};
use overfit_domain::entities::{Analyst, Signal, TimelineEvent};
use overfit_domain::enums::{Severity, SignalStatus};
use overfit_domain::value_objects::Confidence;

use crate::wire::{severity_label, status_label};

fn severity_delta(before: Severity, after: Severity) -> CompareDelta {
    match after.rank().cmp(&before.rank()) {
        std::cmp::Ordering::Greater => CompareDelta::Bad,
        std::cmp::Ordering::Less => CompareDelta::Good,
        std::cmp::Ordering::Equal => CompareDelta::NoChange,
    }
}

fn risk_delta(before: i64, after: i64) -> CompareDelta {
    match after.cmp(&before) {
        std::cmp::Ordering::Greater => CompareDelta::Bad,
        std::cmp::Ordering::Less => CompareDelta::Good,
        std::cmp::Ordering::Equal => CompareDelta::NoChange,
    }
}

fn confidence_delta(before: Confidence, after: Confidence) -> CompareDelta {
    match after.order().cmp(&before.order()) {
        std::cmp::Ordering::Greater => CompareDelta::Good,
        std::cmp::Ordering::Less => CompareDelta::Bad,
        std::cmp::Ordering::Equal => CompareDelta::NoChange,
    }
}

fn assignment_delta(before: Option<&str>, after: Option<&str>) -> CompareDelta {
    if before == after {
        return CompareDelta::NoChange;
    }
    match (before, after) {
        (None, Some(_)) => CompareDelta::Good,
        (Some(_), None) => CompareDelta::Bad,
        _ => CompareDelta::Neutral,
    }
}

fn attr(label: &str, before: String, after: String, delta: CompareDelta) -> CompareAttribute {
    CompareAttribute {
        attribute: label.to_string(),
        changed: before != after,
        before,
        after,
        delta,
    }
}

pub fn build_compare(
    signal: &Signal,
    analysts: &[Analyst],
    events_for_signal: &[&TimelineEvent],
) -> CompareResponse {
    let analyst_name = |id: Option<&str>| -> String {
        match id {
            None => "Unassigned".to_string(),
            Some(aid) => analysts
                .iter()
                .find(|a| a.id == aid)
                .map(|a| a.name.clone())
                .unwrap_or_else(|| aid.to_string()),
        }
    };

    let before_severity = signal.severity.prior();
    let before_risk = (signal.risk_score.get() as i64 - 13).max(0);
    let after_recommended = if signal.severity == Severity::Critical {
        "Escalate to incident"
    } else {
        "Review before escalation"
    };

    let attributes = vec![
        attr(
            "Severity",
            severity_label(before_severity).to_string(),
            severity_label(signal.severity).to_string(),
            severity_delta(before_severity, signal.severity),
        ),
        attr(
            "Status",
            "New".to_string(),
            status_label(signal.status).to_string(),
            if signal.status == SignalStatus::New {
                CompareDelta::NoChange
            } else {
                CompareDelta::Neutral
            },
        ),
        attr(
            "Risk score",
            before_risk.to_string(),
            signal.risk_score.get().to_string(),
            risk_delta(before_risk, signal.risk_score.get() as i64),
        ),
        attr(
            "Confidence",
            signal.confidence.label().to_string(),
            signal.confidence.label().to_string(),
            confidence_delta(signal.confidence, signal.confidence),
        ),
        attr(
            "Assigned to",
            "Unassigned".to_string(),
            analyst_name(signal.assigned_to.as_deref()),
            assignment_delta(None, signal.assigned_to.as_deref()),
        ),
        attr(
            "Recommended action",
            "Monitor for 24h".to_string(),
            after_recommended.to_string(),
            CompareDelta::Neutral,
        ),
    ];

    let timeline: Vec<TimelineEventDto> = events_for_signal
        .iter()
        .take(6)
        .map(|e| TimelineEventDto::from(*e))
        .collect();

    CompareResponse {
        signal_id: signal.id.0.clone(),
        attributes,
        timeline,
        impact_sentence: "This change reduces qualification time but increases review scope."
            .to_string(),
        impact_metrics: vec![
            CompareImpactMetric {
                label: "Qualification time".to_string(),
                delta: CompareDelta::Good,
                value: "\u{2212}22%".to_string(),
            },
            CompareImpactMetric {
                label: "Review scope".to_string(),
                delta: CompareDelta::Bad,
                value: "+3 signals".to_string(),
            },
            CompareImpactMetric {
                label: "Time to escalate".to_string(),
                delta: CompareDelta::Good,
                value: "\u{2212}14m".to_string(),
            },
        ],
    }
}
