import { useState } from 'react'
import { AXES, CHANGE_SENSITIVITY, OUTSIDE_FACTOR } from '../bench/ctl'
import type { AxisResult } from '../bench/ctl'
import { VARIANTS, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { fmtFactor, fmtSeconds } from '../bench/format'
import { useInView } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'

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
        <button type="button" className="rail-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
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
                  <th key={v} scope="col" className={`v-${v}`}>{VARIANT_NAME[v]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {axis.metrics.map((m) => (
                <tr key={m.id}>
                  <th scope="row">
                    {m.label}
                    <span className={`level-tag level-${m.level}`}>{m.level === 'direct' ? 'mesure' : 'dérivé'}</span>
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
              {axis.metrics.filter((m) => m.note).map((m) => (
                <li key={m.id}>{m.note}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

const READING: Record<VariantId, string> = {
  friction: 'La facture de Friction est à l’adresse Change : un coût relatif observé de 1,50×, contre 1,00× pour Flow.',
  overfit: 'Celle d’Overfit est répartie — mais s’alourdit à Build (2,77×) et Change (1,88×) : le prix de la sophistication sur un petit produit.',
  flow: 'Flow paie quelques pourcents partout (1,02× à 1,09×) — et c’est sur Change qu’il creuse l’écart, avec le plus faible coût relatif observé de l’axe.'
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
          Quatre axes indépendants. Sur chaque axe, <strong>1,00×</strong> marque le plus faible
          coût relatif observé — une référence, pas une perfection. Les facteurs se lisent{' '}
          <em>sur un même axe</em>, jamais d'un axe à l'autre, jamais additionnés, jamais moyennés —
          et jamais convertis en euros.
        </p>
      </Reveal>
      <div className="rails">
        {AXES.map((axis) => (
          <AxisRail key={axis.id} axis={axis} />
        ))}
      </div>
      <div className="rail-outside">
        <Reveal>
          <p className="outside-title">Exposé hors facteur — mesuré, mais pas compté :</p>
          <ul className="outside-list">
            <li>
              <strong>Build, la tension froid/chaud.</strong> À froid, Friction valide en{' '}
              <N info={{ what: 'Validation locale à froid, Friction', level: 'direct', source: 'repo:tools/metrics/results/ci/friction.json' }}>
                {fmtSeconds(17273)}
              </N>{' '}
              contre{' '}
              <N info={{ what: 'Validation locale à froid, Flow', level: 'direct', source: 'repo:tools/metrics/results/ci/flow.json' }}>
                {fmtSeconds(46063)}
              </N>{' '}
              pour Flow ; à chaud, Flow repasse devant ({fmtSeconds(6073)} contre {fmtSeconds(14538)}).
              Le facteur combine les deux — aucune des deux lectures n'est cachée.
            </li>
            <li>
              <strong>Ship, le démarrage.</strong> Conteneur → première réponse saine :{' '}
              {VARIANTS.map((v, i) => (
                <span key={v}>
                  {i > 0 && ' · '}
                  {VARIANT_NAME[v]}{' '}
                  <N info={{ what: `Démarrage conteneur, ${VARIANT_NAME[v]}`, level: 'direct', source: `repo:tools/metrics/results/ci/${v}.json`, note: OUTSIDE_FACTOR.startup.note }}>
                    {OUTSIDE_FACTOR.startup.values[v] >= 1000
                      ? fmtSeconds(OUTSIDE_FACTOR.startup.values[v])
                      : `${OUTSIDE_FACTOR.startup.values[v]} ms`}
                  </N>
                </span>
              ))}
              . Topologies différentes (SSR vs statique + API) : exposé, non compté.
            </li>
          </ul>
        </Reveal>
      </div>
      <Lecture>
        {READING.friction} {READING.overfit} {READING.flow} Aucune n'a le « meilleur CTL » : chacune
        choisit où sa facture arrive.
      </Lecture>
      <Reveal>
        <p className="sensitivity-note">
          Sensibilité : sans le churn qualité S04, la tête de l'axe Change bascule — Friction{' '}
          {fmtFactor(CHANGE_SENSITIVITY.relativeCost.friction)}, Flow{' '}
          {fmtFactor(CHANGE_SENSITIVITY.relativeCost.flow)}, Overfit{' '}
          {fmtFactor(CHANGE_SENSITIVITY.relativeCost.overfit)}. Le détail est assumé dans{' '}
          <a href="#limites">Limites</a>.
        </p>
      </Reveal>
    </Act>
  )
}
