import { Controller, Get } from '@nestjs/common'
import { DX_METRICS_SEED } from './dataset'
import type { DxMetricsResponse } from './types'

@Controller('api/dx-metrics')
export class MetricsController {
  @Get()
  metrics(): DxMetricsResponse {
    // Friction always serves the seed table; there is no metrics collection pipeline.
    return { metrics: DX_METRICS_SEED, current: 'friction', source: 'seed' }
  }
}
