import { Controller, HttpException, Post } from '@nestjs/common'
import { makeRequestId } from './errors'
import type { ApiError } from './types'

@Controller('api/simulate-error')
export class SimulateController {
  @Post()
  simulate(): never {
    // Build the envelope inline here (the not-found path in errors.ts builds its own).
    const body: ApiError = {
      code: 'simulated_error',
      message: 'Simulated API error — widgets now show a partial-error state.',
      requestId: makeRequestId()
    }
    throw new HttpException(body, 500)
  }
}
