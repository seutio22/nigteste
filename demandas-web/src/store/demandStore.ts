import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Demand, DemandId } from '../types/demand'
import type { TimelineEvent } from '../types/timeline'

interface DemandState {
  items: Demand[]
  timeline: TimelineEvent[]
  isLoading: boolean
  add: (d: Omit<Demand, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Demand>
  upsert: (d: Demand) => void
  remove: (id: DemandId) => Promise<void>
  clear: () => void
  log: (e: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
  syncFromApi: () => Promise<void>
}

export const useDemandStore = create<DemandState>()(
  persist(
    (set, get) => ({
      items: [],
      timeline: [],
      isLoading: false,
      add: async (payload) => {
        console.log('🔍 DemandStore.add: Iniciando criação de demanda...')
        console.log('🔍 DemandStore.add: Payload recebido:', payload)
        
        function pad(num: number, size: number) {
          let s = String(num)
          while (s.length < size) s = '0' + s
          return s
        }
        
        function generateTicket(existing: Demand[]): string {
          const now = new Date()
          const y = now.getFullYear()
          const m = pad(now.getMonth() + 1, 2)
          const ym = `${y}${m}`
          const key = `ticket-seq-${ym}`
          let seq = 1
          try {
            const raw = localStorage.getItem(key)
            if (raw) seq = Number(raw) + 1
          } catch {}
          // garantir unicidade local
          let ticket = `DEM-${ym}-${pad(seq, 4)}`
          const has = (t: string) => existing.some((d) => (d.ticket || '').toUpperCase() === t.toUpperCase())
          while (has(ticket)) {
            seq += 1
            ticket = `DEM-${ym}-${pad(seq, 4)}`
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
          console.log('🔍 DemandStore.add: Enviando para API...')
          const { api } = await import('../lib/api.local')
          const createdDemanda = await api.createDemanda(apiPayload)
          
          console.log('🔍 DemandStore.add: Demanda criada na API:', createdDemanda)
          
          // Mapear resposta da API para o formato do frontend
          const demand: Demand = {
            ...createdDemanda,
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
          
          console.log('🔍 DemandStore.add: Demanda mapeada:', demand)
          
          // Adicionar ao store local
          set((s) => {
            console.log('🔍 DemandStore.add: Adicionando demanda ao store (API):', demand)
            console.log('🔍 DemandStore.add: Items antes:', s.items.length)
            const newItems = [demand, ...s.items]
            console.log('🔍 DemandStore.add: Items depois:', newItems.length)
            return { items: newItems }
          })
          
          // log create
          const { useAuthStore } = await import('./authStore')
          const user = useAuthStore.getState().user
          set((s) => ({ 
            timeline: [
              { 
                id: crypto.randomUUID(), 
                demandaId: demand.id, 
                type: 'create', 
                timestamp: now,
                user: user?.name || 'Usuário desconhecido'
              }, 
              ...s.timeline 
            ] 
          }))
          
          console.log('🔍 DemandStore.add: Demanda adicionada ao store local')
          return demand
          
        } catch (error) {
          console.error('❌ DemandStore.add: Erro ao criar na API:', error)
          console.log('🔍 DemandStore.add: Criando apenas localmente...')
          
          // Fallback: criar apenas localmente
          const demand: Demand = { 
            id: crypto.randomUUID(), 
            createdAt: now, 
            updatedAt: now, 
            ...payload, 
            ticket 
          }
          
          console.log('🔍 DemandStore.add: Demanda local criada:', demand)
          
          // Adicionar ao store local
          set((s) => {
            console.log('🔍 DemandStore.add: Adicionando demanda ao store local:', demand)
            console.log('🔍 DemandStore.add: Items antes:', s.items.length)
            const newItems = [demand, ...s.items]
            console.log('🔍 DemandStore.add: Items depois:', newItems.length)
            return { items: newItems }
          })
          
          // log create
          const { useAuthStore } = await import('./authStore')
          const user = useAuthStore.getState().user
          set((s) => ({ 
            timeline: [
              { 
                id: crypto.randomUUID(), 
                demandaId: demand.id, 
                type: 'create', 
                timestamp: now,
                user: user?.name || 'Usuário desconhecido'
              }, 
              ...s.timeline 
            ] 
          }))
          
          console.log('🔍 DemandStore.add: Demanda criada apenas localmente')
          return demand
        }
      },
      upsert: (demand) => set((s) => {
        const exists = s.items.some((d) => d.id === demand.id)
        if (exists) {
          return { items: s.items.map((d) => (d.id === demand.id ? { ...demand, updatedAt: new Date().toISOString() } : d)) }
        }
        return { items: [demand, ...s.items] }
      }),
      remove: async (id) => {
        console.log('🔍 DemandStore: Removendo demanda:', id)
        
        try {
          // Excluir do backend primeiro
          const { useAuthStore } = await import('./authStore')
          const baseUrl = 'https://nigteste-production.up.railway.app'
          const response = await fetch(`${baseUrl}/demandas/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${useAuthStore.getState().token}`,
            },
          })

          if (response.ok) {
            // Se excluiu do backend, excluir do frontend
            set((s) => ({ items: s.items.filter((d) => d.id !== id) }))
            console.log('✅ DemandStore: Demanda excluída do backend e frontend:', id)
          } else {
            console.error('❌ DemandStore: Erro ao excluir do backend:', response.status)
            throw new Error(`Erro ao excluir: ${response.status}`)
          }
        } catch (error) {
          console.error('❌ DemandStore: Erro ao excluir demanda:', error)
          throw error
        }
      },
      clear: () => set({ items: [] }),
      log: (e) => set((s) => ({ timeline: [{ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...e }, ...s.timeline] })),
      async syncFromApi() {
        const state = get()
        if (state.isLoading) {
          return
        }
        
        try {
          set({ isLoading: true })
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          const demandas = await api.getDemandas()
          
          
          // Mapear dados da API para o formato do frontend
          const demandasMapeadas: Demand[] = demandas.map((d: any) => ({
            id: d.id,
            ticket: d.ticket,
            status: d.status,
            solicitante: d.solicitante,
            descricao: d.descricao,
            observacoes: d.observacoes,
            qualidade: d.qualidade,
            periodicidade: d.periodicidade,
            qtdRetornos: d.qtdRetornos,
            qtdClientesVinculados: d.qtdClientesVinculados,
            usuariosEmpresa: d.usuariosEmpresa,
            dataInicio: d.dataInicio,
            dataFinal: d.dataFinal,
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
            // IDs para edição
            clienteId: d.clienteId,
            contratoId: d.contratoId,
            operadoraId: d.operadoraId,
            produtoId: d.produtoId,
            sistemaId: d.sistemaId,
            areaId: d.areaId,
            tipoId: d.tipoId,
            tipoServicoId: d.tipoServicoId,
            analistaId: d.analistaId
          }))
          
          set({ items: demandasMapeadas, isLoading: false })
        } catch (error) {
          console.error('❌ DemandStore: Erro no syncFromApi:', error)
          set({ isLoading: false })
        }
      }
    }),
    {
      name: 'demandStore',
      partialize: (state) => ({ 
        items: state.items, 
        timeline: state.timeline 
      })
    }
  )
)