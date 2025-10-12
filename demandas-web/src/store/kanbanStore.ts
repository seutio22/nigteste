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
            console.log('🔍 KanbanStore: startDate recebido:', ticketData.startDate, 'dueDate recebido:', ticketData.dueDate)
            set({ loading: true, error: null })
            
            const newTicket: KanbanTicket = {
              ...ticketData,
              id: `ticket-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }
            
            console.log('🔍 KanbanStore: Novo ticket criado:', newTicket)
            
            // Salvar APENAS no localStorage (modo offline)
            set((state) => {
              console.log('🔍 KanbanStore: Estado atual antes de adicionar:', state.tickets.length)
              const newState = {
                tickets: [...state.tickets, newTicket],
                loading: false
              }
              console.log('🔍 KanbanStore: Novo estado com ticket:', newState.tickets.length)
              return newState
            })
            
            console.log('✅ KanbanStore: Ticket adicionado ao localStorage (modo offline)')
            
            // NÃO tentar salvar na API - Kanban é 100% offline
            
          } catch (error) {
            console.error('❌ Erro ao criar ticket:', error)
            set({ error: 'Erro ao criar ticket', loading: false })
            throw error
          }
        },
        
        updateTicket: async (id: string, updates: Partial<KanbanTicket>) => {
          try {
            set({ loading: true, error: null })
            
            const updatedTicket = { ...updates, updatedAt: new Date().toISOString() }
            
            // Atualizar APENAS no localStorage (modo offline)
            set((state) => ({
              tickets: state.tickets.map(ticket =>
                ticket.id === id
                  ? { ...ticket, ...updatedTicket }
                  : ticket
              ),
              loading: false
            }))
            
            console.log('✅ Ticket atualizado no localStorage (modo offline):', id)
            
            // NÃO tentar atualizar na API - Kanban é 100% offline
            
          } catch (error) {
            console.error('❌ Erro ao atualizar ticket:', error)
            set({ error: 'Erro ao atualizar ticket', loading: false })
            throw error
          }
        },
        
        moveTicket: async (ticketId: string, newStatus: KanbanTicket['status']) => {
          try {
            set({ loading: true, error: null })
            
            const updatedTicket = { status: newStatus, updatedAt: new Date().toISOString() }
            
            // Atualizar APENAS no localStorage (modo offline)
            set((state) => ({
              tickets: state.tickets.map(ticket =>
                ticket.id === ticketId
                  ? { ...ticket, ...updatedTicket }
                  : ticket
              ),
              loading: false
            }))
            
            console.log('✅ Ticket movido no localStorage (modo offline):', ticketId, '->', newStatus)
            
            // NÃO tentar atualizar na API - Kanban é 100% offline
            
          } catch (error) {
            console.error('❌ Erro ao mover ticket:', error)
            set({ error: 'Erro ao mover ticket', loading: false })
            throw error
          }
        },
        
        deleteTicket: async (id: string) => {
          try {
            set({ loading: true, error: null })
            
            // Remover APENAS do localStorage (modo offline)
            set((state) => ({
              tickets: state.tickets.filter(ticket => ticket.id !== id),
              loading: false
            }))
            
            console.log('✅ Ticket removido do localStorage (modo offline):', id)
            
            // NÃO tentar remover da API - Kanban é 100% offline
            
          } catch (error) {
            console.error('❌ Erro ao remover ticket:', error)
            set({ error: 'Erro ao remover ticket', loading: false })
            throw error
          }
        },
        
        deleteAllTickets: async () => {
          try {
            set({ loading: true, error: null })
            
            // Limpar APENAS localStorage (modo offline)
            set({ tickets: [], loading: false })
            
            console.log('✅ Todos os tickets removidos do localStorage (modo offline)')
            
            // NÃO tentar limpar na API - Kanban é 100% offline
            
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
        
        // Sincronização DESABILITADA - Kanban é 100% offline (localStorage apenas)
        syncFromApi: async () => {
          try {
            console.log('ℹ️ KanbanStore: Kanban funciona em modo offline (localStorage)')
            console.log('ℹ️ KanbanStore: Sincronização com API desabilitada')
            
            // Apenas marcar como não carregando
            set({ loading: false, error: null })
            
            // NÃO fazer requisição para API que não existe
            
          } catch (error) {
            console.error('❌ Erro inesperado:', error)
            set({ loading: false, error: null })
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
