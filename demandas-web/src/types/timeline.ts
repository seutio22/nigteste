export type TimelineEventId = string

export type TimelineEventType = 'create' | 'field_change' | 'status_change' | 'comment'

export interface TimelineEvent {
  id: TimelineEventId
  // Campos para diferentes tipos de entidades
  atendimentoId?: string
  reajusteId?: string
  demandaId?: string
  manutencaoId?: string
  reportId?: string
  
  timestamp: string // ISO
  user?: string
  type: TimelineEventType
  field?: string
  from?: string
  to?: string
  comment?: string
}


