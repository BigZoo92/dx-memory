import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useRouterState } from '@tanstack/react-router'
import { NAV_ROUTES } from '@signalops/ui-spec'
import type { DashboardSummary } from '@signalops/contracts'
import {
  AppShell,
  Banner,
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
import { useDashboardSummary, useHealth } from '@signalops/flow-api-client'
import menu from './HeaderMenus.module.css'

// ui-spec route ids line up 1:1 with flow-ui Icon names.
const NAV_ITEMS: NavItem[] = NAV_ROUTES.map((route) => ({
  id: route.id,
  label: route.navLabel ?? route.screen,
  icon: route.id as IconName,
  href: route.path
}))

const SEVERITY_DOT: Record<string, string> = {
  critical: '#d92d20',
  high: '#ef7e00',
  medium: '#d9a200',
  low: '#2563eb'
}

const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

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
      className="so-topbar-search"
      onSubmit={(e) => {
        e.preventDefault()
        navigate({ to: '/signals', search: value ? { search: value } : {} })
      }}
    >
      <SearchInput
        label="Global search"
        value={value}
        onChange={setValue}
        placeholder="Search signals…"
        hideLabel
      />
    </form>
  )
}

/** Notifications bell → dropdown of the highest-priority signals (built from the dashboard
 *  summary the shell already loads — no extra request). Closes on outside-click / Escape. */
function NotificationsMenu({ summary }: { summary: DashboardSummary | undefined }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const items = summary?.mostCriticalSignals ?? []
  const count = items.length

  return (
    <div className={menu.menuWrap} ref={wrapRef}>
      <Button
        variant="ghost"
        aria-label={count > 0 ? `Notifications (${count})` : 'Notifications'}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={menu.bell}>
          <Icon name="bell" size={18} />
          {count > 0 ? <span className={menu.bellDot} aria-hidden="true" /> : null}
        </span>
      </Button>

      {open ? (
        <div className={menu.menu} aria-label="Notifications">
          <div className={menu.menuHead}>
            <span>Notifications</span>
            {count > 0 ? <span className={menu.menuCount}>{count} need triage</span> : null}
          </div>
          {count === 0 ? (
            <p className={menu.menuEmpty}>You’re all caught up — no signals need attention.</p>
          ) : (
            <div className={menu.menuList}>
              {items.map((signal) => (
                <Link
                  key={signal.id}
                  to="/signals/$id"
                  params={{ id: signal.id }}
                  className={menu.menuRow}
                  onClick={() => setOpen(false)}
                >
                  <span
                    className={menu.menuDot}
                    style={{ background: SEVERITY_DOT[signal.severity] }}
                    aria-hidden="true"
                  />
                  <span className={menu.menuRowText}>
                    <span className={menu.menuTitle}>{signal.title}</span>
                    <span className={menu.menuMeta}>
                      {signal.id} · {cap(signal.severity)}
                    </span>
                  </span>
                  <span className={menu.menuRisk}>{signal.riskScore}</span>
                </Link>
              ))}
            </div>
          )}
          <div className={menu.menuFoot}>
            <Link to="/signals" className={menu.menuFootLink} onClick={() => setOpen(false)}>
              View all signals
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const NEW_SIGNAL_SEVERITIES = ['low', 'medium', 'high', 'critical']
const NEW_SIGNAL_SOURCES = ['web', 'social', 'internal', 'partner', 'api', 'manual']

/** "New signal" CTA → a modal capture form. The dataset is read-only (demo build), so on submit
 *  it confirms via a banner and opens the Signals Explorer rather than persisting. */
function NewSignalDialog({ onCreated }: { onCreated: (title: string) => void }) {
  const navigate = useNavigate()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [title, setTitle] = useState('')
  const [severity, setSeverity] = useState('high')
  const [source, setSource] = useState('internal')

  const close = () => dialogRef.current?.close()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = title.trim() || 'Untitled signal'
    close()
    onCreated(name)
    setTitle('')
    setSeverity('high')
    setSource('internal')
    navigate({ to: '/signals', search: {} })
  }

  return (
    <>
      <Button variant="primary" onClick={() => dialogRef.current?.showModal()}>
        New signal
      </Button>
      <dialog ref={dialogRef} className={menu.dialog} aria-labelledby="new-signal-title">
        <form onSubmit={submit}>
          <div className={menu.dialogHead}>
            <h2 className={menu.dialogTitle} id="new-signal-title">
              New signal
            </h2>
            <p className={menu.dialogSub}>Capture a signal to triage in the Explorer.</p>
          </div>
          <div className={menu.dialogBody}>
            <div className={menu.field}>
              <label className={menu.label} htmlFor="new-signal-title-input">
                Title
              </label>
              <input
                id="new-signal-title-input"
                className={menu.input}
                value={title}
                autoFocus
                placeholder="e.g. Unusual authentication pattern detected"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className={menu.dialogGrid}>
              <div className={menu.field}>
                <label className={menu.label} htmlFor="new-signal-severity">
                  Severity
                </label>
                <select
                  id="new-signal-severity"
                  className={menu.select}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {NEW_SIGNAL_SEVERITIES.map((v) => (
                    <option key={v} value={v}>
                      {cap(v)}
                    </option>
                  ))}
                </select>
              </div>
              <div className={menu.field}>
                <label className={menu.label} htmlFor="new-signal-source">
                  Source
                </label>
                <select
                  id="new-signal-source"
                  className={menu.select}
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {NEW_SIGNAL_SOURCES.map((v) => (
                    <option key={v} value={v}>
                      {v === 'api' ? 'API' : cap(v)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className={menu.note}>
              <Icon name="incidents" size={15} />
              Demo build — the dataset is read-only, so this signal is confirmed but not persisted.
            </p>
          </div>
          <div className={menu.dialogFoot}>
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create signal
            </Button>
          </div>
        </form>
      </dialog>
    </>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const health = useHealth()
  const summary = useDashboardSummary()
  const activeId = activeIdFor(pathname)
  const [notice, setNotice] = useState<string | null>(null)

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
              <NotificationsMenu summary={summary.data} />
              <NewSignalDialog
                onCreated={(title) =>
                  setNotice(
                    `New signal “${title}” captured — demo build, so it is not persisted to the dataset.`
                  )
                }
              />
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
      {notice ? (
        <div className={menu.notice}>
          <Banner tone="success" onRetry={() => setNotice(null)} retryLabel="Dismiss">
            {notice}
          </Banner>
        </div>
      ) : null}
      {children}
    </AppShell>
  )
}
