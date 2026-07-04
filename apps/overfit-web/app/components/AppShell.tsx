'use client'

// The application shell: sidebar, topbar (breadcrumb + search + notifications + New signal),
// footer. Uses Next routing; fetches nav counts + health through the api-client. Kept in the app
// (not the ui package) so the ui package stays framework-agnostic.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { DashboardSummary, HealthResponse } from '@signalops/overfit-contracts-generated'
import { overfitApi } from '@signalops/overfit-api-client'
import { Icon, type IconName } from '@signalops/overfit-ui'

const VARIANT_LABEL = 'Variant C — Overfit'
const BUILD_INFO = 'SignalOps · overfit · build local · v0.1.0'

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Overview', icon: 'overview' },
  { to: '/signals', label: 'Signals', icon: 'signals' },
  { to: '/incidents', label: 'Incidents', icon: 'incidents' },
  { to: '/compare', label: 'Compare', icon: 'compare' },
  { to: '/dx-metrics', label: 'DX Metrics', icon: 'dx-metrics' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
  { to: '/ops', label: 'Ops', icon: 'ops' }
]

const SEVERITY_DOT: Record<string, string> = {
  critical: '#d92d20',
  high: '#ef7e00',
  medium: '#d9a200',
  low: '#2563eb'
}
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [term, setTerm] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    overfitApi
      .getDashboardSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
    overfitApi
      .getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [pathname])

  useEffect(() => {
    if (!notifOpen) return
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNotifOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [notifOpen])

  const crumbs = buildCrumbs(pathname)
  const critical = summary?.mostCriticalSignals ?? []

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    router.push('/signals?search=' + encodeURIComponent(term))
  }

  function isActive(to: string): boolean {
    return to === '/' ? pathname === '/' : pathname.startsWith(to)
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="logoMark">S</span>
          <div>
            <div className="brandName">SignalOps</div>
            <div className="brandSub">Operational signals</div>
          </div>
        </div>
        <div className="variantPill">
          <span className="dot" />
          {VARIANT_LABEL}
        </div>
        <div>
          <div className="navGroupLabel">Product</div>
          <ul className="navList">
            {NAV.map((item) => (
              <li key={item.to}>
                <Link
                  href={item.to}
                  className={'navItem' + (isActive(item.to) ? ' navItemActive' : '')}
                >
                  <Icon name={item.icon} size={18} className="navIcon" />
                  <span className="navLabel">{item.label}</span>
                  {item.label === 'Signals' && summary && (
                    <span className="navCount">
                      {summary.kpis.openSignals.value.toLocaleString()}
                    </span>
                  )}
                  {item.label === 'Incidents' && summary && (
                    <span className="navCount">{summary.kpis.activeIncidents.value}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="spacer" />
        <div className="userBlock">
          <span className="avatar">AS</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Amelia Stone</div>
            <div className="brandSub">Lead analyst</div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="header">
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
              <span key={i} className="crumbs">
                {i > 0 && <span className="crumbSep">/</span>}
                <span className={i === crumbs.length - 1 ? 'crumbCurrent' : 'crumb'}>{c}</span>
              </span>
            ))}
          </nav>
          <div className="headerRight">
            <form className="search topbarSearch" onSubmit={onSearch}>
              <span className="searchIcon">
                <Icon name="search" size={16} />
              </span>
              <input
                className="searchInput"
                placeholder="Search signals…"
                aria-label="Search signals"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
              />
            </form>

            <div className="menuWrap" ref={notifRef}>
              <button
                className="btn btn-ghost btn-sm"
                aria-label={
                  critical.length > 0 ? `Notifications (${critical.length})` : 'Notifications'
                }
                aria-haspopup="true"
                aria-expanded={notifOpen}
                onClick={() => setNotifOpen((o) => !o)}
              >
                <span className="bell">
                  <Icon name="bell" size={18} />
                  {critical.length > 0 && <span className="bellDot" />}
                </span>
              </button>
              {notifOpen && (
                <div className="menu" aria-label="Notifications">
                  <div className="menuHead">
                    <span>Notifications</span>
                    {critical.length > 0 && (
                      <span className="menuCount">{critical.length} need triage</span>
                    )}
                  </div>
                  {critical.length === 0 ? (
                    <p className="menuEmpty">You are all caught up — no signals need attention.</p>
                  ) : (
                    <div className="menuList">
                      {critical.map((s) => (
                        <Link
                          key={s.id}
                          href={`/signals/${s.id}`}
                          className="menuRow"
                          onClick={() => setNotifOpen(false)}
                        >
                          <span
                            className="menuDot"
                            style={{ background: SEVERITY_DOT[s.severity] }}
                          />
                          <span className="menuRowText">
                            <span className="menuTitle">{s.title}</span>
                            <span className="menuMeta">
                              {s.id} · {cap(s.severity)}
                            </span>
                          </span>
                          <span className="menuRisk mono">{s.riskScore}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                  <div className="menuFoot">
                    <Link
                      href="/signals"
                      className="linkAccent"
                      onClick={() => setNotifOpen(false)}
                    >
                      View all signals
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <button className="btn btn-primary btn-sm" onClick={() => setDialogOpen(true)}>
              New signal
            </button>
          </div>
        </header>

        <main className="content">
          {notice && (
            <div className="banner banner-ok" style={{ marginBottom: 16 }}>
              {notice}
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => setNotice(null)}
              >
                Dismiss
              </button>
            </div>
          )}
          {children}
        </main>

        <footer className="footer">
          <span>
            {BUILD_INFO} · dataset {health?.datasetVersion ?? 'v2.4.0'}
          </span>
          <span className="statusDot">
            <span
              className="dot"
              style={{ background: health ? 'var(--so-green-fg)' : 'var(--so-red-fg)' }}
            />
            API {health ? health.status : 'unreachable'}
          </span>
        </footer>
      </div>

      {dialogOpen && (
        <div
          className="modalOverlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDialogOpen(false)
          }}
        >
          <div className="modalCard" role="dialog" aria-modal="true">
            <div className="modalHead">
              <h2 className="cardTitle" style={{ margin: 0 }}>
                New signal
              </h2>
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                Capture a signal to triage in the Explorer.
              </p>
            </div>
            <div className="modalBody">
              <p className="muted" style={{ fontSize: 12.5 }}>
                Demo build — the dataset is read-only, so this signal is confirmed but not
                persisted.
              </p>
            </div>
            <div className="modalFoot">
              <button className="btn btn-secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setDialogOpen(false)
                  setNotice(
                    'New signal captured — demo build, so it is not persisted to the dataset.'
                  )
                }}
              >
                Create signal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function buildCrumbs(pathname: string): string[] {
  if (pathname === '/') return ['SignalOps']
  const parts = pathname.split('/').filter(Boolean)
  const labelMap: Record<string, string> = {
    signals: 'Signals',
    incidents: 'Incidents',
    compare: 'Compare',
    'dx-metrics': 'DX Metrics',
    settings: 'Settings',
    ops: 'Ops'
  }
  const out = ['SignalOps']
  parts.forEach((p) => out.push(labelMap[p] ?? p))
  return out
}
