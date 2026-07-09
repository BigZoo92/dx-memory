import { pack, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { fmtInt } from '../bench/format'
import { useInView } from '../lib/hooks'
import { N } from '../lib/Prov'
import { Act, Affirm, Kicker, Lecture, Reveal } from '../ui/voice'

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

export function Act6Qualites() {
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
      <ChurnColumns mode="a11y" />
      <Lecture>
        L'accessibilité coûte moins cher quand le système l'attend déjà.
      </Lecture>
    </Act>
  )
}
