import { Controller, Get, Param, Query } from '@nestjs/common'
import { SignalsService } from './signals.service'
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './helpers'
import type { Paginated, Signal, SignalsQuery, SignalDetailResponse, TimelineEvent } from './types'

@Controller('api/signals')
export class SignalsController {
  constructor(private readonly signals: SignalsService) {}

  @Get()
  list(@Query() q: Record<string, string>): Paginated<Signal> {
    // Loose query coercion. Unknown enum values just fall through and match nothing.
    const query: SignalsQuery = {
      search: q.search || undefined,
      severity: (q.severity as any) || undefined,
      status: (q.status as any) || undefined,
      source: (q.source as any) || undefined,
      assignedTo: q.assignedTo || undefined,
      dateFrom: q.dateFrom || undefined,
      dateTo: q.dateTo || undefined,
      page: q.page ? parseInt(q.page, 10) : undefined,
      pageSize: q.pageSize
        ? Math.min(parseInt(q.pageSize, 10) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
        : undefined,
      sortBy: (q.sortBy as any) || undefined,
      sortDirection: (q.sortDirection as any) || undefined
    }
    return this.signals.list(query)
  }

  @Get(':id')
  one(@Param('id') id: string): SignalDetailResponse {
    return this.signals.getOne(id)
  }

  @Get(':id/events')
  events(@Param('id') id: string): TimelineEvent[] {
    return this.signals.events(id)
  }
}
