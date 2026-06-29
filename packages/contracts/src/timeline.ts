export type TimelineEventType =
  | 'created'
  | 'updated'
  | 'assigned'
  | 'commented'
  | 'escalated'
  | 'resolved'

export type TimelineEvent = {
  id: string
  signalId: string
  type: TimelineEventType
  label: string
  actor: string
  createdAt: string
}

export const TIMELINE_EVENT_TYPES = [
  'created',
  'updated',
  'assigned',
  'commented',
  'escalated',
  'resolved'
] as const

export function isTimelineEventType(value: unknown): value is TimelineEventType {
  return typeof value === 'string' && (TIMELINE_EVENT_TYPES as readonly string[]).includes(value)
}
