import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { getApi } from '../lib/apiConfig'

export const useUserAlerts = () => {
  const { add: addNotification } = useNotificationStore()
  const { user } = useAuthStore()

  const checkUserAlerts = useCallback(async () => {
    if (!user) return

    try {
      const api = getApi()
      const response = await api.get('/user-alerts')
      const list = response?.notifications ?? []
      const current = useNotificationStore.getState().notifications

      list.forEach((n: any) => {
        const exists = current.some((x) => x.dados?.alertaId === n.id)
        if (!exists) {
          addNotification({
            titulo: n.titulo,
            mensagem: n.mensagem,
            tipo: 'alerta',
            prioridade: n.prioridade || 'media',
            lida: n.lida,
            dataCriacao: n.dataCriacao,
            dados: {
              ...n.dados,
              alertaId: n.id
            }
          })
        }
      })
    } catch (error) {
      console.error('Erro ao verificar alertas de usuário:', error)
    }
  }, [addNotification, user])

  useEffect(() => {
    const runCheck = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      checkUserAlerts()
    }

    const onRefresh = () => runCheck()
    window.addEventListener('refresh-user-alerts', onRefresh)
    runCheck()
    const interval = setInterval(runCheck, 5 * 60 * 1000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') runCheck()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('refresh-user-alerts', onRefresh)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [checkUserAlerts])

  return { checkUserAlerts }
}
