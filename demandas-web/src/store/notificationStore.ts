import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Notification {
  id: string
  titulo: string
  mensagem: string
  tipo: 'comunicado' | 'demanda' | 'atendimento' | 'sistema'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  lida: boolean
  dataCriacao: string
  dataLeitura?: string
  link?: string
  dados?: {
    comunicadoId?: string
    demandaId?: string
    atendimentoId?: string
    kanbanTicketId?: string
    autor?: string
    categoria?: string
    projectId?: string
    projectName?: string
    taskId?: string
    taskName?: string
    subtaskId?: string
    subtaskName?: string
    phaseName?: string
    plannedDate?: string
    endDate?: string
    diasRestantes?: number
    targetType?: string
  }
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  add: (notification: Omit<Notification, 'id' | 'dataCriacao' | 'lida'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  remove: (id: string) => void
  clear: () => void
  clearRead: () => void
  getUnreadCount: () => number
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      
      add: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          dataCriacao: new Date().toISOString(),
          lida: false
        }
        
        set((state) => {
          const newNotifications = [newNotification, ...state.notifications]
          const unreadCount = newNotifications.filter(n => !n.lida).length
          
          return {
            notifications: newNotifications,
            unreadCount
          }
        })
        
        // Mostrar notificação toast se disponível
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notification.titulo, {
            body: notification.mensagem,
            icon: '/favicon.ico',
            tag: newNotification.id
          })
        }
      },
      
      markAsRead: (id) => {
        set((state) => {
          const newNotifications = state.notifications.map(n => 
            n.id === id 
              ? { ...n, lida: true, dataLeitura: new Date().toISOString() }
              : n
          )
          const unreadCount = newNotifications.filter(n => !n.lida).length
          
          return {
            notifications: newNotifications,
            unreadCount
          }
        })
      },
      
      markAllAsRead: () => {
        set((state) => {
          const newNotifications = state.notifications.map(n => ({
            ...n,
            lida: true,
            dataLeitura: n.dataLeitura || new Date().toISOString()
          }))
          
          return {
            notifications: newNotifications,
            unreadCount: 0
          }
        })
      },
      
      remove: (id) => {
        set((state) => {
          const newNotifications = state.notifications.filter(n => n.id !== id)
          const unreadCount = newNotifications.filter(n => !n.lida).length
          
          return {
            notifications: newNotifications,
            unreadCount
          }
        })
      },
      
      clear: () => set({ notifications: [], unreadCount: 0 }),
      
      clearRead: () => {
        set((state) => {
          const newNotifications = state.notifications.filter(n => !n.lida)
          const unreadCount = newNotifications.length
          
          return {
            notifications: newNotifications,
            unreadCount
          }
        })
      },
      
      getUnreadCount: () => {
        const state = get()
        return state.notifications.filter(n => !n.lida).length
      }
    }),
    { 
      name: 'notifications-store-v1',
      version: 1
    }
  )
)
