// Profil de coût total de livraison (CTL).
//
// Le CTL n'est pas un score : quatre axes indépendants (Build / Ship / Run / Change),
// jamais moyennés entre eux. Pour chaque axe :
//
//   cost_ratio(variant, m)   = value(variant, m) / min sur les trois variantes
//   axis_raw_factor(variant) = moyenne géométrique des cost_ratio de l'axe
//   axis_relative_cost(v)    = axis_raw_factor(v) / min des axis_raw_factor
//
// Le meilleur équilibre observé sur un axe vaut donc 1,00×. Les facteurs se comparent
// entre variantes SUR UN MÊME AXE ; deux axes n'ont pas la même unité sous-jacente.
// Les valeurs non arrondies sont conservées ici ; l'arrondi (2 décimales) est un
// choix d'affichage.

import { pack, VARIANTS } from './data'
import type { EvidenceLevel, PerVariant, VariantId } from './types'

export interface AxisMetric {
  id: string
  label: string
  unit: 'ms' | 'LOC' | 'fichiers' | 'Ko'
  level: EvidenceLevel
  source: string
  note?: string
  values: PerVariant<number>
}

export interface AxisResult {
  id: 'build' | 'ship' | 'run' | 'change'
  label: string
  gloss: string
  metrics: AxisMetric[]
  costRatios: Record<string, PerVariant<number>>
  rawFactor: PerVariant<number>
  /** Facteur relatif de l'axe, meilleur équilibre = 1. Non arrondi. */
  relativeCost: PerVariant<number>
}

const perVariant = (fn: (v: VariantId) => number): PerVariant<number> =>
  Object.fromEntries(VARIANTS.map((v) => [v, fn(v)])) as PerVariant<number>

const minOf = (values: PerVariant<number>) => Math.min(...VARIANTS.map((v) => values[v]))

const geomean = (xs: number[]) => Math.exp(xs.reduce((s, x) => s + Math.log(x), 0) / xs.length)

function computeAxis(
  id: AxisResult['id'],
  label: string,
  gloss: string,
  metrics: AxisMetric[]
): AxisResult {
  const costRatios: Record<string, PerVariant<number>> = {}
  for (const m of metrics) {
    const best = minOf(m.values)
    costRatios[m.id] = perVariant((v) => m.values[v] / best)
  }
  const rawFactor = perVariant((v) => geomean(metrics.map((m) => costRatios[m.id][v])))
  const bestFactor = minOf(rawFactor)
  const relativeCost = perVariant((v) => rawFactor[v] / bestFactor)
  return { id, label, gloss, metrics, costRatios, rawFactor, relativeCost }
}

// ---------------------------------------------------------------------------
// Composition des axes (critères d'admissibilité : voir la vue Méthode)
// ---------------------------------------------------------------------------

const buildMetrics: AxisMetric[] = [
  {
    id: 'cold_validation',
    label: 'validation locale à froid (build + typecheck + lint + test, caches désactivés)',
    unit: 'ms',
    level: 'direct',
    source: 'repo:tools/metrics/results/ci/*.json · steps',
    values: perVariant((v) => pack.autoMetrics[v].coldValidationMs)
  },
  {
    id: 'warm_validation',
    label: 'boucle de feedback à chaud (mêmes gates, stratégie de cache réelle)',
    unit: 'ms',
    level: 'direct',
    source: 'repo:tools/metrics/results/ci/*.json · warmSteps',
    values: perVariant((v) => pack.autoMetrics[v].warmValidationMs)
  }
]

const shipMetrics: AxisMetric[] = [
  {
    id: 'docker_build',
    label: "build des images livrables (somme, --no-cache)",
    unit: 'ms',
    level: 'derived',
    source: 'repo:tools/metrics/results/ci/*.json · docker.releaseImages',
    note: 'Valeur consolidée : la métrique publiée ne comptait que l’image primaire.',
    values: perVariant((v) => pack.autoMetrics[v].dockerBuild.consolidatedAllReleaseImagesMs)
  },
  {
    id: 'image_size',
    label: 'poids des images livrables (somme)',
    unit: 'Ko',
    level: 'direct',
    source: 'repo:tools/metrics/results/ci/*.json · docker.releaseImageStats',
    values: perVariant((v) => pack.autoMetrics[v].dockerImageSizeKb)
  }
]

const runMetrics: AxisMetric[] = [
  {
    id: 'time_to_root_cause',
    label: 'temps jusqu’à la cause racine confirmée (S03)',
    unit: 'ms',
    level: 'direct',
    source: 'archive:s03/*/result.json · execution.time_to_root_cause_ms',
    note: 'Métrique unique volontairement : time_to_first_hypothesis vient du même scénario et ne compte pas deux fois.',
    values: perVariant((v) => pack.s03[v].timeToRootCauseMs)
  }
]

const changeMetrics: AxisMetric[] = [
  {
    id: 'change_time',
    label: 'temps cumulé S01 + S02 jusqu’au vert',
    unit: 'ms',
    level: 'derived',
    source: 'archive:s01+s02 · execution.time_to_green_ms',
    values: perVariant((v) => pack.cumulative[v].timeMs)
  },
  {
    id: 'change_churn',
    label: 'churn LOC cumulé S01 + S02',
    unit: 'LOC',
    level: 'derived',
    source: 'archive:s01+s02 · patch loc_added + loc_deleted',
    values: perVariant((v) => pack.cumulative[v].churn)
  },
  {
    id: 'change_touches',
    label: 'fichiers touchés cumulés S01 + S02',
    unit: 'fichiers',
    level: 'derived',
    source: 'archive:s01+s02 · patch changed files',
    values: perVariant((v) => pack.cumulative[v].fileTouches)
  },
  {
    id: 'quality_target_churn',
    label: 'churn combiné pour la cible accessibilité + sobriété (S04)',
    unit: 'LOC',
    level: 'derived',
    source: 'archive:s04/*/result.json · combined.combined_loc_churn',
    values: perVariant((v) => pack.s04[v].combined.combinedLocChurn)
  }
]

export const AXES: AxisResult[] = [
  computeAxis('build', 'Build', 'construire et tester localement', buildMetrics),
  computeAxis('ship', 'Ship', 'valider et livrer avec confiance', shipMetrics),
  computeAxis('run', 'Run', 'diagnostiquer et restaurer', runMetrics),
  computeAxis('change', 'Change', 'faire évoluer sans tout payer', changeMetrics)
]

/**
 * Analyse de sensibilité : l'axe Change recalculé sans le churn qualité S04.
 * Le classement de tête change (Friction 1,00× ; Flow ≈ 1,06×) — exposé dans Limites.
 */
export const CHANGE_SENSITIVITY: AxisResult = computeAxis(
  'change',
  'Change (sensibilité)',
  'sans le churn qualité S04',
  changeMetrics.filter((m) => m.id !== 'quality_target_churn')
)

/** Mesures volontairement hors facteur, exposées à côté des rails. */
export const OUTSIDE_FACTOR = {
  startup: {
    label: 'démarrage conteneur → première réponse saine',
    values: perVariant((v) => pack.autoMetrics[v].outsideFactor.startupMs),
    note: pack.autoMetrics.flow.outsideFactor.note
  }
}
