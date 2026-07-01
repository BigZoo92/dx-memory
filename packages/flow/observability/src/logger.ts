import type { FlowLogEvent, FlowLogFields, FlowLogLevel, FlowRuntime } from './types'
import { FLOW_VARIANT } from './types'
import { levelToSeverityNumber, meetsMinLevel } from './severity'
import { redactEvent } from './redact'
import { makeEventId, nowIso } from './ids'
import type { LogStore } from './memory-store'

export type LoggerOptions = {
  runtime: FlowRuntime
  store: LogStore
  /** Mirror events to the console (dev only). Off by default. */
  console?: boolean
  /** Drop events below this level. Defaults to 'debug' (keep everything). */
  minLevel?: FlowLogLevel
}

export type FlowLogger = {
  log(level: FlowLogLevel, message: string, fields?: FlowLogFields): FlowLogEvent | null
  debug(message: string, fields?: FlowLogFields): FlowLogEvent | null
  info(message: string, fields?: FlowLogFields): FlowLogEvent | null
  warn(message: string, fields?: FlowLogFields): FlowLogEvent | null
  error(message: string, fields?: FlowLogFields): FlowLogEvent | null
  fatal(message: string, fields?: FlowLogFields): FlowLogEvent | null
}

const CONSOLE_METHOD: Record<FlowLogLevel, 'debug' | 'info' | 'warn' | 'error'> = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'error'
}

/**
 * Build a structured logger over a store. Every event is redacted before it is stored (and before it
 * is mirrored to the console), so this is the safe entry point for both the client and the server.
 */
export function createLogger(options: LoggerOptions): FlowLogger {
  const minLevel = options.minLevel ?? 'debug'
  const useConsole = options.console ?? false

  const log = (
    level: FlowLogLevel,
    message: string,
    fields: FlowLogFields = {}
  ): FlowLogEvent | null => {
    if (!meetsMinLevel(level, minLevel)) return null
    const event = redactEvent({
      id: makeEventId(),
      timestamp: nowIso(),
      level,
      runtime: options.runtime,
      variant: FLOW_VARIANT,
      message,
      severityNumber: levelToSeverityNumber(level),
      ...fields
    })
    options.store.add(event)
    if (useConsole) {
      console[CONSOLE_METHOD[level]](`[flow:${event.runtime}] ${level} ${event.message}`, {
        requestId: event.requestId,
        route: event.route,
        status: event.status,
        safeContext: event.safeContext
      })
    }
    return event
  }

  return {
    log,
    debug: (message, fields) => log('debug', message, fields),
    info: (message, fields) => log('info', message, fields),
    warn: (message, fields) => log('warn', message, fields),
    error: (message, fields) => log('error', message, fields),
    fatal: (message, fields) => log('fatal', message, fields)
  }
}
