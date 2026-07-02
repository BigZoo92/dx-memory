'use client'

import { useEffect, useState } from 'react'
import type { ApiError, HealthResponse } from '@signalops/overfit-contracts-generated'
import { overfitApi } from '@signalops/overfit-api-client'
import { Card, StatusDot, Toggle } from '@signalops/overfit-ui'

const VARIANT_LABEL = 'Variant C — Overfit'

const FEATURE_FLAGS = [
  { key: 'ai', label: 'AI recommendations', on: true },
  { key: 'grouping', label: 'Incident grouping', on: true },
  { key: 'dense', label: 'Dense tables', on: true },
  { key: 'autoEscalation', label: 'Auto-escalation', on: false },
  { key: 'experimentalScoring', label: 'Experimental scoring', on: false }
]

export function SettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [flags, setFlags] = useState(() => FEATURE_FLAGS.map((f) => ({ ...f })))
  const [forced, setForced] = useState(false)
  const [banner, setBanner] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  useEffect(() => {
    overfitApi
      .getHealth()
      .then(setHealth)
      .catch(() => setHealth(null))
  }, [])

  function toggleForceError(v: boolean) {
    setForced(v)
    setBanner({
      tone: v ? 'error' : 'ok',
      text: v ? 'Simulated API error is ON — the demo error path is armed.' : 'Simulated API error cleared.'
    })
  }

  async function simulateOnce() {
    try {
      await overfitApi.simulateError()
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
                Arm the controlled error path (POST /api/simulate-error).
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
                setForced(false)
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
