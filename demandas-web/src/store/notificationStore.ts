import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Notification {
  id: string
  titulo: string
  mensagem: string
  tipo: 'comunicado' | 'demanda' | 'atendimento' | 'sistema' | 'alerta'
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
    alertaId?: string
    autor?: string
    autorId?: string
    dedupeKey?: string
  }
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  add: (notification: Omit<Notification, 'id' | 'dataCriacao'> & { lida?: boolean; dedupeKey?: string }) => void
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
        const { dedupeKey, ...rest } = notification as typeof notification & { dedupeKey?: string }
        
        const state = get()
        if (dedupeKey && state.notifications.some(n => n.dados?.dedupeKey === dedupeKey)) {
          return
        }
        
        const newNotification: Notification = {
          ...rest,
          dados: { ...rest.dados, ...(dedupeKey && { dedupeKey }) },
          id: crypto.randomUUID(),
          dataCriacao: rest.dataCriacao || new Date().toISOString(),
          lida: rest.lida ?? false
        }
        
        set((s) => {
          const newNotifications = [newNotification, ...s.notifications]
          return {
            notifications: newNotifications,
            unreadCount: newNotifications.filter(n => !n.lida).length
          }
        })
        
        if ('Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification(newNotification.titulo, {
            body: newNotification.mensagem,
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
