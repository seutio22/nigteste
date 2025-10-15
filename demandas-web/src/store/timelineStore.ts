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
      
      addEvent: async (eventData) => {
        const newEvent: TimelineEvent = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          ...eventData
        }
        
        // Adicionar ao store local imediatamente
        set((state) => ({
          events: [newEvent, ...state.events]
        }))
        
        // Salvar no banco de dados em background
        try {
          const { api } = await import('../lib/api.local')
          const { useAuthStore } = await import('./authStore')
          const user = useAuthStore.getState().user
          
          // Determinar entityId e entityType baseado nos campos presentes
          const entityId = eventData.reajusteId || eventData.reportId || eventData.demandaId || eventData.atendimentoId || eventData.manutencaoId || ''
          const entityType = eventData.reajusteId ? 'reajuste' : 
                           eventData.reportId ? 'analytics' :
                           eventData.demandaId ? 'demanda' :
                           eventData.atendimentoId ? 'atendimento' :
                           eventData.manutencaoId ? 'manutencao' : 'reajuste'
          
          await api.createTimelineEvent({
            entityId,
            entityType,
            eventType: eventData.type,
            field: eventData.field,
            fromValue: eventData.from,
            toValue: eventData.to,
            comment: undefined,
            userId: user?.id
          })
          
          console.log('✅ Evento de timeline salvo no banco:', newEvent)
        } catch (error) {
          console.error('❌ Erro ao salvar evento de timeline no banco:', error)
        }
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
