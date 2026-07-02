//! SignalOps Overfit API binary.
//!
//! Intentionally tiny: all it does is delegate to `bootstrap::run`. Routing lives in
//! `overfit-adapters-http`, orchestration in `overfit-application`, and each concern (domain,
//! contracts, events, read models, observability, policies, ...) in its own crate. The over-
//! decomposition is the point of Variant C.

mod bootstrap;

#[tokio::main]
async fn main() {
    bootstrap::run().await;
}
