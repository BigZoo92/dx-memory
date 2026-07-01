import { useEffect, useRef, useState, type ReactNode } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { NAV, VARIANT_LABEL, BUILD_INFO } from './constants'
import { apiGet } from './api'
import { Icon } from './icons'
import type { DashboardSummary, HealthResponse, Signal } from './types'

const SEVERITY_DOT: Record<string, string> = {
  critical: '#d92d20',
  high: '#ef7e00',
  medium: '#d9a200',
  low: '#2563eb'
}
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)
const NEW_SEVERITIES = ['low', 'medium', 'high', 'critical']
const NEW_SOURCES = ['web', 'social', 'internal', 'partner', 'api', 'manual']

// The whole app shell lives in this one file: sidebar, header, search, notifications, the new
// signal modal and the footer. It also does its own data fetching for the counts and health.
export function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [term, setTerm] = useState('')
  const [notifOpen, setNotifOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [nsTitle, setNsTitle] = useState('')
  const [nsSeverity, setNsSeverity] = useState('high')
  const [nsSource, setNsSource] = useState('internal')
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    apiGet<DashboardSummary>('/dashboard/summary')
      .then((d) => setSummary(d))
      .catch(() => setSummary(null))
    apiGet<HealthResponse>('/health')
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [location.pathname])

  useEffect(() => {
    if (!notifOpen) return
    const onDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotifOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [notifOpen])

  const crumbs = buildCrumbs(location.pathname)
  const critical: Signal[] = summary?.mostCriticalSignals ?? []

  function onSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate('/signals?search=' + encodeURIComponent(term))
  }

  function createSignal(e: React.FormEvent) {
    e.preventDefault()
    const name = nsTitle.trim() || 'Untitled signal'
    setDialogOpen(false)
    setNotice(`New signal “${name}” captured — demo build, so it is not persisted to the dataset.`)
    setNsTitle('')
    setNsSeverity('high')
    setNsSource('internal')
    navigate('/signals')
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
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => 'navItem' + (isActive ? ' navItemActive' : '')}
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
                </NavLink>
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
                    <p className="menuEmpty">You’re all caught up — no signals need attention.</p>
                  ) : (
                    <div className="menuList">
                      {critical.map((s) => (
                        <Link
                          key={s.id}
                          to={`/signals/${s.id}`}
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
                    <Link to="/signals" className="linkAccent" onClick={() => setNotifOpen(false)}>
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
        <div className="modalOverlay" onMouseDown={() => setDialogOpen(false)}>
          <div className="modalCard" onMouseDown={(e) => e.stopPropagation()}>
            <form onSubmit={createSignal}>
              <div className="modalHead">
                <h2 className="cardTitle" style={{ margin: 0 }}>
                  New signal
                </h2>
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 12.5 }}>
                  Capture a signal to triage in the Explorer.
                </p>
              </div>
              <div className="modalBody">
                <div className="field">
                  <label className="fieldLabel" htmlFor="ns-title">
                    Title
                  </label>
                  <input
                    id="ns-title"
                    className="input"
                    autoFocus
                    placeholder="e.g. Unusual authentication pattern detected"
                    value={nsTitle}
                    onChange={(e) => setNsTitle(e.target.value)}
                  />
                </div>
                <div className="grid-2" style={{ gap: 12 }}>
                  <div className="field">
                    <label className="fieldLabel" htmlFor="ns-sev">
                      Severity
                    </label>
                    <select
                      id="ns-sev"
                      className="select"
                      value={nsSeverity}
                      onChange={(e) => setNsSeverity(e.target.value)}
                    >
                      {NEW_SEVERITIES.map((v) => (
                        <option key={v} value={v}>
                          {cap(v)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="fieldLabel" htmlFor="ns-src">
                      Source
                    </label>
                    <select
                      id="ns-src"
                      className="select"
                      value={nsSource}
                      onChange={(e) => setNsSource(e.target.value)}
                    >
                      {NEW_SOURCES.map((v) => (
                        <option key={v} value={v}>
                          {v === 'api' ? 'API' : cap(v)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="muted" style={{ fontSize: 12.5 }}>
                  Demo build — the dataset is read-only, so this signal is confirmed but not
                  persisted.
                </p>
              </div>
              <div className="modalFoot">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create signal
                </button>
              </div>
            </form>
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
