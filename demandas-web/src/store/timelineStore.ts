import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TimelineEvent, TimelineEventType } from '../types/timeline'

interface TimelineState {
  events: TimelineEvent[]
  addEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
  getEventsByEntity: (entityId: string, entityType: 'atendimento' | 'reajuste' | 'demanda' | 'analytics' | 'manutencao' | 'validacao') => TimelineEvent[]
  clearEvents: () => void
}

export const useTimelineStore = create<TimelineState>()(
  persist(
    (set, get) => ({
      events: [],
      
      addEvent: (eventData) => {
        const newEvent: TimelineEvent = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          ...eventData
        }
        
        set((state) => ({
          events: [newEvent, ...state.events]
        }))
      },
      
      getEventsByEntity: (entityId, entityType) => {
        const { events } = get()
        const entityField = entityType === 'atendimento' ? 'atendimentoId' : 
                           entityType === 'reajuste' ? 'reajusteId' : 
                           entityType === 'demanda' ? 'demandaId' : 
                           entityType === 'manutencao' ? 'manutencaoId' :
                           entityType === 'validacao' ? 'validationId' :
                           'reportId'
        
        return events.filter(event => event[entityField as keyof TimelineEvent] === entityId)
      },
      
      clearEvents: () => set({ events: [] })
    }),
    {
      name: 'timeline-store-v1',
      version: 1
    }
  )
)
