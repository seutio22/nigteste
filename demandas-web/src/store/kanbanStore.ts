import { create } from 'zustand'

/** Remove cache legado que estourava a cota do localStorage (tickets duplicados). */
export function clearKanbanLocalCache(): void {
  try {
    localStorage.removeItem('kanban-store-v1')
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && key.startsWith('kanban-store')) localStorage.removeItem(key)
    }
  } catch {
    /* ignore */
  }
}

/** A API devolve `tags` como string; o front usa `string[]` no estado. */
function normalizeTagsFromApi(tags: unknown): string[] {
  if (tags == null) return []
  if (Array.isArray(tags)) return tags.map((t) => String(t))
  if (typeof tags === 'string') {
    const s = tags.trim()
    if (!s) return []
    try {
      const parsed = JSON.parse(s) as unknown
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return s.split(',').map((t) => t.trim()).filter(Boolean)
    }
  }
  return []
}

export type KanbanBaseStatus = 'backlog' | 'todo' | 'in-progress' | 'done'
export type KanbanOptionalStatus = 'analise' | 'homologacao' | 'aguardando-retorno'
export type KanbanStatus = KanbanBaseStatus | KanbanOptionalStatus

export interface KanbanTicket {
  id: string
  title: string
  description: string
  status: KanbanStatus
  priority: 'low' | 'medium' | 'high'
  assignee: string // Campo obrigatório para controle de acesso
  startDate?: string
  dueDate?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface KanbanColumn {
  id: KanbanStatus
  title: string
  tickets: KanbanTicket[]
  color: string
  optional?: boolean
}

/**
 * Cores do Kanban (dashboard): #C0B66D, #C7C8CA, #EA983E, #49B7C4, #A4C854, #68A79D
 * Ordem completa do fluxo. Colunas com `optional: true` só aparecem quando o
 * usuário as ativa; as demais são a matriz fixa do sistema.
 */
export const KANBAN_ALL_COLUMNS: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    tickets: [],
    color: '#C7C8CA'
  },
  {
    id: 'analise',
    title: 'Análise',
    tickets: [],
    color: '#C0B66D',
    optional: true
  },
  {
    id: 'todo',
    title: 'A Fazer',
    tickets: [],
    color: '#EA983E'
  },
  {
    id: 'homologacao',
    title: 'Homologação',
    tickets: [],
    color: '#68A79D',
    optional: true
  },
  {
    id: 'in-progress',
    title: 'Em Andamento',
    tickets: [],
    color: '#49B7C4'
  },
  {
    id: 'aguardando-retorno',
    title: 'Aguardando Retorno',
    tickets: [],
    color: '#9A7FB8',
    optional: true
  },
  {
    id: 'done',
    title: 'Concluído',
    tickets: [],
    color: '#A4C854'
  }
]

/** Colunas matriz (sempre visíveis). Mantido para compatibilidade. */
export const KANBAN_COLUMNS: KanbanColumn[] = KANBAN_ALL_COLUMNS.filter((c) => !c.optional)

export const KANBAN_OPTIONAL_COLUMNS: KanbanColumn[] = KANBAN_ALL_COLUMNS.filter((c) => c.optional)

/** Colunas ativas na ordem do fluxo (matriz + opcionais ativadas pelo usuário). */
export function getActiveKanbanColumns(enabledOptional: string[]): KanbanColumn[] {
  return KANBAN_ALL_COLUMNS.filter((c) => !c.optional || enabledOptional.includes(c.id))
}

interface KanbanState {
  tickets: KanbanTicket[]
  columns: KanbanColumn[]
  enabledOptionalColumns: string[]
  loading: boolean
  error: string | null
  
  // Ações
  addTicket: (ticket: Omit<KanbanTicket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<KanbanTicket>
  updateTicket: (id: string, updates: Partial<KanbanTicket>) => Promise<void>
  moveTicket: (ticketId: string, newStatus: KanbanTicket['status']) => Promise<void>
  deleteTicket: (id: string) => Promise<void>
  deleteAllTickets: () => Promise<void>
  
  // Colunas opcionais
  loadColumnPrefs: () => Promise<void>
  setOptionalColumnEnabled: (columnId: KanbanOptionalStatus, enabled: boolean) => Promise<void>
  
  // Utilitários
  getTicketsByStatus: (status: KanbanTicket['status']) => KanbanTicket[]
  getTicketById: (id: string) => KanbanTicket | undefined
  getColumnsWithTickets: () => KanbanColumn[]
  
  // Controle de acesso
  getFilteredTickets: (userRole?: string, userId?: string, viewOwnDataOnly?: boolean) => KanbanTicket[]
  getFilteredColumnsWithTickets: (userRole?: string, userId?: string, viewOwnDataOnly?: boolean) => KanbanColumn[]
  
  // Importação/Exportação
  importTickets: (tickets: KanbanTicket[]) => void
  exportTickets: () => KanbanTicket[]
  
  // Sincronização com API
  syncFromApi: () => Promise<void>
  clearError: () => void
}

export const useKanbanStore = create<KanbanState>()((set, get) => {
      return {
        tickets: [],
        columns: KANBAN_COLUMNS,
        enabledOptionalColumns: [],
        loading: false,
        error: null,
        
        loadColumnPrefs: async () => {
          try {
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            const res = await api.get('/kanban/column-prefs')
            const enabled = Array.isArray(res?.enabledColumns) ? res.enabledColumns.map(String) : []
            set({ enabledOptionalColumns: enabled })
          } catch (error) {
            console.error('❌ Erro ao carregar preferências de colunas:', error)
          }
        },
        
        setOptionalColumnEnabled: async (columnId: KanbanOptionalStatus, enabled: boolean) => {
          const current = get().enabledOptionalColumns
          const next = enabled
            ? [...new Set([...current, columnId])]
            : current.filter((c) => c !== columnId)

          try {
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            const res = await api.put('/kanban/column-prefs', { enabledColumns: next })
            const confirmed = Array.isArray(res?.enabledColumns) ? res.enabledColumns.map(String) : next
            set({ enabledOptionalColumns: confirmed })
          } catch (error) {
            console.error('❌ Erro ao salvar preferências de colunas:', error)
            throw error
          }
        },
        
        addTicket: async (ticketData: Omit<KanbanTicket, 'id' | 'createdAt' | 'updatedAt'>) => {
          try {
            console.log('🔍 KanbanStore: addTicket iniciado')
            console.log('🔍 KanbanStore: ticketData recebido:', ticketData)
            console.log('🔍 KanbanStore: ticketData JSON:', JSON.stringify(ticketData, null, 2))
            set({ loading: true, error: null })
            
            // Salvar na API primeiro
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            
            console.log('🔍 KanbanStore: Enviando para API POST /kanban/tickets')
            const payload = {
              ...ticketData,
              tags: Array.isArray(ticketData.tags)
                ? ticketData.tags.join(', ')
                : typeof ticketData.tags === 'string'
                  ? ticketData.tags
                  : '',
            }
            const newTicket = await api.post('/kanban/tickets', payload)
            console.log('✅ KanbanStore: Ticket criado na API:', newTicket)
            
            const normalizedTicket = {
              ...newTicket,
              tags: normalizeTagsFromApi(newTicket.tags),
            }
            
            // Adicionar ao estado local
            set((state) => ({
              tickets: [...state.tickets, normalizedTicket],
              loading: false
            }))
            
            console.log('✅ KanbanStore: Ticket adicionado ao estado local')
            return normalizedTicket as KanbanTicket
          } catch (error) {
            console.error('❌ Erro ao criar ticket:', error)
            set({ error: 'Erro ao criar ticket', loading: false })
            throw error
          }
        },
        
        updateTicket: async (id: string, updates: Partial<KanbanTicket>) => {
          try {
            set({ loading: true, error: null })
            
            // Atualizar na API
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            
            const putBody = {
              ...updates,
              ...(updates.tags !== undefined
                ? {
                    tags: Array.isArray(updates.tags)
                      ? updates.tags.join(', ')
                      : typeof updates.tags === 'string'
                        ? updates.tags
                        : '',
                  }
                : {}),
            }
            const updatedTicket = await api.put(`/kanban/tickets/${id}`, putBody)
            console.log('✅ KanbanStore: Ticket atualizado na API:', id)
            
            const normalizedTicket = {
              ...updatedTicket,
              tags: normalizeTagsFromApi(updatedTicket.tags),
            }

            set((state) => ({
              tickets: state.tickets.map((ticket) => (ticket.id === id ? normalizedTicket : ticket)),
              loading: false,
            }))
            
          } catch (error) {
            console.error('❌ Erro ao atualizar ticket:', error)
            set({ error: 'Erro ao atualizar ticket', loading: false })
            throw error
          }
        },
        
        moveTicket: async (ticketId: string, newStatus: KanbanTicket['status']) => {
          const previousTickets = get().tickets
          const current = previousTickets.find((t) => t.id === ticketId)
          if (!current || current.status === newStatus) return

          // Atualização otimista: o card muda de coluna imediatamente; rollback se a API falhar
          set({
            tickets: previousTickets.map((ticket) =>
              ticket.id === ticketId
                ? { ...ticket, status: newStatus, updatedAt: new Date().toISOString() }
                : ticket
            ),
            error: null,
          })

          try {
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            
            const updatedTicket = await api.put(`/kanban/tickets/${ticketId}`, { status: newStatus })
            console.log('✅ KanbanStore: Ticket movido na API:', ticketId, '->', newStatus)
            
            const normalizedTicket = {
              ...updatedTicket,
              tags: normalizeTagsFromApi(updatedTicket.tags),
            }

            set((state) => ({
              tickets: state.tickets.map((ticket) => (ticket.id === ticketId ? normalizedTicket : ticket)),
            }))
            
          } catch (error) {
            console.error('❌ Erro ao mover ticket:', error)
            set({ tickets: previousTickets, error: 'Erro ao mover ticket' })
            throw error
          }
        },
        
        deleteTicket: async (id: string) => {
          try {
            set({ loading: true, error: null })
            
            // Remover da API
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            
            await api.delete(`/kanban/tickets/${id}`)
            console.log('✅ KanbanStore: Ticket removido da API:', id)
            
            // Remover do estado local
            set((state) => ({
              tickets: state.tickets.filter(ticket => ticket.id !== id),
              loading: false
            }))
            
          } catch (error) {
            console.error('❌ Erro ao remover ticket:', error)
            set({ error: 'Erro ao remover ticket', loading: false })
            throw error
          }
        },
        
        deleteAllTickets: async () => {
          try {
            set({ loading: true, error: null })
            
            // Limpar na API
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            
            await api.delete('/kanban/tickets')
            console.log('✅ KanbanStore: Todos os tickets removidos da API')
            
            // Limpar estado local
            set({ tickets: [], loading: false })
            
          } catch (error) {
            console.error('❌ Erro ao limpar tickets:', error)
            set({ error: 'Erro ao limpar tickets', loading: false })
            throw error
          }
        },
        
        getTicketsByStatus: (status: KanbanTicket['status']) => {
          return get().tickets.filter(ticket => ticket.status === status)
        },
        
        getTicketById: (id: string) => {
          return get().tickets.find(ticket => ticket.id === id)
        },
        
        getColumnsWithTickets: () => {
          const { tickets, enabledOptionalColumns } = get()
          return getActiveKanbanColumns(enabledOptionalColumns).map(col => ({
            ...col,
            tickets: tickets.filter(ticket => ticket.status === col.id)
          }))
        },
        
        // Controle de acesso
        getFilteredTickets: (userRole?: string, userId?: string, viewOwnDataOnly?: boolean) => {
          const { tickets } = get()
          
          // Se não há usuário logado, retornar array vazio (não mostrar tickets)
          if (!userId) {
            console.log('🔍 KanbanStore: Usuário não logado, retornando array vazio')
            return []
          }
          
          // SEMPRE filtrar por tickets do usuário logado (tickets privados)
          return tickets.filter(ticket => ticket.assignee === userId)
        },
        
        getFilteredColumnsWithTickets: (userRole?: string, userId?: string, viewOwnDataOnly?: boolean) => {
          // Filtrar tickets por usuário logado
          const filteredTickets = get().getFilteredTickets(userRole, userId, viewOwnDataOnly)
          
          const result = getActiveKanbanColumns(get().enabledOptionalColumns).map(col => ({
            ...col,
            tickets: filteredTickets.filter(ticket => ticket.status === col.id)
          }))
          
          return result
        },
        
        importTickets: (newTickets: KanbanTicket[]) => {
          set((state) => ({
            tickets: [...state.tickets, ...newTickets]
          }))
        },
        
        exportTickets: () => {
          return get().tickets
        },
        
        // Sincronização com API - Kanban com backend completo
        syncFromApi: async () => {
          try {
            set({ loading: true, error: null })
            console.log('🔍 KanbanStore: Iniciando sincronização com API...')
            
            // Importar API com autenticação
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            
            // Buscar tickets do kanban da API
            const kanbanTickets = await api.get('/kanban/tickets')
            console.log('✅ KanbanStore: Tickets carregados da API:', kanbanTickets.length)
            
            const normalizedTickets = kanbanTickets.map((ticket: Record<string, unknown>) => ({
              ...ticket,
              tags: normalizeTagsFromApi(ticket.tags),
            }))
            
            // Aplicar tickets normalizados ao store
            set({ tickets: normalizedTickets, loading: false })
            
            console.log('✅ KanbanStore: Sincronização concluída com sucesso')
            
          } catch (error) {
            console.error('❌ Erro na sincronização:', error)
            set({ 
              error: error instanceof Error ? error.message : 'Erro na sincronização com API',
              loading: false 
            })
          }
        },
        
        clearError: () => set({ error: null })
      }
})
