//! Value objects. Small wrappers that would be plain fields in a leaner design; here they carry
//! their own invariants so the domain cannot represent an illegal state.

use serde::{Deserialize, Serialize};

/// A bounded risk score in the inclusive range 0..=100.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct RiskScore(u8);

impl RiskScore {
    pub const MIN: u8 = 0;
    pub const MAX: u8 = 100;

    /// Clamp any integer into the valid range. Total by construction.
    pub fn new(value: i64) -> RiskScore {
        let clamped = value.clamp(Self::MIN as i64, Self::MAX as i64);
        RiskScore(clamped as u8)
    }

    pub fn get(self) -> u8 {
        self.0
    }
}

/// Optional model confidence in [0.0, 1.0]. `None` maps to the "Unavailable" UI band.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct Confidence(Option<f64>);

impl Confidence {
    pub fn some(value: f64) -> Confidence {
        Confidence(Some(value.clamp(0.0, 1.0)))
    }

    pub fn unavailable() -> Confidence {
        Confidence(None)
    }

    pub fn from_option(value: Option<f64>) -> Confidence {
        match value {
            Some(v) => Confidence::some(v),
            None => Confidence::unavailable(),
        }
    }

    pub fn value(self) -> Option<f64> {
        self.0
    }

    /// Human band, matching the shared product spec (thresholds 0.66 / 0.33).
    pub fn label(self) -> &'static str {
        match self.0 {
            None => "Unavailable",
            Some(c) if c >= 0.66 => "High",
            Some(c) if c >= 0.33 => "Medium",
            Some(_) => "Low",
        }
    }

    /// Ordering used by the compare read model (Unavailable < Low < Medium < High).
    pub fn order(self) -> i8 {
        match self.label() {
            "High" => 2,
            "Medium" => 1,
            "Low" => 0,
            _ => -1,
        }
    }

    pub fn percent(self) -> u8 {
        match self.0 {
            Some(c) => (c.clamp(0.0, 1.0) * 100.0).round() as u8,
            None => 0,
        }
    }
}

/// A typed signal identifier (`sig_00001`). Newtype so an incident id can never be passed where a
/// signal id is expected.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SignalId(pub String);

impl SignalId {
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl std::fmt::Display for SignalId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
