import {
  formatSeverity,
  formatStatus,
  formatSource,
  formatRiskTrend,
  severityHue,
  statusHue,
  impactHue,
  incidentStatusLabel,
  confidenceLabel,
  confidencePercent,
  riskColor,
  riskTrendArrow,
  riskTrendHue,
  formatDuration,
  ageSince
} from './helpers'

describe('formatSeverity', () => {
  it('low', () => expect(formatSeverity('low')).toBe('Low'))
  it('medium', () => expect(formatSeverity('medium')).toBe('Medium'))
  it('high', () => expect(formatSeverity('high')).toBe('High'))
  it('critical', () => expect(formatSeverity('critical')).toBe('Critical'))
})

describe('formatStatus', () => {
  it('new', () => expect(formatStatus('new')).toBe('New'))
  it('investigating', () => expect(formatStatus('investigating')).toBe('Investigating'))
  it('resolved', () => expect(formatStatus('resolved')).toBe('Resolved'))
})

describe('formatSource', () => {
  it('api', () => expect(formatSource('api')).toBe('API'))
  it('web', () => expect(formatSource('web')).toBe('Web'))
  it('manual', () => expect(formatSource('manual')).toBe('Manual'))
  it('partner', () => expect(formatSource('partner')).toBe('Partner'))
})

describe('severityHue', () => {
  it('critical is red', () => expect(severityHue('critical')).toBe('red'))
  it('high is orange', () => expect(severityHue('high')).toBe('orange'))
  it('medium is amber', () => expect(severityHue('medium')).toBe('amber'))
  it('low is blue', () => expect(severityHue('low')).toBe('blue'))
})

describe('statusHue', () => {
  it('resolved is green', () => expect(statusHue('resolved')).toBe('green'))
  it('investigating is orange', () => expect(statusHue('investigating')).toBe('orange'))
  it('new is blue', () => expect(statusHue('new')).toBe('blue'))
  it('dismissed is grey', () => expect(statusHue('dismissed')).toBe('grey'))
})

describe('formatRiskTrend', () => {
  it('up is Rising', () => expect(formatRiskTrend('up')).toBe('Rising'))
  it('stable is Stable', () => expect(formatRiskTrend('stable')).toBe('Stable'))
  it('down is Falling', () => expect(formatRiskTrend('down')).toBe('Falling'))
})

describe('riskTrendHue', () => {
  it('up is red', () => expect(riskTrendHue('up')).toBe('red'))
  it('stable is grey', () => expect(riskTrendHue('stable')).toBe('grey'))
  it('down is green', () => expect(riskTrendHue('down')).toBe('green'))
})

describe('riskTrendArrow', () => {
  it('up', () => expect(riskTrendArrow('up')).toBe('▲'))
  it('stable', () => expect(riskTrendArrow('stable')).toBe('▬'))
  it('down', () => expect(riskTrendArrow('down')).toBe('▼'))
})

describe('impactHue', () => {
  it('security is red', () => expect(impactHue('security')).toBe('red'))
  it('business is green', () => expect(impactHue('business')).toBe('green'))
  it('user is blue', () => expect(impactHue('user')).toBe('blue'))
  it('system is grey', () => expect(impactHue('system')).toBe('grey'))
})

describe('incidentStatusLabel', () => {
  it('in_progress', () => expect(incidentStatusLabel('in_progress')).toBe('In progress'))
  it('open', () => expect(incidentStatusLabel('open')).toBe('Open'))
  it('resolved', () => expect(incidentStatusLabel('resolved')).toBe('Resolved'))
})

describe('confidenceLabel', () => {
  it('null', () => expect(confidenceLabel(null)).toBe('Unavailable'))
  it('high', () => expect(confidenceLabel(0.9)).toBe('High'))
  it('medium', () => expect(confidenceLabel(0.5)).toBe('Medium'))
  it('low', () => expect(confidenceLabel(0.1)).toBe('Low'))
})

describe('confidencePercent', () => {
  it('null is 0', () => expect(confidencePercent(null)).toBe(0))
  it('half is 50', () => expect(confidencePercent(0.5)).toBe(50))
  it('one is 100', () => expect(confidencePercent(1)).toBe(100))
})

describe('riskColor', () => {
  it('high score is red', () => expect(riskColor(90)).toContain('red'))
  it('low score is blue', () => expect(riskColor(10)).toContain('blue'))
})

describe('formatDuration', () => {
  it('zero', () => expect(formatDuration(0)).toBe('0m'))
  it('minutes', () => expect(formatDuration(120000)).toBe('2m'))
  it('hours', () => expect(formatDuration(7200000)).toBe('2h'))
  it('days', () => expect(formatDuration(2 * 24 * 3600000)).toBe('2d'))
})

describe('ageSince', () => {
  it('returns a string', () => {
    expect(
      typeof ageSince('2026-06-01T00:00:00.000Z', Date.parse('2026-06-02T00:00:00.000Z'))
    ).toBe('string')
  })
})
