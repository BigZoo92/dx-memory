/**
 * The reusable component catalog (design spec §7). This is a NAMING + responsibility contract,
 * not an implementation — each variant builds these components in its own framework, but the
 * names and responsibilities are shared so the UI stays consistent and comparable.
 */
export type ComponentGroup = 'Layout' | 'Data' | 'Inputs' | 'Feedback' | 'Actions/AI'

export type ComponentSpec = {
  name: string
  group: ComponentGroup
  responsibility: string
}

export const COMPONENTS: ComponentSpec[] = [
  // Layout
  {
    name: 'AppShell',
    group: 'Layout',
    responsibility: 'Sidebar + TopBar + Content + Footer frame'
  },
  {
    name: 'Sidebar',
    group: 'Layout',
    responsibility: 'Logo, variant pill, PRODUCT nav, user block'
  },
  {
    name: 'TopBar',
    group: 'Layout',
    responsibility: 'Breadcrumb, global search, alerts, primary CTA'
  },
  { name: 'Breadcrumb', group: 'Layout', responsibility: 'Route breadcrumb trail' },
  { name: 'Footer', group: 'Layout', responsibility: 'Build/version info + API status dot' },

  // Data
  { name: 'KpiCard', group: 'Data', responsibility: 'Label, icon tile, value, trend chip' },
  { name: 'StatTile', group: 'Data', responsibility: 'Compact metric tile (optionally with bar)' },
  {
    name: 'DataTable',
    group: 'Data',
    responsibility: 'Dense, sortable, selectable, virtualization-ready table'
  },
  { name: 'SeverityBars', group: 'Data', responsibility: 'Horizontal bars per severity' },
  {
    name: 'TrendChart',
    group: 'Data',
    responsibility: 'Area + line time series (all vs critical)'
  },
  { name: 'VariantBars', group: 'Data', responsibility: 'Grouped A/B/C comparison bars' },
  { name: 'Timeline', group: 'Data', responsibility: 'Vertical event timeline with status dots' },
  {
    name: 'StatusList',
    group: 'Data',
    responsibility: 'Service rows with status dots + text badge'
  },

  // Inputs
  { name: 'SearchInput', group: 'Inputs', responsibility: 'Search field with "/" hint' },
  { name: 'FilterSelect', group: 'Inputs', responsibility: 'Labeled filter dropdown' },
  { name: 'Checkbox', group: 'Inputs', responsibility: 'Row/select-all checkbox with aria-label' },
  { name: 'Toggle', group: 'Inputs', responsibility: 'Feature flag switch (role="switch")' },
  { name: 'BulkActionBar', group: 'Inputs', responsibility: 'Selection toolbar with bulk actions' },

  // Feedback
  { name: 'Badge', group: 'Feedback', responsibility: 'Severity/status/impact label (text + hue)' },
  { name: 'Banner', group: 'Feedback', responsibility: 'Inline result/partial-error banner' },
  { name: 'EmptyState', group: 'Feedback', responsibility: 'No-results message + reset action' },
  { name: 'ErrorState', group: 'Feedback', responsibility: 'Global error page' },
  { name: 'Skeleton', group: 'Feedback', responsibility: 'Loading shimmer placeholder' },
  { name: 'Spinner', group: 'Feedback', responsibility: 'Slow-network spinner + message' },

  // Actions / AI
  {
    name: 'Button',
    group: 'Actions/AI',
    responsibility: 'primary/secondary/ghost/danger/dark/disabled'
  },
  { name: 'AiCard', group: 'Actions/AI', responsibility: 'Orange-tint AI summary card (mock tag)' },
  {
    name: 'RecommendedAction',
    group: 'Actions/AI',
    responsibility: 'Severity-aware recommendation callout'
  },
  {
    name: 'DiffRow',
    group: 'Actions/AI',
    responsibility: 'Before/after attribute row with delta chip'
  },
  {
    name: 'VariantBadge',
    group: 'Actions/AI',
    responsibility: 'The single variant pill (only allowed visible difference)'
  }
]

export const COMPONENT_GROUPS: ComponentGroup[] = [
  'Layout',
  'Data',
  'Inputs',
  'Feedback',
  'Actions/AI'
]

export function componentsByGroup(group: ComponentGroup): ComponentSpec[] {
  return COMPONENTS.filter((c) => c.group === group)
}
