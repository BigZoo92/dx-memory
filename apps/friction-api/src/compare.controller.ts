import { Controller, Get, Param } from '@nestjs/common'
import { getDataset } from './dataset'
import { buildCompare } from './helpers'
import { notFound } from './errors'
import type { CompareResponse } from './types'

@Controller('api/compare')
export class CompareController {
  @Get(':id')
  compare(@Param('id') id: string): CompareResponse {
    const { signals, analysts, events } = getDataset()
    const signal = signals.find((s) => s.id === id)
    if (!signal) notFound('Signal', id)
    return buildCompare(signal, analysts, events)
  }
}
