//! Integration coverage for the Overfit API surface, exercised through the application layer
//! (the same object the Axum handlers call). Covers every required endpoint plus the key technical
//! ones.

use overfit_application::Application;
use overfit_contracts::query::SignalsQuery;
use overfit_test_support::booted_app;

#[test]
fn health_reports_overfit_variant() {
    let app = booted_app();
    let h = app.health();
    assert_eq!(h.status, "ok");
    assert_eq!(h.variant, "Variant C \u{2014} Overfit");
}

#[test]
fn list_signals_returns_10k_and_first_page() {
    let app = booted_app();
    let page = app.signals(&SignalsQuery::default());
    assert_eq!(page.total, 10_000);
    assert_eq!(page.page, 1);
    assert_eq!(page.page_size, 50);
    assert_eq!(page.items.len(), 50);
    assert!(page.items.iter().all(|s| s.risk_trend.is_some()));
}

#[test]
fn get_signal_and_events() {
    let app = booted_app();
    let detail = app.signal_detail("sig_00001").expect("signal exists");
    assert_eq!(detail.signal.id, "sig_00001");
    let events = app.signal_events("sig_00001").expect("events ok");
    // chronological order
    let sorted = {
        let mut v = events.clone();
        v.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        v
    };
    assert_eq!(events, sorted);
}

#[test]
fn incidents_dashboard_compare_dx() {
    let app = booted_app();
    let incidents = app.incidents(&Default::default());
    assert_eq!(incidents.total, 300);

    let dash = app.dashboard_summary();
    assert_eq!(dash.severity_breakdown.len(), 4);
    assert_eq!(
        dash.most_critical_signals.len().min(8),
        dash.most_critical_signals.len()
    );

    let cmp = app.compare("sig_00001").expect("compare ok");
    assert_eq!(cmp.attributes.len(), 6);

    let dx = app.dx_metrics();
    assert_eq!(dx.metrics.len(), 3);
    assert_eq!(dx.current, "overfit");
    assert_eq!(dx.source, "seed");
}

#[test]
fn logs_simulate_schema_and_policy() {
    let app: Application = booted_app();
    // simulate-error
    let err = app.simulate_error();
    assert_eq!(err.code, "simulated_error");

    // logs POST then GET
    let ack = app.logs_post(serde_json::json!({ "level": "warn", "message": "client breadcrumb" }));
    assert_eq!(ack["accepted"], true);
    assert!(!app.logs_get().is_empty());

    // schema registry
    let reg = app.schema_registry();
    assert_eq!(reg["entryCount"], 20);

    // policy check
    let dec = app.policy_check(serde_json::json!({
        "policy": "route_access",
        "input": { "method": "GET", "route": "/api/signals" }
    }));
    assert_eq!(dec["allowed"], true);
}

#[test]
fn risk_trend_filter_and_search() {
    let app = booted_app();
    for trend in ["up", "stable", "down"] {
        let q = SignalsQuery {
            risk_trend: Some(trend.to_string()),
            ..Default::default()
        };
        let page = app.signals(&q);
        assert!(page.total > 0, "expected some signals with trend {trend}");
    }
}
