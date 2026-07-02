//! The `ApiError` envelope — byte-identical across all three variants.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
    #[serde(rename = "requestId")]
    pub request_id: String,
}

impl ApiError {
    pub fn new(code: &str, message: impl Into<String>, request_id: impl Into<String>) -> ApiError {
        ApiError {
            code: code.to_string(),
            message: message.into(),
            details: None,
            request_id: request_id.into(),
        }
    }

    pub fn not_found(entity: &str, id: &str, request_id: impl Into<String>) -> ApiError {
        ApiError::new(
            "not_found",
            format!("{entity} {id} was not found"),
            request_id,
        )
    }

    pub fn with_details(mut self, details: serde_json::Value) -> ApiError {
        self.details = Some(details);
        self
    }
}
