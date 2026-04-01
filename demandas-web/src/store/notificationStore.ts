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
  snoozedUntil?: string
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

const MAX_DISMISSED_KEYS = 500

/** Normaliza data para evitar diferença de milissegundos (API vs store) */
function normDate(s: string | undefined): string {
  if (!s || typeof s !== 'string') return ''
  const trimmed = s.trim()
  if (trimmed.length >= 19) return trimmed.slice(0, 19) // YYYY-MM-DDTHH:mm:ss
  return trimmed.slice(0, 30)
}

/** Chave estável por conteúdo: evita reaparecer notificações antigas sem alertaId/dedupeKey */
function contentKey(n: { titulo?: string; mensagem?: string; dataCriacao?: string }): string {
  const t = (n.titulo ?? '').trim().slice(0, 200)
  const m = (n.mensagem ?? '').trim().slice(0, 500)
  const d = normDate(n.dataCriacao)
  return `content:${t}|${m}|${d}`
}

function normKey(v: string | undefined): string {
  if (v == null || v === '') return ''
  return String(v).trim()
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  /** Chaves (alertaId ou dedupeKey) que o usuário excluiu – não readicionar */
  dismissedKeys: string[]
  add: (notification: Omit<Notification, 'id' | 'dataCriacao'> & { lida?: boolean; dedupeKey?: string }) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  remove: (id: string) => void
  clear: () => void
  clearRead: () => void
  getUnreadCount: () => number
  snoozeNotification: (id: string, until: Date) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      dismissedKeys: [],

      add: (notification) => {
        const { dedupeKey, ...rest } = notification as typeof notification & { dedupeKey?: string }
        const state = get()
        const alertaId = rest.dados?.alertaId
        const dismissed = state.dismissedKeys ?? []

        const dk = normKey(dedupeKey)
        const ak = normKey(alertaId)
        if (dk && dismissed.some((k) => normKey(k) === dk)) return
        if (ak && dismissed.some((k) => normKey(k) === ak)) return
        const ck = contentKey(rest)
        if (dismissed.some((k) => k === ck)) return
        if (dk && state.notifications.some((n) => normKey(n.dados?.dedupeKey) === dk)) return
        if (ak && state.notifications.some((n) => normKey(n.dados?.alertaId) === ak)) return
        if (state.notifications.some((n) => contentKey(n) === ck)) return

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
          const removed = state.notifications.find((n) => n.id === id)
          const currentDismissed = state.dismissedKeys ?? []
          const toAdd: string[] = []
          if (removed) {
            const key = removed.dados?.alertaId ?? removed.dados?.dedupeKey
            const keyNorm = normKey(key)
            if (keyNorm && !currentDismissed.some((k) => normKey(k) === keyNorm)) {
              toAdd.push(keyNorm)
            }
            const ck = contentKey(removed)
            if (ck && !currentDismissed.includes(ck)) {
              toAdd.push(ck)
            }
          }
          let newDismissed =
            toAdd.length > 0
              ? [...currentDismissed.slice(-(MAX_DISMISSED_KEYS - toAdd.length)), ...toAdd]
              : currentDismissed
          newDismissed = newDismissed.slice(-MAX_DISMISSED_KEYS)
          let newNotifications = state.notifications.filter((n) => n.id !== id)
          const dismissedSet = new Set(newDismissed)
          const normSet = new Set(newDismissed.map((k) => normKey(k)).filter(Boolean))
          newNotifications = newNotifications.filter((n) => {
            const k = n.dados?.alertaId ?? n.dados?.dedupeKey
            if (k && (dismissedSet.has(k) || normSet.has(normKey(k)))) return false
            if (contentKey(n) && dismissedSet.has(contentKey(n))) return false
            return true
          })
          const unreadCount = newNotifications.filter((n) => !n.lida).length
          return {
            notifications: newNotifications,
            unreadCount,
            dismissedKeys: newDismissed
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
        const now = new Date()
        return state.notifications.filter(n => {
          if (n.snoozedUntil && new Date(n.snoozedUntil) > now) return false
          return !n.lida
        }).length
      },

      snoozeNotification: (id, until) => {
        set((state) => {
          const newNotifications = state.notifications.map(n =>
            n.id === id
              ? { ...n, snoozedUntil: until.toISOString(), lida: false }
              : n
          )
          const now = new Date()
          const unreadCount = newNotifications.filter(n => {
            if (n.snoozedUntil && new Date(n.snoozedUntil) > now) return false
            return !n.lida
          }).length
          return { notifications: newNotifications, unreadCount }
        })
      }
    }),
    {
      name: 'notifications-store-v1',
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state?.notifications?.length && state?.dismissedKeys?.length) {
          const dismissedSet = new Set(state.dismissedKeys)
          const filtered = state.notifications.filter((n) => {
            const k = n.dados?.alertaId ?? n.dados?.dedupeKey
            if (k && dismissedSet.has(k)) return false
            if (dismissedSet.has(contentKey(n))) return false
            return true
          })
          if (filtered.length < state.notifications.length) {
            useNotificationStore.setState({
              notifications: filtered,
              unreadCount: filtered.filter((n) => !n.lida).length
            })
          }
        }
      }
    }
  )
)
