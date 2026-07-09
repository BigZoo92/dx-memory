// « Même produit. Pas la même gravité. » — photographie structurelle réelle.
//
// Trois panneaux, un par variante : les unités INTERNES du repo (apps, packages,
// crates) atteignables depuis les apps livrables, et leurs dépendances réelles
// (graphe Nx + manifests Cargo, snapshot committé — jamais extrait au runtime).
// Layout radial déterministe : chaque app livrable est un centre de gravité,
// ses dépendances orbitent à un rayon proportionnel à leur distance.
// Aucune simulation, aucune physique : la topologie réelle produit l'image.
// Hors CTL : une photographie, pas un score.

import { useMemo, useState } from 'react'
import { VARIANTS, VARIANT_NAME } from '../bench/data'
import { structure } from '../bench/structure'
import type { StructureVariant, VariantId } from '../bench/types'
import { fmtInt } from '../bench/format'
import { useInView, usePrefersReducedMotion } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Affirm, Reveal } from '../ui/voice'

const VB_W = 340
const VB_H = 310

interface PlacedNode {
  id: string
  x: number
  y: number
  cx: number
  cy: number
  tech: 'ts' | 'rust'
  kind: 'app' | 'unit'
  depth: number
}

/** Layout radial déterministe : îlot par app livrable, anneau par profondeur. */
function layout(v: StructureVariant): { nodes: PlacedNode[]; deps: Map<string, string[]> } {
  const deps = new Map<string, string[]>()
  for (const n of v.nodes) deps.set(n.id, [])
  for (const e of v.edges) deps.get(e.from)?.push(e.to)

  // Chaque nœud rejoint l'îlot de la première app livrable qui l'atteint.
  const island = new Map<string, string>()
  for (const root of v.roots) {
    if (!island.has(root)) island.set(root, root)
    const queue = [root]
    while (queue.length) {
      const cur = queue.shift() as string
      for (const d of deps.get(cur) ?? []) {
        if (!island.has(d)) {
          island.set(d, root)
          queue.push(d)
        }
      }
    }
  }

  const single = v.roots.length === 1
  const centers: Record<string, { x: number; y: number }> = {}
  v.roots.forEach((root, i) => {
    centers[root] = single
      ? { x: VB_W / 2, y: VB_H / 2 }
      : { x: i === 0 ? 92 : 243, y: VB_H / 2 }
  })
  const ringGap = single ? 55 : 44

  const placed: PlacedNode[] = []
  for (const root of v.roots) {
    const mine = v.nodes.filter((n) => island.get(n.id) === root)
    const byDepth = new Map<number, typeof mine>()
    for (const n of mine) {
      if (!byDepth.has(n.depth)) byDepth.set(n.depth, [])
      byDepth.get(n.depth)?.push(n)
    }
    const c = centers[root]
    for (const [depth, ring] of byDepth) {
      const sorted = ring.toSorted((a, b) => a.id.localeCompare(b.id))
      sorted.forEach((n, i) => {
        const angle = -Math.PI / 2 + (i / sorted.length) * Math.PI * 2 + depth * 0.35
        const r = depth * ringGap
        placed.push({
          id: n.id,
          x: c.x + Math.cos(angle) * r,
          y: c.y + Math.sin(angle) * r,
          cx: c.x,
          cy: c.y,
          tech: n.tech,
          kind: n.kind,
          depth: n.depth
        })
      })
    }
  }
  return { nodes: placed, deps }
}

function shortName(id: string): string {
  return id.replace('@signalops/', '')
}

function GravityPanel({
  variant,
  deployed,
  active,
  onActivate
}: {
  variant: VariantId
  deployed: boolean
  active: boolean
  onActivate: (v: VariantId | null) => void
}) {
  const data = structure.variants[variant]
  const { nodes, deps } = useMemo(() => layout(data), [data])
  const [hl, setHl] = useState<string | null>(null)
  const pos = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes])
  const litTargets = hl ? new Set(deps.get(hl) ?? []) : null
  const ordered = useMemo(() => nodes.map((n) => n.id), [nodes])

  const cycle = (dir: 1 | -1) => {
    const i = hl ? ordered.indexOf(hl) : dir === 1 ? -1 : 0
    setHl(ordered[(i + dir + ordered.length) % ordered.length])
  }

  const m = data.metrics
  const summary =
    `${VARIANT_NAME[variant]} : ${m.internalNodeCount} unités internes, ${m.internalEdgeCount} ` +
    `dépendances internes, profondeur maximale ${m.maxDepthFromApp} depuis l'app livrable, ` +
    `${m.connectedComponents} ${m.connectedComponents > 1 ? 'îlots' : 'îlot'}.`

  return (
    <div className={`grav-panel v-${variant}${active ? ' is-active' : ''}${hl ? ' has-hl' : ''}`}>
      <button
        type="button"
        className="grav-hit"
        aria-label={`${summary} Flèches gauche/droite : parcourir les unités.`}
        onFocus={() => onActivate(variant)}
        onBlur={() => {
          onActivate(null)
          setHl(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            cycle(1)
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            cycle(-1)
          } else if (e.key === 'Escape') {
            setHl(null)
          }
        }}
      />
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="grav-svg"
        aria-hidden="true"
        focusable="false"
        onPointerLeave={() => setHl(null)}
      >
        {data.edges.map((e) => {
          const a = pos.get(e.from)
          const b = pos.get(e.to)
          if (!a || !b) return null
          const mx = (a.x + b.x) / 2 + (a.cx - (a.x + b.x) / 2) * 0.22
          const my = (a.y + b.y) / 2 + (a.cy - (a.y + b.y) / 2) * 0.22
          const lit = hl !== null && e.from === hl
          return (
            <path
              key={`${e.from}→${e.to}`}
              d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`}
              className={`grav-edge${lit ? ' is-lit' : ''}`}
              style={deployed ? { transitionDelay: `${420 + (a.depth + b.depth) * 90}ms` } : undefined}
            />
          )
        })}
        {nodes.map((n, i) => {
          const lit = hl === n.id || litTargets?.has(n.id)
          return (
            <g
              key={n.id}
              className={`grav-node${lit ? ' is-lit' : ''}${n.kind === 'app' ? ' is-app' : ''}`}
              style={{
                transform: deployed ? `translate(${n.x}px, ${n.y}px)` : `translate(${n.cx}px, ${n.cy}px)`,
                transitionDelay: deployed ? `${n.depth * 160 + (i % 7) * 24}ms` : '0ms'
              }}
              onPointerEnter={() => setHl(n.id)}
            >
              <circle r="13" className="grav-halo" />
              {n.tech === 'rust' ? (
                <rect x="-4" y="-4" width="8" height="8" className="grav-mark" />
              ) : (
                <circle r={n.kind === 'app' ? 6.5 : 4.5} className="grav-mark" />
              )}
              {n.kind === 'app' && <circle r="10.5" className="grav-ring" />}
            </g>
          )
        })}
      </svg>
      <p className="grav-caption">
        <span className="grav-vname">{VARIANT_NAME[variant]}</span>
        <N
          info={{
            what: `Unités et dépendances internes réelles (${VARIANT_NAME[variant]}) — ${structure.method.perimeter}`,
            level: structure.method.levels.metrics,
            source: `repo:apps/metrics-dashboard/src/bench/structure-snapshot.json · ${structure.method.tsSource}${
              variant === 'overfit' ? ` + ${structure.method.rustSource}` : ''
            }`,
            note: structure.method.note
          }}
        >
          <span className="grav-count">
            {fmtInt(m.internalNodeCount)} unités · {fmtInt(m.internalEdgeCount)} liens
          </span>
        </N>
      </p>
      <p className="grav-hlinfo" aria-live="polite">
        {hl
          ? `${shortName(hl)} → ${(deps.get(hl) ?? []).length} dépendance${
              (deps.get(hl) ?? []).length > 1 ? 's' : ''
            } interne${(deps.get(hl) ?? []).length > 1 ? 's' : ''}`
          : ' '}
      </p>
      <p className="sr-only">{summary}</p>
    </div>
  )
}

export function Gravity() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  const reduced = usePrefersReducedMotion()
  const deployed = inView || reduced
  const [active, setActive] = useState<VariantId | null>(null)

  return (
    <div ref={ref} className={`grav${deployed ? ' is-in' : ''}${active ? ` active-${active}` : ''}`}>
      <Affirm size="md">Même produit.</Affirm>
      <div className="grav-panels">
        {VARIANTS.map((v) => (
          <GravityPanel key={v} variant={v} deployed={deployed} active={active === v} onActivate={setActive} />
        ))}
      </div>
      <Reveal delay={reduced ? 0 : 900}>
        <Affirm size="md">Pas la même gravité.</Affirm>
        <p className="grav-legend">
          ● unité TypeScript · ■ crate Rust · ◎ app livrable — dépendances internes réelles, hors
          CTL. Survolez une unité : ses dépendances directes s'allument.
        </p>
      </Reveal>
    </div>
  )
}
