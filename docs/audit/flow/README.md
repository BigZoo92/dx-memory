# Flow audit artifacts (generated — not versioned)

This directory is a local sink for **generated** Flow audit artifacts. Everything here except this
README is git-ignored and safe to delete; regenerate it on demand:

| Artifact | Regenerate with |
| --- | --- |
| `bundle-stats.after.{html,json,md}` | `pnpm analyze:flow` |
| `pa11y-results.json`, `a11y-debug.log`, `accessibility-report.md` | `pnpm flow:a11y` |

Canonical Flow documentation lives in [`docs/flow/`](../../flow/README.md). Do not commit reports or
metrics results here — a dedicated metrics-collection pass will handle cross-variant results later.
