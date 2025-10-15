import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api.local'
import type { TimelineEvent } from '../types/timeline'

export interface AtendimentoEntry {
  id: string
  ticket: string
  cliente: string
  contrato?: string
  operadora: string
  produto?: string
  sistema?: string
  area: string
  analista: string
  tipo: string
  tipoServico: string
  descricao: string
  solicitante: string
  dataInicio: string
  dataFinal?: string
  periodicidade?: string
  qtdRetornos?: number
  qualidade?: string
  observacoes?: string
  status?: string
  createdAt: string
  updatedAt: string
}

interface AtendimentoState {
  items: AtendimentoEntry[]
  timeline: TimelineEvent[]
  isLoading: boolean
  add: (atendimento: Omit<AtendimentoEntry, 'id' | 'createdAt' | 'updatedAt'>, user?: { name?: string; id?: string }) => AtendimentoEntry
  update: (id: string, atendimento: Partial<AtendimentoEntry>, user?: { name?: string; id?: string }) => void
  remove: (id: string) => void
  clear: () => void
  log: (e: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
  syncFromApi: () => Promise<void>
}

export const useAtendimentoStore = create<AtendimentoState>()(
  persist(
    (set, get) => ({
      items: [],
      timeline: [],
      isLoading: false,
      
      add: async (payload, user) => {
        const now = new Date().toISOString()
        
        // Gerar ticket simples
        function generateTicket(): string {
          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          const random = Math.random().toString(36).substr(2, 4).toUpperCase()
          return `ATD-${year}${month}${day}-${random}`
        }
        
        const ticket = generateTicket()
        
        const apiPayload = {
          descricao: payload.descricao,
          solicitante: payload.solicitante,
          ticket,
          dataAbertura: payload.dataInicio ? new Date(payload.dataInicio).toISOString() : now,
          dataResolucao: payload.dataFinal ? new Date(payload.dataFinal).toISOString() : null,
          status: 'Aberto',
          prioridade: 'Média',
          // Campos obrigatórios - garantir que sejam enviados
          analistaId: payload.analista || null,
          areaId: payload.area || null,
          tipoServicoId: payload.tipoServico || null,
          // Campos opcionais
          clienteId: payload.cliente || null,
          contratoId: payload.contrato || null,
          operadoraId: payload.operadora || null,
          produtoId: payload.produto || null,
          sistemaId: payload.sistema || null,
          tipoId: payload.tipo || null,
          comentarios: payload.observacoes || null
        }
        
        try {
          // Criar na API
          const createdAtendimento = await api.createAtendimento(apiPayload)
          
          // Mapear resposta da API para o formato do frontend (simplificado)
          const atendimento: AtendimentoEntry = {
            ...createdAtendimento,
            // Manter os IDs originais para edição
            cliente: payload.cliente || '',
            contrato: payload.contrato || '',
            operadora: payload.operadora || '',
            produto: payload.produto || '',
            sistema: payload.sistema || '',
            area: payload.area || '',
            analista: payload.analista || '',
            tipo: payload.tipo || '',
            tipoServico: payload.tipoServico || '',
            // Garantir que as datas sejam strings
            dataInicio: payload.dataInicio || '',
            dataFinal: payload.dataFinal || '',
            createdAt: now,
            updatedAt: now
          }
          
          // Adicionar ao store local
          set((s) => {
            const newItems = [atendimento, ...s.items]
            return { items: newItems }
          })
          
          // Log de criação
          get().log({
            type: 'create',
            atendimentoId: atendimento.id,
            comment: `Atendimento ${ticket} criado`,
            userName: user?.name || 'Usuário do Sistema'
          })
          
          return atendimento
        } catch (error) {
          console.error('❌ AtendimentoStore.add: Erro ao criar atendimento na API:', error)
          throw error
        }
      },
      
      update: async (id, atendimento, user) => {
        try {
          // Obter estado anterior para comparar mudanças
          const state = get()
          const oldAtendimento = state.items.find(item => item.id === id)
          
          // Mapear campos do frontend para o formato da API
          const mappedData = {
            descricao: atendimento.descricao,
            solicitante: atendimento.solicitante,
            status: atendimento.status,
            prioridade: atendimento.prioridade || 'Média',
            analistaId: atendimento.analista || null,
            areaId: atendimento.area || null,
            clienteId: atendimento.cliente || null,
            contratoId: atendimento.contrato || null,
            operadoraId: atendimento.operadora || null,
            produtoId: atendimento.produto || null,
            sistemaId: atendimento.sistema || null,
            tipoId: atendimento.tipo || null,
            tipoServicoId: atendimento.tipoServico || null,
            dataAbertura: atendimento.dataInicio ? new Date(atendimento.dataInicio).toISOString() : null,
            dataResolucao: atendimento.dataFinal ? new Date(atendimento.dataFinal).toISOString() : null,
            tempoResolucao: atendimento.qtdRetornos || null,
            categoria: atendimento.qualidade || null,
            comentarios: atendimento.observacoes || null
          }
          
          // Chamar API para atualizar
          const updatedAtendimento = await api.updateAtendimento(id, mappedData)
          
          // Atualizar no store local
          set((state) => {
            const newItems = state.items.map((item) => {
              if (item.id === id) {
                // Mapear resposta da API para o formato do frontend
                const mappedResponse = {
                  ...item,
                  ...atendimento,
                  updatedAt: new Date().toISOString()
                }
                return mappedResponse
              }
              return item
            })
            return { items: newItems }
          })
          
          // Rastrear alterações se houver estado anterior
          if (oldAtendimento) {
            const fieldsToTrack = [
              'status', 'cliente', 'contrato', 'operadora', 'produto', 'sistema', 
              'area', 'tipo', 'tipoServico', 'descricao', 'solicitante', 
              'dataInicio', 'dataFinal', 'periodicidade', 'qtdRetornos', 'qualidade', 'observacoes'
            ]
            
            // Função para converter ID em nome para logs
            const convertIdToName = (id: string | undefined, fieldType: string) => {
              if (!id) return 'N/A'
              
              // Importar masterDataStore aqui seria problemático, então vamos usar uma abordagem diferente
              // Por enquanto, vamos manter os IDs e ajustar na exibição do Timeline
              return id
            }
            
            fieldsToTrack.forEach(field => {
              const oldValue = oldAtendimento[field] || ''
              const newValue = atendimento[field] || ''
              
              if (String(oldValue) !== String(newValue)) {
                get().log({
                  type: 'field_change',
                  atendimentoId: id,
                  field: field,
                  from: oldValue,
                  to: newValue,
                  userName: user?.name || 'Usuário do Sistema'
                })
              }
            })
          }
          
          return updatedAtendimento
          
        } catch (error) {
          console.error('❌ AtendimentoStore.update: Erro ao atualizar atendimento:', error)
          throw error
        }
      },
      
      remove: async (id) => {
        try {
          // Obter dados do atendimento antes de excluir para o log
          const state = get()
          const atendimentoToDelete = state.items.find(item => item.id === id)
          
          // Excluir do backend primeiro
          await api.deleteAtendimento(id)
          
          // Se excluiu do backend, excluir do frontend
          set((s) => ({ items: s.items.filter((item) => item.id !== id) }))
          
          // Log de exclusão
          if (atendimentoToDelete) {
            get().log({
              type: 'delete',
              atendimentoId: id,
              comment: `Atendimento ${atendimentoToDelete.ticket || id} excluído`,
              userName: 'Usuário do Sistema'
            })
          }
        } catch (error) {
          console.error('❌ AtendimentoStore: Erro ao excluir atendimento:', error)
          throw error
        }
      },
      
      clear: () => set({ items: [] }),
      
      log: async (e) => {
        const eventId = crypto.randomUUID()
        const timestamp = new Date().toISOString()
        const event = { 
          id: eventId, 
          timestamp, 
          userName: 'Usuário do Sistema',
          ...e 
        }
        
        // Adicionar ao store local imediatamente
        set((s) => ({ timeline: [event, ...s.timeline] }))
        
        // Salvar no banco de dados em background
        try {
          const { api } = await import('../lib/api.local')
          const { useAuthStore } = await import('./authStore')
          const user = useAuthStore.getState().user
          
          await api.createTimelineEvent({
            entityId: e.atendimentoId!,
            entityType: 'atendimento',
            eventType: e.type,
            field: e.field,
            fromValue: e.from,
            toValue: e.to,
            comment: undefined,
            userId: user?.id
          })
          
          console.log('✅ Evento de timeline de atendimento salvo no banco:', event)
        } catch (error) {
          console.error('❌ Erro ao salvar evento de timeline no banco:', error)
        }
      },
      
      syncFromApi: async () => {
        const state = get()
        if (state.isLoading) {
          return
        }
        
        try {
          set({ isLoading: true })
          const atendimentos = await api.getAtendimentos()
          
          // Mapear dados da API para o formato do frontend (simplificado)
          const mappedAtendimentos = atendimentos.map((apiAtendimento: any): AtendimentoEntry => ({
            id: apiAtendimento.id,
            ticket: apiAtendimento.ticket || '',
            // Mapear apenas se os IDs não forem null/undefined
            cliente: apiAtendimento.clienteId ? apiAtendimento.clienteId : '',
            contrato: apiAtendimento.contratoId ? apiAtendimento.contratoId : '',
            operadora: apiAtendimento.operadoraId ? apiAtendimento.operadoraId : '',
            produto: apiAtendimento.produtoId ? apiAtendimento.produtoId : '',
            sistema: apiAtendimento.sistemaId ? apiAtendimento.sistemaId : '',
            area: apiAtendimento.areaId ? apiAtendimento.areaId : '',
            analista: apiAtendimento.analistaId ? apiAtendimento.analistaId : '',
            tipo: apiAtendimento.tipoId ? apiAtendimento.tipoId : '',
            tipoServico: apiAtendimento.tipoServicoId ? apiAtendimento.tipoServicoId : '',
            descricao: apiAtendimento.descricao || '',
            solicitante: apiAtendimento.solicitante || '',
            dataInicio: apiAtendimento.dataAbertura ? apiAtendimento.dataAbertura.split('T')[0] : '',
            dataFinal: apiAtendimento.dataResolucao ? apiAtendimento.dataResolucao.split('T')[0] : '',
            periodicidade: apiAtendimento.periodicidade || '',
            qtdRetornos: apiAtendimento.tempoResolucao || 0,
            qualidade: apiAtendimento.categoria || '',
            observacoes: apiAtendimento.comentarios || '',
            status: apiAtendimento.status || 'Aberto',
            createdAt: apiAtendimento.createdAt || '',
            updatedAt: apiAtendimento.updatedAt || ''
          }))
          
          set({ items: mappedAtendimentos, isLoading: false })
        } catch (error) {
          console.error('❌ AtendimentoStore: Erro no syncFromApi:', error)
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'atendimentoStore',
      partialize: (state) => ({ 
        items: state.items, 
        timeline: state.timeline 
      })
    }
  )
)
