/**
 * Design tokens — transcribed verbatim from `docs/product/01-design-spec.md` (the clickable
 * reference is `maquettes/SignalOps.dc.html`). Variants must port these values into their own
 * styling layer WITHOUT changing them: the three variants are meant to be pixel-identical.
 *
 * Meaning is never encoded by color alone — every badge also carries a text label.
 */

export const colors = {
  surface: '#f6f7f8',
  card: '#ffffff',
  border: '#e8eaed',
  borderSubtle: '#eceef0',
  borderInner: '#f2f3f5',
  text: {
    ink: '#14171a',
    slate700: '#3a414a',
    slate500: '#5c6470',
    slate400: '#8a929e',
    slate300: '#a3aab4'
  },
  accent: {
    base: '#ef7e00',
    hover: '#c2630a',
    tint100: '#fff1e3',
    tint50: '#fffaf3',
    borderTint: '#ffd9ad'
  }
} as const

/** Semantic hues — `fg` for text/icon, `bg` for the badge background. */
export const hues = {
  blue: { fg: '#175cd3', bg: '#eff4ff' },
  green: { fg: '#067647', bg: '#ecfdf3' },
  red: { fg: '#d92d20', bg: '#fef3f2' },
  amber: { fg: '#a86a04', bg: '#fef7e6' },
  orange: { fg: '#ef7e00', bg: '#fff1e3' },
  grey: { fg: '#5c6470', bg: '#f2f3f5' }
} as const

export type HueName = keyof typeof hues

export const radius = {
  sm: 6,
  md: 8,
  control: 9,
  card: 12,
  pill: 999
} as const

/** Spacing scale in px: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40. */
export const spacing = [4, 8, 12, 16, 20, 24, 32, 40] as const

export const shadow = {
  card: '0 1px 2px rgba(16,24,40,.06)',
  raised: '0 8px 24px rgba(16,24,40,.12)'
} as const

export const typography = {
  fontFamily: {
    ui: 'Geist',
    mono: 'Geist Mono'
  },
  scale: {
    display: { size: 28, weight: 700, letterSpacing: '-0.02em' },
    heading: { size: 22, weight: 700, letterSpacing: '-0.02em' },
    sectionTitle: { size: 14, weight: 600 },
    body: { size: 13.5, weight: 400 },
    small: { size: 12, weight: 400 }
  },
  minBodyPx: 12.5,
  tableCellPx: 12.5
} as const

export const focusRing = '2px solid #ef7e00' as const
export const focusRingOffset = 2 as const

export const layout = {
  designWidth: 1440,
  designHeight: 1024,
  sidebarWidth: 248,
  topBarHeight: 60,
  contentMaxWidth: 1140,
  tableHorizontalScrollBelow: 1080
} as const

/**
 * Meaning → hue maps. These mirror the design spec exactly and are keyed by the contract
 * enums so the mapping cannot drift from the data model.
 */
export const severityHue = {
  low: 'blue',
  medium: 'amber',
  high: 'orange',
  critical: 'red'
} as const satisfies Record<import('@signalops/contracts').SignalSeverity, HueName>

export const statusHue = {
  new: 'blue',
  triaged: 'amber',
  investigating: 'orange',
  resolved: 'green',
  dismissed: 'grey'
} as const satisfies Record<import('@signalops/contracts').SignalStatus, HueName>

export const impactHue = {
  user: 'blue',
  system: 'grey',
  security: 'red',
  business: 'green'
} as const satisfies Record<import('@signalops/contracts').IncidentImpact, HueName>

/** Badge variants the components layer should support (each renders a text label). */
export const BADGE_VARIANTS = [
  'severity',
  'status',
  'impact',
  'neutral',
  'success',
  'danger',
  'warning',
  'info',
  'accent'
] as const
export type BadgeVariant = (typeof BADGE_VARIANTS)[number]
