import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TimelineEvent, TimelineEventType } from '../types/timeline'

interface TimelineState {
  events: TimelineEvent[]
  addEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
  getEventsByEntity: (entityId: string, entityType: 'atendimento' | 'reajuste' | 'demanda' | 'analytics' | 'manutencao' | 'validacao') => TimelineEvent[]
  clearEvents: () => void
  syncTimeline: (entityId: string, entityType: string) => Promise<void>
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
          
          // Obter o usuário atual do authStore
          const currentUser = useAuthStore.getState().user
          const userId = currentUser?.id
          
          console.log('🔍 timelineStore.addEvent: Dados do evento:', {
            eventData,
            currentUser: {
              id: currentUser?.id,
              name: currentUser?.name,
              email: currentUser?.email
            },
            userIdParaSalvar: userId
          })
          
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
            userId: userId
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
      
      clearEvents: () => set({ events: [] }),
      
      async syncTimeline(entityId: string, entityType: string) {
        try {
          console.log('🔄 Sincronizando timeline:', { entityId, entityType })
          
          const { api } = await import('../lib/api.local')
          const events = await api.getTimelineEvents(entityId, entityType)
          
          console.log('✅ Timeline sincronizada:', events.length, 'eventos do banco')
          
          // Mapear eventos da API para o formato do frontend
          const mappedEvents = events.map((event: any) => {
            const entityField = entityType === 'reajuste' ? 'reajusteId' : 'reportId'
            return {
              id: event.id,
              [entityField]: event.entityId,
              type: event.eventType,
              field: event.field,
              from: event.fromValue,
              to: event.toValue,
              timestamp: event.createdAt,
              user: event.userName || event.userId || 'Usuário desconhecido'
            }
          })
          
          // Mesclar eventos do banco com locais (sem duplicar)
          set((s) => {
            const otherEvents = s.events.filter((e: any) => {
              const field = entityType === 'reajuste' ? e.reajusteId : e.reportId
              return field !== entityId
            })
            
            const localEvents = s.events.filter((e: any) => {
              const field = entityType === 'reajuste' ? e.reajusteId : e.reportId
              return field === entityId
            })
            
            const mergedEvents = [...mappedEvents]
            
            localEvents.forEach(localEvent => {
              const existsInBank = mappedEvents.some(bankEvent => {
                const timeDiff = Math.abs(new Date(bankEvent.timestamp).getTime() - new Date(localEvent.timestamp).getTime())
                return timeDiff < 5000 &&
                       bankEvent.field === localEvent.field &&
                       bankEvent.from === localEvent.from &&
                       bankEvent.to === localEvent.to
              })
              if (!existsInBank) mergedEvents.push(localEvent)
            })
            
            return { events: [...mergedEvents, ...otherEvents] }
          })
        } catch (error) {
          console.error('❌ Erro ao sincronizar timeline:', error)
        }
      }
    }),
    {
      name: 'timeline-store-v1',
      version: 1
    }
  )
)
