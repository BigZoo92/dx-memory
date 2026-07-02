//! Generic pagination envelope, matching `Paginated<T>` in the shared TypeScript contract.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Paginated<T> {
    pub items: Vec<T>,
    pub page: usize,
    pub page_size: usize,
    pub total: usize,
    pub total_pages: usize,
}

impl<T> Paginated<T> {
    pub fn new(items: Vec<T>, page: usize, page_size: usize, total: usize) -> Paginated<T> {
        let total_pages = if total == 0 {
            0
        } else {
            total.div_ceil(page_size.max(1))
        };
        Paginated {
            items,
            page,
            page_size,
            total,
            total_pages,
        }
    }
}
