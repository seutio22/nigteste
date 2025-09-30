import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface KanbanTicket {
  id: string
  title: string
  description?: string
  type: 'lembrete' | 'atividade' | 'tarefa' | 'projeto'
  status: string
  priority: 'Alta' | 'Média' | 'Baixa'
  area: string
  cliente?: string
  analista: string
  createdAt: string
  updatedAt: string
}

interface TicketState {
  tickets: KanbanTicket[]
  add: (ticket: Omit<KanbanTicket, 'id' | 'createdAt' | 'updatedAt'>) => KanbanTicket
  update: (id: string, updates: Partial<KanbanTicket>) => void
  remove: (id: string) => void
  moveToStatus: (id: string, newStatus: string) => void
  getByStatus: (status: string) => KanbanTicket[]
}

export const useTicketStore = create<TicketState>()(
  persist(
    (set, get) => ({
      tickets: [],
      
      add: (payload) => {
        console.log('=== TICKET STORE: ADICIONANDO ===')
        console.log('Payload recebido:', payload)
        
        const ticket: KanbanTicket = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...payload
        }
        
        console.log('Ticket criado:', ticket)
        
        set((state) => {
          const newTickets = [ticket, ...state.tickets]
          console.log('Estado anterior:', state.tickets)
          console.log('Novo estado:', newTickets)
          return { tickets: newTickets }
        })
        
        console.log('Estado atualizado no store')
        return ticket
      },

      update: (id, updates) => {
        console.log('Atualizando ticket:', id, 'com:', updates)
        set((state) => ({
          tickets: state.tickets.map((ticket) =>
            ticket.id === id
              ? { ...ticket, ...updates, updatedAt: new Date().toISOString() }
              : ticket
          )
        }))
      },

      remove: (id) => {
        console.log('Removendo ticket:', id)
        set((state) => ({ tickets: state.tickets.filter((ticket) => ticket.id !== id) }))
      },

      moveToStatus: (id, newStatus) => {
        console.log('Movendo ticket:', id, 'para status:', newStatus)
        set((state) => ({
          tickets: state.tickets.map((ticket) =>
            ticket.id === id
              ? { ...ticket, status: newStatus, updatedAt: new Date().toISOString() }
              : ticket
          )
        }))
      },

      getByStatus: (status) => {
        const { tickets } = get()
        return tickets.filter((ticket) => ticket.status === status)
      }
    }),
    { 
      name: 'kanban-tickets-v1',
      onRehydrateStorage: () => (state) => {
        console.log('Store rehydrated:', state)
      }
    }
  )
)
