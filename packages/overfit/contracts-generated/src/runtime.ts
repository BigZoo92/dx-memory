// -----------------------------------------------------------------------------
// GENERATED FILE — DO NOT EDIT BY HAND. Runtime validators paired with the DTOs.
// -----------------------------------------------------------------------------
//
// Hand-written type guards (no zod dependency) that the frontend runs on every API response,
// *after* the network layer already trusts the typed client. Double validation is the point.

import type { Paginated, Signal } from './index'

const SEVERITIES = ['low', 'medium', 'high', 'critical']
const TRENDS = ['up', 'stable', 'down']

export class ContractViolation extends Error {
  constructor(
    message: string,
    public readonly path: string
  ) {
    super(`contract violation at ${path}: ${message}`)
    this.name = 'ContractViolation'
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

export function isSignal(value: unknown): value is Signal {
  if (!isObject(value)) return false
  if (typeof value.id !== 'string') return false
  if (typeof value.title !== 'string') return false
  if (!SEVERITIES.includes(value.severity as string)) return false
  if (typeof value.riskScore !== 'number') return false
  if (value.riskTrend !== undefined && !TRENDS.includes(value.riskTrend as string)) return false
  if (value.confidence !== null && typeof value.confidence !== 'number') return false
  if (!Array.isArray(value.tags)) return false
  return true
}

/** Assert a paginated signals payload. Throws `ContractViolation` on the first bad row. */
export function assertPaginatedSignals(value: unknown): Paginated<Signal> {
  if (!isObject(value) || !Array.isArray(value.items)) {
    throw new ContractViolation('missing items array', 'root')
  }
  value.items.forEach((item, i) => {
    if (!isSignal(item)) throw new ContractViolation('invalid Signal', `items[${i}]`)
  })
  return value as unknown as Paginated<Signal>
}

export function assertSignal(value: unknown, path = 'root'): Signal {
  if (!isSignal(value)) throw new ContractViolation('invalid Signal', path)
  return value
}
