//! DX metrics read model. Serves the shared seed table for all three variants, with `current` set
//! to `overfit`. These are transcribed demo numbers, not measurements (see the measurement
//! protocol) — the response marks them `seed`.

use overfit_contracts::views::{DxMetric, DxMetricsResponse};

fn metric(variant: &str, v: [i64; 14], ai_task_result: &str) -> DxMetric {
    DxMetric {
        variant: variant.to_string(),
        install_time_ms: v[0],
        typecheck_time_ms: v[1],
        test_time_ms: v[2],
        build_time_ms: v[3],
        docker_build_time_ms: v[4],
        ci_duration_ms: v[5],
        bundle_size_kb: v[6],
        main_chunk_size_kb: v[7],
        lighthouse_performance: v[8],
        table_render_time_ms: v[9],
        files_touched_for_ai_task: v[10],
        tests_impacted: v[11],
        error_reproduction_steps: v[12],
        docs_pages_needed: v[13],
        ai_task_result: ai_task_result.to_string(),
    }
}

/// The seed DX metrics for all three variants (shared across the lab).
pub fn dx_metrics_seed() -> Vec<DxMetric> {
    vec![
        metric(
            "friction",
            [
                48_000, 19_000, 160_000, 72_000, 250_000, 560_000, 412, 287, 71, 480, 23, 48, 7, 5,
            ],
            "partial",
        ),
        metric(
            "flow",
            [
                22_000, 8_000, 54_000, 38_000, 110_000, 220_000, 198, 121, 94, 120, 6, 9, 2, 1,
            ],
            "success",
        ),
        metric(
            "overfit",
            [
                31_000, 12_000, 98_000, 26_000, 125_000, 310_000, 164, 96, 97, 90, 41, 72, 9, 8,
            ],
            "partial",
        ),
    ]
}

/// `GET /api/dx-metrics` for the Overfit variant.
pub fn dx_metrics_response() -> DxMetricsResponse {
    DxMetricsResponse {
        metrics: dx_metrics_seed(),
        current: "overfit".to_string(),
        source: "seed".to_string(),
    }
}
