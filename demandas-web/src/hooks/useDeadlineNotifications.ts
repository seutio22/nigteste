import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { getApi } from '../lib/apiConfig'

/** Prazos Kanban/projetos mudam com menos frequência; 3 min reduz atraso sem sobrecarregar a API. */
const DEADLINE_NOTIFICATIONS_POLL_MS = 3 * 60 * 1000

export const useDeadlineNotifications = () => {
  const { add: addNotification } = useNotificationStore()
  const { user } = useAuthStore()

  const checkKanbanDeadlineNotifications = useCallback(async () => {
    if (!user) return
    try {
      const api = getApi()
      const response = await api.get('/notifications/kanban-deadlines')
      const notifications = response?.notifications ?? []
      if (notifications.length === 0) return

      notifications.forEach((n: any) => {
        const ticketId = n.dados?.kanbanTicketId ?? ''
        const categoria = n.dados?.categoria ?? 'kanban'
        const key = `kanban-${categoria}-${ticketId}`
        if (!localStorage.getItem(key)) {
          addNotification({
            titulo: n.titulo,
            mensagem: n.mensagem,
            tipo: n.tipo || 'sistema',
            prioridade: n.prioridade || 'alta',
            link: n.link,
            dados: n.dados,
            dedupeKey: key
          })
          localStorage.setItem(key, 'true')
        }
      })
    } catch (error) {
      console.error('Erro ao verificar notificações Kanban:', error)
    }
  }, [addNotification, user])

  const checkProjectDeadlineNotifications = useCallback(async () => {
    if (!user) return

    try {
      const api = getApi()
      const response = await api.get('/notifications/project-deadlines')

      const notifications = response?.notifications ?? []
      if (notifications.length === 0) return

      const today = new Date().toDateString()
      const dueKey = (d: any) => (d?.endDate || d?.plannedDate || '').toString().split('T')[0]
      notifications.forEach((n: any) => {
        const key = `project-deadline-${n.dados?.projectId ?? ''}-${n.dados?.taskId ?? 'proj'}-${dueKey(n.dados)}`
        if (!localStorage.getItem(key)) {
          addNotification({
            titulo: n.titulo,
            mensagem: n.mensagem,
            tipo: n.tipo || 'sistema',
            prioridade: n.prioridade || 'alta',
            link: n.link,
            dados: n.dados,
            dedupeKey: key
          })
          localStorage.setItem(key, 'true')
        }
      })
    } catch (error) {
      console.error('Erro ao verificar alertas de projeto:', error)
    }
  }, [addNotification, user])

  const checkDeadlineNotifications = useCallback(async () => {
    if (!user) return
    await checkKanbanDeadlineNotifications()
    await checkProjectDeadlineNotifications()
  }, [user, checkKanbanDeadlineNotifications, checkProjectDeadlineNotifications])

  useEffect(() => {
    const runCheck = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      checkDeadlineNotifications()
    }

    runCheck()
    const interval = setInterval(runCheck, DEADLINE_NOTIFICATIONS_POLL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') runCheck()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [checkDeadlineNotifications])

  return {
    checkDeadlineNotifications
  }
}
