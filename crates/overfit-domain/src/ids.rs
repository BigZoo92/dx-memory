//! Deterministic id formatting shared by the fixtures adapter. `sig_00001`, `inc_001`, etc.

pub fn format_id(prefix: &str, index: usize, width: usize) -> String {
    format!("{prefix}_{index:0width$}", index = index, width = width)
}
