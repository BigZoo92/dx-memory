// Les vues de défense : Méthode, Limites, Données, Sources.
// Elles existent pour les dix minutes de questions — chaque chiffre du récit
// doit pouvoir être retrouvé, re-dérivé et critiqué ici.

import { Fragment } from 'react'
import { AXES, CHANGE_SENSITIVITY } from '../bench/ctl'
import { pack, VARIANTS, VARIANT_NAME } from '../bench/data'
import type { EvidenceLevel, VariantId } from '../bench/types'
import { fmtChrono, fmtFactor, fmtInt, fmtKb, fmtSeconds, fmtThousands } from '../bench/format'
import { LevelTag } from '../lib/Prov'
import { Reveal } from '../ui/voice'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="defense">
      <Reveal>
        <h2 className="defense-title">{title}</h2>
      </Reveal>
      {children}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Méthode
// ---------------------------------------------------------------------------

const LEVELS: { level: EvidenceLevel; label: string; desc: string; examples: string }[] = [
  {
    level: 'direct',
    label: 'Mesure directe',
    desc: 'Timestamps instrumentés, Git, diff numstat, exit codes, CDP, axe réellement exécuté, SHA.',
    examples: 'time_to_green, churn, requêtes réseau, critères a11y'
  },
  {
    level: 'derived',
    label: 'Dérivé reproductible',
    desc: 'Calcul explicite et rejouable à partir des mesures directes — la formule est publiée.',
    examples: 'cumuls S01+S02, cost ratios, facteurs d’axe, evolution_tax'
  },
  {
    level: 'reviewable',
    label: 'Post-hoc revu',
    desc: 'Classification demandant un jugement, vérifiable par relecture des artefacts.',
    examples: 'knowledge map, « première hypothèse correcte », fausses pistes'
  },
  {
    level: 'interpretation',
    label: 'Lecture',
    desc: 'Argumentation. Jamais stockée comme une mesure, toujours marquée typographiquement.',
    examples: '« taxe d’entrée architecturale », « l’adresse de la facture »'
  }
]

const ADMISSIBILITY = [
  'représenter réellement un coût de livraison',
  'avoir un sens de lecture non ambigu (plus faible = moins de coût)',
  'être comparable sur les trois variantes',
  'avoir été mesurée avec une méthode suffisamment homogène',
  'exister pour les trois variantes',
  'ne pas être un jugement qualitatif inventé',
  'ne pas dupliquer conceptuellement une métrique déjà retenue dans l’axe',
  'privilégier les coûts directs'
]

const EXCLUDED = [
  'occupation finale de contexte et « tokens » supposés',
  'nombre de tool calls, de tests, de packages, de crates, de gates ou de validations',
  'octets réseau absolus S04 entre variantes',
  'time_to_bug_fixed, time_to_green et taille de patch S03 (post-cause, déclassés)',
  'notes cognitives ou appréciations qualitatives'
]

export function Methode() {
  return (
    <Section id="methode" title="Méthode">
      <div className="defense-grid">
        <div className="defense-block">
          <h3>Protocole</h3>
          <p>
            Douze runs : 4 scénarios × 3 variantes du même produit. Pour chaque scénario, une
            conversation neuve par variante, le même prompt exact, la même machine, le même niveau
            d'information initial, les mêmes permissions, zéro prompt de correction (
            <code>agent_correction_prompt_count = 0</code> vérifié sur les 12 runs). Modèle :{' '}
            <code>{pack.protocol.model}</code>, raisonnement {pack.protocol.reasoningMode}.
          </p>
          <p>
            L'ordre de passage tourne entre scénarios pour qu'aucune variante ne passe
            systématiquement en premier :
          </p>
          <table className="def-table">
            <thead>
              <tr><th scope="col">scénario</th><th scope="col">ordre d'exécution</th></tr>
            </thead>
            <tbody>
              {Object.entries(pack.protocol.executionOrders).map(([s, order]) => (
                <tr key={s}>
                  <th scope="row">{s.toUpperCase()}</th>
                  <td>{order.map((v) => VARIANT_NAME[v]).join(' → ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            S02 part du commit S01 validé de chaque variante (chaîne de SHA dans les données). Les
            conversations neuves réduisent l'effet d'apprentissage ; elles ne font pas de ces runs une
            expérience statistique généralisable.
          </p>
        </div>
        <div className="defense-block">
          <h3>Ce que mesure <code>time_to_green</code></h3>
          <p>
            Le temps jusqu'à un changement <em>considéré livrable selon le chemin de validation
            disponible dans l'environnement</em>, sous une règle commune <code>FULL_GREEN</code> — pas
            le temps d'une même suite de commandes. Friction lance ses builds ciblés, Flow ses gates
            Nx et d'architecture, Overfit traverse Rust + TypeScript + contract drift. C'est un choix
            assumé : on compare le coût pour satisfaire les mêmes critères d'acceptation dans chaque
            système, avec les validations que ce système juge pertinentes.
          </p>
          <h3>Niveaux de vérité</h3>
          <ul className="levels-list">
            {LEVELS.map((l) => (
              <li key={l.level}>
                <LevelTag level={l.level}>{l.label}</LevelTag>
                <p>{l.desc}</p>
                <p className="levels-examples">{l.examples}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="defense-block">
        <h3>Le profil CTL — calcul</h3>
        <p>Pour entrer dans un facteur d'axe, une métrique doit :</p>
        <ol className="admiss-list">
          {ADMISSIBILITY.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ol>
        <pre className="formula">{`cost_ratio(variante, m)   = value(variante, m) / min(value(flow, m), value(friction, m), value(overfit, m))
axis_raw_factor(variante) = moyenne_géométrique(cost_ratio des métriques de l'axe)
axis_relative_cost(v)     = axis_raw_factor(v) / min(axis_raw_factor des trois variantes)`}</pre>
        <p>
          Sur un axe, 1,00× désigne le plus faible coût relatif observé dans cette expérience — une
          référence de lecture, pas une note ni une perfection. Les facteurs sont comparables entre
          variantes <strong>sur un même axe</strong> ; les axes n'ont pas la même unité sous-jacente,
          on ne les additionne pas, on ne les moyenne pas, on ne les convertit pas en monnaie.
          L'affichage arrondit à deux décimales ; le modèle garde les valeurs exactes.
        </p>
        <h4>Composition des axes</h4>
        <table className="def-table">
          <thead>
            <tr>
              <th scope="col">axe</th>
              <th scope="col">métriques retenues</th>
              {VARIANTS.map((v) => (
                <th key={v} scope="col" className={`v-${v}`}>{VARIANT_NAME[v]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AXES.map((axis) => (
              <Fragment key={axis.id}>
                {axis.metrics.map((m, mi) => (
                  <tr key={m.id}>
                    {mi === 0 && (
                      <th scope="row" rowSpan={axis.metrics.length + 1} className="axis-cell">
                        {axis.label}
                      </th>
                    )}
                    <td>
                      {m.label} <LevelTag level={m.level} />
                    </td>
                    {VARIANTS.map((v) => (
                      <td key={v} className="num">
                        {m.unit === 'ms'
                          ? m.values[v] >= 100000
                            ? fmtChrono(m.values[v])
                            : fmtSeconds(m.values[v])
                          : m.unit === 'Ko'
                            ? fmtKb(m.values[v])
                            : fmtInt(m.values[v])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="axis-total">
                  <td>facteur relatif de l'axe</td>
                  {VARIANTS.map((v) => (
                    <td key={v} className="num strong">{fmtFactor(axis.relativeCost[v])}</td>
                  ))}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
        <p>
          Run garde une seule métrique — <code>time_to_first_hypothesis</code> vient du même scénario
          de diagnostic et compterait deux fois le même phénomène ; c'est un reveal narratif, pas une
          seconde pondération. Ship expose le démarrage conteneur hors facteur (topologies non
          comparables) et consolide le build Docker en sommant toutes les images livrables. Jamais
          admis dans un facteur : {EXCLUDED.join(' ; ')}.
        </p>
        <h4>Sensibilité de l'axe Change</h4>
        <p>
          Avec les quatre métriques : Flow {fmtFactor(AXES[3].relativeCost.flow)}, Friction{' '}
          {fmtFactor(AXES[3].relativeCost.friction)}, Overfit {fmtFactor(AXES[3].relativeCost.overfit)}.
          Sans <code>quality_target_churn</code> (S04) : Friction{' '}
          {fmtFactor(CHANGE_SENSITIVITY.relativeCost.friction)}, Flow{' '}
          {fmtFactor(CHANGE_SENSITIVITY.relativeCost.flow)}, Overfit{' '}
          {fmtFactor(CHANGE_SENSITIVITY.relativeCost.overfit)} — la tête de l'axe bascule. La lecture
          honnête : Flow prend nettement l'avantage sur Change lorsque le coût d'obtention des
          qualités transversales (accessibilité + sobriété) fait partie du coût normal de livraison —
          pas nécessairement sur n'importe quel périmètre. Assumé en Limites n° 9.
        </p>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Limites
// ---------------------------------------------------------------------------

const LIMITS: { title: string; body: React.ReactNode }[] = [
  {
    title: 'Biais de sélection assumé',
    body:
      'Les scénarios testent les qualités que Flow prétend offrir (évolution, diagnostic, qualités transversales). Les résultats n’ont pas été corrigés pour faire gagner Flow — Friction gagne S01, le cumul S01+S02 au chrono et la confirmation S03 — mais le choix des scénarios oriente ce qui est observable.'
  },
  {
    title: 'Seuils riskLevel non identiques',
    body: (
      <>
        S01 imposait <code>low / medium / high</code> sans fixer les seuils exacts : Friction a choisi
        high ≥ 70 / medium ≥ 40, Flow high ≥ 70 / medium ≥ 50 ; les seuils « critical » de S02
        diffèrent aussi légèrement. S01/S02 comparent donc le coût pour satisfaire les mêmes critères
        d'acceptation, pas une distribution algorithmique identique — interdit d'en tirer une
        comparaison du nombre de signaux critiques entre variantes.
      </>
    )
  },
  {
    title: 'Chemins de validation non identiques',
    body: (
      <>
        <code>time_to_green</code> mesure le temps jusqu'au vert du chemin de validation propre à
        chaque environnement (règle commune <code>FULL_GREEN</code>), pas l'exécution d'une liste de
        commandes identique.
      </>
    )
  },
  {
    title: 'S03 re-scopé avant benchmark',
    body: (
      <>
        La prémisse initiale (crash <code>localeCompare</code>) n'existait pas dans les trois
        codebases : l'injecteur neutre l'a démontré et le scénario a été re-scopé en{' '}
        <code>nullable-tags-render-crash</code> avant tout run. Même défaut conceptuel, même signal,
        même symptôme pour les trois.
      </>
    )
  },
  {
    title: 'S03 : seams d’injection asymétriques',
    body:
      'L’injection Overfit vit à un seam différent (adapter côté réception, backend Rust typé Vec<String>). Exclus des comparaisons croisées : distance injection→crash, profondeur de pile, couches traversées, distance au fix.'
  },
  {
    title: 'S03 : consigne perdue, correctifs non comparables',
    body:
      'Le prompt re-scopé n’a pas conservé « ne modifie pas la fixture défectueuse ». Flow corrige à son point d’injection, Overfit à son adapter, Friction choisit un rendu défensif : stratégies non comparables équitablement. Tout ce qui suit ROOT_CAUSE_FOUND (temps de fix, temps au vert, taille de patch, stratégie) est déclassé en secondaire et n’entre pas dans le facteur Run.'
  },
  {
    title: 'S04 accessibilité : méthodes non homogènes',
    body:
      'Friction : vrai Chromium + axe-core avec layout réel et contraste évalué. Flow : happy-dom sur le sous-arbre de la feature + inspection CSS statique du focus. Overfit : happy-dom, contraste désactivé. Interdit de comparer les totaux axe-core ou de classer les variantes sur axe. Autorisé : la cible fonctionnelle commune atteinte, et le coût Git pour l’atteindre.'
  },
  {
    title: 'S04 réseau : méthodes non homogènes',
    body:
      'Friction et Flow mesurent au vrai Chrome (CDP, octets wire) ; Overfit via un enregistreur de fetch composant (API uniquement, sans assets ni paint). Interdit de comparer les octets absolus entre variantes ou d’en dériver une estimation carbone inter-variantes. Autorisé : les requêtes dupliquées avant→après au sein de chaque variante et la surface de changement pour atteindre la cible.'
  },
  {
    title: 'Sensibilité de l’axe Change',
    body: (
      <>
        Sans le churn qualité S04, la tête de l'axe bascule (Friction{' '}
        {fmtFactor(CHANGE_SENSITIVITY.relativeCost.friction)}, Flow{' '}
        {fmtFactor(CHANGE_SENSITIVITY.relativeCost.flow)}). Le facteur affiché garde les quatre
        métriques annoncées — aucune n'a été retirée parce qu'elle défavorisait une variante — et la
        dépendance est documentée en Méthode.
      </>
    )
  },
  {
    title: 'Build/Ship : mesures mono-run, environnement local',
    body:
      'Les coûts Build et Ship viennent d’un run local unique par étape (win32, node v22.19.0, même machine, docker --no-cache), Flow capturé dans une invocation séparée ~17 min plus tard. Pas de répétition ni de médiane : ordres de grandeur robustes, décimales non significatives.'
  },
  {
    title: 'Occupation de contexte : capture externe',
    body:
      'Les snapshots de fenêtre de contexte sont des captures d’écran externes après run — une occupation à un instant, pas des tokens consommés, pas un coût API. Jamais utilisés dans le CTL.'
  },
  {
    title: 'S03 Overfit : final_build_pass consolidé',
    body: (
      <>
        Le rapport brut déclare <code>final_build_pass: true</code> alors qu'aucune commande de build
        n'existe dans <code>commands.jsonl</code>. La valeur brute est conservée, la valeur consolidée
        est <code>null</code> avec raison — le récit n'utilise que la valeur consolidée.
      </>
    )
  },
  {
    title: 'Douze runs ne sont pas une statistique',
    body:
      'Un run par cellule scénario×variante, un seul modèle, un seul produit. C’est une expérience contrôlée qui autorise une interprétation — pas une preuve causale générale, pas une loi.'
  }
]

export function Limites() {
  return (
    <Section id="limites" title="Limites">
      <p className="defense-lede">
        Ces limites font partie du résultat. Chacune borne ce que les chiffres ont le droit de dire —
        et ce qu'ils ne diront pas ici.
      </p>
      <ol className="limits-list">
        {LIMITS.map((l, i) => (
          <Reveal key={l.title} delay={Math.min(i * 60, 300)}>
            <li className="limit">
              <span className="limit-n">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{l.title}</h3>
                <p>{l.body}</p>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Données
// ---------------------------------------------------------------------------

function Row({
  label,
  level,
  values,
  source
}: {
  label: React.ReactNode
  level: EvidenceLevel
  values: (v: VariantId) => React.ReactNode
  source: string
}) {
  return (
    <tr>
      <th scope="row">
        {label} <LevelTag level={level} />
      </th>
      {VARIANTS.map((v) => (
        <td key={v} className="num">{values(v)}</td>
      ))}
      <td className="src"><code>{source}</code></td>
    </tr>
  )
}

function DataTable({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="data-block">
      <h3>{title}</h3>
      <div className="data-scroll">
        <table className="def-table data-table">
          <thead>
            <tr>
              <th scope="col">métrique</th>
              {VARIANTS.map((v) => (
                <th key={v} scope="col" className={`v-${v}`}>{VARIANT_NAME[v]}</th>
              ))}
              <th scope="col">source</th>
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  )
}

export function Donnees() {
  const ctx = pack.externalContextSnapshots
  return (
    <Section id="donnees" title="Données">
      <p className="defense-lede">
        La table consolidée des douze runs. Chaque ligne porte son niveau de vérité et sa source ; les
        valeurs brutes divergentes sont conservées à côté de leur consolidation, jamais écrasées.
      </p>
      <DataTable title="S01 — risk-level-v1">
        <Row label="temps jusqu'au vert" level="direct" source="s0X/*/result.json · execution" values={(v) => fmtChrono(pack.s01[v].timeToGreenMs)} />
        <Row label="fichiers modifiés" level="direct" source="patch (= git diff)" values={(v) => pack.s01[v].changedFiles} />
        <Row label="churn (LOC + / −)" level="direct" source="git diff numstat" values={(v) => `${pack.s01[v].locAdded} + ${pack.s01[v].locDeleted} = ${pack.s01[v].churn}`} />
        <Row label="fichiers inspectés" level="reviewable" source="inspected-files (déclaratif)" values={(v) => pack.s01[v].filesInspected} />
        <Row label="projets Nx affected" level="direct" source="nx affected" values={(v) => pack.s01[v].nxAffectedProjects ?? '—'} />
      </DataTable>
      <DataTable title="S02 — risk-level-v2 (critical)">
        <Row label="temps jusqu'au vert" level="direct" source="s02/*/result.json" values={(v) => fmtChrono(pack.s02[v].timeToGreenMs)} />
        <Row label="fichiers modifiés" level="direct" source="patch" values={(v) => pack.s02[v].changedFiles} />
        <Row label="churn" level="direct" source="git diff numstat" values={(v) => pack.s02[v].churn} />
        <Row label="amplification du changement" level="derived" source="evolution" values={(v) => pack.s02[v].changeAmplification.toFixed(4)} />
        <Row label="taxe d'évolution" level="derived" source="evolution" values={(v) => pack.s02[v].evolutionTax.toFixed(4)} />
        <Row label="dispersion brute (fichiers)" level="reviewable" source="knowledge.risk_rule_map" values={(v) => pack.s02[v].knowledgeDispersionRaw} />
        <Row label="liens règle→fichier (consolidé)" level="reviewable" source="dérivé post-hoc de la map" values={(v) => pack.knowledgeMap.variants[v].ruleLocationEdges} />
        <Row label="fichiers multi-règles" level="reviewable" source="dérivé post-hoc" values={(v) => pack.knowledgeMap.variants[v].multiRuleFiles} />
        <Row label="max règles / fichier" level="reviewable" source="dérivé post-hoc" values={(v) => pack.knowledgeMap.variants[v].maxRulesPerFile} />
        <Row label="règles dupliquées" level="reviewable" source="risk_rule_map" values={(v) => pack.knowledgeMap.variants[v].duplicatedRiskRules} />
        <Row label="cumul S01+S02 : temps" level="derived" source="Σ time_to_green" values={(v) => fmtChrono(pack.cumulative[v].timeMs)} />
        <Row label="cumul S01+S02 : churn" level="derived" source="Σ churn" values={(v) => pack.cumulative[v].churn} />
        <Row label="cumul S01+S02 : fichiers" level="derived" source="Σ changed files" values={(v) => pack.cumulative[v].fileTouches} />
      </DataTable>
      <DataTable title="S03 — nullable-tags-render-crash (avant ROOT_CAUSE_FOUND)">
        <Row label="temps → cause racine" level="direct" source="execution" values={(v) => fmtChrono(pack.s03[v].timeToRootCauseMs)} />
        <Row label="temps → première hypothèse" level="direct" source="hypotheses.jsonl (horodatage)" values={(v) => fmtChrono(pack.s03[v].timeToFirstHypothesisMs)} />
        <Row label="hypothèse correcte" level="reviewable" source="comparaison post-hoc au ground truth" values={(v) => (pack.s03[v].rootCauseGroundTruthMatch ? 'oui' : 'non')} />
        <Row label="fichiers inspectés avant cause" level="reviewable" source="diagnosis" values={(v) => pack.s03[v].filesInspectedBeforeRootCause} />
        <Row label="fausses pistes" level="reviewable" source="diagnosis" values={(v) => pack.s03[v].falseLeadsBeforeRootCause} />
        <Row
          label={<>final_build_pass <em>(brut → consolidé)</em></>}
          level="derived"
          source="validation + commands.jsonl"
          values={(v) => {
            const b = pack.s03[v].finalBuildPass
            const raw = b.rawReportedValue === null ? 'null' : String(b.rawReportedValue)
            const cons = b.consolidatedValue === null ? 'null' : String(b.consolidatedValue)
            return raw === cons ? raw : `${raw} → ${cons}`
          }}
        />
      </DataTable>
      <p className="data-note">
        Déclassé (non comparable entre variantes, voir Limites 5-6) : temps de correction, temps au
        vert, taille de patch, stratégie de fix — conservés dans l'archive.
      </p>
      <DataTable title="S04 — accessibilité + sobriété">
        <Row label="a11y : temps au vert" level="direct" source="accessibility.execution" values={(v) => fmtChrono(pack.s04[v].a11y.timeToGreenMs)} />
        <Row label="a11y : churn" level="direct" source="accessibility.patch" values={(v) => pack.s04[v].a11y.churn} />
        <Row label="sobriété : statut" level="direct" source="eco.status" values={(v) => (pack.s04[v].eco.status === 'GREEN_NO_CHANGE_REQUIRED' ? 'vert sans changement' : 'vert')} />
        <Row label="sobriété : temps au vert" level="direct" source="eco.execution" values={(v) => fmtChrono(pack.s04[v].eco.timeToGreenMs)} />
        <Row label="sobriété : churn" level="direct" source="eco.patch" values={(v) => pack.s04[v].eco.churn} />
        <Row label="requêtes dupliquées avant → après" level="direct" source="eco.baseline / eco.after" values={(v) => `${pack.s04[v].eco.baseline.duplicateRequestCount} → ${pack.s04[v].eco.after.duplicateRequestCount}`} />
        <Row label="churn combiné" level="derived" source="combined" values={(v) => pack.s04[v].combined.combinedLocChurn} />
        <Row label="temps combiné" level="direct" source="combined" values={(v) => fmtChrono(pack.s04[v].combined.qualityDeliveryCostMs)} />
      </DataTable>
      <DataTable title="Build / Ship — métriques automatiques gelées (run local unique, win32)">
        <Row label="validation à froid" level="direct" source="tools/metrics/results/ci/*.json" values={(v) => fmtSeconds(pack.autoMetrics[v].coldValidationMs)} />
        <Row label="boucle à chaud" level="direct" source="warmSteps" values={(v) => fmtSeconds(pack.autoMetrics[v].warmValidationMs)} />
        <Row
          label={<>build Docker <em>(publié → consolidé)</em></>}
          level="derived"
          source="docker.releaseImages (somme)"
          values={(v) => `${fmtSeconds(pack.autoMetrics[v].dockerBuild.rawPrimaryImageMs)} → ${fmtSeconds(pack.autoMetrics[v].dockerBuild.consolidatedAllReleaseImagesMs)}`}
        />
        <Row label="poids des images livrables" level="direct" source="docker.releaseImageStats" values={(v) => fmtKb(pack.autoMetrics[v].dockerImageSizeKb)} />
        <Row label="démarrage conteneur (hors facteur)" level="direct" source="docker.runtime" values={(v) => (pack.autoMetrics[v].outsideFactor.startupMs >= 1000 ? fmtSeconds(pack.autoMetrics[v].outsideFactor.startupMs) : `${pack.autoMetrics[v].outsideFactor.startupMs} ms`)} />
      </DataTable>
      <div className="data-block">
        <h3>Occupation finale de la fenêtre de contexte — donnée externe, hors CTL</h3>
        <p className="data-warning">
          Captures d'écran externes après run. Ce ne sont <strong>pas</strong> des tokens consommés,
          pas la consommation cumulée de la session, pas un coût API : c'est l'occupation de la
          fenêtre au moment de la capture. Jamais utilisée dans un facteur.
        </p>
        <div className="data-scroll">
          <table className="def-table data-table">
            <thead>
              <tr>
                <th scope="col">scénario</th>
                {VARIANTS.map((v) => (
                  <th key={v} scope="col" className={`v-${v}`}>{VARIANT_NAME[v]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(ctx.values).map(([s, vals]) => (
                <tr key={s}>
                  <th scope="row">{s.toUpperCase()}</th>
                  {VARIANTS.map((v) => (
                    <td key={v} className="num">
                      {vals[v] != null ? `${fmtThousands(vals[v])} / 1,0 M` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export function Sources() {
  return (
    <Section id="sources" title="Sources">
      <ul className="sources-list">
        <li>
          <strong>Archive primaire des 12 runs</strong> — <code>~/{pack.archive}</code> : un{' '}
          <code>result.json</code> par run + artefacts (events, edits, searches, validations,
          patch.diff, knowledge-map, hypotheses, commands, ground truth S03).
        </li>
        <li>
          <strong>Truth pack consolidé</strong> — <code>apps/metrics-dashboard/src/bench/truth-pack.json</code>,
          généré mécaniquement par <code>{pack.generatedBy}</code> (checkpoints d'intégrité inclus,
          consolidations documentées, mode <code>--check</code> anti-dérive).
        </li>
        <li>
          <strong>Métriques automatiques Build/Ship</strong> —{' '}
          <code>tools/metrics/results/ci/&#123;flow,friction,overfit&#125;.json</code> (capture locale du{' '}
          {new Date(pack.autoMetrics.flow.capturedAt).toLocaleDateString('fr-FR')}, modèle de collecte v1.1).
        </li>
        <li>
          <strong>Chaîne de commits</strong> — chaque run part d'un SHA baseline et livre un SHA final
          (S02 part du S01 validé de sa variante) ; chaîne complète dans le truth pack.
        </li>
        <li>
          <strong>ADR-0003</strong> — <code>docs/overfit/adr/0003-openapi-generated-client.md</code> :
          le document OpenAPI d'Overfit est maintenu à la main, le générateur n'émet que le lock — la
          base de la revue de provenance de la knowledge map.
        </li>
        <li>
          <strong>DORA</strong> — <em>State of AI-assisted Software Development</em>, 2025. Cadre :
          l'IA amplifie le système dans lequel elle travaille. Utilisé comme cadrage, pas comme preuve
          causale de ces benchmarks.
        </li>
        <li>
          <strong>Modèle des runs</strong> — <code>{pack.protocol.model}</code>, raisonnement{' '}
          {pack.protocol.reasoningMode}, capture externe du nom de modèle (11/12 runs l'enregistrent ;
          S01 Friction : null au raw, consolidé depuis la capture externe).
        </li>
      </ul>
      <p className="sources-foot">
        Mémoire : « Optimiser la DX pour une UX qui rapporte » — Enzo Givernaud, Mastère IWID, IIM
        Digital School De Vinci, 2025-2026 · Entreprise d'accueil : Sahar.
      </p>
    </Section>
  )
}
