//! Date/duration helpers for the read models. Duplicated here rather than shared with the fixtures
//! adapter, because read models must not depend on an adapter (clean-architecture direction rule).

/// `Date.parse('2026-06-29T12:00:00.000Z')`.
pub const REFERENCE_NOW_MS: i64 = 1_782_734_400_000;
pub const DAY_MS: i64 = 86_400_000;

const MINUTE_MS: i64 = 60_000;
const HOUR_MS: i64 = 60 * MINUTE_MS;

/// Parse an ISO-8601 `YYYY-MM-DDTHH:MM:SS.sssZ` timestamp to epoch milliseconds. Total on the shapes
/// our own fixtures produce; returns 0 on anything malformed.
pub fn iso_to_ms(iso: &str) -> i64 {
    let bytes = iso.as_bytes();
    if bytes.len() < 24 {
        return 0;
    }
    let n = |a: usize, b: usize| iso[a..b].parse::<i64>().unwrap_or(0);
    let year = n(0, 4);
    let month = n(5, 7);
    let day = n(8, 10);
    let hour = n(11, 13);
    let minute = n(14, 16);
    let second = n(17, 19);
    let millis = n(20, 23);
    let days = days_from_civil(year, month, day);
    days * DAY_MS + hour * HOUR_MS + minute * MINUTE_MS + second * 1000 + millis
}

fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400;
    let mp = if m > 2 { m - 3 } else { m + 9 };
    let doy = (153 * mp + 2) / 5 + d - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146_097 + doe - 719_468
}

pub fn start_of_utc_day(ms: i64) -> i64 {
    ms.div_euclid(DAY_MS) * DAY_MS
}

/// `YYYY-MM-DD` for the given epoch milliseconds (UTC).
pub fn iso_date(ms: i64) -> String {
    let days = ms.div_euclid(DAY_MS);
    let (y, m, d) = civil_from_days(days);
    format!("{y:04}-{m:02}-{d:02}")
}

fn civil_from_days(days: i64) -> (i64, i64, i64) {
    let z = days + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 } / 146_097;
    let doe = z - era * 146_097;
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = if m <= 2 { y + 1 } else { y };
    (year, m, d)
}

/// Format a duration the way the product does: `2d 3h`, `4h 12m`, `37m`, `0m`.
pub fn format_duration(ms: i64) -> String {
    if ms <= 0 {
        return "0m".to_string();
    }
    let days = ms / DAY_MS;
    let hours = (ms % DAY_MS) / HOUR_MS;
    let minutes = (ms % HOUR_MS) / MINUTE_MS;
    if days > 0 {
        if hours > 0 {
            format!("{days}d {hours}h")
        } else {
            format!("{days}d")
        }
    } else if hours > 0 {
        if minutes > 0 {
            format!("{hours}h {minutes}m")
        } else {
            format!("{hours}h")
        }
    } else {
        format!("{minutes}m")
    }
}
