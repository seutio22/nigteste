import { useNotificationStore } from '../store/notificationStore'
import type { KanbanTicket } from '../store/kanbanStore'
import {
  activeCategoryForTicket,
  alertsForKanbanTicket,
  isKanbanDeadlineCategory,
} from './kanbanDeadlineRules'
import { parseLocalDateFromYmd } from './kanbanDates'

export type KanbanDeadlineCheckResult = {
  overdueTitles: string[]
}

export type KanbanDeadlineCheckOptions = {
  /** false = só alerta no quadro + limpeza; notificações vêm do hook useDeadlineNotifications (API) */
  syncToNotificationCenter?: boolean
}

/**
 * Verifica prazos: alerta amarelo no quadro + limpeza de notificações obsoletas.
 * Inclusão no sino é feita pela API (/notifications/kanban-deadlines) com as mesmas regras.
 */
export function runKanbanDeadlineChecks(
  tickets: KanbanTicket[],
  options?: KanbanDeadlineCheckOptions
): KanbanDeadlineCheckResult {
  const syncToNotificationCenter = options?.syncToNotificationCenter === true
  const { notifications, add, remove } = useNotificationStore.getState()

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const overdueTitles: string[] = []

  const hasCat = (taskId: string, cat: string) =>
    notifications.some((n) => n.dados?.kanbanTicketId === taskId && n.dados?.categoria === cat)

  for (const task of tickets) {
    const alerts = alertsForKanbanTicket(task, todayStart)
    if (alerts.some((a) => a.dados.categoria === 'kanban-overdue')) {
      overdueTitles.push(task.title)
    }
    if (!syncToNotificationCenter) continue
    for (const alert of alerts) {
      const cat = alert.dados.categoria
      if (!hasCat(task.id, cat)) {
        add({
          titulo: alert.titulo,
          mensagem: alert.mensagem,
          tipo: 'sistema',
          prioridade: alert.prioridade,
          dados: alert.dados,
          dedupeKey: alert.dedupeKey,
        })
      }
    }
  }

  const finalNotes = useNotificationStore.getState().notifications

  ;[...finalNotes].forEach((notification) => {
    const cat = notification.dados?.categoria
    const tid = notification.dados?.kanbanTicketId
    if (!isKanbanDeadlineCategory(cat) || !tid) return

    const task = tickets.find((t) => t.id === tid)
    if (!task || task.status === 'done') {
      remove(notification.id)
      return
    }

    const active = activeCategoryForTicket(task, todayStart)
    if (active !== cat) remove(notification.id)
  })

  return { overdueTitles }
}
