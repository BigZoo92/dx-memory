//! Query / filter / sort DTOs for `GET /api/signals`. Mirrors the required filter set from the
//! product contract: search, severity, status, source, assignedTo, dateFrom, dateTo, page,
//! pageSize, sortBy, sortDirection.

use serde::{Deserialize, Serialize};

pub const DEFAULT_PAGE_SIZE: usize = 50;
pub const MAX_PAGE_SIZE: usize = 200;
pub const UNASSIGNED: &str = "unassigned";

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignalsQuery {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub search: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub severity: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub assigned_to: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date_from: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub date_to: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub risk_trend: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub page_size: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_by: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sort_direction: Option<String>,
}

impl SignalsQuery {
    pub fn effective_page_size(&self) -> usize {
        self.page_size
            .unwrap_or(DEFAULT_PAGE_SIZE)
            .clamp(1, MAX_PAGE_SIZE)
    }

    pub fn effective_sort_by(&self) -> &str {
        self.sort_by.as_deref().unwrap_or("riskScore")
    }

    pub fn effective_sort_direction(&self) -> &str {
        self.sort_direction.as_deref().unwrap_or("desc")
    }
}
