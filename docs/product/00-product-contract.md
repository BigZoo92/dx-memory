# SignalOps — Product Contract

This document is the invariant contract for the three technical variants of SignalOps.

## Purpose

SignalOps is a fictional B2B SaaS dashboard for monitoring, qualifying and prioritizing operational signals. It is used in a thesis defense to demonstrate how the same product can have different total delivery costs depending on Developer Experience decisions.

The comparison must remain fair: the product, screens, routes, data, UI states and functional acceptance criteria are identical across all variants.

## Variants

- Variant A — Friction: functional product with neglected DX and costly delivery.
- Variant B — Flow: balanced DX, optimized for clarity, feedback loops and cost of change.
- Variant C — Overfit: technically serious but over-engineered, with high cognitive and delivery cost.

## Absolute invariant rule

The three variants must implement the exact same product: same routes, same screens, same data model, same fixtures, same user flows, same UI states, same visible UI, same functional behavior and same acceptance criteria.

The only visible difference allowed is the variant badge value.

Permitted differences: architecture, tooling, framework internals, backend technology, CI, Docker setup, tests, documentation, API contract strategy, error-handling implementation and internal DX.

Forbidden differences: routes, features, screens, data shape, UX behavior, visual hierarchy, labels, columns, filters, mock data semantics, metric definitions and acceptance criteria.

## Routes

| Route          | Screen           | Required |
| -------------- | ---------------- | -------- |
| `/`            | Overview         | Yes      |
| `/signals`     | Signals Explorer | Yes      |
| `/signals/:id` | Signal Detail    | Yes      |
| `/incidents`   | Incidents        | Yes      |
| `/compare`     | Compare          | Yes      |
| `/dx-metrics`  | DX Metrics       | Yes      |
| `/settings`    | Settings         | Yes      |

## Shared data volumes

| Entity          | Minimum volume |
| --------------- | -------------: |
| Signals         |         10,000 |
| Incidents       |            300 |
| Analysts        |             25 |
| Sources         |             12 |
| Timeline events |         50,000 |
| DX metrics      | JSON-generated |

## Shared data model

```ts
type Signal = {
  id: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'triaged' | 'investigating' | 'resolved' | 'dismissed'
  source: 'web' | 'social' | 'internal' | 'partner' | 'api' | 'manual'
  confidence: number | null
  riskScore: number
  riskTrend?: 'up' | 'stable' | 'down'
  region: string
  assignedTo: string | null
  createdAt: string
  updatedAt: string
  tags: string[]
  hasLinkedIncident: boolean
}

type Incident = {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'in_progress' | 'resolved'
  linkedSignalIds: string[]
  owner: string
  createdAt: string
  resolvedAt: string | null
  impact: 'user' | 'system' | 'security' | 'business'
}

type TimelineEvent = {
  id: string
  signalId: string
  type: 'created' | 'updated' | 'assigned' | 'commented' | 'escalated' | 'resolved'
  label: string
  actor: string
  createdAt: string
}

type ApiError = {
  code: string
  message: string
  details?: unknown
  requestId: string
}
```

## Required API endpoints

| Method | Endpoint                  | Description                    |
| ------ | ------------------------- | ------------------------------ |
| GET    | `/api/health`             | API status                     |
| GET    | `/api/signals`            | Paginated and filtered signals |
| GET    | `/api/signals/:id`        | Signal detail                  |
| GET    | `/api/signals/:id/events` | Signal timeline                |
| GET    | `/api/incidents`          | Incident list                  |
| GET    | `/api/dashboard/summary`  | Dashboard KPIs and widgets     |
| GET    | `/api/compare/:id`        | Before/after comparison        |
| GET    | `/api/dx-metrics`         | DX metrics                     |
| POST   | `/api/simulate-error`     | Controlled API error           |

Required `/api/signals` filters: `search`, `severity`, `status`, `source`, `assignedTo`, `dateFrom`, `dateTo`, `page`, `pageSize`, `sortBy`, `sortDirection`.

## Required UI states

Every asynchronous surface must support loading, empty, global error, partial error, slow network, invalid data, not found and unauthorized mock states.

## Accessibility baseline

- Visible focus states.
- Text labels on all status/severity badges.
- No information conveyed only through color.
- Explicit input labels.
- Tables remain readable in dense mode.
- Keyboard navigation for primary controls.

## Acceptance rule for implementation

A variant is not valid if it looks different from the reference UI, drops a required route, removes a required state, changes the data model, removes API-backed behavior, or makes the product easier by reducing scope.
