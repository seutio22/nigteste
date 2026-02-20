import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { getApi } from '../lib/apiConfig'

export const useDeadlineNotifications = () => {
  const { add: addNotification } = useNotificationStore()
  const { user } = useAuthStore()

  const checkKanbanDeadlineNotifications = useCallback(async () => {
    // TEMPORARIAMENTE DESABILITADO - causando logout automático
    // TODO: Corrigir autenticação do endpoint /notifications/scheduled
    return
  }, [])

  const checkProjectDeadlineNotifications = useCallback(async () => {
    if (!user) return

    try {
      const api = getApi()
      const response = await api.get('/notifications/project-deadlines')

      const notifications = response?.notifications ?? []
      if (notifications.length === 0) return

      const today = new Date().toDateString()
      notifications.forEach((n: any) => {
        const key = `project-deadline-${n.dados?.projectId ?? ''}-${n.dados?.taskId ?? 'proj'}-${today}`
        if (!localStorage.getItem(key)) {
          addNotification({
            titulo: n.titulo,
            mensagem: n.mensagem,
            tipo: n.tipo || 'sistema',
            prioridade: n.prioridade || 'alta',
            link: n.link,
            dados: n.dados
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
    const interval = setInterval(runCheck, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [checkDeadlineNotifications])

  return {
    checkDeadlineNotifications
  }
}
