/**
 * Production server entry.
 *
 * `vite build` emits a Web-standard `{ fetch }` handler at dist/server/server.js (it does not
 * self-listen). This wrapper serves that handler on a port using `srvx` (the unjs universal
 * server, same one TanStack/h3 uses), so the container runs a plain `node server.mjs`.
 */
import { serve } from 'srvx'
import handler from './dist/server/server.js'

const port = Number(process.env.PORT) || 3000

serve({ fetch: handler.fetch, port })
console.log(`SignalOps Flow listening on http://0.0.0.0:${port}`)
