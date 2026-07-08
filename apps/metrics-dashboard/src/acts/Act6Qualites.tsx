import { pack, VARIANT_NAME } from '../bench/data'
import type { A11yCaps, VariantId } from '../bench/types'
import { fmtChrono, fmtInt } from '../bench/format'
import { useInView } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'

const CAPS: { id: keyof A11yCaps | 'filters' | 'keyboard'; label: string; read: (c: A11yCaps) => boolean }[] = [
  { id: 'filters', label: 'noms accessibles', read: (c) => c.filtersNamed.split('/')[0] === c.filtersNamed.split('/')[1] },
  { id: 'keyboard', label: 'tris au clavier', read: (c) => c.keyboardSort.split('/')[0] === c.keyboardSort.split('/')[1] },
  { id: 'ariaSort', label: 'aria-sort', read: (c) => c.ariaSort },
  { id: 'visibleFocus', label: 'focus visible', read: (c) => c.visibleFocus },
  { id: 'liveAnnouncement', label: 'annonce live des résultats', read: (c) => c.liveAnnouncement }
]

/** Capacités accessibilité : couches déjà présentes au départ vs posées pendant S04. */
function CapabilityLayers() {
  const order: VariantId[] = ['flow', 'friction', 'overfit']
  const { ref, inView } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} className={`caps${inView ? ' is-in' : ''}`}>
      {order.map((v) => {
        const { baseline, after } = pack.s04[v].a11y
        return (
          <div key={v} className={`caps-col v-${v}`}>
            <p className="caps-name">{VARIANT_NAME[v]}</p>
            <ul className="caps-stack">
              {CAPS.map((cap, i) => {
                const had = cap.read(baseline)
                const has = cap.read(after)
                const state = had ? 'had' : has ? 'added' : 'missing'
                return (
                  <li key={cap.id} className={`caps-layer is-${state}`} style={{ transitionDelay: `${i * 70}ms` }}>
                    <span className="caps-label">{cap.label}</span>
                    <span className="caps-state">{had ? 'déjà là' : has ? 'posée en S04' : '—'}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      <p className="caps-footnote">
        États fonctionnels mesurés au baseline puis après S04 (
        <N
          info={{
            what: 'Critères fonctionnels accessibilité, baseline et après, par variante',
            level: 'direct',
            source: 'archive:s04/*/result.json · accessibility.baseline / .after',
            note: 'Les méthodes de mesure diffèrent (vrai Chromium vs happy-dom) : les critères fonctionnels sont comparables, les totaux axe-core ne le sont pas — voir Limites.'
          }}
        >
          détail par variante
        </N>
        ). Même cible atteinte par les trois : tris clavier, aria-sort, focus visible, annonce live,
        zéro tabindex positif, zéro interaction essentielle à la souris seule.
      </p>
    </div>
  )
}

function ChurnColumns({ mode }: { mode: 'a11y' | 'combined' }) {
  const order: VariantId[] =
    mode === 'a11y' ? ['flow', 'friction', 'overfit'] : ['flow', 'overfit', 'friction']
  const value = (v: VariantId) =>
    mode === 'a11y' ? pack.s04[v].a11y.churn : pack.s04[v].combined.combinedLocChurn
  const max = Math.max(...order.map(value))
  const { ref, inView } = useInView<HTMLDivElement>(0.35)
  return (
    <div ref={ref} className={`churncols${inView ? ' is-in' : ''}`}>
      {order.map((v) => (
        <div key={v} className={`churncol v-${v}`}>
          <N
            info={{
              what:
                mode === 'a11y'
                  ? `Churn du chantier accessibilité S04 (${VARIANT_NAME[v]})`
                  : `Churn combiné accessibilité + sobriété S04 (${VARIANT_NAME[v]})`,
              level: 'derived',
              source: pack.s04[v].source,
              formula: mode === 'a11y' ? 'loc_added + loc_deleted (phase A)' : 'combined.combined_loc_churn'
            }}
          >
            <span className="churncol-value">{fmtInt(value(v))}</span>
          </N>
          <div className="churncol-bar" aria-hidden="true">
            <span style={{ height: `${(value(v) / max) * 100}%` }} />
          </div>
          <span className="churncol-name">{VARIANT_NAME[v]}</span>
        </div>
      ))}
    </div>
  )
}

function DuplicateDots({ variant, before }: { variant: VariantId; before: number }) {
  return (
    <span className={`dup-dots v-${variant}`} aria-hidden="true">
      {Array.from({ length: before }, (_, i) => (
        <span key={i} className="dup-dot" style={{ transitionDelay: `${i * 90}ms` }} />
      ))}
    </span>
  )
}

export function Act6Qualites() {
  const { ref: zeroRef, inView: zeroIn } = useInView<HTMLDivElement>(0.5)
  return (
    <Act id="qualites">
      <Kicker>Scénario S04 · accessibilité puis sobriété réseau, même cible pour les trois</Kicker>
      <Affirm size="lg">
        Même qualité finale.
        <br />
        Pas le même chantier.
      </Affirm>
      <Reveal>
        <p className="prose">
          Deux tickets qualité : rendre le parcours accessible au clavier et annoncé, puis éliminer le
          gaspillage réseau. Les trois variantes atteignent la cible. La question du mémoire :{' '}
          <strong>combien coûte l'obtention du même résultat ?</strong>
        </p>
      </Reveal>
      <CapabilityLayers />
      <Reveal>
        <p className="block-title">Churn pour atteindre la cible accessibilité</p>
      </Reveal>
      <ChurnColumns mode="a11y" />
      <Lecture>
        L'accessibilité coûte moins cher quand le système l'attend déjà. Flow possédait tris clavier,
        aria-sort et focus : il ne restait qu'à réutiliser sa LiveRegion — 18 lignes. Les deux autres
        ont posé les mêmes capacités en 80 et 82 lignes.
      </Lecture>
      <div ref={zeroRef} className={`zero-scene${zeroIn ? ' is-in' : ''}`}>
        <p className="zero-kicker">Sobriété réseau, Flow :</p>
        <N
          info={{
            what: 'Fichiers produit modifiés en phase sobriété S04, Flow — statut GREEN_NO_CHANGE_REQUIRED',
            level: 'direct',
            source: pack.s04.flow.source,
            note: 'Baseline mesuré au vrai Chrome (CDP) : 0 requête dupliquée, pas de détail anticipé, pas de refetch de liste au retour, pas de données secondaires inutiles.'
          }}
        >
          <span className="zero-figure">0</span>
        </N>
        <p className="zero-caption">fichier à modifier</p>
        <ul className="zero-props">
          <li>0 requête dupliquée</li>
          <li>0 détail anticipé</li>
          <li>0 refetch de liste au retour</li>
          <li>0 donnée secondaire inutile</li>
        </ul>
        <p className="zero-note">
          Les sept appels API du parcours étaient justifiés. L'agent n'a créé aucune optimisation
          artificielle — et a tout de même passé{' '}
          <N
            info={{
              what: 'Temps de la phase sobriété S04, Flow (vérification sans changement)',
              level: 'direct',
              source: pack.s04.flow.source
            }}
          >
            <strong>{fmtChrono(pack.s04.flow.eco.timeToGreenMs)}</strong>
          </N>{' '}
          à vérifier qu'il n'y avait rien à faire.
        </p>
      </div>
      <Lecture>Parfois, le meilleur coût de changement est un changement qui n'a plus besoin d'exister.</Lecture>
      <div className="dup-block">
        <p className="block-title">Requêtes classées dupliquées sur le parcours mesuré</p>
        {(['friction', 'overfit'] as VariantId[]).map((v) => (
          <Reveal key={v}>
            <div className={`dup-row v-${v}`}>
              <span className="dup-name">{VARIANT_NAME[v]}</span>
              <DuplicateDots variant={v} before={pack.s04[v].eco.baseline.duplicateRequestCount} />
              <span className="dup-arrow">→</span>
              <N
                info={{
                  what: `Requêtes dupliquées avant → après, S04 ${VARIANT_NAME[v]} (parcours intra-variante)`,
                  level: 'direct',
                  source: pack.s04[v].source,
                  note:
                    v === 'overfit'
                      ? 'Optimisation : suppression d\'un breadcrumb télémétrique POST /api/logs émis quatre fois, dont trois duplicatas exacts. Mesure API-level (happy-dom).'
                      : 'Les duplicatas baseline étaient largement servis par le cache HTTP : le gain est en allers-retours évités plus qu\'en octets (réduction ~0,5 %).'
                }}
              >
                <span className="dup-after">0</span>
              </N>
            </div>
          </Reveal>
        ))}
        <p className="caps-footnote">
          Comparaison avant/après <em>au sein de chaque variante</em> uniquement — les octets absolus ne se
          comparent pas entre variantes (méthodes de mesure différentes, voir Limites).
        </p>
      </div>
      <Reveal>
        <p className="block-title">Churn combiné pour la même cible accessibilité + sobriété</p>
      </Reveal>
      <ChurnColumns mode="combined" />
      <Reveal>
        <p className="prose counterpoint">
          Contrepoint affiché : en temps brut, Flow est le plus lent du S04 combiné —{' '}
          <N info={{ what: 'Temps combiné S04 (a11y + sobriété), Flow', level: 'direct', source: pack.s04.flow.source }}>
            <strong>{fmtChrono(pack.s04.flow.combined.qualityDeliveryCostMs)}</strong>
          </N>{' '}
          contre{' '}
          <N info={{ what: 'Temps combiné S04, Friction', level: 'direct', source: pack.s04.friction.source }}>
            <strong>{fmtChrono(pack.s04.friction.combined.qualityDeliveryCostMs)}</strong>
          </N>{' '}
          (Friction) et{' '}
          <N info={{ what: 'Temps combiné S04, Overfit', level: 'direct', source: pack.s04.overfit.source }}>
            <strong>{fmtChrono(pack.s04.overfit.combined.qualityDeliveryCostMs)}</strong>
          </N>{' '}
          (Overfit). La vitesse brute reste chez les autres. Le chantier, lui, change d'échelle.
        </p>
      </Reveal>
    </Act>
  )
}
