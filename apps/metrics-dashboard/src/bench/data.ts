import raw from './truth-pack.json'
import type { TruthPack, VariantId } from './types'

export const pack = raw as unknown as TruthPack

export const VARIANTS: VariantId[] = ['flow', 'friction', 'overfit']

export const VARIANT_NAME: Record<VariantId, string> = {
  flow: 'Flow',
  friction: 'Friction',
  overfit: 'Overfit'
}

export const VARIANT_TAGLINE: Record<VariantId, string> = {
  flow: 'le compromis',
  friction: 'le chemin direct',
  overfit: "l'industrialisation poussée"
}

/** French labels of the five tracked riskLevel rules (S02 knowledge map). */
export const RULE_LABEL: Record<string, string> = {
  allowed_values: 'valeurs autorisées',
  score_to_level_derivation: 'dérivation score → niveau',
  descending_risk_order: 'ordre de risque décroissant',
  high_risk_kpi_membership: 'appartenance au KPI haut risque',
  filter_domain_support: 'domaine du filtre'
}
