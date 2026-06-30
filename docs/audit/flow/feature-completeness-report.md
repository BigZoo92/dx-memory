# Flow v2 — feature completeness report

Per-screen audit of every visible control: ✅ functional, 🟡 functional but local/optimistic
(read-only dataset — by design), ⚪️ intentionally static mock (labeled in the UI), ⛔️ explicitly
disabled with a visible reason.

> Dataset is read-only (the shared deterministic fixtures). "Local/optimistic" means the action has
> a real, visible UI effect (state changes, banners, downloads) but is not persisted server-side —
> matching the reference's demo behavior. **No silent decorative buttons remain.**

## `/` Overview (`flow-feature-dashboard`)

| Control                         | Status | Notes                                                                            |
| ------------------------------- | ------ | -------------------------------------------------------------------------------- |
| Export                          | ✅     | Downloads `signalops-overview.json` (KPIs + critical signals + recent incidents) |
| Refresh                         | ✅     | `query.refetch()`, disabled while fetching                                       |
| Critical signal row → detail    | ✅     | `Link` to `/signals/$id`                                                         |
| Recent incident row → incidents | ✅     | `Link` to `/incidents` (added this pass)                                         |
| AI recommendation card          | ⚪️     | Static mock, labelled                                                            |
| loading / empty / error states  | ✅     | via `QueryState`                                                                 |

Tests: `export.test.ts` (`dashboardToJson`).

## `/signals` Signals Explorer (`flow-feature-signals`)

| Control                                 | Status | Notes                                                                              |
| --------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| Search                                  | ✅     | URL-backed, server-filtered                                                        |
| Severity/Status/Source/Assignee filters | ✅     | URL-backed, server-filtered                                                        |
| Date range                              | ✅     | URL-backed                                                                         |
| Reset filters                           | ✅     | clears the URL search                                                              |
| Sort (severity, risk)                   | ✅     | server-side sort via TanStack Table header                                         |
| Pagination (prev/next)                  | ✅     | server-paged                                                                       |
| Virtualized rendering                   | ✅     | TanStack Virtual — smooth over 10k rows                                            |
| Multi-select                            | ✅     | row + select-all checkboxes                                                        |
| **Assign selected**                     | 🟡     | sets assignee override → **the table's Assigned cells update** + banner            |
| **Mark as triaged**                     | 🟡     | sets status override → **the StatusBadge of each row flips to "triaged"** + banner |
| Row View → detail                       | ✅     | `Link`                                                                             |
| Linked incident → incidents             | ✅     | `Link`                                                                             |
| empty / error / loading                 | ✅     | empty offers Reset; error shows requestId + retry                                  |
| slow network / API error                | ✅     | driven from Settings demo controls (real effect)                                   |

Tests: `client.test.ts` (forced-error + slow-network client behavior), Settings toggle tests.
Limit: bulk actions are local/optimistic (read-only dataset) — not unit-tested at the component
level because rendering the table needs a TanStack Router provider (documented limitation).

## `/signals/:id` Signal Detail (`flow-feature-signal-detail`)

| Control         | Status | Notes                                                                       |
| --------------- | ------ | --------------------------------------------------------------------------- |
| Assign          | 🟡     | sets local assignee (`analyst-001`) → "Assigned to …" tile updates + banner |
| Change status   | 🟡     | cycles the lifecycle → StatusBadge updates + banner                         |
| Escalate        | 🟡     | status → `investigating` + danger banner; disabled when resolved            |
| Resolve         | 🟡     | status → `resolved` + success banner; disables Escalate/Resolve             |
| Timeline        | ✅     | rendered; **partial-error** state with retry on events failure              |
| Linked incident | ✅     | shown, or "Not linked" empty state                                          |
| Confidence null | ✅     | "Unavailable" + explicit "Confidence unavailable." detail card              |
| Not found       | ✅     | `QueryState errorTitle="Signal not found"`                                  |

Tests: covered by `QueryState` tests + domain `normalizeConfidence`/`confidence` tests.

## `/incidents` Incidents (`flow-feature-incidents`)

| Control                            | Status | Notes                                      |
| ---------------------------------- | ------ | ------------------------------------------ |
| Status / Severity / Impact filters | ✅     | client-side over the full incident set     |
| Reset                              | ✅     | clears all three filters (added this pass) |
| Linked signals → explorer          | ✅     | `Link` to `/signals` (added this pass)     |
| Summary KPIs                       | ✅     | computed in `flow-domain`                  |
| Resolution status / "open for"     | ✅     | visible per row                            |
| empty / loading / error            | ✅     | via `QueryState`                           |

Limit: the per-row "New incident" CTA from the spec is **not rendered** (it would be a no-op on a
read-only dataset) — omitted rather than shown decoratively.

## `/compare` Compare (`flow-feature-compare`)

| Control           | Status | Notes                                              |
| ----------------- | ------ | -------------------------------------------------- |
| Signal selector   | ✅     | defaults to highest-risk signal, switches the diff |
| Re-run            | ✅     | `compare.refetch()`                                |
| Before/after diff | ✅     | updates per selected signal                        |
| Deltas / chips    | ✅     | good/bad/neutral chips                             |
| User impact       | ✅     | sentence + metric rows                             |
| Change timeline   | ✅     | rendered                                           |

## `/dx-metrics` DX Metrics (`flow-feature-dx-metrics`)

| Control                 | Status | Notes                                 |
| ----------------------- | ------ | ------------------------------------- | -------------------------------------- |
| Export CSV              | ✅     | `signalops-dx-metrics.csv`            |
| Export JSON             | ✅     | `signalops-dx-metrics.json`           |
| Build/Ship/Run/Change   | ✅     | derived in `flow-domain`              |
| Variant comparison bars | ✅     | A/B/C, current highlighted            |
| AI task result          | ✅     | outcome chip + sentence               |
| Bundle & performance    | ✅     | from the metrics response             |
| Full metrics table      | ✅     | best-per-row + current column tinted  |
| seed vs collected       | ✅     | `source: seed                         | collected` shown in the section header |
| CI history              | ⚪️     | static demo data, clearly a demo list |

Tests: `export.test.ts` (`dxMetricsToCsv`, `dxMetricsToJson`).

## `/settings` Settings (`flow-feature-settings`)

| Control                    | Status | Notes                                                                                                                                                            |
| -------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API status                 | ✅     | live from `/api/health`                                                                                                                                          |
| Dataset / variant / region | ✅     | from the app `variant` config (passed as a prop)                                                                                                                 |
| Feature-flag toggles       | 🟡     | real local toggle state (demo flags; do not alter behavior)                                                                                                      |
| **Simulate API error**     | ✅     | flips a client demo control → **every data widget shows the partial-error state**; button becomes "Stop API error"; `/api/health` stays up so the shell survives |
| **Simulate slow network**  | ✅     | flips a client demo control → **all requests delayed ~3s** (loading states show)                                                                                 |
| **Reset demo state**       | ✅     | clears both controls + flags, invalidates the cache, confirms                                                                                                    |

Tests: `SettingsScreen.test.tsx` (renders environment block; "Simulate API error" toggles control +
banner; "Reset demo state" clears + confirms).

## Cross-cutting

- **Variant badge** — the single visible difference, driven by one config value (`VARIANT`), shown
  in the sidebar + settings.
- **8 async UI states** — loading, empty, partial-error, global-error, slow-network, invalid-data
  (confidence), not-found, unauthorized envelope — all reachable (slow-network + global-error now
  triggerable live from Settings).

## Remaining limits (honest)

1. Mutations (assign / status / bulk) are **local/optimistic** — the dataset is read-only by
   contract; effects are visible but not persisted.
2. The Signals bulk-action and Signal-detail action **component** tests are not present because
   rendering those screens requires a TanStack Router test harness (`Link`/route context); the
   underlying logic and the data-layer behavior (`client.test.ts`) and Settings interactions are
   tested.
3. "New incident" CTA and per-row incident actions from the spec are omitted (no-ops on a read-only
   dataset) rather than rendered as decorative buttons.
4. CI history and the AI cards are intentionally static demo content (labelled).
