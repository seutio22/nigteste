export type TimelineEventId = string

export type TimelineEventType = 'create' | 'field_change' | 'status_change' | 'comment'

export interface TimelineEvent {
  id: TimelineEventId
  demandaId: string
  timestamp: string // ISO
  user?: string
  type: TimelineEventType
  field?: string
  from?: string
  to?: string
  comment?: string
}


