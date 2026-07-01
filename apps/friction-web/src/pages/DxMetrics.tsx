import { useEffect, useState } from 'react'
import { apiGet } from '../api'
import type { ApiError, DxMetric, DxMetricsResponse } from '../types'
import { Card, StatTile, ErrorState, SkeletonRows } from '../components'

// Local formatters for the metric values.
function fmtTime(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
function fmtKb(v: number): string {
  return `${v} KB`
}
function fmtMsSmall(v: number): string {
  return `${v} ms`
}

type Row = { label: string; key: keyof DxMetric; kind: 'time' | 'kb' | 'ms' | 'score' | 'num' }

const ROWS: Row[] = [
  { label: 'Install time', key: 'installTimeMs', kind: 'time' },
  { label: 'Typecheck time', key: 'typecheckTimeMs', kind: 'time' },
  { label: 'Test time', key: 'testTimeMs', kind: 'time' },
  { label: 'Build time', key: 'buildTimeMs', kind: 'time' },
  { label: 'Docker build time', key: 'dockerBuildTimeMs', kind: 'time' },
  { label: 'CI duration', key: 'ciDurationMs', kind: 'time' },
  { label: 'Bundle size', key: 'bundleSizeKb', kind: 'kb' },
  { label: 'Main chunk size', key: 'mainChunkSizeKb', kind: 'kb' },
  { label: 'Lighthouse performance', key: 'lighthousePerformance', kind: 'score' },
  { label: 'Table render time', key: 'tableRenderTimeMs', kind: 'ms' },
  { label: 'Files touched · AI task', key: 'filesTouchedForAiTask', kind: 'num' },
  { label: 'Tests impacted', key: 'testsImpacted', kind: 'num' },
  { label: 'Error reproduction steps', key: 'errorReproductionSteps', kind: 'num' },
  { label: 'Docs pages needed', key: 'docsPagesNeeded', kind: 'num' }
]

const VARIANT_NAME: Record<string, string> = {
  friction: 'A · Friction',
  flow: 'B · Flow',
  overfit: 'C · Overfit'
}

function fmt(kind: Row['kind'], v: number): string {
  if (kind === 'time') return fmtTime(v)
  if (kind === 'kb') return fmtKb(v)
  if (kind === 'ms') return fmtMsSmall(v)
  return String(v)
}

export function DxMetrics() {
  const [data, setData] = useState<DxMetricsResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    setError(null)
    apiGet<DxMetricsResponse>('/dx-metrics')
      .then((d) => setData(d))
      .catch((e) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <SkeletonRows rows={8} />
  if (error || !data) return <ErrorState error={error} onRetry={load} />

  const by = (v: string) => data.metrics.find((m) => m.variant === v)!
  const friction = by('friction')

  function bestVariant(key: keyof DxMetric): string {
    const higher = key === 'lighthousePerformance'
    let best = data!.metrics[0]
    for (const m of data!.metrics) {
      if (
        higher
          ? (m[key] as number) > (best[key] as number)
          : (m[key] as number) < (best[key] as number)
      )
        best = m
    }
    return best.variant
  }

  function CompareGroup({
    title,
    metricKey,
    kind
  }: {
    title: string
    metricKey: keyof DxMetric
    kind: Row['kind']
  }) {
    const values = data!.metrics.map((m) => ({ variant: m.variant, value: m[metricKey] as number }))
    const max = Math.max(...values.map((v) => v.value))
    return (
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>{title}</div>
        <div className="variantBars">
          <div className="variantBarGroup">
            {values.map((v) => (
              <div
                key={v.variant}
                title={`${VARIANT_NAME[v.variant]}: ${fmt(kind, v.value)}`}
                className={'variantBar' + (v.variant === 'friction' ? ' current' : '')}
                style={{ height: `${(v.value / max) * 100}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="pageHead">
        <div>
          <h1 className="pageTitle">DX Metrics</h1>
          <p className="pageSubtitle">
            Delivery cost and developer experience, compared across variants.
          </p>
        </div>
        <div className="row">
          <span className="badge badge-orange">Showing Friction</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const lines = ['Metric,A Friction,B Flow,C Overfit,Best']
              for (const r of ROWS) {
                lines.push(
                  [
                    JSON.stringify(r.label),
                    fmt(r.kind, by('friction')[r.key] as number),
                    fmt(r.kind, by('flow')[r.key] as number),
                    fmt(r.kind, by('overfit')[r.key] as number),
                    VARIANT_NAME[bestVariant(r.key)]
                  ].join(',')
                )
              }
              const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'dx-metrics.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'dx-metrics.json'
              a.click()
              URL.revokeObjectURL(url)
            }}
          >
            Export JSON
          </button>
        </div>
      </div>

      {data.source === 'seed' && (
        <div
          className="banner"
          style={{
            background: 'var(--so-amber-bg)',
            color: 'var(--so-amber-fg)',
            borderColor: '#f0dcae'
          }}
        >
          These numbers are seed / demo values (no metrics collection pipeline in this variant), not
          measured on this machine.
        </div>
      )}

      <div className="grid-kpis">
        <Card title="Build">
          <div className="kpiValue">{fmtTime(friction.buildTimeMs)}</div>
          <div className="sub-metric">
            <span>Install</span>
            <span>{fmtTime(friction.installTimeMs)}</span>
          </div>
          <div className="sub-metric">
            <span>Typecheck</span>
            <span>{fmtTime(friction.typecheckTimeMs)}</span>
          </div>
          <div className="sub-metric">
            <span>Test</span>
            <span>{fmtTime(friction.testTimeMs)}</span>
          </div>
        </Card>
        <Card title="Ship">
          <div className="kpiValue">{fmtTime(friction.ciDurationMs)}</div>
          <div className="sub-metric">
            <span>Docker build</span>
            <span>{fmtTime(friction.dockerBuildTimeMs)}</span>
          </div>
          <div className="sub-metric">
            <span>Pipeline</span>
            <span className="muted">install → test → build</span>
          </div>
        </Card>
        <Card title="Run">
          <div className="kpiValue">{friction.lighthousePerformance}</div>
          <div className="sub-metric">
            <span>Table render</span>
            <span>{fmtMsSmall(friction.tableRenderTimeMs)}</span>
          </div>
          <div className="sub-metric">
            <span>Bundle</span>
            <span>{fmtKb(friction.bundleSizeKb)}</span>
          </div>
        </Card>
        <Card title="Change">
          <div className="kpiValue">{friction.filesTouchedForAiTask}</div>
          <div className="sub-metric">
            <span>Tests impacted</span>
            <span>{friction.testsImpacted}</span>
          </div>
          <div className="sub-metric">
            <span>Error repro steps</span>
            <span>{friction.errorReproductionSteps}</span>
          </div>
          <div className="sub-metric">
            <span>Docs pages</span>
            <span>{friction.docsPagesNeeded}</span>
          </div>
        </Card>
      </div>

      <Card title="Variant comparison" right={<span className="muted">lower is better</span>}>
        <div className="row" style={{ alignItems: 'stretch', gap: 22 }}>
          <CompareGroup title="CI duration" metricKey="ciDurationMs" kind="time" />
          <CompareGroup title="Bundle size" metricKey="bundleSizeKb" kind="kb" />
          <CompareGroup
            title="Files touched · AI task"
            metricKey="filesTouchedForAiTask"
            kind="num"
          />
        </div>
        <div className="row" style={{ marginTop: 10, fontSize: 12, color: 'var(--so-slate-500)' }}>
          <span>A · Friction (highlighted) · B · Flow · C · Overfit</span>
        </div>
      </Card>

      <Card title="AI task — Add Risk trend capability">
        <div className="grid-kpis">
          <StatTile label="Files touched" value={friction.filesTouchedForAiTask} />
          <StatTile label="Tests impacted" value={friction.testsImpacted} />
          <StatTile label="Error repro steps" value={friction.errorReproductionSteps} />
          <StatTile label="Docs pages" value={friction.docsPagesNeeded} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span className="badge badge-red">High cost</span>
          <span style={{ marginLeft: 10 }} className="muted">
            The same change touches many duplicated files across the frontend and backend.
          </span>
        </div>
      </Card>

      <div className="grid-kpis">
        <StatTile label="Bundle size" value={fmtKb(friction.bundleSizeKb)} />
        <StatTile label="Main chunk" value={fmtKb(friction.mainChunkSizeKb)} />
        <StatTile
          label="Lighthouse"
          value={friction.lighthousePerformance}
          barPercent={friction.lighthousePerformance}
        />
        <StatTile label="Table render" value={fmtMsSmall(friction.tableRenderTimeMs)} />
      </div>

      <Card title="All metrics" flush>
        <div className="tableWrap">
          <table className="table metricsTable">
            <thead>
              <tr>
                <th>Metric</th>
                <th className="currentCol">A · Friction</th>
                <th>B · Flow</th>
                <th>C · Overfit</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => {
                const best = bestVariant(r.key)
                return (
                  <tr key={r.key as string}>
                    <td className="cellTitle">{r.label}</td>
                    <td className={'currentCol' + (best === 'friction' ? ' best' : '')}>
                      {fmt(r.kind, by('friction')[r.key] as number)}
                    </td>
                    <td className={best === 'flow' ? 'best' : ''}>
                      {fmt(r.kind, by('flow')[r.key] as number)}
                    </td>
                    <td className={best === 'overfit' ? 'best' : ''}>
                      {fmt(r.kind, by('overfit')[r.key] as number)}
                    </td>
                    <td>{VARIANT_NAME[best]}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="CI history" flush>
        <div className="tableWrap">
          <table className="table">
            <thead>
              <tr>
                <th>Commit</th>
                <th>SHA · time</th>
                <th>Duration</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['fix pipeline', 'a1b2c3d · 2h ago', '9m 22s', true],
                ['accessibility pass', 'e4f5a6b · 5h ago', '9m 05s', true],
                ['resolve metrics error', '7c8d9e0 · 1d ago', '9m 41s', true],
                ['clean flow app', 'b2c3d4e · 1d ago', '9m 18s', true],
                ['add compare screen', 'f5a6b7c · 2d ago', '9m 33s', false]
              ].map((row, i) => (
                <tr key={i}>
                  <td>{row[0] as string}</td>
                  <td className="mono muted">{row[1] as string}</td>
                  <td className="mono">{row[2] as string}</td>
                  <td>
                    <span className={`badge ${row[3] ? 'badge-green' : 'badge-red'}`}>
                      {row[3] ? 'Passed' : 'Failed'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
