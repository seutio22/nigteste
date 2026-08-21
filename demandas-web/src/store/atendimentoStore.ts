import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api.local'
import { hasAuthToken } from '../lib/authSession'
import type { TimelineEvent } from '../types/timeline'
import { createSafePersistStorage, removeLocalStorageByPrefix } from '../lib/safePersistStorage'
import { shouldSkipStoreSync } from '../utils/syncCooldown'

export function clearAtendimentoLocalCache(): void {
  removeLocalStorageByPrefix('atendimentoStore')
}

let atendimentoSyncInFlight: Promise<void> | null = null

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
  /** Nome do solicitante quando a API retorna (backend enriquece por UUID) */
  solicitanteNome?: string
  dataInicio: string
  dataFinal?: string
  periodicidade?: string
  qtdRetornos?: number
  qualidade?: string
  observacoes?: string
  status?: string
  /** Campo enviado à API em atualizações (mapeamento) */
  prioridade?: string
  createdAt: string
  updatedAt: string
}

interface AtendimentoState {
  items: AtendimentoEntry[]
  timeline: TimelineEvent[]
  isLoading: boolean
  lastSync: number
  add: (atendimento: Omit<AtendimentoEntry, 'id' | 'createdAt' | 'updatedAt'>, user?: { name?: string; id?: string }) => Promise<AtendimentoEntry>
  update: (id: string, atendimento: Partial<AtendimentoEntry>, user?: { name?: string; id?: string }) => Promise<void>
  remove: (id: string) => void
  clear: () => void
  log: (e: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
  syncFromApi: (force?: boolean) => Promise<void>
  syncTimeline: (atendimentoId: string) => Promise<void>
}

export function mapApiAtendimentoToEntry(apiAtendimento: any): AtendimentoEntry {
  const normalizeSolicitante = (a: any): string => {
    const raw = a?.solicitanteId ?? a?.solicitante
    if (raw == null || raw === '') return ''
    if (typeof raw === 'string') return raw
    if (typeof raw === 'object' && raw !== null) return (raw.id ?? raw.nome ?? '') || ''
    return ''
  }
  // GET por id retorna objetos aninhados (cliente, analista, area...); lista retorna IDs planos
  const idOr = (flat: string | undefined, nested: any): string => {
    if (flat) return flat
    if (nested && typeof nested === 'object' && nested.id) return nested.id
    return ''
  }
  const a = apiAtendimento
  return {
    id: a.id,
    ticket: a.ticket || '',
    cliente: idOr(a.clienteId, a.cliente),
    contrato: idOr(a.contratoId, a.contrato),
    operadora: idOr(a.operadoraId, a.operadora),
    produto: idOr(a.produtoId, a.produto),
    sistema: idOr(a.sistemaId, a.sistema),
    area: idOr(a.areaId, a.area),
    analista: idOr(a.analistaId, a.analista),
    tipo: idOr(a.tipoId, a.tipo),
    tipoServico: idOr(a.tipoServicoId, a.tipoServico),
    descricao: a.descricao || '',
    solicitante: normalizeSolicitante(a),
    solicitanteNome: a.solicitanteNome ?? undefined,
    dataInicio: a.dataAbertura ? (typeof a.dataAbertura === 'string' ? a.dataAbertura.split('T')[0] : '') : '',
    dataFinal: a.dataResolucao ? (typeof a.dataResolucao === 'string' ? a.dataResolucao.split('T')[0] : '') : '',
    periodicidade: a.periodicidade || '',
    qtdRetornos: a.tempoResolucao ?? 0,
    qualidade: a.categoria || '',
    observacoes: a.comentarios || '',
    status: a.status || 'Aberto',
    createdAt: a.createdAt || '',
    updatedAt: a.updatedAt || ''
  }
}

export const useAtendimentoStore = create<AtendimentoState>()(
  persist(
    (set, get) => ({
      items: [],
      timeline: [],
      isLoading: false,
      lastSync: 0,
      
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
        
        const checkTicketExists = async (ticket: string): Promise<boolean> => {
          try {
            const data = await api.getAtendimentos(`?ticket=${encodeURIComponent(ticket)}`)
            return Array.isArray(data) ? data.length > 0 : data != null
          } catch {
            return false
          }
        }
        
        // Usar ticket fornecido pelo usuário ou gerar um único
        // Converter string vazia para null
        let ticket = payload.ticket && typeof payload.ticket === 'string' && payload.ticket.trim() !== '' 
          ? payload.ticket.trim() 
          : null
        
        // Se o ticket for null, gerar um único automaticamente
        if (!ticket) {
          // Gerar ticket único automaticamente
          let attempts = 0
          let uniqueTicket = generateTicket()
          
          while (await checkTicketExists(uniqueTicket) && attempts < 10) {
            attempts++
            uniqueTicket = generateTicket()
          }
          
          if (attempts >= 10) {
            throw new Error('Não foi possível gerar um ticket único após 10 tentativas')
          }
          
          ticket = uniqueTicket
        }
        
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
            user: user?.name || 'Usuário do Sistema'
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
                  user: user?.name || 'Usuário do Sistema'
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
        // Obter dados do atendimento antes de excluir para o log
        const state = get()
        const atendimentoToDelete = state.items.find(item => item.id === id)
        
        // Remover do estado local imediatamente (otimista)
        set((s) => ({ items: s.items.filter((item) => item.id !== id) }))
        
        try {
          // Excluir do backend
          await api.deleteAtendimento(id)
          
          // Log de exclusão
          if (atendimentoToDelete) {
            get().log({
              type: 'delete',
              atendimentoId: id,
              comment: `Atendimento ${atendimentoToDelete.ticket || id} excluído`,
              user: 'Usuário do Sistema'
            })
          }
        } catch (error: any) {
          // Se erro 404, o registro já foi deletado ou não existe - ignorar
          if (error?.statusCode === 404) {
            console.log('⚠️ AtendimentoStore: Atendimento não encontrado no backend (já foi deletado), continuando...')
            return
          }
          console.error('⚠️ AtendimentoStore: Erro ao excluir no backend:', error)
        }
      },
      
      clear: () => set({ items: [], lastSync: 0 }),
      
      log: async (e) => {
        const eventId = crypto.randomUUID()
        const timestamp = new Date().toISOString()
        const event: TimelineEvent = {
          ...e,
          id: eventId,
          timestamp,
          user: e.user || 'Usuário do Sistema'
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
      
      syncFromApi: async (force?: boolean) => {
        if (atendimentoSyncInFlight) return atendimentoSyncInFlight

        const state = get()
        const now = Date.now()
        if (shouldSkipStoreSync(state.lastSync, state.items.length, force)) return

        atendimentoSyncInFlight = (async () => {
        try {
          set({ isLoading: true })
          const atendimentos = await api.getAtendimentos()
          const mappedAtendimentos = atendimentos.map((a: any) => mapApiAtendimentoToEntry(a))
          set({ items: mappedAtendimentos, isLoading: false, lastSync: now })
        } catch (error) {
          console.error('❌ AtendimentoStore: Erro no syncFromApi:', error)
          set({ isLoading: false })
        } finally {
          atendimentoSyncInFlight = null
        }
        })()

        return atendimentoSyncInFlight
      },
      async syncTimeline(atendimentoId: string) {
        try {
          console.log('🔄 Sincronizando timeline do atendimento:', atendimentoId)
          
          const { api } = await import('../lib/api.local')
          const events = await api.getTimelineEvents(atendimentoId, 'atendimento')
          
          console.log('✅ Timeline sincronizada:', events.length, 'eventos do banco')
          
          const mappedEvents = events.map((event: any) => ({
            id: event.id,
            atendimentoId: event.entityId,
            type: event.eventType,
            field: event.field,
            from: event.fromValue,
            to: event.toValue,
            timestamp: event.createdAt,
            user: event.userName || event.userId || 'Usuário desconhecido'
          }))
          
          set((s) => {
            const otherEvents = s.timeline.filter(e => e.atendimentoId !== atendimentoId)
            const localEvents = s.timeline.filter(e => e.atendimentoId === atendimentoId)
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
            
            return { timeline: [...mergedEvents, ...otherEvents] }
          })
        } catch (error) {
          console.error('❌ Erro ao sincronizar timeline de atendimento:', error)
        }
      }
    }),
    {
      name: 'atendimentoStore',
      version: 2,
      partialize: (state) => ({ lastSync: state.lastSync }),
      storage: createSafePersistStorage<Pick<AtendimentoState, 'lastSync'>>('atendimentoStore', {
        onQuotaExceeded: clearAtendimentoLocalCache,
      }),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          if (!hasAuthToken()) return
          const s = useAtendimentoStore.getState()
          if (s.items.length === 0 && !s.isLoading) {
            void s.syncFromApi()
          }
        })
      },
    }
  )
)
