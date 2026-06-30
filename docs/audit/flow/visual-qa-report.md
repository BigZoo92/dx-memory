# Flow v2 — Visual QA report

Pure UI-polish pass on **Variant B — Flow**. No business logic, no Effect TS, no
architecture / boundary / route / data / endpoint changes. Goal: the app must be clean and
demo-ready on desktop, laptop (1440), tablet and mobile, with `/signals` as the priority.

Method: code-level audit of `apps/flow-app/src` + `packages/flow/*` against
`maquettes/SignalOps-UI-Spec.md`, `docs/product/01-design-spec.md` and the reference
screenshots in `maquettes/screenshots/`.

Status legend: ✅ fixed · ➖ no change needed · ⏳ known limitation.

---

## A. Signals Explorer `/signals` — PRIORITY

| #   | Bug                                                               | Probable cause                                                                                                                                                                                  | File                                                          | Fix                                                                                                                                                              | Status |
| --- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| A1  | Virtualized rows **overlap**                                      | `useVirtualizer` `estimateSize: () => 48` but rows are absolutely positioned with **no fixed height**; real content height (~64–80px) > 48px positioning step → rows stack on top of each other | `feature-signals/SignalsTable.tsx`, `SignalsTable.module.css` | Single source of truth `ROW_HEIGHT = 64`; `estimateSize` + inline `height` + `.row { height }` all derive from it                                                | ✅     |
| A2  | **Title column too narrow**, text breaks vertically               | Grid `40px 1.6fr 104px …` — the 10 fixed columns sum to ~1070px so `1.6fr` collapses to ~10–70px; grid items had no `min-width: 0` so nothing could ellipsize                                   | `SignalsTable.module.css`                                     | Re-balanced track sizes, `title = minmax(260px, 2.2fr)`, raised `.grid` min-width to the real column sum (1384px), added `min-width: 0` to cells                 | ✅     |
| A3  | Inconsistent virtual row height / layout shift on scroll          | Same root cause as A1 (estimate ≠ real height)                                                                                                                                                  | `SignalsTable.tsx`                                            | Fixed row height = exact estimate → zero drift                                                                                                                   | ✅     |
| A4  | Title wraps to many lines / "texte vertical"                      | `.title { white-space: normal }` with a too-narrow column and no line clamp                                                                                                                     | `SignalsTable.module.css`                                     | `-webkit-line-clamp: 2` + `overflow: hidden`; id on its own line; title cell is a centered flex column                                                           | ✅     |
| A5  | Cells / checkbox not vertically centered with a fixed row height  | Block cells with vertical padding inside a now-fixed-height row                                                                                                                                 | `SignalsTable.module.css`                                     | Row `align-items: center`, cell vertical padding removed (centering via the row track)                                                                           | ✅     |
| A6  | No clean horizontal scroll when columns exceed the content column | `.grid` min-width was 1080 (≈ content width) so the table crushed instead of scrolling                                                                                                          | `SignalsTable.module.css` + `Table` `.scroll` wrapper         | Min-width set to real sum; `DataTableShell` already provides `overflow-x: auto` → header + body scroll together; header stays sticky above the vertical viewport | ✅     |
| A7  | 10,000-row readiness                                              | n/a — virtualization kept; only visible rows render                                                                                                                                             | `SignalsTable.tsx`                                            | TanStack Virtual + Table preserved; overscan 12; fixed height keeps it smooth                                                                                    | ➖     |

## B. Header / TopBar (every route)

| #   | Bug                                                                      | Probable cause                                                                                                                                                                                                                                 | File                                                                   | Fix                                                                                                                                                 | Status |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| B1  | Global search misaligned, topbar looks broken                            | `SearchInput` always renders a stacked `<label>` above the 38px box. In the fixed 60px topbar (`align-items: center`) the label+gap+input ≈ 62px and the visible "Global search" text breaks the vertical rhythm vs the single-line breadcrumb | `ui/components/Inputs.tsx` + `.module.css`, `app/layout/AppLayout.tsx` | Added `hideLabel` prop → visually-hidden (`sr-only`) label (keeps a11y); topbar search now a single 38px control, vertically centered, capped width | ✅     |
| B2  | Header could exceed its own height / no z-index over sticky table header | 62px content in a 60px bar; table header is `sticky z-index:2`                                                                                                                                                                                 | `ui/layout/Layout.module.css`                                          | Topbar `min-height` instead of hard `height`, `z-index: 20` so it always sits above content/sticky table head                                       | ✅     |
| B3  | Topbar breaks on mobile (320px search + bell + CTA overflow)             | No responsive treatment of the topbar                                                                                                                                                                                                          | `Layout.module.css`                                                    | Search flexes & is hidden ≤640px; header padding reduced; actions stay (bell + New signal)                                                          | ✅     |
| B4  | "Barre violette / artefact"                                              | Searched the codebase — the only violet is the **spec-mandated** DX Metrics "Change" accent (`#7c5cff`). No stray purple in the shell                                                                                                          | —                                                                      | Confirmed clean                                                                                                                                     | ➖     |
| B5  | `<Link><Button>` nests `<a>`→`<button>` for "New signal"                 | Pre-existing markup                                                                                                                                                                                                                            | `AppLayout.tsx`                                                        | Left as-is (renders & aligns fine); flagged as minor a11y nit                                                                                       | ⏳     |

## C. Sidebar / nav

| #   | Bug                                                                                     | Cause                                                                                  | File                | Fix                                                                                                                                   | Status |
| --- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| C1  | On narrow widths the full vertical sidebar just stacks on top, pushing content far down | `@media (max-width:900px)` only switched the grid to 1 col and made the sidebar static | `Layout.module.css` | ≤1024px the sidebar becomes a compact, horizontally-scrollable **top nav** (brand · variant pill · row of items); header stays sticky | ✅     |
| C2  | Nav active/hover/focus, counts                                                          | —                                                                                      | —                   | Already correct (orange active bg `#fff4e8`, count pills, focus ring)                                                                 | ➖     |

## D. Cards / unpadded-card headers

| #   | Bug                                                                                                                                                                               | Cause                                                                  | File                            | Fix                                                                                                | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- | ------ |
| D1  | `CardHeader` flush to the top-left corner (no padding) inside `Card padded={false}` — Incidents "N incidents", Compare "Attribute diff", DX Metrics "Full metrics" / "CI history" | A `CardHeader` placed directly in an unpadded card inherits no padding | `ui/components/Card.module.css` | Added `.card:not(.padded) > .header { padding: 16px 18px 0 }` (padded cards & toolbars unaffected) | ✅     |

## E. Per-page checks (header · cards · tables · filters · states · mobile)

| Page           | Findings                                                                                                                                                       | Status                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `/` Overview   | KPI grid, charts, "Most critical", System status, AI card, Recent incidents OK. Recent-incidents `<table>` had no horizontal-scroll wrapper (mobile overflow). | ✅ wrapped in `overflow-x`                 |
| `/signals`     | See section A. Filters grid collapses 6→2 cols ≤1080; add 1-col ≤640.                                                                                          | ✅                                         |
| `/signals/:id` | Header card, action buttons (wrap), 4 stat tiles (4→2 ≤1080, →1 ≤640), timeline, partial-error, AI/recommended/linked-incident OK.                             | ✅                                         |
| `/incidents`   | KPI cards, filters, table already `overflow-x`. Unpadded-card header fixed (D1). Mobile filter grid →1 col.                                                    | ✅                                         |
| `/compare`     | Diff grid `170px 1fr 40px 1.3fr` overflowed on mobile; selector row OK; "User impact" title sits above its orange card (acceptable).                           | ✅ diff stacks ≤640; unpadded header fixed |
| `/dx-metrics`  | Axis cards (4→2→1), comparison bars (3→1), AI/perf tiles, MetricsTable (`overflow-x` ok), CI history table lacked scroll wrapper. Unpadded headers fixed.      | ✅ ci table wrapped                        |
| `/settings`    | Environment rows, feature-flag toggles, demo controls all align; warning/demo banners visible.                                                                 | ➖                                         |

## F. Responsive breakpoints

Consolidated around the requested tiers: **≥1200 desktop · 1024 laptop/tablet-landscape ·
768 tablet · ≤640 mobile**.

- `≤1024` → sidebar becomes top nav, content full width, topbar padding tightens.
- `≤1080` (laptop) → KPI 4→2, 2-col page layouts → 1 col, Signals/Incidents filter grids → 2 col, DX grids → 2/1.
- `≤640` (mobile) → KPI/stat/DX tiles → 1 col, filter grids → 1 col, topbar search hidden, Compare diff stacks, content padding reduced.
- All wide tables scroll horizontally inside their own container; the page body never scrolls horizontally.

## G. Accessibility (visual)

- Visible focus ring (`2px #ef7e00`) is global — kept. ➖
- Every badge/severity/status/impact/delta carries a **text label** (never color alone). ➖
- Inputs keep real `<label>`s; topbar search label is visually-hidden, not removed. ✅
- Toggles `role="switch"`, checkboxes `aria-label`. ➖
- Mobile nav items given a comfortable tap height. ✅

## H. Follow-up fixes (post-review)

### H1 — Double horizontal scrollbar in the Signals table

Two stacked horizontal scrollbars appeared under the table. Cause: there were **two nested
horizontal scroll containers** — the `DataTableShell` `.scroll` wrapper (`overflow-x: auto`,
wrapping the `min-width:1384px` grid) **and** the body `.viewport` (its `overflow-y: auto`
promotes `overflow-x` to `auto` per the CSS spec; when the vertical scrollbar appears it shrinks
the viewport width below the grid's min-width, so a second horizontal bar appears).

Fix (`feature-signals/SignalsTable.tsx` + `.module.css`): restructured to a **single scroll
container**. The `.viewport` (`overflow: auto`, `max-height: 600px`) now holds the sticky header
**and** the virtualized rows inside the `.grid`, so there is exactly one horizontal + one vertical
scrollbar. The outer `DataTableShell` `.scroll` no longer overflows (only Signals uses it). The
header stays sticky and column-aligned during both axes of scroll. ✅

### I — Header action buttons were inert

The bell did nothing and "New signal" only navigated. Both now have real behavior, kept honest
about the read-only demo dataset and within scope (no new routes/endpoints/data):

| Button                   | Behavior                                                                                                                                                                                                                                                       | File                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **Notifications (bell)** | Toggles a dropdown of the highest-priority signals, built from the dashboard summary the shell already loads (no extra request). Red unread dot when items exist; rows link to the signal detail; "View all signals" footer. Closes on outside-click / Escape. | `app/layout/AppLayout.tsx`, `HeaderMenus.module.css` |
| **New signal**           | Opens a native `<dialog>` capture form (Title · Severity · Source). On submit it shows a success banner ("captured — demo build, not persisted") and opens the Signals Explorer. Closes on Escape / Cancel.                                                    | same                                                 |

a11y: dropdown is a labelled group of native links (not a faux ARIA menu); modal uses native
`<dialog>` for focus handling + Escape. Lint/typecheck/boundaries all clean. ✅
