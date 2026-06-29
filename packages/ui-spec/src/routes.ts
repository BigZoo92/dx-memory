/**
 * The seven product routes (from `docs/product/00-product-contract.md`). The set, paths and
 * screen names are invariant across variants — only the variant badge value may differ.
 *
 * Reference-only docs routes (`design-system`, `components`, `ui-states`, `responsive`) are
 * NOT part of the product and must not ship.
 */
export type ScreenId =
  'overview' | 'signals' | 'signal-detail' | 'incidents' | 'compare' | 'dx-metrics' | 'settings'

export type RouteSpec = {
  id: ScreenId
  path: string
  screen: string
  /** Sidebar label, or `null` for routes not shown in the nav (e.g. detail pages). */
  navLabel: string | null
  /** Suggested line-icon name for the sidebar. */
  icon: string | null
  /** Order in the PRODUCT nav group; `null` when not in the nav. */
  navOrder: number | null
}

export const ROUTES: RouteSpec[] = [
  {
    id: 'overview',
    path: '/',
    screen: 'Overview',
    navLabel: 'Overview',
    icon: 'gauge',
    navOrder: 1
  },
  {
    id: 'signals',
    path: '/signals',
    screen: 'Signals Explorer',
    navLabel: 'Signals',
    icon: 'radar',
    navOrder: 2
  },
  {
    id: 'signal-detail',
    path: '/signals/:id',
    screen: 'Signal Detail',
    navLabel: null,
    icon: null,
    navOrder: null
  },
  {
    id: 'incidents',
    path: '/incidents',
    screen: 'Incidents',
    navLabel: 'Incidents',
    icon: 'alert-triangle',
    navOrder: 3
  },
  {
    id: 'compare',
    path: '/compare',
    screen: 'Compare',
    navLabel: 'Compare',
    icon: 'git-compare',
    navOrder: 4
  },
  {
    id: 'dx-metrics',
    path: '/dx-metrics',
    screen: 'DX Metrics',
    navLabel: 'DX Metrics',
    icon: 'activity',
    navOrder: 5
  },
  {
    id: 'settings',
    path: '/settings',
    screen: 'Settings',
    navLabel: 'Settings',
    icon: 'settings',
    navOrder: 6
  }
]

/** Routes shown in the sidebar PRODUCT group, in order. */
export const NAV_ROUTES = ROUTES.filter((r) => r.navOrder !== null).sort(
  (a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0)
)

export function routeById(id: ScreenId): RouteSpec | undefined {
  return ROUTES.find((r) => r.id === id)
}
