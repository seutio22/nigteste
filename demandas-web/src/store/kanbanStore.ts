import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface KanbanTicket {
  id: string
  title: string
  description: string
  status: 'backlog' | 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  assignee: string // Campo obrigatório para controle de acesso
  startDate?: string
  dueDate?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface KanbanColumn {
  id: string
  title: string
  tickets: KanbanTicket[]
  color: string
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'backlog',
    title: 'Backlog',
    tickets: [],
    color: '#9e9e9e'
  },
  {
    id: 'todo',
    title: 'A Fazer',
    tickets: [],
    color: '#ff9800'
  },
  {
    id: 'in-progress',
    title: 'Em Andamento',
    tickets: [],
    color: '#2196f3'
  },
  {
    id: 'done',
    title: 'Concluído',
    tickets: [],
    color: '#4caf50'
  }
]

interface KanbanState {
  tickets: KanbanTicket[]
  columns: KanbanColumn[]
  loading: boolean
  error: string | null
  
  // Ações
  addTicket: (ticket: Omit<KanbanTicket, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateTicket: (id: string, updates: Partial<KanbanTicket>) => Promise<void>
  moveTicket: (ticketId: string, newStatus: KanbanTicket['status']) => Promise<void>
  deleteTicket: (id: string) => Promise<void>
  deleteAllTickets: () => Promise<void>
  
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

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set, get) => {
      return {
        tickets: [],
        columns: KANBAN_COLUMNS,
        loading: false,
        error: null,
        
        addTicket: async (ticketData: Omit<KanbanTicket, 'id' | 'createdAt' | 'updatedAt'>) => {
          try {
            console.log('🔍 KanbanStore: addTicket iniciado com dados:', ticketData)
            set({ loading: true, error: null })
            
            // Salvar na API primeiro
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            
            const newTicket = await api.post('/kanban/tickets', ticketData)
            console.log('✅ KanbanStore: Ticket criado na API:', newTicket.id)
            
            // Adicionar ao estado local
            set((state) => ({
              tickets: [...state.tickets, newTicket],
              loading: false
            }))
            
            console.log('✅ KanbanStore: Ticket adicionado ao estado local')
            
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
            
            const updatedTicket = await api.put(`/kanban/tickets/${id}`, updates)
            console.log('✅ KanbanStore: Ticket atualizado na API:', id)
            
            // Atualizar estado local
            set((state) => ({
              tickets: state.tickets.map(ticket =>
                ticket.id === id ? updatedTicket : ticket
              ),
              loading: false
            }))
            
          } catch (error) {
            console.error('❌ Erro ao atualizar ticket:', error)
            set({ error: 'Erro ao atualizar ticket', loading: false })
            throw error
          }
        },
        
        moveTicket: async (ticketId: string, newStatus: KanbanTicket['status']) => {
          try {
            set({ loading: true, error: null })
            
            // Atualizar na API
            const { getApi } = await import('../lib/apiConfig')
            const api = getApi()
            
            const updatedTicket = await api.put(`/kanban/tickets/${ticketId}`, { status: newStatus })
            console.log('✅ KanbanStore: Ticket movido na API:', ticketId, '->', newStatus)
            
            // Atualizar estado local
            set((state) => ({
              tickets: state.tickets.map(ticket =>
                ticket.id === ticketId ? updatedTicket : ticket
              ),
              loading: false
            }))
            
          } catch (error) {
            console.error('❌ Erro ao mover ticket:', error)
            set({ error: 'Erro ao mover ticket', loading: false })
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
          const { tickets } = get()
          return KANBAN_COLUMNS.map(col => ({
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
          const filtered = tickets.filter(ticket => ticket.assignee === userId)
          console.log(`🔍 KanbanStore: Filtrando tickets para usuário ${userId}: ${filtered.length} de ${tickets.length} tickets`)
          return filtered
        },
        
        getFilteredColumnsWithTickets: (userRole?: string, userId?: string, viewOwnDataOnly?: boolean) => {
          // Filtrar tickets por usuário logado
          const filteredTickets = get().getFilteredTickets(userRole, userId, viewOwnDataOnly)
          
          const result = KANBAN_COLUMNS.map(col => ({
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
            
            // Aplicar tickets ao store
            set({ tickets: kanbanTickets, loading: false })
            
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
    },
    {
      name: 'kanban-store-v1',
      version: 1
    }
  )
)
