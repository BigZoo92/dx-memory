import { useEffect, useState } from 'react'
import { summary, variants, VARIANT_ORDER } from './data'
import type { VariantId } from './types'
import { VARIANT_COLOR, VARIANT_LABEL } from './lib/theme'
import { TooltipHost, Reveal, SectionHead, Legend } from './components/ui'
import { Hero } from './components/Hero'
import { AxisTracks } from './components/charts/AxisTracks'
import { PositioningPlot } from './components/charts/PositioningPlot'
import { ForceGraph } from './components/charts/ForceGraph'
import { BundleTreemap } from './components/charts/Treemap'
import { MetricBarGroup } from './components/charts/MetricBars'
import { MetricTable } from './components/MetricTable'

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'why', label: 'Why Flow wins' },
  { id: 'axes', label: 'Build·Ship·Run·Change' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'build', label: 'Build & CI' },
  { id: 'bundle', label: 'Bundle' },
  { id: 'runtime', label: 'Runtime & UX' },
  { id: 'sustainability', label: 'Sustainability' },
  { id: 'table', label: 'All metrics' }
]

const LEGEND = VARIANT_ORDER.map((id) => ({ label: VARIANT_LABEL[id], color: VARIANT_COLOR[id].mark }))
const NAV_IDS = NAV.map((n) => n.id)

function useScrollSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (vis[0]) setActive(vis[0].target.id)
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: [0, 0.3, 0.6] }
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [ids])
  return active
}

function VariantPicker({ value, onChange }: { value: VariantId; onChange: (v: VariantId) => void }) {
  return (
    <div className="seg">
      {VARIANT_ORDER.map((id) => (
        <button key={id} className={value === id ? 'on' : ''} onClick={() => onChange(id)} style={value === id ? { color: VARIANT_COLOR[id].glow } : undefined}>
          {VARIANT_LABEL[id]}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const active = useScrollSpy(NAV_IDS)
  const [archId, setArchId] = useState<VariantId>('flow')
  const flow = variants.find((v) => v.meta.variant === 'flow')!

  return (
    <TooltipHost>
      <nav className="nav">
        <div className="nav-inner">
          <span className="nav-brand">
            <span className="nav-dot" /> SignalOps · Delivery Cost
          </span>
          <div className="nav-links">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} className={`nav-link ${active === n.id ? 'active' : ''}`}>
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <Hero />

      <main className="shell">
        {/* ---------------------------------------------------------- WHY FLOW ---- */}
        <section id="why">
          <SectionHead
            kicker="The thesis"
            title="Small looks cheap. Safe-to-change is cheap."
            lede={
              <>
                Every raw size metric rewards <b>Friction</b> for being tiny — that’s exactly its trap. Plot apparent leanness
                against how safe the code is to change, and the picture inverts: Friction is lean but the riskiest to touch,
                while <b>Flow</b> trades a little size for the safest, cleanest system. Bubble size = total delivery score.
              </>
            }
          />
          <Reveal className="card">
            <PositioningPlot />
            <Legend items={LEGEND} />
          </Reveal>
        </section>

        {/* -------------------------------------------------------------- AXES ---- */}
        <section id="axes">
          <SectionHead
            kicker="Four axes of delivery cost"
            title="Build · Ship · Run · Change"
            lede={
              <>
                The headline <b>Total Delivery Score</b> is a weighted mean over the axes actually measured for each variant
                (weights: Change {pct('Change')}, Run {pct('Run')}, Ship {pct('Ship')}, Build {pct('Build')}). Change dominates
                because change is where lifetime cost concentrates — and it’s the only axis fully measured for all three today.
              </>
            }
          />
          <Reveal className="card">
            <AxisTracks />
            <Legend items={LEGEND} />
            <p className="chart-note">
              Dashed rings = pending: an axis with too little measured signal (build/CI timings and full runtime land in pass 2)
              is never scored as a fake zero. Flow reaches into <b>Run</b> because it’s the only variant with a proven Lighthouse
              run.
            </p>
          </Reveal>
        </section>

        {/* ----------------------------------------------------- ARCHITECTURE ---- */}
        <section id="architecture">
          <SectionHead
            kicker="Structural health"
            title="The shape of each codebase"
            lede={
              <>
                Every node is a project (npm package ◯ or Rust crate ◇); size = how many projects depend on it (change blast
                radius). Friction is a 2-project monolith with no seams; Overfit fragments the same product into 31 projects;
                Flow sits in the healthy middle.
              </>
            }
          />
          <div className="controls">
            <VariantPicker value={archId} onChange={setArchId} />
            <span className="tiny muted" style={{ marginLeft: 'auto' }}>
              {archMeta(archId)}
            </span>
          </div>
          <div className="grid cols-2">
            <Reveal className="card">
              <ForceGraph id={archId} />
              <p className="chart-note">◯ npm package · ◇ Rust crate · hover a node to trace its dependents.</p>
            </Reveal>
            <Reveal className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>
                Architecture signals (all three)
              </div>
              <MetricBarGroup
                metricKeys={['nxProjects', 'circularDeps', 'fanInMax', 'avgComplexity', 'businessRatio', 'anyCount']}
              />
            </Reveal>
          </div>
        </section>

        {/* -------------------------------------------------------- BUILD & CI ---- */}
        <section id="build">
          <SectionHead
            kicker="Build & CI"
            title="What it costs to compile, check and ship"
            lede={
              <>
                Build, typecheck, test and lint <i>timings</i> are opt-in (they cost minutes and need the full toolchain) so they
                run in CI, not in the static pass — shown here honestly as “pending” rather than guessed. The deployable artifact
                size is measured now.
              </>
            }
          />
          <Reveal className="card">
            <MetricBarGroup metricKeys={['buildTimeMs', 'typecheckTimeMs', 'testTimeMs', 'lintTimeMs', 'distTotalKb']} />
            <p className="chart-note">
              Run <code className="mono">pnpm metrics:dynamic:timings</code> (or the CI job) to replace the pending build bars
              with real wall-clock numbers.
            </p>
          </Reveal>
        </section>

        {/* ------------------------------------------------------------ BUNDLE ---- */}
        <section id="bundle">
          <SectionHead
            kicker="Frontend delivery"
            title="Every kilobyte the browser downloads"
            lede="Real gzip and brotli sizes, computed from each variant’s actual build output. The treemaps show chunk composition — one giant chunk means poor code-splitting; a spread means the router lazy-loads."
          />
          <div className="grid cols-3" style={{ marginBottom: 18 }}>
            {VARIANT_ORDER.map((id) => (
              <Reveal className="card" key={id} delay={0}>
                <div className="between" style={{ marginBottom: 12 }}>
                  <span className="card-title" style={{ color: VARIANT_COLOR[id].glow }}>
                    {VARIANT_LABEL[id]}
                  </span>
                  <span className="tiny muted">{bundleMeta(id)}</span>
                </div>
                <BundleTreemap id={id} />
              </Reveal>
            ))}
          </div>
          <Reveal className="card">
            <MetricBarGroup metricKeys={['bundleJsGzipKb', 'bundleJsBrotliKb', 'largestChunkKb', 'jsChunks', 'distTotalKb']} />
          </Reveal>
        </section>

        {/* --------------------------------------------------------- RUNTIME ---- */}
        <section id="runtime">
          <SectionHead
            kicker="Runtime & visible UX"
            title="From technical choices to what users feel"
            lede={
              <>
                Lighthouse ties the architecture back to experience. Flow’s reports are collected; Friction and Overfit haven’t
                been audited yet (no served URL in this pass), shown as pending. This is the seam where post-deploy audits plug in.
              </>
            }
          />
          <Reveal className="card">
            <MetricBarGroup
              metricKeys={['lighthousePerformance', 'lcpMs', 'tbtMs', 'cls', 'speedIndexMs', 'fcpMs']}
            />
            <p className="chart-note">
              Flow scores {lh('lighthousePerformance')} Lighthouse Performance with LCP {lh('lcpMs')} and CLS {lh('cls')} —
              measured, not asserted.
            </p>
          </Reveal>
        </section>

        {/* --------------------------------------------------- SUSTAINABILITY ---- */}
        <section id="sustainability">
          <SectionHead
            kicker="Sustainability & accessibility"
            title="Weight on the wire, and who can use it"
            lede="Transferred bytes, request count and an order-of-magnitude CO₂ estimate per view, plus the automated accessibility score. Lighter pages cost less to run and emit less."
          />
          <Reveal className="card">
            <MetricBarGroup metricKeys={['transferredKb', 'requests', 'co2PerViewMg', 'lighthouseAccessibility']} />
            <p className="chart-note">
              CO₂ is a Sustainable-Web-Design order-of-magnitude estimate from transferred bytes (≈0.5 g/MB) — directional, not
              a certified figure.
            </p>
          </Reveal>
        </section>

        {/* ------------------------------------------------------------ TABLE ---- */}
        <section id="table">
          <SectionHead
            kicker="The whole picture"
            title="Every metric, side by side"
            lede="All collected metrics with unit, direction and winner. Filter by axis, search, sort by any column, and toggle variants to compare two head-to-head with deltas."
          />
          <Reveal>
            <MetricTable />
          </Reveal>
        </section>
      </main>

      <footer className="shell">
        <div className="between wrap" style={{ alignItems: 'flex-start', gap: 30 }}>
          <div style={{ maxWidth: 520 }}>
            <b style={{ color: 'var(--ink)' }}>How this is scored.</b> Every raw value is collected automatically from the
            repository (static analysis, real gzip/brotli, manifest graph, Lighthouse reports) — nothing is hand-entered.
            Values are min-max normalised across variants (direction-aware; structural metrics use a healthy-band “balance”
            score). Scores are fully configurable in <code className="mono">tools/metrics/config/scoring.config.json</code>.
          </div>
          <div style={{ maxWidth: 420 }}>
            <b style={{ color: 'var(--ink)' }}>Pending (pass 2):</b>{' '}
            {Object.keys(summary.notMeasured).join(', ')} — plus build/CI timings and full runtime audits for all variants, and
            the human/AI change-cost scenarios. Each is surfaced as “pending”, never faked.
            <div style={{ marginTop: 14 }} className="tiny muted">
              collector v{summary.collectorVersion} · {summary.commitShort} · generated {new Date(summary.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} · flow ok metrics: {flow.statuses.ok}
            </div>
          </div>
        </div>
      </footer>
    </TooltipHost>
  )
}

/* -------------------------------------------------------------------- helpers */
function pct(axis: string): string {
  const w = summary.axisWeights[axis]
  return typeof w === 'number' ? `${Math.round(w * 100)}%` : '—'
}
function archMeta(id: VariantId): string {
  const v = variants.find((x) => x.meta.variant === id)!
  const n = v.metrics.nxProjects
  const e = v.graph.edges.length
  return `${n?.value ?? '—'} projects · ${e} internal edges · central: ${v.graph.central[0]?.name?.replace('@signalops/', '') ?? '—'}`
}
function bundleMeta(id: VariantId): string {
  const v = variants.find((x) => x.meta.variant === id)!
  const g = v.metrics.bundleJsGzipKb
  return g?.status === 'ok' ? `${g.value} KB gzip` : 'pending'
}
function lh(key: string): string {
  const m = variants.find((v) => v.meta.variant === 'flow')!.metrics[key]
  if (!m || m.status !== 'ok') return '—'
  if (key === 'lcpMs') return `${Math.round(m.value as number)}ms`
  return String(m.value)
}
