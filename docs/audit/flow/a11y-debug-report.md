# Flow accessibility debug report

Diagnostic captured with real Chromium via Pa11y (WCAG 2.1 AA), route by route, then
re-verified after the fixes. Both Pa11y runners were used: HTML_CodeSniffer (contrast +
structure) and axe-core (ARIA + roles).

- Tooling: `pa11y` / `pa11y-ci` 9.x with bundled Chromium 148, `@lhci/cli` 0.15.
- Server: `apps/flow-app` production build (`node server.mjs`) on `http://localhost:3000`.
- Detail route resolved to a real id from `GET /api/signals` → `/signals/sig_00326`.

## Baseline (before fixes) — error counts per route

| Route | Pa11y errors (htmlcs) |
| --- | ---: |
| `/` | 47 |
| `/signals` | 53 |
| `/signals/sig_00326` | 33 |
| `/incidents` | 1160 |
| `/compare` | 31 |
| `/dx-metrics` | 66 |
| `/settings` | 21 |
| `/ops` | 21 |

`/incidents` dominated only because the same muted-text token repeats on every row of a
long table (~1159 identical contrast failures). The number of distinct *causes* is small.

## Root causes (every error mapped to one)

All but one error were `WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail` (contrast). The
one structural error was the topbar search form. axe-core reported no additional errors.

### C1 — muted text token too light (largest cause, ~1500 instances)

- Message: `insufficient contrast ... ratio 3.14:1 (2.93:1 on the grey surface)`.
- Selectors / contexts (representative): `._muted`, `._id`, `._subtitle`, `._crumb`,
  `._kbd`, `._brandSub`, `._navGroupLabel`, `._statLabel`, `._headerCell`, `._sortBtn`,
  `._navCount`, `._tag`, `._unit`, `._tlTime`, `._barName`, `._toggleDesc`, `._sourceMeta`,
  `._monoId`, `._incId`, `._critMeta`, and bare `<th>Incident|Severity|Owner|...</th>`.
- Cause: `--so-slate-400: #8a929e` (and `--so-slate-300: #a3aab4` for the breadcrumb
  separator and compare arrow) fail 4.5:1 on both `#ffffff` and the `#f6f7f8` surface.
- File: `packages/flow/ui/src/styles/tokens.css`.
- Fix: `--so-slate-400 → #646b76` (5.01:1 on surface), `--so-slate-300 → #6d747f` (4.71:1).
- Status: fixed.

### C2 — accent orange as solid fill under white text

- Message: `ratio 2.74:1` on `._btn._primary` (New signal), `._logoMark` (sidebar mark).
- Cause: `--so-accent: #ef7e00` white-on-orange = 2.74:1.
- File: `tokens.css` (new `--so-accent-strong: #ad5a00`), `components/Button.module.css`,
  `layout/Layout.module.css`.
- Fix: primary button + logo mark now use `--so-accent-strong` (white-on-#ad5a00 = 4.95:1).
  `--so-accent` stays vibrant for decorative use (focus ring, chart bars, icons, borders).
- Status: fixed.

### C3 — accent orange as text / on peach tints

- Message: `ratio 3.35–4.13:1` on `._navItemActive`, `._navCount` (active), `._badge._orange`,
  `._mockTag`, `._barNameCurrent`, `._thCurrent`, VariantBadge `._badge`, `._linkedLink`
  (incidents), `._timelineCategory` (ops), and the inline `/ops` links on dx-metrics/settings.
- Cause: `--so-accent-hover: #c2630a` fails 4.5:1 as small text and on the peach tints
  (`#fff1e3`, `#fff4e8`, `#ffe3c2`, `#fff7ee`). Two class/inline sites used raw `--so-accent`.
- Files: `tokens.css`, `feature-incidents/.../IncidentsScreen.module.css`,
  `ui/src/ops/Ops.module.css`, `feature-dx-metrics/.../DxMetricsScreen.tsx`,
  `feature-settings/.../SettingsScreen.tsx`.
- Fix: `--so-accent-hover → #9a5100` (>=4.79:1 on every tint above and 5.91:1 on white);
  the two raw-`--so-accent` text sites switched to `--so-accent-hover`.
- Status: fixed.

### C4 — semantic badge foregrounds just under AA

- Message: `ratio 4.16:1` (amber badge), `4.44:1` (red badge / compare `._chip._bad` /
  signal-detail callout).
- Cause: `--so-amber-fg: #a86a04` and `--so-red-fg: #d92d20` sit just below 4.5:1 on their
  tinted badge backgrounds.
- File: `tokens.css`.
- Fix: `--so-amber-fg → #8f5a00` (5.42:1), `--so-red-fg → #c92a1e` (5.04:1).
- Status: fixed.

### C5 — DX Metrics per-axis accents (chart labels)

- Message: `ratio 2.74:1` (Build orange) and `4.35:1` (Change purple) on `._metricAxis`.
- Cause: `AXIS_ACCENT` passed `#ef7e00` / `#7c5cff` as text color on white cards.
- File: `feature-dx-metrics/src/DxMetricsScreen.tsx`.
- Fix: `Build #ef7e00 → #ad5a00` (4.95:1), `Change #7c5cff → #6a4bdb` (5.77:1). Ship/Run
  already passed and were left unchanged.
- Status: fixed.

### S1 — topbar search form has no submit button

- Message: `WCAG2AA.Principle3.Guideline3_2.3_2_2.H32.2 — This form does not contain a
  submit button` (one per route).
- Selector: `form.so-topbar-search`.
- Cause: the global search `<form>` only wrapped a search input; keyboard users had no
  submit affordance exposed to the a11y API.
- Files: `apps/flow-app/src/app/layout/AppLayout.tsx`, `apps/flow-app/src/app/styles/app.css`.
- Fix: added a visually-hidden `<button type="submit">Search</button>` plus a reusable
  `.so-visually-hidden` utility. The input keeps its associated (visually hidden) label.
- Status: fixed.

## After fixes — re-verified

Both runners, all eight routes, real Chromium:

| Route | htmlcs errors | axe errors |
| --- | ---: | ---: |
| `/` | 0 | 0 |
| `/signals` | 0 | 0 |
| `/signals/sig_00326` | 0 | 0 |
| `/incidents` | 0 | 0 |
| `/compare` | 0 | 0 |
| `/dx-metrics` | 0 | 0 |
| `/settings` | 0 | 0 |
| `/ops` | 0 | 0 |

Lighthouse CI accessibility category also passes its `>= 0.9` assertion on every collected URL.

No Pa11y rules are ignored, no elements are hidden from the audit, and no false positives
were suppressed. Every route passes on its own merits.
