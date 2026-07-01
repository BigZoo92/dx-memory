import { HashMap, Logger, type LogLevel } from 'effect'
import type { FlowLogLevel, FlowRuntime } from './types'
import { createLogger } from './logger'
import type { LogStore } from './memory-store'

/**
 * The Effect logging adapter, deliberately kept in this separate `@signalops/flow-observability/effect`
 * entry point so the framework-free core never pulls `effect` into a client bundle. The server edge
 * provides `observabilityLoggerLayer`; then any `Effect.logError(...).pipe(Effect.annotateLogs(...))`
 * lands as a structured Flow event in the same store the Ops UI reads.
 */

function mapLevel(level: LogLevel.LogLevel): FlowLogLevel {
  switch (level._tag) {
    case 'Fatal':
      return 'fatal'
    case 'Error':
      return 'error'
    case 'Warning':
      return 'warn'
    case 'Debug':
    case 'Trace':
      return 'debug'
    default:
      return 'info'
  }
}

function toRecord(annotations: HashMap.HashMap<string, unknown>): Record<string, unknown> {
  return HashMap.reduce(annotations, {} as Record<string, unknown>, (acc, value, key) => {
    acc[key] = value
    return acc
  })
}

export function makeObservabilityLogger(
  store: LogStore,
  runtime: FlowRuntime = 'effect'
): Logger.Logger<unknown, void> {
  const logger = createLogger({ store, runtime, console: false })
  return Logger.make(({ logLevel, message, annotations }) => {
    const safeContext = toRecord(annotations)
    const text = typeof message === 'string' ? message : JSON.stringify(message)
    const requestId = typeof safeContext.requestId === 'string' ? safeContext.requestId : undefined
    logger.log(mapLevel(logLevel), text, { requestId, safeContext })
  })
}

/** A Layer that adds the observability logger alongside Effect's default logger. */
export function observabilityLoggerLayer(store: LogStore, runtime: FlowRuntime = 'effect') {
  return Logger.add(makeObservabilityLogger(store, runtime))
}
