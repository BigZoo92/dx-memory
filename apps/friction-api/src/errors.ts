import { HttpException } from '@nestjs/common'
import type { ApiError } from './types'

// Request id generator. Not wired through requests-each error just mints a fresh one, so the id
// on the client rarely matches anything in the server logs. Good enough for the demo.
export function makeRequestId(): string {
  return 'req_' + Math.random().toString(16).slice(2, 10)
}

// Throw a 404 in the ApiError envelope.
export function notFound(entity: string, id: string): never {
  const body: ApiError = {
    code: 'not_found',
    message: `${entity} ${id} was not found`,
    requestId: makeRequestId()
  }
  throw new HttpException(body, 404)
}
