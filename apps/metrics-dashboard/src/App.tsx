import { useEffect, useState } from 'react'
import { summary, variants, VARIANT_ORDER } from './data'
import type { VariantId } from './types'
import { VARIANT_COLOR, VARIANT_LABEL } from './lib/theme'
import { TooltipHost, Reveal, SectionHead, Legend } from './components/ui'
import { Hero } from './components/Hero'
import { ContrastBoard } from './components/ContrastBoard'
import { ChangeCost } from './components/ChangeCost'
import { AxisTracks } from './components/charts/AxisTracks'
import { ForceGraph } from './components/charts/ForceGraph'
import { MetricBarGroup } from './components/charts/MetricBars'
import { MetricTable } from './components/MetricTable'

/**
 * /metrics is a demonstration, not a monitoring dashboard. Five moments:
 *   1. Verdict   — who delivers cheapest (Hero podium).
 *   2. Why       — local trophies vs delivery cost (the thesis).
 *   3. Change    — how far one schema change travels.
 *   4. Shape     — why that distance is architectural, not accidental.
 *   5. Evidence  — the full per-axis measurements and the complete table.
 */

const NAV = [
  { id: 'verdict', label: 'Verdict' },
  { id: 'why', label: 'Why' },
  { id: 'change', label: 'The next change' },
  { id: 'shape', label: 'Shape' },
  { id: 'evidence', label: 'Evidence' }
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

const SHAPE_TAKEAWAY: Record<VariantId, string> = {
  flow: 'Layered features — a change stays in its lane.',
  friction: 'Two boxes, no seams — everything can touch everything.',
  overfit: 'A change must cross many borders before it ships.'
}

export default function App() {
  const active = useScrollSpy(NAV_IDS)

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

      {/* ------------------------------------------------- MOMENT 1 · VERDICT ---- */}
      <Hero />

      <main className="shell">
        {/* ---------------------------------------------------- MOMENT 2 · WHY ---- */}
        <section id="why">
          <SectionHead
            kicker="Why"
            title="Small looks cheap. Safe-to-change is cheap."
            lede={
              <>
                Read one metric at a time and <b>Friction</b> (tiny) or <b>Overfit</b> (immaculate) wins almost every trophy.
                Price a real change — validate it, ship it, keep every copy in sync — and the board flips.
              </>
            }
          />
          <ContrastBoard />
        </section>

        {/* ------------------------------------------------- MOMENT 3 · CHANGE ---- */}
        <section id="change">
          <SectionHead
            kicker="The next change"
            title="The same change was asked of all three. Here is what happened."
            lede={
              <>
                One product intent — the <b>Risk trend</b> capability — one spec, implemented in each variant the way its
                own maintainer would. First the <b>observation</b> (the measured footprint), then the <b>explanation</b>{' '}
                (the structure that made it spread).
              </>
            }
          />
          <ChangeCost />
        </section>

        {/* -------------------------------------------------- MOMENT 4 · SHAPE ---- */}
        <section id="shape">
          <SectionHead
            kicker="Shape"
            title="That distance is the architecture"
            lede={
              <>
                Each node is a project; its size is how many others depend on it (the blast radius of touching it). The
                propagation cost above isn&rsquo;t an accident — it&rsquo;s the shape of the codebase.
              </>
            }
          />
          <div className="grid cols-3 shape-grid">
            {VARIANT_ORDER.map((id) => {
              const v = variants.find((x) => x.meta.variant === id)!
              const c = VARIANT_COLOR[id]
              return (
                <Reveal className="card shape-card" key={id}>
                  <div className="between" style={{ marginBottom: 4 }}>
                    <span className="card-title" style={{ color: c.glow }}>
                      {VARIANT_LABEL[id]}
                    </span>
                    <span className="tiny muted mono">
                      {v.metrics.nxProjects?.value ?? '—'} projects · {v.graph.edges.length} edges
                    </span>
                  </div>
                  <ForceGraph id={id} height={300} />
                  <p className="shape-takeaway">{SHAPE_TAKEAWAY[id]}</p>
                </Reveal>
              )
            })}
          </div>
          <p className="chart-note" style={{ marginTop: 14 }}>
            ◯ npm package · ◇ Rust crate · hover a node to trace its dependents. A healthy shape has seams (you can change one
            lane safely) without sprawl (you don&rsquo;t cross five borders to ship a column).
          </p>
        </section>

        {/* ----------------------------------------------- MOMENT 5 · EVIDENCE ---- */}
        <section id="evidence">
          <SectionHead
            kicker="Evidence"
            title="Every score, decomposed"
            lede={
              <>
                The verdict is a weighted mean over four measured axes — Change {pct('Change')}, Build {pct('Build')}, Ship{' '}
                {pct('Ship')}, Run {pct('Run')}. Each metric below shows its real value; bar length is the ratio-to-best
                score. Unmeasured data reads <i>pending</i>, never zero.
              </>
            }
          />
          <Reveal className="card">
            <AxisTracks />
            <Legend items={LEGEND} />
          </Reveal>

          <div className="grid cols-2" style={{ marginTop: 18 }}>
            <Reveal className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>
                Build — the feedback loop
              </div>
              <MetricBarGroup metricKeys={['variant.ci.validation.cold', 'variant.ci.validation.warm']} />
              <p className="chart-note">
                Real runs of each variant&rsquo;s own gates (build + typecheck + lint + test) over its entire own code. Cold =
                caches disabled. Warm = the same gates re-run with each variant&rsquo;s real cache strategy — the price paid
                dozens of times a day.
              </p>
            </Reveal>
            <Reveal className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>
                Ship — from validated to running
              </div>
              <MetricBarGroup
                metricKeys={[
                  'ship.services.count',
                  'ship.healthcheck.coverage',
                  'variant.docker.image.size',
                  'variant.docker.build.duration'
                ]}
              />
              <p className="chart-note">
                Surface counted from the variant&rsquo;s real Dockerfiles (the ones release.yml ships); image metrics come from
                the CI matrix&rsquo;s <code className="mono">docker build --no-cache</code>.
              </p>
            </Reveal>
            <Reveal className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>
                Run — when production misbehaves
              </div>
              <MetricBarGroup
                metricKeys={['run.inspection.surfaces', 'run.health.coverage', 'variant.docker.startup.duration']}
              />
              <p className="chart-note">
                How many runtimes to inspect, whether each exposes a dedicated health endpoint, and how fast a container
                returns to healthy (restore speed, probed in CI).
              </p>
            </Reveal>
            <Reveal className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>
                Change — the dominant axis
              </div>
              <MetricBarGroup
                metricKeys={[
                  'change.experiment.sourceFilesTouched',
                  'change.experiment.projectsTouched',
                  'change.experiment.testsTouched',
                  'change.experiment.docsTouched',
                  'change.contract.restatements',
                  'nxProjects',
                  'avgComplexity',
                  'businessRatio'
                ]}
              />
              <p className="chart-note">
                Two families: the <b>observed</b> cost of the same product change (60% of the axis) and the{' '}
                <b>structural</b> signals that explain it (40%). Project count is scored on <i>balance</i>: a 2-project
                tangle and a 31-project sprawl are both expensive to change.
              </p>
            </Reveal>
          </div>

          <div style={{ marginTop: 18 }}>
            <Reveal className="card">
              <div className="card-title" style={{ marginBottom: 16 }}>
                Local quality — real, and deliberately not the verdict
              </div>
              <MetricBarGroup metricKeys={['bundleJsGzipKb', 'largestChunkKb', 'avgComplexity', 'maxComplexity']} />
              <p className="chart-note">
                The product itself is good in all three variants — that&rsquo;s the point. Friction and Overfit genuinely win
                several of these; none of them measures what the next change costs, so they inform the lab without deciding the
                verdict.
              </p>
            </Reveal>
          </div>

          <div style={{ marginTop: 18 }}>
            <Reveal>
              <MetricTable />
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="shell">
        <div className="between wrap" style={{ alignItems: 'flex-start', gap: 30 }}>
          <div style={{ maxWidth: 520 }}>
            <b style={{ color: 'var(--ink)' }}>How this is scored.</b> Every value is collected automatically from the
            repository — static analysis, real command runs, real gzip, real Dockerfiles. Per metric, the best variant scores
            100 and the others score proportionally (ratio-to-best, direction-aware; structural counts use a healthy-band
            balance). Axes are weighted means; the headline weighs Change {pct('Change')}, Build {pct('Build')}, Ship{' '}
            {pct('Ship')}, Run {pct('Run')}. Everything is configured in{' '}
            <code className="mono">tools/metrics/config/scoring.config.json</code> — no score references a variant by name.
          </div>
          <div style={{ maxWidth: 420 }}>
            <b style={{ color: 'var(--ink)' }}>Still pending.</b> Docker image metrics and container startup are measured by
            the CI matrix (they need a Docker daemon); GitHub-based CI feedback needs completed runs. Anything unmeasured is
            shown as <i>pending</i> — never converted into a score.
            <div style={{ marginTop: 14 }} className="tiny muted">
              collector v{summary.collectorVersion} · {summary.commitShort} · generated{' '}
              {new Date(summary.generatedAt).toISOString().slice(0, 16).replace('T', ' ')}
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
