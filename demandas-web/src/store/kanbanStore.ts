import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface KanbanTicket {
  id: string
  title: string
  description: string
  status: 'backlog' | 'todo' | 'in-progress' | 'done'
  priority: 'low' | 'medium' | 'high'
  assignee: string // Campo obrigatório para controle de acesso
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
            
            const newTicket: KanbanTicket = {
              ...ticketData,
              id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            
            console.log('🔍 KanbanStore: Novo ticket criado:', newTicket)
            
            // Salvar no estado local primeiro (para UI responsiva)
            set((state) => {
              console.log('🔍 KanbanStore: Estado atual antes de adicionar:', state.tickets.length)
              const newState = {
                tickets: [...state.tickets, newTicket]
              }
              console.log('🔍 KanbanStore: Novo estado com ticket:', newState.tickets.length)
              return newState
            })
            
            console.log('✅ KanbanStore: Ticket adicionado ao estado local')
            
            // Tentar salvar na API
            try {
              console.log('🔍 KanbanStore: Tentando salvar na API...')
              const { api } = await import('../lib/api.local')
              await api.createKanbanTicket(newTicket)
              console.log('✅ Ticket salvo na API:', newTicket.id)
            } catch (apiError) {
              console.warn('⚠️ Erro ao salvar na API, mantendo apenas local:', apiError)
              // Não falhar se a API estiver indisponível
            }
            
          } catch (error) {
            console.error('❌ Erro ao criar ticket:', error)
            set({ error: 'Erro ao criar ticket' })
            throw error
          } finally {
            set({ loading: false })
          }
        },
        
        updateTicket: async (id: string, updates: Partial<KanbanTicket>) => {
          try {
            set({ loading: true, error: null })
            
            const updatedTicket = { ...updates, updatedAt: new Date().toISOString() }
            
            // Atualizar no estado local primeiro
            set((state) => ({
              tickets: state.tickets.map(ticket =>
                ticket.id === id
                  ? { ...ticket, ...updatedTicket }
                  : ticket
              )
            }))
            
            // Tentar atualizar na API
            try {
              const { api } = await import('../lib/api.local')
              await api.updateKanbanTicket(id, updatedTicket)
              console.log('✅ Ticket atualizado na API:', id)
            } catch (apiError) {
              console.warn('⚠️ Erro ao atualizar na API, mantendo apenas local:', apiError)
            }
            
          } catch (error) {
            console.error('❌ Erro ao atualizar ticket:', error)
            set({ error: 'Erro ao atualizar ticket' })
            throw error
          } finally {
            set({ loading: false })
          }
        },
        
        moveTicket: async (ticketId: string, newStatus: KanbanTicket['status']) => {
          try {
            set({ loading: true, error: null })
            
            const updatedTicket = { status: newStatus, updatedAt: new Date().toISOString() }
            
            // Atualizar no estado local primeiro
            set((state) => ({
              tickets: state.tickets.map(ticket =>
                ticket.id === ticketId
                  ? { ...ticket, ...updatedTicket }
                  : ticket
              )
            }))
            
            // Tentar atualizar na API
            try {
              const { api } = await import('../lib/api.local')
              await api.updateKanbanTicket(ticketId, updatedTicket)
              console.log('✅ Ticket movido na API:', ticketId, '->', newStatus)
            } catch (apiError) {
              console.warn('⚠️ Erro ao mover na API, mantendo apenas local:', apiError)
            }
            
          } catch (error) {
            console.error('❌ Erro ao mover ticket:', error)
            set({ error: 'Erro ao mover ticket' })
            throw error
          } finally {
            set({ loading: false })
          }
        },
        
        deleteTicket: async (id: string) => {
          try {
            set({ loading: true, error: null })
            
            // Remover do estado local primeiro
            set((state) => ({
              tickets: state.tickets.filter(ticket => ticket.id !== id)
            }))
            
            // Tentar remover da API
            try {
              const { api } = await import('../lib/api.local')
              await api.deleteKanbanTicket(id)
              console.log('✅ Ticket removido da API:', id)
            } catch (apiError) {
              console.warn('⚠️ Erro ao remover da API, mantendo apenas local:', apiError)
            }
            
          } catch (error) {
            console.error('❌ Erro ao remover ticket:', error)
            set({ error: 'Erro ao remover ticket' })
            throw error
          } finally {
            set({ loading: false })
          }
        },
        
        deleteAllTickets: async () => {
          try {
            set({ loading: true, error: null })
            
            // Limpar estado local primeiro
            set({ tickets: [] })
            
            // Tentar limpar na API
            try {
              const { api } = await import('../lib/api.local')
              await api.clearAllKanbanTickets()
              console.log('✅ Todos os tickets removidos da API')
            } catch (apiError) {
              console.warn('⚠️ Erro ao limpar API, mantendo apenas local:', apiError)
            }
            
          } catch (error) {
            console.error('❌ Erro ao limpar tickets:', error)
            set({ error: 'Erro ao limpar tickets' })
            throw error
          } finally {
            set({ loading: false })
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
          
          // Se não há usuário logado, retornar todos os tickets
          if (!userId) {
            return tickets
          }
          
          // Se a permissão viewOwnDataOnly está ativada, filtrar por tickets próprios
          if (viewOwnDataOnly) {
            const filtered = tickets.filter(ticket => ticket.assignee === userId)
            return filtered
          }
          
          // Se viewOwnDataOnly está desativado, retornar todos os tickets
          return tickets
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
        
        // Sincronização com API - KANBAN INDEPENDENTE
        syncFromApi: async () => {
          try {
            set({ loading: true, error: null })
            console.log('🔍 KanbanStore: Iniciando syncFromApi...')
            
            // Buscar tickets do kanban da API (endpoint próprio)
            const kanbanResponse = await fetch('http://localhost:3333/kanban-tickets')
            if (!kanbanResponse.ok) {
              // Se não existir endpoint, usar dados locais
              console.log('🔍 KanbanStore: Endpoint não encontrado, usando dados locais')
              set({ loading: false })
              return
            }
            
            const kanbanTickets = await kanbanResponse.json()
            console.log('🔍 KanbanStore: Tickets carregados da API:', kanbanTickets.length)
            
            // Aplicar tickets ao store
            set({ tickets: kanbanTickets, loading: false })
            
            console.log('🔍 KanbanStore: Sincronização concluída com sucesso')
            
          } catch (error) {
            console.error('❌ Erro na sincronização:', error)
            // Em caso de erro, manter dados locais
            console.log('🔍 KanbanStore: Mantendo dados locais em caso de erro')
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
