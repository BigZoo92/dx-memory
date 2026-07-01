import { Controller, Get } from '@nestjs/common'
import type { HealthResponse } from './types'

@Controller('api/health')
export class HealthController {
  @Get()
  health(): HealthResponse {
    return {
      status: 'ok',
      version: '1.0.0',
      variant: 'Variant A — Friction',
      datasetVersion: 'v2.4.0',
      uptimeSeconds: Math.round(process.uptime())
    }
  }
}
