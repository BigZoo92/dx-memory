# SignalOps — UI Specification

> Single source of truth for implementing the SignalOps dashboard in React.
> The product, routes and features are **identical across the three technical variants**.
> The only visual difference allowed is the variant badge (`Variant A — Friction`, `Variant B — Flow`, `Variant C — Overfit`).

The clickable reference is `SignalOps.dc.html`. This document describes how to rebuild it.

---

## 1. Product

SignalOps is a B2B dashboard to **monitor, qualify and prioritize operational signals**. Analysts watch signals, filter alerts, judge severity, inspect linked incidents, compare before/after states, and track delivery + DX metrics.

Tone: serious, sober, premium, legible. Not a startup gadget. No cyber/neon, no forced dark mode, no heavy glassmorphism, no decorative animation.

---

## 2. Routes

| Route | Screen | Purpose |
|---|---|---|
| `/` | Overview | 10-second summary of activity |
| `/signals` | Signals Explorer | Dense table: search, sort, filter, multi-select, bulk actions |
| `/signals/:id` | Signal Detail | Full signal record + AI summary + actions |
| `/incidents` | Incidents | Open incidents and their linked signals |
| `/compare` | Compare | Before/after on a signal + user impact |
| `/dx-metrics` | DX Metrics | Delivery + DX metrics, compared across variants |
| `/settings` | Settings | API status, dataset, flags, demo controls |

Reference-only docs routes (not part of the product, do not ship): `design-system`, `components`, `ui-states`, `responsive`.

---

## 3. Design tokens

### Color
- **Surface (app bg):** `#f6f7f8` · **Card:** `#ffffff` · **Border:** `#e8eaed` (subtle `#eceef0` / `#f2f3f5` for inner dividers)
- **Text:** ink `#14171a`, slate-700 `#3a414a`, slate-500 `#5c6470`, slate-400 `#8a929e`, slate-300 `#a3aab4`
- **Accent (orange):** `#ef7e00` · hover `#c2630a` · tint-100 `#fff1e3` · tint-50 `#fffaf3` · border-tint `#ffd9ad`
- **Status hues (meaning only):** green `#067647`/`#ecfdf3`, red `#d92d20`/`#fef3f2`, amber `#a86a04`/`#fef7e6`, blue `#175cd3`/`#eff4ff`

### Severity → color
Low = blue · Medium = amber · High = orange · Critical = red. Always render the **text label**, never color alone.

### Status → color
New = blue · Triaged = amber · Investigating = orange · Resolved = green · Dismissed = grey.

### Impact → color
User = blue · System = grey · Security = red · Business = green.

### Typography
- **Geist** (UI), **Geist Mono** (IDs, scores, durations, code).
- Display 28/700 · Heading 22/700 · Section title 14/600 · Body 13.5/400 · Small 12/400. Letter-spacing −0.02em on large headings.
- Minimum comfortable body 12.5px; table cells 12.5px.

### Spacing scale
`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40` (px). Use flex/grid with `gap`.

### Radius
sm 6 · md 8 · control 9 · card 12 · pill 999.

### Elevation
- card: `0 1px 2px rgba(16,24,40,.06)`
- raised/popover: `0 8px 24px rgba(16,24,40,.12)`

---

## 4. App shell (every route)

```
┌────────────┬───────────────────────────────────────────────┐
│  Sidebar   │  TopBar (breadcrumb · search · alerts · CTA)   │
│  248px     ├───────────────────────────────────────────────┤
│            │  Content (max-width 1140, centered, scrolls)   │
│  logo      │                                                │
│  variant   │                                                │
│  nav       │                                                │
│  user      ├───────────────────────────────────────────────┤
│            │  Footer (build info · API status)              │
└────────────┴───────────────────────────────────────────────┘
```

- **Sidebar (248px, white, right border):** logo mark (orange rounded square) + "SignalOps"; variant pill (orange tint); `PRODUCT` nav group (Overview, Signals, Incidents, Compare, DX Metrics, Settings) with line icons + optional count badge; active item = orange text + `#fff4e8` background; user block at bottom.
- **TopBar (60px, white, bottom border):** breadcrumb (last crumb ink/600, rest slate-400); global search (320px, `/` hint); notifications bell with red dot; primary CTA "New signal" (orange).
- **Footer:** muted, build/version + API status dot.
- Design width 1440×1024. Sidebar fixed, content area scrolls.

### Variant badge
A single pill reading the variant name. Drive it from one config value; nothing else in the UI depends on the variant.

---

## 5. Screens

### 5.1 Overview `/`
- Page title "Overview" + subtitle "Prioritize what matters first." + date-range select + Export.
- **4 KPI cards:** Open signals · Critical signals · Active incidents · Avg qualification time. Each: label, icon tile, large value, trend chip (color + arrow + text; never color alone).
- **Signals by severity** (horizontal bars, Critical→Low) and **Signals over time** (area + line: all vs critical, 14 days). Grid ~0.95fr / 1.55fr.
- **Most critical signals** (8 rows, clickable → detail: dot, title, id·source·time, severity badge, risk) beside a right column with **System status** (service rows, status dots + text badge) and **AI recommendation** (orange-tint card, "mock" tag, 2 actions).
- **Recent incidents** table (5 rows).

### 5.2 Signals Explorer `/signals`
- Title + result count "X of Y signals · sorted by risk score" + Columns + Export.
- **Filter bar:** Search (title/id/source/assignee) · Severity · Status · Source · Assigned to · Date range · **Reset filters**.
- **Table card.** Toolbar swaps between result count (default) and a **selection bar** (orange tint) when rows are selected: "{n} selected", avg risk, **Assign selected**, **Mark as triaged**, Clear.
- **Columns:** checkbox · Title (+id mono) · Severity · Status · Source · Risk score (mini bar + mono value, color by threshold) · Confidence (dot + label; "Unavailable" when missing) · Assigned to ("Unassigned" if none) · Created · Linked incident (mono link or —) · Actions (View).
- Dense rows (~10–11px vertical padding). Header select-all. Selected row tint `#fffaf3`. Horizontal scroll under 1080px. **Built for 10,000+ rows** (virtualize in implementation).

### 5.3 Signal Detail `/signals/:id`
- Back link + **header card:** severity & status badges + mono id; title; "Source X · Created …"; action buttons **Assign** / **Change status** / **Escalate** (red outline) / **Resolve** (orange). Below: 4 stat tiles (Risk score with bar, Confidence with bar, Source, Assigned to).
- Body grid 1.55fr / 1fr.
  - Left: **Description** + tags (mono chips) · **Linked sources** · **Timeline** (vertical, status dots).
  - Right: **AI summary** (orange tint, "mock") · **Recommended action** (severity-aware callout: red for critical, amber otherwise) · **Linked incident** (card link, or "Not linked" empty state).
- Strong hierarchy: severity/risk/confidence must be instantly scannable.

### 5.4 Incidents `/incidents`
- Title + subtitle + New incident.
- **4 summary cards:** Active incidents · Critical · Avg resolution time · Resolved this week.
- Filters: Status · Severity · Impact + Reset.
- **Table:** Incident (id+title) · Severity · Status · Impact · Linked signals (link) · Owner (avatar+name) · Open for (age) · View. Simpler than Signals Explorer.

### 5.5 Compare `/compare`
- Signal selector + Re-run.
- **Diff card:** columns Attribute / Before / (→) / After, one row per attribute (Severity, Status, Risk score, Confidence, Assigned to, Recommended action). Changed rows tinted, show an arrow and a delta chip (good/bad/neutral/no-change). Badges for severity/status, text for the rest.
- **Timeline of changes** + **User impact** card (orange tint): impact sentence + metric rows (Qualification time, Review scope, Time to escalate) with good/bad chips. Sample copy: "This change reduces qualification time but increases review scope."

### 5.6 DX Metrics `/dx-metrics`  ← centerpiece
- Title + subtitle + "Showing {variant}" pill.
- **4 big cards** Build / Ship / Run / Change (each its own accent: orange / blue / green / violet). Headline metric (Build time / CI duration / Lighthouse / Files touched) + 2–3 sub-metrics.
- **Variant comparison:** 3 grouped bar mini-charts (CI duration, Bundle size, Files touched · AI task) with A/B/C bars; **current variant highlighted orange**; "lower is better".
- **AI task result:** task name + 4 metric tiles (Files touched, Tests impacted, Error repro steps, Docs pages) + outcome chip (Healthy / High cost) + sentence.
- **Bundle & performance:** Bundle size, Main chunk, Lighthouse (with bar), Table render.
- **Full metrics table:** rows = every metric below; columns = Variant A / B / C / Best. Current variant column tinted; best cell green/bold; Best column names the winner.
- **CI history:** recent runs (commit, sha·time, duration, pass/fail badge).

**Metrics (lower is better except Lighthouse). Reference values A / B / C:**

| Metric | A Friction | B Flow | C Overfit | Best |
|---|---|---|---|---|
| Install time | 48s | 22s | 31s | B |
| Typecheck time | 19s | 8s | 12s | B |
| Test time | 2m 40s | 54s | 1m 38s | B |
| Build time | 1m 12s | 38s | 26s | C |
| Docker build time | 4m 10s | 1m 50s | 2m 05s | B |
| CI duration | 9m 20s | 3m 40s | 5m 10s | B |
| Bundle size | 412 KB | 198 KB | 164 KB | C |
| Main chunk size | 287 KB | 121 KB | 96 KB | C |
| Lighthouse performance | 71 | 94 | 97 | C |
| Table render time | 480 ms | 120 ms | 90 ms | C |
| Files touched · AI task | 23 | 6 | 41 | B |
| Tests impacted | 48 | 9 | 72 | B |
| Error reproduction steps | 7 | 2 | 9 | B |
| Docs pages needed | 5 | 1 | 8 | B |

Narrative the screen must support: **B (Flow)** is the balanced, low-cost-to-change variant; **A (Friction)** is slow everywhere; **C (Overfit)** wins raw runtime/build but explodes change cost (files touched, tests impacted, docs) → good DX protects UX.

### 5.7 Settings `/settings`
- **Environment:** API status, Dataset version, Variant name, Region.
- **Feature flags:** toggles — AI recommendations, Incident grouping, Dense tables, Auto-escalation, Experimental scoring.
- **Demo controls:** Simulate API error · Simulate slow network · Reset demo state. Show a result banner.

---

## 6. UI states (cover for every async component)
loading (skeleton/shimmer) · empty ("No signals match your current filters.") · partial error ("Some widgets could not be refreshed." + Retry) · global error (page) · slow network (spinner + message) · invalid data ("Confidence unavailable.") · not found (404 "Signal not found") · unauthorized (mock).

---

## 7. Reusable components
Layout: AppShell, Sidebar, TopBar, Breadcrumb, Footer.
Data: KpiCard, StatTile, DataTable, SeverityBars, TrendChart, VariantBars, Timeline, StatusList.
Inputs: SearchInput, FilterSelect, Checkbox, Toggle, BulkActionBar.
Feedback: Badge (severity/status/impact), Banner, EmptyState, ErrorState, Skeleton, Spinner.
Actions/AI: Button (primary/secondary/ghost/danger/dark/disabled), AiCard, RecommendedAction, DiffRow, VariantBadge.

---

## 8. Accessibility
- Contrast-safe text on every surface; visible focus ring (`2px #ef7e00`, offset 2px).
- Never encode meaning by color alone — every badge carries a text label.
- Inputs have explicit labels; toggles use `role="switch"` + `aria-checked`; checkboxes have aria-labels.
- Touch targets ≥ 44px on mobile; comfortable text sizes; tables remain legible when dense.

---

## 9. Mock data
- **Severities:** Low, Medium, High, Critical. **Statuses:** New, Triaged, Investigating, Resolved, Dismissed. **Sources:** Web, Social, Internal, Partner, API, Manual. **Impacts:** User, System, Security, Business.
- **Signal:** `{ id, title, severity, status, source, risk (0–100), confidence (Low|Medium|High|—), assignee, created, incident }`.
- **Incident:** `{ id, title, severity, status, impact, linkedSignals, owner, age }`.
- Sample titles: "Unusual authentication pattern detected", "Partner API latency spike", "Suspicious document access", "Unexpected data export volume", "Critical workflow failure", "Manual review required".
- Microcopy: "Prioritize what matters first." · "Some widgets could not be refreshed." · "No signals match your current filters." · "Confidence unavailable." · "Review recommended before escalation." · "This change reduces qualification time but increases review scope."

---

## 10. Implementation notes
- Inline-styled in the reference; in React, port tokens to your styling layer but keep values identical.
- Keep the three variants pixel-identical — fork only the variant badge value.
- Signals Explorer must be virtualization-ready (10k+ rows).
- Charts in the reference are lightweight SVG/CSS; any chart lib is fine as long as colors/legends match.
