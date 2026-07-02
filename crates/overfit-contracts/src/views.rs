//! View / response DTOs for the aggregate endpoints: dashboard summary, compare, DX metrics and
//! health. These match the shared TypeScript contract field-for-field. The read-model layer
//! (`overfit-read-models`) computes them; this crate only defines the wire shape.

use serde::{Deserialize, Serialize};

use crate::entities::{IncidentDto, SignalDto, TimelineEventDto};

// ---- dashboard --------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SummaryKpi {
    pub label: String,
    pub value: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display: Option<String>,
    /// "up" | "down" | "flat"
    pub trend: String,
    pub trend_label: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardKpis {
    pub open_signals: SummaryKpi,
    pub critical_signals: SummaryKpi,
    pub active_incidents: SummaryKpi,
    pub avg_qualification_time_ms: SummaryKpi,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SeverityBreakdownEntry {
    /// "low" | "medium" | "high" | "critical"
    pub severity: String,
    pub count: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SignalsOverTimePoint {
    pub date: String,
    pub total: i64,
    pub critical: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ServiceStatus {
    pub name: String,
    /// "operational" | "degraded" | "down"
    pub status: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardSummary {
    pub kpis: DashboardKpis,
    pub severity_breakdown: Vec<SeverityBreakdownEntry>,
    pub signals_over_time: Vec<SignalsOverTimePoint>,
    pub most_critical_signals: Vec<SignalDto>,
    pub system_status: Vec<ServiceStatus>,
    pub recent_incidents: Vec<IncidentDto>,
}

// ---- compare ----------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CompareDelta {
    Good,
    Bad,
    Neutral,
    NoChange,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompareAttribute {
    pub attribute: String,
    pub before: String,
    pub after: String,
    pub changed: bool,
    pub delta: CompareDelta,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CompareImpactMetric {
    pub label: String,
    pub delta: CompareDelta,
    pub value: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareResponse {
    pub signal_id: String,
    pub attributes: Vec<CompareAttribute>,
    pub timeline: Vec<TimelineEventDto>,
    pub impact_sentence: String,
    pub impact_metrics: Vec<CompareImpactMetric>,
}

// ---- dx metrics -------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DxMetric {
    /// "friction" | "flow" | "overfit"
    pub variant: String,
    pub install_time_ms: i64,
    pub typecheck_time_ms: i64,
    pub test_time_ms: i64,
    pub build_time_ms: i64,
    pub docker_build_time_ms: i64,
    pub ci_duration_ms: i64,
    pub bundle_size_kb: i64,
    pub main_chunk_size_kb: i64,
    pub lighthouse_performance: i64,
    pub table_render_time_ms: i64,
    pub files_touched_for_ai_task: i64,
    pub tests_impacted: i64,
    pub error_reproduction_steps: i64,
    pub docs_pages_needed: i64,
    /// "success" | "partial" | "failed"
    pub ai_task_result: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DxMetricsResponse {
    pub metrics: Vec<DxMetric>,
    /// "friction" | "flow" | "overfit"
    pub current: String,
    /// "collected" | "seed"
    pub source: String,
}

// ---- health -----------------------------------------------------------------

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthResponse {
    /// "ok" | "degraded" | "down"
    pub status: String,
    pub version: String,
    pub variant: String,
    pub dataset_version: String,
    pub uptime_seconds: u64,
}
