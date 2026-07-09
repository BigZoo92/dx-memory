// « Plus vite ici. Plus lourd là. » — le reclassement Ship.
//
// Slopegraph éditorial : à gauche le temps de build des images livrables (--no-cache),
// à droite le poids total livré. Les ancres (rang, nom, valeur) sont du HTML aux
// extrémités ; le centre appartient aux trajectoires (SVG, décoratif). Le rang 1→3
// de chaque côté rend le retournement lisible sans suivre les couleurs.
// En dessous de 760 px, la même histoire se raconte en deux listes classées.

import { useState } from 'react'
import { pack, VARIANTS, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { fmtKb, fmtSeconds } from '../bench/format'
import { useInView, useWidth } from '../lib/hooks'
import { N } from '../lib/Prov'
import type { ProvInfo } from '../lib/Prov'
import { Affirm, Reveal } from '../ui/voice'

const ROW_H = 88

const buildMs = (v: VariantId) => pack.autoMetrics[v].dockerBuild.consolidatedAllReleaseImagesMs
const imageKb = (v: VariantId) => pack.autoMetrics[v].dockerImageSizeKb

const BY_BUILD = VARIANTS.toSorted((a, b) => buildMs(a) - buildMs(b))
const BY_WEIGHT = VARIANTS.toSorted((a, b) => imageKb(a) - imageKb(b))

const buildProv = (v: VariantId) => ({
  what: `Build des images livrables, somme --no-cache (${VARIANT_NAME[v]})`,
  level: 'derived' as const,
  source: `repo:tools/metrics/results/ci/${v}.json · docker.releaseImages`,
  formula: 'Σ durationMs des images livrables (--no-cache)',
  note: pack.autoMetrics[v].dockerBuild.consolidationReason
})

const weightProv = (v: VariantId) => ({
  what: `Poids total des images livrables (${VARIANT_NAME[v]})`,
  level: 'direct' as const,
  source: `repo:tools/metrics/results/ci/${v}.json · docker.releaseImageStats`
})

function Anchor({
  variant,
  rank,
  value,
  side,
  prov,
  onHover
}: {
  variant: VariantId
  rank: number
  value: string
  side: 'left' | 'right'
  prov: ProvInfo
  onHover: (v: VariantId | null) => void
}) {
  return (
    <div
      className={`shipslope-anchor side-${side} v-${variant}`}
      onMouseEnter={() => onHover(variant)}
      onMouseLeave={() => onHover(null)}
      onFocusCapture={() => onHover(variant)}
      onBlurCapture={() => onHover(null)}
    >
      <span className="shipslope-rank" aria-hidden="true">
        {rank}
      </span>
      <span className="shipslope-label">
        <span className="shipslope-name">{VARIANT_NAME[variant]}</span>
        <N info={prov}>
          <span className="shipslope-value">{value}</span>
        </N>
      </span>
    </div>
  )
}

export function ShipSlope() {
  const { ref, inView } = useInView<HTMLDivElement>(0.35)
  const { ref: fieldRef, width } = useWidth<HTMLDivElement>(560)
  const [hover, setHover] = useState<VariantId | null>(null)

  const yAt = (i: number) => i * ROW_H + ROW_H / 2

  return (
    <div ref={ref} className={`shipslope${inView ? ' is-in' : ''}${hover ? ` hover-${hover}` : ''}`}>
      <Affirm size="md">
        Plus vite ici.
        <br />
        Plus lourd là.
      </Affirm>
      <Reveal>
        <p className="prose">
          Le chrono Docker favorise Overfit. L'artefact livré remet la masse ailleurs.
        </p>
      </Reveal>

      {/* Desktop : le centre appartient aux trajectoires */}
      <div className="shipslope-grid">
        <p className="shipslope-colhead col-left">
          Temps de build
          <span>images livrables · somme · --no-cache</span>
        </p>
        <p className="shipslope-colhead col-right">
          Artefact livré
          <span>poids total des images</span>
        </p>
        <div className="shipslope-col col-left">
          {BY_BUILD.map((v, i) => (
            <Anchor
              key={v}
              variant={v}
              rank={i + 1}
              value={fmtSeconds(buildMs(v))}
              side="left"
              prov={buildProv(v)}
              onHover={setHover}
            />
          ))}
        </div>
        <div ref={fieldRef} className="shipslope-field">
          <svg
            width={width}
            height={ROW_H * 3}
            viewBox={`0 0 ${width} ${ROW_H * 3}`}
            aria-hidden="true"
            focusable="false"
          >
            {VARIANTS.map((v) => {
              const y1 = yAt(BY_BUILD.indexOf(v))
              const y2 = yAt(BY_WEIGHT.indexOf(v))
              return (
                <g key={v} className={`shipslope-traj v-${v}`}>
                  <line x1={6} y1={y1} x2={width - 6} y2={y2} pathLength={1} className="shipslope-line" />
                  <circle cx={6} cy={y1} r={5.5} className="shipslope-dot dot-start" />
                  <circle cx={width - 6} cy={y2} r={5.5} className="shipslope-dot dot-end" />
                </g>
              )
            })}
          </svg>
        </div>
        <div className="shipslope-col col-right">
          {BY_WEIGHT.map((v, i) => (
            <Anchor
              key={v}
              variant={v}
              rank={i + 1}
              value={fmtKb(imageKb(v))}
              side="right"
              prov={weightProv(v)}
              onHover={setHover}
            />
          ))}
        </div>
      </div>

      {/* Mobile : deux classements, un retournement */}
      <div className="shipslope-mobile">
        <p className="shipslope-colhead">
          Temps de build
          <span>images livrables · somme · --no-cache</span>
        </p>
        <ol className="shipslope-list">
          {BY_BUILD.map((v) => (
            <li key={v} className={`v-${v}`}>
              <span className="shipslope-name">{VARIANT_NAME[v]}</span>
              <N info={buildProv(v)}>
                <span className="shipslope-value">{fmtSeconds(buildMs(v))}</span>
              </N>
            </li>
          ))}
        </ol>
        <p className="shipslope-flip" aria-hidden="true">
          le classement se retourne
        </p>
        <p className="shipslope-colhead">
          Artefact livré
          <span>poids total des images</span>
        </p>
        <ol className="shipslope-list">
          {BY_WEIGHT.map((v) => (
            <li key={v} className={`v-${v}`}>
              <span className="shipslope-name">{VARIANT_NAME[v]}</span>
              <N info={weightProv(v)}>
                <span className="shipslope-value">{fmtKb(imageKb(v))}</span>
              </N>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
