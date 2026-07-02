//! # overfit-commands
//!
//! The write side of CQRS. The demo dataset is read-only, so the only commands that actually run
//! are `SimulateError` (the controlled fault endpoint) and `RecordAuditEvent`. They still go through
//! the full command -> validate -> handle ceremony, and the risk-trend command exists to model the
//! AI-task write path even though the trend is derived at generation time.

use serde::{Deserialize, Serialize};
use thiserror::Error;

use overfit_domain::value_objects::SignalId;

#[derive(Debug, Clone, PartialEq, Eq, Error)]
pub enum CommandError {
    #[error("command validation failed: {0}")]
    Invalid(String),
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "command", rename_all = "PascalCase")]
pub enum Command {
    /// Deliberately fail, so the frontend can exercise its error state.
    SimulateError,
    /// Recompute a signal's risk trend (AI-task write path).
    RecomputeRiskTrend { signal_id: SignalId },
    /// Append an audit event.
    RecordAuditEvent {
        action: String,
        resource: String,
        actor: String,
    },
}

pub trait Validate {
    fn validate(&self) -> Result<(), CommandError>;
}

impl Validate for Command {
    fn validate(&self) -> Result<(), CommandError> {
        match self {
            Command::SimulateError => Ok(()),
            Command::RecomputeRiskTrend { signal_id } => {
                if signal_id.0.is_empty() {
                    Err(CommandError::Invalid("signal_id must not be empty".into()))
                } else {
                    Ok(())
                }
            }
            Command::RecordAuditEvent { action, .. } => {
                if action.trim().is_empty() {
                    Err(CommandError::Invalid("action must not be empty".into()))
                } else {
                    Ok(())
                }
            }
        }
    }
}

/// The controlled fault produced by `POST /api/simulate-error`. The application layer maps this to
/// the `ApiError` envelope with a 500 status.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SimulatedFault {
    pub code: &'static str,
    pub message: &'static str,
}

impl SimulatedFault {
    pub fn new() -> SimulatedFault {
        SimulatedFault {
            code: "simulated_error",
            message: "Simulated API error \u{2014} widgets now show a partial-error state.",
        }
    }
}

impl Default for SimulatedFault {
    fn default() -> Self {
        SimulatedFault::new()
    }
}

/// A handler that consumes a command and produces an output. Implemented by the application layer.
pub trait CommandHandler {
    type Output;
    fn handle(&self, command: Command) -> Result<Self::Output, CommandError>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_action_is_invalid() {
        let c = Command::RecordAuditEvent {
            action: "".into(),
            resource: "/x".into(),
            actor: "system".into(),
        };
        assert!(c.validate().is_err());
    }

    #[test]
    fn simulate_error_validates() {
        assert!(Command::SimulateError.validate().is_ok());
    }
}
