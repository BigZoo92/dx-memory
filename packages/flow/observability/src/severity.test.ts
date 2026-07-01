import { describe, expect, it } from 'vitest'
import { levelToSeverityNumber, meetsMinLevel, severityNumberToLevel } from './severity'

describe('severity', () => {
  it('maps Flow levels to OTel severity numbers', () => {
    expect(levelToSeverityNumber('info')).toBe(9)
    expect(levelToSeverityNumber('error')).toBe(17)
    expect(levelToSeverityNumber('fatal')).toBe(21)
  })

  it('maps severity numbers back to bands', () => {
    expect(severityNumberToLevel(21)).toBe('fatal')
    expect(severityNumberToLevel(17)).toBe('error')
    expect(severityNumberToLevel(9)).toBe('info')
    expect(severityNumberToLevel(1)).toBe('debug')
  })

  it('respects the minimum level', () => {
    expect(meetsMinLevel('error', 'info')).toBe(true)
    expect(meetsMinLevel('debug', 'info')).toBe(false)
  })
})
