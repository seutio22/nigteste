import { create } from 'zustand'
import { persist } from 'zustand/middleware'
// Removido import de Demand - usando tipo genérico
import type { TimelineEvent } from '../types/timeline'
import { useMasterDataStore } from './masterDataStore'

interface ManutencaoState {
  items: any[]
  timeline: TimelineEvent[]
  isLoading: boolean
  add: (d: any) => Promise<any>
  upsert: (d: any) => void
  remove: (id: string) => Promise<void>
  clear: () => void
  clearLocal: () => void
  log: (e: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
  syncFromApi: () => Promise<void>
  syncTimeline: (manutencaoId: string) => Promise<void>
}

export const useManutencaoStore = create<ManutencaoState>()(
  persist(
    (set, get) => ({
      items: [],
      timeline: [],
      isLoading: false,
      add: async (payload) => {
        console.log('🔍 ManutencaoStore.add: Iniciando criação de manutenção...')
        console.log('🔍 ManutencaoStore.add: Payload recebido:', payload)
        
        function pad(num: number, size: number) {
          let s = String(num)
          while (s.length < size) s = '0' + s
          return s
        }
        
        function generateTicket(existing: any[]): string {
          const now = new Date()
          const y = now.getFullYear()
          const m = pad(now.getMonth() + 1, 2)
          const ym = `${y}${m}`
          const key = `ticket-seq-manutencao-${ym}`
          let seq = 1
          try {
            const raw = localStorage.getItem(key)
            if (raw) seq = Number(raw) + 1
          } catch {}
          // garantir unicidade local
          let ticket = `MAN-${ym}-${pad(seq, 4)}`
          const has = (t: string) => existing.some((d) => (d.ticket || '').toUpperCase() === t.toUpperCase())
          while (has(ticket)) {
            seq += 1
            ticket = `MAN-${ym}-${pad(seq, 4)}`
          }
          localStorage.setItem(key, String(seq))
          return ticket
        }
        
        const now = new Date().toISOString()
        const existing = get().items
        const ticket = generateTicket(existing)
        
        const apiPayload = {
          ...payload,
          ticket,
          createdAt: now,
          updatedAt: now
        }
        
        try {
          // Tentar criar na API primeiro
          console.log('🔍 ManutencaoStore.add: Enviando para API...')
          const { api } = await import('../lib/api.local')
          const createdManutencao = await api.createManutencao(apiPayload)
          
          console.log('🔍 ManutencaoStore.add: Manutenção criada na API:', createdManutencao)
          
          // Mapear resposta da API para o formato do frontend
          const manutencao: any = {
            ...createdManutencao,
            // Manter os IDs originais para edição
            clienteId: payload.clienteId,
            contratoId: payload.contratoId,
            operadoraId: payload.operadoraId,
            produtoId: payload.produtoId,
            sistemaId: payload.sistemaId,
            areaId: payload.areaId,
            tipoId: payload.tipoId,
            tipoServicoId: payload.tipoServicoId,
            analistaId: payload.analistaId,
            // Garantir que as datas sejam strings
            dataInicio: payload.dataInicio,
            dataFinal: payload.dataFinal,
            createdAt: now,
            updatedAt: now
          }
          
          console.log('🔍 ManutencaoStore.add: Manutenção mapeada:', manutencao)
          
          // Adicionar ao store local
          set((s) => {
            console.log('🔍 ManutencaoStore.add: Adicionando manutenção ao store (API):', manutencao)
            console.log('🔍 ManutencaoStore.add: Items antes:', s.items.length)
            const newItems = [manutencao, ...s.items]
            console.log('🔍 ManutencaoStore.add: Items depois:', newItems.length)
            return { items: newItems }
          })
          
          // log create
          const { useAuthStore } = await import('./authStore')
          const user = useAuthStore.getState().user
          set((s) => ({ 
            timeline: [
              { 
                id: crypto.randomUUID(), 
                manutencaoId: manutencao.id, 
                type: 'create', 
                timestamp: now,
                user: user?.name || 'Usuário desconhecido'
              }, 
              ...s.timeline 
            ] 
          }))
          
          console.log('🔍 ManutencaoStore.add: Manutenção adicionada ao store local')
          return manutencao
          
        } catch (error) {
          console.error('❌ ManutencaoStore.add: Erro ao criar na API:', error)
          console.log('🔍 ManutencaoStore.add: Tentando com payload simplificado...')
          
          // Tentar novamente com apenas campos obrigatórios
          try {
            const { api: apiRetry } = await import('../lib/api.local')
            const payloadSimplificado = {
              status: payload.status,
              ticket: payload.ticket,
              tipoServicoId: payload.tipoServicoId,
              tipoId: payload.tipoId,
            }
            
            console.log('🔍 ManutencaoStore.add: Payload simplificado:', payloadSimplificado)
            const manutencao = await apiRetry.createManutencao(payloadSimplificado)
            console.log('🔍 ManutencaoStore.add: Manutenção criada com payload simplificado:', manutencao)
            
            // Adicionar ao store local
            set((s) => {
              const newItems = [manutencao, ...s.items]
              return { items: newItems }
            })
            
            console.log('🔍 ManutencaoStore.add: Manutenção criada com sucesso (payload simplificado)')
            return manutencao
            
          } catch (error2) {
            console.error('❌ ManutencaoStore.add: Erro também com payload simplificado:', error2)
            console.log('🔍 ManutencaoStore.add: Criando apenas localmente...')
            
            // Fallback final: criar apenas localmente
            const manutencao: any = { 
              id: crypto.randomUUID(), 
              createdAt: now, 
              updatedAt: now, 
              ...payload, 
              ticket 
            }
            
            console.log('🔍 ManutencaoStore.add: Manutenção local criada:', manutencao)
            
            // Adicionar ao store local
            set((s) => {
              console.log('🔍 ManutencaoStore.add: Adicionando manutenção ao store local:', manutencao)
              console.log('🔍 ManutencaoStore.add: Items antes:', s.items.length)
              const newItems = [manutencao, ...s.items]
              console.log('🔍 ManutencaoStore.add: Items depois:', newItems.length)
              return { items: newItems }
            })
          
          // log create
          const { useAuthStore } = await import('./authStore')
          const user = useAuthStore.getState().user
          set((s) => ({ 
            timeline: [
              { 
                id: crypto.randomUUID(), 
                manutencaoId: manutencao.id, 
                type: 'create', 
                timestamp: now,
                user: user?.name || 'Usuário desconhecido'
              }, 
              ...s.timeline 
            ] 
          }))
          
          console.log('🔍 ManutencaoStore.add: Manutenção criada apenas localmente')
          return manutencao
          }
        }
      },
      upsert: (manutencao) => set((s) => {
        const exists = s.items.some((d) => d.id === manutencao.id)
        if (exists) {
          return { items: s.items.map((d) => (d.id === manutencao.id ? { ...manutencao, updatedAt: new Date().toISOString() } : d)) }
        }
        return { items: [{ ...manutencao, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }, ...s.items] }
      }),
      remove: async (id) => {
        try {
          console.log('🗑️ Removendo manutenção:', id)
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          // Excluir do backend primeiro
          await api.deleteManutencao(id)
          console.log('✅ Manutenção excluída com sucesso no backend')
          
          // Remover do estado local
          set((s) => ({ items: s.items.filter((d) => d.id !== id) }))
          console.log('✅ Manutenção removida do estado local')
          
        } catch (error) {
          console.error('❌ Erro ao excluir manutenção:', error)
          throw error
        }
      },
      clear: () => set({ items: [] }),
      clearLocal: () => {
        console.log('🔍 ManutencaoStore: Limpando todas as manutenções locais')
        set({ items: [] })
        console.log('✅ ManutencaoStore: Manutenções locais limpas')
      },
      log: async (e) => {
        const eventId = crypto.randomUUID()
        const timestamp = new Date().toISOString()
        const event = { id: eventId, timestamp, ...e }
        
        // Adicionar ao store local imediatamente
        set((s) => ({ timeline: [event, ...s.timeline] }))
        
        // Salvar no banco de dados em background
        try {
          const { api } = await import('../lib/api.local')
          const { useAuthStore } = await import('./authStore')
          const user = useAuthStore.getState().user
          
          await api.createTimelineEvent({
            entityId: e.manutencaoId!,
            entityType: 'manutencao',
            eventType: e.type,
            field: e.field,
            fromValue: e.from,
            toValue: e.to,
            comment: undefined,
            userId: user?.id
          })
          
          console.log('✅ Evento de timeline salvo no banco:', event)
        } catch (error) {
          console.error('❌ Erro ao salvar evento de timeline no banco:', error)
          // Não fazer nada - o evento já está salvo localmente
        }
      },
      async syncFromApi() {
        const state = get()
        if (state.isLoading) {
          return
        }
        
        try {
          set({ isLoading: true })
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          const manutencoes = await api.getManutencoes()
          
          // Mapear dados da API para o formato do frontend
          const manutencoesMapeadas: any[] = manutencoes.map((m: any) => ({
            id: m.id,
            ticket: m.ticket,
            status: m.status,
            solicitante: m.solicitante,
            descricao: m.descricao,
            observacoes: m.observacoes,
            qualidade: m.qualidade,
            periodicidade: m.periodicidade,
            qtdRetornos: m.qtdRetornos,
            qtdClientesVinculados: m.qtdClientesVinculados,
            usuariosEmpresa: m.usuariosEmpresa,
            dataInicio: m.dataInicio,
            dataFinal: m.dataFinal,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            // IDs para edição
            clienteId: m.clienteId,
            contratoId: m.contratoId,
            operadoraId: m.operadoraId,
            produtoId: m.produtoId,
            sistemaId: m.sistemaId,
            areaId: m.areaId,
            tipoId: m.tipoId,
            tipoServicoId: m.tipoServicoId,
            analistaId: m.analistaId
          }))
          
          // Se não há dados da API mas há dados locais, manter os dados locais
          if (manutencoesMapeadas.length === 0 && state.items.length > 0) {
            console.log('🔍 ManutencaoStore: API retornou 0 registros, mantendo dados locais')
            set({ isLoading: false })
            return
          }
          
          set({ items: manutencoesMapeadas, isLoading: false })
        } catch (error) {
          console.error('❌ ManutencaoStore: Erro no syncFromApi:', error)
          set({ isLoading: false })
        }
      },
      async syncTimeline(manutencaoId: string) {
        try {
          console.log('🔄 Sincronizando timeline da manutenção:', manutencaoId)
          
          const { api } = await import('../lib/api.local')
          const events = await api.getTimelineEvents(manutencaoId, 'manutencao')
          
          console.log('✅ Timeline sincronizada:', events.length, 'eventos')
          
          // Mapear eventos da API para o formato do frontend
          const mappedEvents = events.map((event: any) => ({
            id: event.id,
            manutencaoId: event.entityId,
            type: event.eventType,
            field: event.field,
            from: event.fromValue,
            to: event.toValue,
            timestamp: event.createdAt,
            user: event.userId
          }))
          
          // Atualizar apenas os eventos desta manutenção específica
          set((s) => {
            // Remover eventos antigos desta manutenção
            const otherEvents = s.timeline.filter(e => e.manutencaoId !== manutencaoId)
            // Adicionar eventos sincronizados
            return { timeline: [...mappedEvents, ...otherEvents] }
          })
        } catch (error) {
          console.error('❌ Erro ao sincronizar timeline:', error)
        }
      },
    }),
    {
      name: 'manutencoes-v1',
      partialize: (state) => ({
        items: state.items,
        timeline: state.timeline,
      }),
    }
  )
)
