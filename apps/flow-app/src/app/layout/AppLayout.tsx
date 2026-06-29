import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { NAV_ROUTES } from '@signalops/ui-spec'
import {
  AppShell,
  Breadcrumb,
  Button,
  Footer,
  Header,
  Icon,
  SearchInput,
  Sidebar,
  type Crumb,
  type IconName,
  type NavItem
} from '@signalops/flow-ui'
import { VARIANT, BUILD_INFO } from '../config'
import { useDashboardSummary, useHealth } from '../../shared/api/queries'

// ui-spec route ids line up 1:1 with flow-ui Icon names.
const NAV_ITEMS: NavItem[] = NAV_ROUTES.map((route) => ({
  id: route.id,
  label: route.navLabel ?? route.screen,
  icon: route.id as IconName,
  href: route.path
}))

function activeIdFor(pathname: string): string {
  if (pathname === '/') return 'overview'
  if (pathname.startsWith('/signals')) return 'signals'
  if (pathname.startsWith('/incidents')) return 'incidents'
  if (pathname.startsWith('/compare')) return 'compare'
  if (pathname.startsWith('/dx-metrics')) return 'dx-metrics'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'overview'
}

const SCREEN_LABEL: Record<string, string> = {
  overview: 'Overview',
  signals: 'Signals',
  incidents: 'Incidents',
  compare: 'Compare',
  'dx-metrics': 'DX Metrics',
  settings: 'Settings'
}

function crumbsFor(pathname: string): Crumb[] {
  const activeId = activeIdFor(pathname)
  const base: Crumb[] = [{ label: 'SignalOps', href: '/' }]
  if (activeId === 'signals' && /^\/signals\/.+/.test(pathname)) {
    const id = pathname.split('/')[2]
    return [...base, { label: 'Signals', href: '/signals' }, { label: id }]
  }
  return [...base, { label: SCREEN_LABEL[activeId] }]
}

function HeaderSearch() {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        navigate({ to: '/signals', search: value ? { search: value } : {} })
      }}
      style={{ width: 320, maxWidth: '40vw' }}
    >
      <SearchInput
        label="Global search"
        value={value}
        onChange={setValue}
        placeholder="Search signals…"
      />
    </form>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const health = useHealth()
  const summary = useDashboardSummary()
  const activeId = activeIdFor(pathname)

  const counts: Record<string, string | undefined> = summary.data
    ? {
        signals: summary.data.kpis.openSignals.value.toLocaleString(),
        incidents: String(summary.data.kpis.activeIncidents.value)
      }
    : {}
  const items: NavItem[] = NAV_ITEMS.map((item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    href: item.href,
    count: counts[item.id]
  }))

  const apiTone =
    health.data?.status === 'ok' ? 'ok' : health.data?.status === 'degraded' ? 'degraded' : 'down'

  return (
    <AppShell
      sidebar={
        <Sidebar
          variantLabel={VARIANT.label}
          items={items}
          activeId={activeId}
          renderLink={(item, content, className) => (
            <Link to={item.href} className={className}>
              {content}
            </Link>
          )}
        />
      }
      header={
        <Header
          breadcrumb={
            <Breadcrumb
              items={crumbsFor(pathname)}
              renderLink={(crumb, content) =>
                crumb.href ? <Link to={crumb.href}>{content}</Link> : content
              }
            />
          }
          search={<HeaderSearch />}
          actions={
            <>
              <Button variant="ghost" aria-label="Notifications">
                <Icon name="bell" size={18} />
              </Button>
              <Link to="/signals">
                <Button variant="primary">New signal</Button>
              </Link>
            </>
          }
        />
      }
      footer={
        <Footer
          buildInfo={`${BUILD_INFO} · dataset ${VARIANT.datasetVersion}`}
          apiStatus={{ label: `API ${health.data?.status ?? 'checking…'}`, tone: apiTone }}
        />
      }
    >
      {children}
    </AppShell>
  )
}
