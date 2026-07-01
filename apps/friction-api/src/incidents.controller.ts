import { Controller, Get, Query } from '@nestjs/common'
import { getDataset } from './dataset'
import type { Incident, Paginated } from './types'

// Incidents list. The filter/sort/paginate logic is re-implemented here (it is close to, but not
// shared with, the signals version in helpers.ts).
@Controller('api/incidents')
export class IncidentsController {
  @Get()
  list(@Query() q: Record<string, string>): Paginated<Incident> {
    const { incidents } = getDataset()
    const filtered = incidents.filter((i) => {
      if (q.status && i.status !== q.status) return false
      if (q.severity && i.severity !== q.severity) return false
      if (q.impact && i.impact !== q.impact) return false
      return true
    })
    const sorted = filtered
      .slice()
      .sort((a, b) =>
        a.createdAt !== b.createdAt ? (a.createdAt < b.createdAt ? 1 : -1) : a.id < b.id ? -1 : 1
      )
    const pageSize = q.pageSize ? Math.min(parseInt(q.pageSize, 10) || 50, 200) : 50
    const total = sorted.length
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
    const page = Math.min(
      Math.max(1, q.page ? parseInt(q.page, 10) || 1 : 1),
      Math.max(1, totalPages)
    )
    const start = (page - 1) * pageSize
    return { items: sorted.slice(start, start + pageSize), page, pageSize, total, totalPages }
  }
}
