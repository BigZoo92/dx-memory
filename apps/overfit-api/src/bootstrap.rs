//! Boot sequence: init tracing, generate the dataset + seed the event store (inside
//! `Application::bootstrap`), mount the router, expose the OpenAPI document, and serve.

use std::sync::Arc;

use axum::{response::IntoResponse, routing::get, Router};

use overfit_application::Application;

/// The maintained OpenAPI document (see ADR-0003). Embedded at compile time and served at
/// `/api/openapi.json`.
const OPENAPI_JSON: &str = include_str!("../../../generated/overfit/openapi.json");

pub async fn run() {
    init_tracing();

    tracing::info!("overfit-api: generating deterministic fixtures + seeding event store");
    let app = Arc::new(Application::bootstrap());

    let router = overfit_adapters_http::router(app).merge(openapi_router());

    let port = std::env::var("OVERFIT_API_PORT")
        .ok()
        .and_then(|v| v.parse::<u16>().ok())
        .unwrap_or(3200);

    let addr = format!("0.0.0.0:{port}");
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|e| panic!("failed to bind {addr}: {e}"));

    tracing::info!("overfit-api listening on http://{addr} (variant C - overfit)");
    axum::serve(listener, router).await.expect("server error");
}

fn openapi_router() -> Router {
    Router::new().route("/api/openapi.json", get(openapi))
}

async fn openapi() -> impl IntoResponse {
    ([("content-type", "application/json")], OPENAPI_JSON)
}

fn init_tracing() {
    use tracing_subscriber::{fmt, EnvFilter};
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    // JSON logs — structured by default in Overfit, even locally.
    let _ = fmt().with_env_filter(filter).with_target(false).try_init();
}
