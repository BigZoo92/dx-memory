// Le métier à tisser : les cinq règles métier `riskLevel` (fils) et les fichiers
// qui les encodent (nœuds). Convergence (Friction), séparation (Flow),
// réplication (Overfit). Analyse dérivée post-hoc, revue — jamais dans le CTL.

import { pack, RULE_LABEL, VARIANT_NAME } from '../bench/data'
import type { VariantId } from '../bench/types'
import { N } from '../lib/Prov'
import { Reveal } from '../ui/voice'

const W = 760
const RULE_X = 256
const FILE_X = 496

function fileParts(path: string): { dir: string; base: string } {
  const bits = path.split('/')
  let dir = bits.slice(0, -1).join('/') + '/'
  if (dir.length > 32) dir = `…${dir.slice(dir.length - 31)}`
  return { dir, base: bits[bits.length - 1] }
}

function LoomDiagram({ variant }: { variant: VariantId }) {
  const k = pack.knowledgeMap.variants[variant]
  const ruleIds = pack.knowledgeMap.ruleIds
  const files: string[] = []
  for (const rule of ruleIds) {
    for (const f of k.consolidatedMap[rule]) {
      if (!files.includes(f)) files.push(f)
    }
  }
  const rowGap = 46
  const rulesH = ruleIds.length * rowGap
  const filesH = files.length * rowGap
  const height = Math.max(rulesH, filesH) + 40
  const ruleY = (i: number) => height / 2 + (i - (ruleIds.length - 1) / 2) * rowGap
  const fileY = (i: number) => height / 2 + (i - (files.length - 1) / 2) * rowGap
  const rulesPerFile = new Map<string, number>()
  for (const rule of ruleIds) {
    for (const f of k.consolidatedMap[rule]) {
      rulesPerFile.set(f, (rulesPerFile.get(f) ?? 0) + 1)
    }
  }

  return (
    <figure className={`loom v-${variant}`}>
      <figcaption className="loom-head">
        <span className="loom-name">{VARIANT_NAME[variant]}</span>
        <N
          info={{
            what: `Cartographie des règles riskLevel (${VARIANT_NAME[variant]}) — consolidée après revue de provenance`,
            level: 'reviewable',
            source: `archive:s02/${variant}/result.json · knowledge.risk_rule_map`,
            formula: 'liens = Σ longueur des 5 listes ; dupliquée = règle encodée dans > 1 fichier maintenu',
            note: pack.knowledgeMap.note
          }}
        >
          <span className="loom-stats">
            {k.ruleLocationEdges} liens · {k.uniqueFiles} fichiers · {k.duplicatedRiskRules}{' '}
            {k.duplicatedRiskRules > 1 ? 'règles dupliquées' : 'règle dupliquée'} · max {k.maxRulesPerFile}{' '}
            {k.maxRulesPerFile > 1 ? 'règles' : 'règle'}/fichier
          </span>
        </N>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${height}`} className="loom-svg" role="img" aria-label={`Règles et fichiers, ${VARIANT_NAME[variant]}`}>
        {ruleIds.map((rule, ri) =>
          k.consolidatedMap[rule].map((f) => {
            const fi = files.indexOf(f)
            const y1 = ruleY(ri)
            const y2 = fileY(fi)
            const mx = (RULE_X + FILE_X) / 2
            return (
              <path
                key={`${rule}-${f}`}
                d={`M ${RULE_X + 10} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${FILE_X - 10} ${y2}`}
                className="loom-thread"
              />
            )
          })
        )}
        {ruleIds.map((rule, ri) => (
          <g key={rule} transform={`translate(${RULE_X}, ${ruleY(ri)})`}>
            <circle r="4.5" className="loom-rule-dot" />
            <text x="-14" y="4" textAnchor="end" className="loom-rule-label">
              {RULE_LABEL[rule] ?? rule}
            </text>
          </g>
        ))}
        {files.map((f, fi) => {
          const { dir, base } = fileParts(f)
          const count = rulesPerFile.get(f) ?? 1
          return (
            <g key={f} transform={`translate(${FILE_X}, ${fileY(fi)})`}>
              <circle r={count > 1 ? 8 : 5} className={`loom-file-dot${count > 1 ? ' is-multi' : ''}`} />
              {count > 1 && <circle r="12.5" className="loom-file-ring" />}
              <text x="20" y="-2" className="loom-file-dir">{dir}</text>
              <text x="20" y="12" className="loom-file-base">{base}</text>
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

const LOOM_READING: Record<VariantId, string> = {
  friction:
    'Trois règles convergent dans helpers.ts : peu de fichiers, mais un fichier qui accumule les responsabilités.',
  flow: 'Un fil, un fichier : chaque règle suivie possède un emplacement principal distinct. Aucune dupliquée.',
  overfit:
    'Les valeurs autorisées vivent dans cinq représentations maintenues à la main — la bannière « generated » ne protège pas de la maintenance.'
}

export function Loom() {
  return (
    <div className="loom-block">
      {(['friction', 'flow', 'overfit'] as VariantId[]).map((v, i) => (
        <Reveal key={v} delay={i * 120}>
          <LoomDiagram variant={v} />
          <p className="loom-reading">{LOOM_READING[v]}</p>
        </Reveal>
      ))}
      <p className="loom-footnote">
        Analyse post-hoc revue, dérivée des cartes brutes d'agent. La revue de provenance a tout
        conservé : le générateur Overfit n'émet que <code>contracts.lock.json</code> (ADR-0003) —{' '}
        <code>openapi.json</code>, <code>index.ts</code> et <code>runtime.ts</code> ont été édités à la
        main pendant S02. Le nombre brut de fichiers (4 / 5 / 8) est insuffisant seul : un fichier
        fourre-tout paraît « peu dispersé ».
      </p>
    </div>
  )
}
