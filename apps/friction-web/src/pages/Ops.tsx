import { useEffect, useState } from 'react'
import { apiGet } from '../api'
import type { HealthResponse } from '../types'
import { Card, StatusDot } from '../components'

// Operational status. This variant has no real Run tooling: no log store, no error inbox,
// no diagnostic pack, no correlation. Just a health check and a couple of static statuses.
export function Ops() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [checkedAt, setCheckedAt] = useState<string>('')

  function check() {
    apiGet<HealthResponse>('/health')
      .then((h) => {
        setHealth(h)
        setCheckedAt(new Date().toISOString().slice(0, 19).replace('T', ' '))
      })
      .catch(() => setHealth(null))
  }

  useEffect(() => {
    check()
  }, [])

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1 className="pageTitle">Operational status</h1>
          <p className="pageSubtitle">Basic health only.</p>
        </div>
        <button className="btn btn-secondary" onClick={check}>
          Refresh
        </button>
      </div>

      <Card title="System">
        <div className="list">
          <div className="listRow">
            <span>API</span>
            <span className="row" style={{ gap: 7 }}>
              <StatusDot tone={health ? 'ok' : 'down'} />
              {health ? health.status : 'unreachable'}
            </span>
          </div>
          <div className="listRow">
            <span>Version</span>
            <span className="mono">{health?.version ?? '—'}</span>
          </div>
          <div className="listRow">
            <span>Uptime</span>
            <span className="mono">{health ? `${health.uptimeSeconds}s` : '—'}</span>
          </div>
          <div className="listRow">
            <span>Last checked</span>
            <span className="mono">{checkedAt || '—'}</span>
          </div>
        </div>
      </Card>

      <Card title="Services">
        <div className="list">
          <div className="listRow">
            <span>Ingestion</span>
            <span className="muted">operational</span>
          </div>
          <div className="listRow">
            <span>Scoring</span>
            <span className="muted">operational</span>
          </div>
          <div className="listRow">
            <span>Notifications</span>
            <span className="muted">operational</span>
          </div>
        </div>
      </Card>

      <p className="muted" style={{ fontSize: 12.5 }}>
        No log stream, error inbox or diagnostic pack is available in this build.
      </p>
    </div>
  )
}
