//! # overfit-adapters-http
//!
//! The HTTP adapter. Builds the Axum `Router`, extracts/validates query params, calls the
//! application service, and maps the `ApiError` envelope to the right status. It contains no domain
//! or query logic — that all lives behind `overfit-application`.

use std::sync::Arc;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use tower_http::cors::CorsLayer;

use overfit_application::Application;
use overfit_contracts::query::SignalsQuery;
use overfit_contracts::ApiError;
use overfit_read_models::IncidentsQuery;

pub type AppState = Arc<Application>;

/// ApiError plus a resolved HTTP status.
struct AppError(StatusCode, ApiError);

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        (self.0, Json(self.1)).into_response()
    }
}

fn map_error(e: ApiError) -> AppError {
    let status = match e.code.as_str() {
        "not_found" => StatusCode::NOT_FOUND,
        "simulated_error" => StatusCode::INTERNAL_SERVER_ERROR,
        _ => StatusCode::BAD_REQUEST,
    };
    AppError(status, e)
}

/// Build the full router. Mounted at the root; every route is under `/api`.
pub fn router(app: AppState) -> Router {
    Router::new()
        // required product endpoints
        .route("/api/health", get(health))
        .route("/api/signals", get(signals))
        .route("/api/signals/:id", get(signal_detail))
        .route("/api/signals/:id/events", get(signal_events))
        .route("/api/incidents", get(incidents))
        .route("/api/dashboard/summary", get(dashboard_summary))
        .route("/api/compare/:id", get(compare))
        .route("/api/dx-metrics", get(dx_metrics))
        .route("/api/simulate-error", post(simulate_error))
        .route("/api/logs", get(logs_get).post(logs_post))
        // technical / observability endpoints (Overfit)
        .route("/api/health/deep", get(health_deep))
        .route("/api/health/dependencies", get(health_dependencies))
        .route("/api/telemetry/traces", get(telemetry_traces))
        .route("/api/telemetry/metrics", get(telemetry_metrics))
        .route("/api/audit-events", get(audit_events))
        .route("/api/schema-registry", get(schema_registry))
        .route("/api/feature-flags", get(feature_flags))
        .route("/api/policy/check", post(policy_check))
        .route("/api/diagnostic-pack", get(diagnostic_pack))
        .layer(CorsLayer::permissive())
        .with_state(app)
}

// ---- required product handlers ---------------------------------------------

async fn health(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.health())
}

async fn signals(State(app): State<AppState>, Query(q): Query<SignalsQuery>) -> impl IntoResponse {
    Json(app.signals(&q))
}

async fn signal_detail(
    State(app): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    app.signal_detail(&id).map(Json).map_err(map_error)
}

async fn signal_events(
    State(app): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    app.signal_events(&id).map(Json).map_err(map_error)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IncidentsParams {
    status: Option<String>,
    severity: Option<String>,
    impact: Option<String>,
    page: Option<usize>,
    page_size: Option<usize>,
}

async fn incidents(
    State(app): State<AppState>,
    Query(p): Query<IncidentsParams>,
) -> impl IntoResponse {
    let q = IncidentsQuery {
        status: p.status,
        severity: p.severity,
        impact: p.impact,
        page: p.page,
        page_size: p.page_size,
    };
    Json(app.incidents(&q))
}

async fn dashboard_summary(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.dashboard_summary())
}

async fn compare(
    State(app): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    app.compare(&id).map(Json).map_err(map_error)
}

async fn dx_metrics(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.dx_metrics())
}

async fn simulate_error(State(app): State<AppState>) -> AppError {
    map_error(app.simulate_error())
}

async fn logs_get(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.logs_get())
}

async fn logs_post(
    State(app): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    (StatusCode::CREATED, Json(app.logs_post(body)))
}

// ---- technical handlers ----------------------------------------------------

async fn health_deep(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.health_deep())
}

async fn health_dependencies(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.health_dependencies())
}

async fn telemetry_traces(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.telemetry_traces())
}

async fn telemetry_metrics(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.telemetry_metrics())
}

async fn audit_events(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.audit_events())
}

async fn schema_registry(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.schema_registry())
}

async fn feature_flags(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.feature_flags())
}

async fn policy_check(
    State(app): State<AppState>,
    Json(body): Json<serde_json::Value>,
) -> impl IntoResponse {
    Json(app.policy_check(body))
}

async fn diagnostic_pack(State(app): State<AppState>) -> impl IntoResponse {
    Json(app.diagnostic_pack())
}
