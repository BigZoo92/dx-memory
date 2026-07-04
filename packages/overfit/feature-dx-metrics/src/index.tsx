'use client'

import { useEffect, useState } from 'react'
import type { ApiError, DxMetric, DxMetricsResponse } from '@signalops/overfit-contracts-generated'
import { overfitApi } from '@signalops/overfit-api-client'
import { Card, ErrorState, SkeletonRows, StatTile } from '@signalops/overfit-ui'

function fmtTime(ms: number): string {
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  const m = Math.floor(ms / 60000)
  const s = Math.round((ms % 60000) / 1000)
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}
const fmtKb = (v: number) => `${v} KB`
const fmtMs = (v: number) => `${v} ms`

type Kind = 'time' | 'kb' | 'ms' | 'score' | 'num'
type Row = { label: string; key: keyof DxMetric; kind: Kind }

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

function fmt(kind: Kind, v: number): string {
  if (kind === 'time') return fmtTime(v)
  if (kind === 'kb') return fmtKb(v)
  if (kind === 'ms') return fmtMs(v)
  return String(v)
}

export function DxMetricsPage() {
  const [data, setData] = useState<DxMetricsResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(true)

  function load() {
    setLoading(true)
    setError(null)
    overfitApi
      .getDxMetrics()
      .then(setData)
      .catch((e: ApiError) => setError(e))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  if (loading) return <SkeletonRows rows={8} />
  if (error || !data) return <ErrorState error={error} onRetry={load} />

  const by = (v: string) => data.metrics.find((m) => m.variant === v) as DxMetric
  const overfit = by('overfit')

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
    kind: Kind
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
                className={'variantBar' + (v.variant === 'overfit' ? ' current' : '')}
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
          <span className="badge badge-orange">Showing Overfit</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => download('dx-metrics.csv', buildDxCsv(data), 'text/csv')}
          >
            Export CSV
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() =>
              download('dx-metrics.json', JSON.stringify(data, null, 2), 'application/json')
            }
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
          These numbers are seed / demo values transcribed from the measurement protocol, not
          measured on this machine.
        </div>
      )}

      <div className="grid-kpis">
        <Card title="Build">
          <div className="kpiValue">{fmtTime(overfit.buildTimeMs)}</div>
          <SubMetric label="Install" value={fmtTime(overfit.installTimeMs)} />
          <SubMetric label="Typecheck" value={fmtTime(overfit.typecheckTimeMs)} />
          <SubMetric label="Test" value={fmtTime(overfit.testTimeMs)} />
        </Card>
        <Card title="Ship">
          <div className="kpiValue">{fmtTime(overfit.ciDurationMs)}</div>
          <SubMetric label="Docker build" value={fmtTime(overfit.dockerBuildTimeMs)} />
          <SubMetric label="Pipeline" value="install → test → build" />
        </Card>
        <Card title="Run">
          <div className="kpiValue">{overfit.lighthousePerformance}</div>
          <SubMetric label="Table render" value={fmtMs(overfit.tableRenderTimeMs)} />
          <SubMetric label="Bundle" value={fmtKb(overfit.bundleSizeKb)} />
        </Card>
        <Card title="Change">
          <div className="kpiValue">{overfit.filesTouchedForAiTask}</div>
          <SubMetric label="Tests impacted" value={String(overfit.testsImpacted)} />
          <SubMetric label="Error repro steps" value={String(overfit.errorReproductionSteps)} />
          <SubMetric label="Docs pages" value={String(overfit.docsPagesNeeded)} />
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
          <span>A · Friction · B · Flow · C · Overfit (highlighted)</span>
        </div>
      </Card>

      <Card title="AI task — Add Risk trend capability">
        <div className="grid-kpis">
          <StatTile label="Files touched" value={overfit.filesTouchedForAiTask} />
          <StatTile label="Tests impacted" value={overfit.testsImpacted} />
          <StatTile label="Error repro steps" value={overfit.errorReproductionSteps} />
          <StatTile label="Docs pages" value={overfit.docsPagesNeeded} />
        </div>
        <div style={{ marginTop: 12 }}>
          <span className="badge badge-red">High cost</span>
          <span style={{ marginLeft: 10 }} className="muted">
            One product column (Risk trend) forced coordinated edits across 41 files: Rust domain,
            DTOs, OpenAPI, fixtures, read models, generated TS contracts, runtime schema,
            api-client, feature package, UI, docs, ADR and governance manifests. See
            docs/overfit/change-management/risk-trend-change-surface.md.
          </span>
        </div>
      </Card>

      <div className="grid-kpis">
        <StatTile label="Bundle size" value={fmtKb(overfit.bundleSizeKb)} />
        <StatTile label="Main chunk" value={fmtKb(overfit.mainChunkSizeKb)} />
        <StatTile
          label="Lighthouse"
          value={overfit.lighthousePerformance}
          barPercent={overfit.lighthousePerformance}
        />
        <StatTile label="Table render" value={fmtMs(overfit.tableRenderTimeMs)} />
      </div>

      <Card title="All metrics" flush>
        <div className="tableWrap">
          <table className="table metricsTable">
            <thead>
              <tr>
                <th>Metric</th>
                <th>A · Friction</th>
                <th>B · Flow</th>
                <th className="currentCol">C · Overfit</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => {
                const best = bestVariant(r.key)
                return (
                  <tr key={r.key as string}>
                    <td className="cellTitle">{r.label}</td>
                    <td className={best === 'friction' ? 'best' : ''}>
                      {fmt(r.kind, by('friction')[r.key] as number)}
                    </td>
                    <td className={best === 'flow' ? 'best' : ''}>
                      {fmt(r.kind, by('flow')[r.key] as number)}
                    </td>
                    <td className={'currentCol' + (best === 'overfit' ? ' best' : '')}>
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
                ['add risk trend capability', 'c0ffee1 · 2h ago', '5m 10s', true],
                ['regenerate contracts', 'a11cee2 · 5h ago', '5m 02s', true],
                ['tighten schema policy', 'b0bcaf3 · 1d ago', '5m 22s', true],
                ['bump event envelope v1', 'de1e7e4 · 1d ago', '5m 08s', true],
                ['scaffold ops telemetry', 'facade5 · 2d ago', '5m 41s', false]
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

function bestOf(metrics: DxMetric[], key: keyof DxMetric): string {
  const higher = key === 'lighthousePerformance'
  let best = metrics[0]
  for (const m of metrics) {
    if (
      higher
        ? (m[key] as number) > (best[key] as number)
        : (m[key] as number) < (best[key] as number)
    )
      best = m
  }
  return best.variant
}

function buildDxCsv(data: DxMetricsResponse): string {
  const by = (v: string) => data.metrics.find((m) => m.variant === v) as DxMetric
  const lines = ['Metric,A Friction,B Flow,C Overfit,Best']
  for (const r of ROWS) {
    lines.push(
      [
        JSON.stringify(r.label),
        fmt(r.kind, by('friction')[r.key] as number),
        fmt(r.kind, by('flow')[r.key] as number),
        fmt(r.kind, by('overfit')[r.key] as number),
        VARIANT_NAME[bestOf(data.metrics, r.key)]
      ].join(',')
    )
  }
  return lines.join('\n')
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function SubMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="sub-metric">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
