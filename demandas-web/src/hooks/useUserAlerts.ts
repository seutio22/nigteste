import { useEffect, useCallback } from 'react'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { getApi } from '../lib/apiConfig'
import { isAlertDismissed } from '../utils/dismissedAlerts'

/** Intervalo para buscar alertas criados por admin/gerente. 90s equilibra rapidez e carga na API. */
const USER_ALERTS_POLL_MS = 90 * 1000

export const useUserAlerts = () => {
  const { add: addNotification, remove } = useNotificationStore()
  const { user } = useAuthStore()

  const checkUserAlerts = useCallback(async () => {
    if (!user) return

    try {
      const api = getApi()
      const response = await api.get('/user-alerts')
      const list = response?.notifications ?? []
      const current = useNotificationStore.getState().notifications
      const fetchedIds = new Set(
        list.map((n: any) => (n.id != null ? String(n.id).trim() : '')).filter(Boolean)
      )

      const dismissed = useNotificationStore.getState().dismissedKeys ?? []
      const dismissedNorm = new Set(dismissed.map((k) => String(k).trim()).filter(Boolean))
      const normDate = (s: string | undefined) =>
        !s ? '' : s.trim().length >= 19 ? s.trim().slice(0, 19) : s.trim().slice(0, 30)
      const contentKey = (item: { titulo?: string; mensagem?: string; dataCriacao?: string }) =>
        `content:${(item.titulo ?? '').trim().slice(0, 200)}|${(item.mensagem ?? '').trim().slice(0, 500)}|${normDate(item.dataCriacao)}`
      list.forEach((n: any) => {
        const idStr = n.id != null ? String(n.id).trim() : ''
        if (!idStr) return
        if (isAlertDismissed(idStr) || dismissedNorm.has(idStr)) return
        if (dismissedNorm.has(contentKey(n))) return
        const exists = current.some((x) => x.dados?.alertaId != null && String(x.dados.alertaId).trim() === idStr)
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

      current.forEach((n) => {
        const aid = n.dados?.alertaId
        if (aid && n.tipo === 'alerta' && !fetchedIds.has(aid)) {
          remove(n.id)
        }
      })
    } catch (error) {
      console.error('Erro ao verificar alertas de usuário:', error)
    }
  }, [addNotification, remove, user])

  useEffect(() => {
    const runCheck = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      checkUserAlerts()
    }

    // Evento explícito: sempre consulta a API (ex.: abrir caixa de entrada), mesmo se a aba estiver em segundo plano
    const onRefresh = () => {
      checkUserAlerts()
    }
    window.addEventListener('refresh-user-alerts', onRefresh)
    runCheck()
    const interval = setInterval(runCheck, USER_ALERTS_POLL_MS)
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
