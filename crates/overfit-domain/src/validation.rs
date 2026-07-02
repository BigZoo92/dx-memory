//! Domain-level validation and the domain error type.

use thiserror::Error;

use crate::entities::Signal;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum DomainError {
    #[error("invalid transition `{what}`: {reason}")]
    InvalidTransition {
        what: &'static str,
        reason: &'static str,
    },
    #[error("invariant violated: {0}")]
    Invariant(&'static str),
}

/// Structural invariants a `Signal` must satisfy. Called by the fixtures adapter after generation
/// so a malformed dataset fails fast rather than reaching the UI.
pub fn check_signal_invariants(signal: &Signal) -> Result<(), DomainError> {
    if signal.id.0.is_empty() {
        return Err(DomainError::Invariant("signal id must not be empty"));
    }
    if signal.title.trim().is_empty() {
        return Err(DomainError::Invariant("signal title must not be empty"));
    }
    // RiskScore is a value object bounded by construction, so no range check is needed here —
    // which is precisely the point of the value object.
    Ok(())
}
