import { Controller, Get } from '@nestjs/common'
import { getDataset } from './dataset'
import { buildDashboard } from './helpers'
import type { DashboardSummary } from './types'

@Controller('api/dashboard')
export class DashboardController {
  @Get('summary')
  summary(): DashboardSummary {
    const { signals, incidents } = getDataset()
    return buildDashboard(signals, incidents)
  }
}
