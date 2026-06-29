/**
 * @signalops/test-scenarios
 *
 * Centralized, typed user scenarios. Every variant maps its own tests to these so the
 * three variants are checked against the SAME behaviors. Each scenario links to one of the
 * four delivery-cost axes (`relatedMetricAxis`) used on `/dx-metrics`.
 */
export type { TestScenario } from './scenarios'
export { SCENARIOS } from './scenarios'

import { SCENARIOS, type TestScenario } from './scenarios'

/** Look up a scenario by its id. */
export function getScenario(id: string): TestScenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}

/** All scenarios tied to a given delivery-cost axis. */
export function scenariosByAxis(axis: TestScenario['relatedMetricAxis']): TestScenario[] {
  return SCENARIOS.filter((s) => s.relatedMetricAxis === axis)
}
