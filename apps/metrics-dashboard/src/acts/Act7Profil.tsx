import { useState } from 'react'
import { AXES } from '../bench/ctl'
import type { AxisResult } from '../bench/ctl'
import { pack, VARIANTS, VARIANT_NAME } from '../bench/data'
import { fmtFactor, fmtKbFine, fmtSeconds } from '../bench/format'
import { useInView } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'
import { ShipSlope } from './ShipSlope'

const SCALE_MAX = 3.0

function AxisRail({ axis }: { axis: AxisResult }) {
  const [open, setOpen] = useState(false)
  const { ref, inView } = useInView<HTMLDivElement>(0.4)
  const pos = (factor: number) => ((factor - 1) / (SCALE_MAX - 1)) * 100
  const sorted = [...VARIANTS].sort((a, b) => axis.relativeCost[a] - axis.relativeCost[b])
  return (
    <div ref={ref} className={`rail${inView ? ' is-in' : ''}`}>
      <div className="rail-head">
        <h3 className="rail-name">{axis.label}</h3>
        <p className="rail-gloss">{axis.gloss}</p>
        <button
          type="button"
          className="rail-toggle"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? 'refermer' : 'd’où vient ce facteur ?'}
        </button>
      </div>
      <div className="rail-rows">
        <span className="rail-refline" aria-hidden="true">
          <em>1,00×</em>
        </span>
        {sorted.map((v, i) => {
          const f = axis.relativeCost[v]
          return (
            <div key={v} className={`rail-row v-${v}`}>
              <span className="rail-rowname">{VARIANT_NAME[v]}</span>
              <span className="rail-rowtrack">
                <span className="rail-rowline" aria-hidden="true" />
                <N
                  className="rail-mark"
                  info={{
                    what: `Coût relatif observé, axe ${axis.label} (${VARIANT_NAME[v]}) — sur les métriques retenues pour cet axe, dans cette expérience`,
                    level: 'derived',
                    source: axis.metrics.map((m) => m.source).join(' ; '),
                    formula:
                      'moyenne géométrique des cost_ratio de l’axe, normalisée par le plus faible coût relatif observé sur l’axe (= 1,00×)',
                    note: `Valeur non arrondie : ${axis.relativeCost[v].toFixed(6)}. Comparable entre variantes sur ce même axe uniquement — pas d'un axe à l'autre, pas en euros.`
                  }}
                >
                  <span
                    className="rail-dot"
                    style={{ left: `${pos(f)}%`, transitionDelay: `${i * 140}ms` }}
                  />
                </N>
              </span>
              <span className="rail-rowvalue">{fmtFactor(f)}</span>
            </div>
          )
        })}
      </div>
      {open && (
        <div className="rail-details">
          <table className="rail-table">
            <thead>
              <tr>
                <th scope="col">métrique retenue</th>
                {VARIANTS.map((v) => (
                  <th key={v} scope="col" className={`v-${v}`}>
                    {VARIANT_NAME[v]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {axis.metrics.map((m) => (
                <tr key={m.id}>
                  <th scope="row">
                    {m.label}
                    <span className={`level-tag level-${m.level}`}>
                      {m.level === 'direct' ? 'mesure' : 'dérivé'}
                    </span>
                  </th>
                  {VARIANTS.map((v) => (
                    <td key={v}>
                      <span className="rail-ratio">{fmtFactor(axis.costRatios[m.id][v])}</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {axis.metrics.some((m) => m.note) && (
            <ul className="rail-notes">
              {axis.metrics
                .filter((m) => m.note)
                .map((m) => (
                  <li key={m.id}>{m.note}</li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

export function Act7Profil() {
  return (
    <Act id="profil">
      <Kicker>Le profil de coût total de livraison</Kicker>
      <Affirm size="lg">
        Le CTL n'est pas un score.
        <br />
        C'est l'adresse de la facture.
      </Affirm>
      <Reveal>
        <p className="prose">
          Sur chacun des quatres axes, <strong>1,00×</strong> marque le plus faible coût relatif
          observé comme référence, pas une perfection.
        </p>
      </Reveal>
      <div className="rails">
        {AXES.map((axis) => (
          <AxisRail key={axis.id} axis={axis} />
        ))}
      </div>

      <Reveal>
        <div className="proof-strip">
          <p className="proof-title">
            Boucle locale <span className="proof-unit">froid → chaud, mêmes gates</span>
          </p>
          <div className="proof-rows">
            {VARIANTS.map((v) => (
              <p key={v} className={`proof-row v-${v}`}>
                <span className="proof-name">{VARIANT_NAME[v]}</span>
                <N
                  info={{
                    what: `Validation locale à froid (${VARIANT_NAME[v]}) — build + typecheck + lint + test, caches désactivés`,
                    level: 'direct',
                    source: `repo:tools/metrics/results/ci/${v}.json · steps`
                  }}
                >
                  <span className="proof-value">
                    {fmtSeconds(pack.autoMetrics[v].coldValidationMs)}
                  </span>
                </N>
                <span className="proof-arrow" aria-hidden="true">
                  →
                </span>
                <N
                  info={{
                    what: `Boucle de feedback à chaud (${VARIANT_NAME[v]}) — mêmes gates, stratégie de cache réelle`,
                    level: 'direct',
                    source: `repo:tools/metrics/results/ci/${v}.json · warmSteps`
                  }}
                >
                  <span className="proof-value is-warm">
                    {fmtSeconds(pack.autoMetrics[v].warmValidationMs)}
                  </span>
                </N>
              </p>
            ))}
          </div>
        </div>
      </Reveal>

      <ShipSlope />

      <Reveal>
        <div className="proof-strip">
          <p className="proof-title">
            Bundle JS gzip <span className="level-tag level-direct">hors CTL</span>
          </p>
          <div className="proof-rows">
            {VARIANTS.map((v) => (
              <p key={v} className={`proof-row v-${v}`}>
                <span className="proof-name">{VARIANT_NAME[v]}</span>
                <N
                  info={{
                    what: `JS client émis par le build, compressé gzip (${VARIANT_NAME[v]})`,
                    level: 'direct',
                    source: pack.autoMetrics[v].bundleJsGzip.source,
                    note: pack.autoMetrics[v].bundleJsGzip.note
                  }}
                >
                  <span className="proof-value">
                    {fmtKbFine(pack.autoMetrics[v].bundleJsGzip.kb)}
                  </span>
                </N>
              </p>
            ))}
          </div>
        </div>
      </Reveal>

      <Lecture>
        Friction paie le changement. Overfit paie sa sophistication. Flow reste contenu partout et
        creuse l’écart sur Change.
      </Lecture>
    </Act>
  )
}
