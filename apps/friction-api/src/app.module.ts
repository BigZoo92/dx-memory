import { Module } from '@nestjs/common'
import { SignalsController } from './signals.controller'
import { SignalsService } from './signals.service'
import { IncidentsController } from './incidents.controller'
import { DashboardController } from './dashboard.controller'
import { CompareController } from './compare.controller'
import { MetricsController } from './metrics.controller'
import { HealthController } from './health.controller'
import { SimulateController } from './simulate.controller'

// One module, everything in it. No feature modules.
@Module({
  controllers: [
    SignalsController,
    IncidentsController,
    DashboardController,
    CompareController,
    MetricsController,
    HealthController,
    SimulateController
  ],
  providers: [SignalsService]
})
export class AppModule {}
