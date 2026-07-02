//! Minimal UTC millisecond -> ISO-8601 formatter, so the fixtures crate has no `chrono`/`time`
//! dependency. Uses Howard Hinnant's civil-from-days algorithm.

/// `Date.parse('2026-06-29T12:00:00.000Z')` — the fixed dataset anchor.
pub const REFERENCE_NOW_MS: i64 = 1_782_734_400_000;
pub const DAY_MS: i64 = 86_400_000;
pub const WINDOW_DAYS: i64 = 90;

/// Format epoch milliseconds as `YYYY-MM-DDTHH:MM:SS.sssZ` (UTC), matching `new Date(ms).toISOString()`.
pub fn ms_to_iso(ms: i64) -> String {
    let secs = ms.div_euclid(1000);
    let millis = ms.rem_euclid(1000);
    let days = secs.div_euclid(86_400);
    let rem = secs.rem_euclid(86_400);
    let hours = rem / 3600;
    let minutes = (rem % 3600) / 60;
    let seconds = rem % 60;

    let (year, month, day) = civil_from_days(days);
    format!("{year:04}-{month:02}-{day:02}T{hours:02}:{minutes:02}:{seconds:02}.{millis:03}Z")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097; // [0, 146096]
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365; // [0, 399]
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100); // [0, 365]
    let mp = (5 * doy + 2) / 153; // [0, 11]
    let d = doy - (153 * mp + 2) / 5 + 1; // [1, 31]
    let m = if mp < 10 { mp + 3 } else { mp - 9 }; // [1, 12]
    let year = if m <= 2 { y + 1 } else { y };
    (year, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reference_now_formats_correctly() {
        assert_eq!(ms_to_iso(REFERENCE_NOW_MS), "2026-06-29T12:00:00.000Z");
    }

    #[test]
    fn epoch_formats_correctly() {
        assert_eq!(ms_to_iso(0), "1970-01-01T00:00:00.000Z");
    }
}
