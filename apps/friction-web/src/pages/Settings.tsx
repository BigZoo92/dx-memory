import { useEffect, useState } from 'react'
import { apiGet, apiPost, setForceError, isForceError } from '../api'
import type { ApiError, HealthResponse } from '../types'
import { VARIANT_LABEL, FEATURE_FLAGS } from '../constants'
import { Card, Toggle, StatusDot } from '../components'

export function Settings() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [flags, setFlags] = useState(() => FEATURE_FLAGS.map((f) => ({ ...f })))
  const [forced, setForced] = useState(isForceError())
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    apiGet<HealthResponse>('/health')
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [])

  function toggleForceError(v: boolean) {
    setForced(v)
    setForceError(v)
    setBanner({
      tone: v ? 'error' : 'ok',
      text: v
        ? 'Simulated API error is ON — reads will fail across the app.'
        : 'Simulated API error cleared.'
    })
  }

  async function simulateOnce() {
    try {
      await apiPost('/simulate-error')
      setBanner({ tone: 'ok', text: 'No error (unexpected).' })
    } catch (e) {
      const err = e as ApiError
      setBanner({ tone: 'error', text: `${err.code}: ${err.message} (requestId ${err.requestId})` })
    }
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1 className="pageTitle">Settings</h1>
          <p className="pageSubtitle">Environment, feature flags and demo controls.</p>
        </div>
      </div>

      {banner && <div className={`banner banner-${banner.tone}`}>{banner.text}</div>}

      <div className="grid-2">
        <Card title="Environment">
          <div className="list">
            <div className="listRow">
              <span>API status</span>
              <span className="row" style={{ gap: 7 }}>
                <StatusDot tone={health ? 'ok' : 'down'} />
                {health ? health.status : 'unreachable'}
              </span>
            </div>
            <div className="listRow">
              <span>Dataset version</span>
              <span className="mono">{health?.datasetVersion ?? 'v2.4.0'}</span>
            </div>
            <div className="listRow">
              <span>Variant</span>
              <span>{VARIANT_LABEL}</span>
            </div>
            <div className="listRow">
              <span>Region</span>
              <span className="mono">eu-west-1</span>
            </div>
          </div>
        </Card>

        <Card title="Feature flags">
          <div className="list">
            {flags.map((f, i) => (
              <div key={f.key} className="listRow">
                <span>{f.label}</span>
                <Toggle
                  label={f.label}
                  checked={f.on}
                  onChange={(v) => setFlags(flags.map((x, xi) => (xi === i ? { ...x, on: v } : x)))}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Demo controls">
        <div className="list">
          <div className="listRow">
            <div>
              <div>Simulate API error</div>
              <div className="muted" style={{ fontSize: 12 }}>
                Force every read (except health) to fail with a simulated error.
              </div>
            </div>
            <Toggle label="Simulate API error" checked={forced} onChange={toggleForceError} />
          </div>
          <div className="listRow">
            <span>Trigger one API error (POST /api/simulate-error)</span>
            <button className="btn btn-secondary btn-sm" onClick={simulateOnce}>
              Trigger
            </button>
          </div>
          <div className="listRow">
            <span>Reset demo state</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                toggleForceError(false)
                setFlags(FEATURE_FLAGS.map((f) => ({ ...f })))
                setBanner({ tone: 'ok', text: 'Demo state reset.' })
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}
