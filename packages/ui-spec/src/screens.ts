import type { ScreenId } from './routes'

/**
 * Screen blueprints — the required sections/widgets per route, distilled from
 * `docs/product/01-design-spec.md` §5. A variant is invalid if it drops a section or a
 * required UI state.
 */
export type ScreenSpec = {
  id: ScreenId
  title: string
  subtitle?: string
  /** Required sections/widgets, top to bottom. */
  sections: string[]
}

export const SCREENS: ScreenSpec[] = [
  {
    id: 'overview',
    title: 'Overview',
    subtitle: 'Prioritize what matters first.',
    sections: [
      '4 KPI cards: Open signals · Critical signals · Active incidents · Avg qualification time',
      'Signals by severity (horizontal bars)',
      'Signals over time (area + line, all vs critical, 14 days)',
      'Most critical signals (8 rows, clickable)',
      'System status (service rows with status dots)',
      'AI recommendation (orange-tint, mock, 2 actions)',
      'Recent incidents table (5 rows)'
    ]
  },
  {
    id: 'signals',
    title: 'Signals Explorer',
    subtitle: 'X of Y signals · sorted by risk score',
    sections: [
      'Filter bar: Search · Severity · Status · Source · Assigned to · Date range · Reset',
      'Toolbar / selection bar (bulk actions: Assign selected, Mark as triaged, Clear)',
      'Dense table — columns: checkbox · Title (+id) · Severity · Status · Source · Risk score · Confidence · Assigned to · Created · Linked incident · Actions',
      'Built for 10,000+ rows (virtualize)'
    ]
  },
  {
    id: 'signal-detail',
    title: 'Signal Detail',
    sections: [
      'Header card: severity & status badges + mono id, title, source/created, actions (Assign, Change status, Escalate, Resolve)',
      '4 stat tiles: Risk score, Confidence, Source, Assigned to',
      'Description + tags',
      'Linked sources',
      'Timeline (vertical, status dots)',
      'AI summary (orange tint, mock)',
      'Recommended action (severity-aware callout)',
      'Linked incident (card link or "Not linked" empty state)'
    ]
  },
  {
    id: 'incidents',
    title: 'Incidents',
    sections: [
      '4 summary cards: Active incidents · Critical · Avg resolution time · Resolved this week',
      'Filters: Status · Severity · Impact · Reset',
      'Table: Incident (id+title) · Severity · Status · Impact · Linked signals · Owner · Open for · View'
    ]
  },
  {
    id: 'compare',
    title: 'Compare',
    sections: [
      'Signal selector + Re-run',
      'Diff card: Attribute / Before / → / After, changed rows tinted with arrow + delta chip',
      'Timeline of changes',
      'User impact card (orange tint): impact sentence + metric rows with good/bad chips'
    ]
  },
  {
    id: 'dx-metrics',
    title: 'DX Metrics',
    subtitle: 'Showing {variant}',
    sections: [
      '4 big cards: Build · Ship · Run · Change',
      'Variant comparison: grouped bars (CI duration, Bundle size, Files touched · AI task), current variant highlighted',
      'AI task result: 4 metric tiles + outcome chip (Healthy / High cost)',
      'Bundle & performance: Bundle size, Main chunk, Lighthouse, Table render',
      'Full metrics table: rows = metrics, columns = A / B / C / Best',
      'CI history: recent runs (commit, sha·time, duration, pass/fail)'
    ]
  },
  {
    id: 'settings',
    title: 'Settings',
    sections: [
      'Environment: API status · Dataset version · Variant name · Region',
      'Feature flags: AI recommendations · Incident grouping · Dense tables · Auto-escalation · Experimental scoring',
      'Demo controls: Simulate API error · Simulate slow network · Reset demo state (with result banner)'
    ]
  }
]

/** Every asynchronous surface must support all of these states (design spec §6). */
export const UI_STATES = [
  'loading',
  'empty',
  'partial-error',
  'global-error',
  'slow-network',
  'invalid-data',
  'not-found',
  'unauthorized'
] as const
export type UiState = (typeof UI_STATES)[number]

/** Canonical microcopy — keep wording identical across variants (design spec §9). */
export const MICROCOPY = {
  overviewSubtitle: 'Prioritize what matters first.',
  partialError: 'Some widgets could not be refreshed.',
  emptySignals: 'No signals match your current filters.',
  confidenceUnavailable: 'Confidence unavailable.',
  reviewRecommended: 'Review recommended before escalation.',
  compareImpactSample: 'This change reduces qualification time but increases review scope.',
  signalNotFound: 'Signal not found',
  unassigned: 'Unassigned',
  notLinked: 'Not linked'
} as const

export function screenById(id: ScreenId): ScreenSpec | undefined {
  return SCREENS.find((s) => s.id === id)
}
