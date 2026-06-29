import type { MetricAxis } from '@signalops/contracts'

/**
 * A user scenario every variant must satisfy identically. Variants implement these with
 * their own test stack (Vitest, Playwright, Rust tests…) but the behavior and expected
 * result must match. `relatedMetricAxis` ties the scenario back to the four delivery-cost
 * axes used on `/dx-metrics`.
 */
export type TestScenario = {
  id: string
  title: string
  route: string
  steps: string[]
  expectedResult: string
  relatedMetricAxis: MetricAxis
}

export const SCENARIOS: TestScenario[] = [
  {
    id: 'dashboard-loads-summary',
    title: 'Dashboard loads summary',
    route: '/',
    steps: [
      'Open the Overview route.',
      'Wait for the summary request to resolve.',
      'Read the 4 KPI cards, severity bars, time series and most-critical list.'
    ],
    expectedResult:
      'The four KPIs (open, critical, active incidents, avg qualification time) render with trend chips; widgets show data, not skeletons.',
    relatedMetricAxis: 'Run'
  },
  {
    id: 'filter-critical-signals',
    title: 'User filters critical signals',
    route: '/signals',
    steps: [
      'Open the Signals Explorer.',
      'Set the Severity filter to "Critical".',
      'Observe the result count and table rows.'
    ],
    expectedResult:
      'Only critical signals are shown, the result count updates, and the table stays responsive with 10,000+ rows in the dataset.',
    relatedMetricAxis: 'Run'
  },
  {
    id: 'open-signal-detail',
    title: 'User opens a signal detail',
    route: '/signals/:id',
    steps: [
      'From the Signals table, click "View" on a row.',
      'Land on the signal detail route.',
      'Read severity/status badges, risk score, confidence and timeline.'
    ],
    expectedResult:
      'The detail page shows the full signal record, AI summary (mock), recommended action and linked incident (or a "Not linked" empty state).',
    relatedMetricAxis: 'Run'
  },
  {
    id: 'empty-table-result',
    title: 'User handles empty table result',
    route: '/signals',
    steps: [
      'Open the Signals Explorer.',
      'Apply filters that match no signals (e.g. an impossible search string).',
      'Observe the table body.'
    ],
    expectedResult:
      'The empty state reads "No signals match your current filters." with a way to reset filters; no error is shown.',
    relatedMetricAxis: 'Run'
  },
  {
    id: 'partial-error-on-timeline',
    title: 'User sees partial error on timeline',
    route: '/signals/:id',
    steps: [
      'Open a signal detail with the timeline request forced to fail (mock).',
      'Keep the rest of the page loaded.',
      'Observe the timeline section.'
    ],
    expectedResult:
      'A partial error banner "Some widgets could not be refreshed." appears with Retry, while the rest of the page stays usable.',
    relatedMetricAxis: 'Run'
  },
  {
    id: 'compare-before-after',
    title: 'User compares before/after signal data',
    route: '/compare',
    steps: [
      'Open the Compare route.',
      'Select a signal and run the comparison.',
      'Read the attribute diff and user-impact card.'
    ],
    expectedResult:
      'Changed attributes are tinted with an arrow and a good/bad/neutral delta chip; the impact sentence and metric rows render.',
    relatedMetricAxis: 'Change'
  },
  {
    id: 'check-dx-metrics',
    title: 'User checks DX metrics',
    route: '/dx-metrics',
    steps: [
      'Open the DX Metrics route.',
      'Read the Build / Ship / Run / Change cards and the variant comparison bars.',
      'Read the full metrics table and the AI task result.'
    ],
    expectedResult:
      'Metrics load from collected results when available and fall back to seed data; the current variant column is highlighted and best cells are marked.',
    relatedMetricAxis: 'Change'
  },
  {
    id: 'simulate-api-error',
    title: 'User simulates API error',
    route: '/settings',
    steps: [
      'Open Settings → Demo controls.',
      'Trigger "Simulate API error".',
      'Observe the result banner and a subsequent API-backed surface.'
    ],
    expectedResult:
      'The API returns the canonical ApiError envelope (code, message, requestId); the UI shows a global/partial error state with a result banner.',
    relatedMetricAxis: 'Run'
  },
  {
    id: 'simulate-slow-network',
    title: 'User simulates slow network',
    route: '/settings',
    steps: [
      'Open Settings → Demo controls.',
      'Trigger "Simulate slow network".',
      'Navigate to a data-backed screen.'
    ],
    expectedResult:
      'Loading/slow-network states (spinner + message) are shown while requests are delayed; the UI never blocks or crashes.',
    relatedMetricAxis: 'Run'
  },
  {
    id: 'validate-risk-trend-feature',
    title: 'User validates the future Risk trend feature',
    route: '/signals',
    steps: [
      'Apply the shared "Risk trend" AI task (see docs/product/03-ai-task-protocol.md).',
      'Open the Signals Explorer and the signal detail.',
      'Use the new Risk trend column, filter and detail field.'
    ],
    expectedResult:
      'A readable "Risk trend" badge (text, not color alone) appears in /signals and /signals/:id, a Risk trend filter works, and the table stays usable at 10,000 rows. This scenario measures cost of change across variants.',
    relatedMetricAxis: 'Change'
  }
]
