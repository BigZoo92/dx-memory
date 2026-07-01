import { createLogger, getDefaultStore } from '@signalops/flow-observability'

let installed = false

/**
 * Install browser-global error handlers once. They capture otherwise-invisible client failures
 * (uncaught errors, unhandled promise rejections) into the in-memory store the Ops surface reads.
 * No-op on the server and after the first call.
 */
export function installClientObservability(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  const logger = createLogger({ store: getDefaultStore(), runtime: 'client' })

  window.addEventListener('error', (event) => {
    logger.error(event.message || 'Uncaught error', {
      errorTag: 'unhandled',
      errorCode: 'unhandled',
      safeContext: { source: event.filename, line: event.lineno, column: event.colno }
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    logger.error(reason instanceof Error ? reason.message : 'Unhandled promise rejection', {
      errorTag: 'unhandled',
      errorCode: 'unhandled'
    })
  })
}
