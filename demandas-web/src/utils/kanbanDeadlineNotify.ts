import { useNotificationStore } from '../store/notificationStore'
import type { KanbanTicket } from '../store/kanbanStore'
import { businessDaysFromTomorrowToDueInclusive, parseLocalDateFromYmd } from './kanbanDates'

export type KanbanDeadlineCheckResult = {
  overdueTitles: string[]
}

/** Categorias antigas (antes da regra só 3 úteis / 1 útil / vencido) — removidas do centro de notificações. */
const DEPRECATED_KANBAN_CATS = new Set([
  'kanban-due-today',
  'kanban-due-tomorrow',
  'kanban-due-soon',
  'kanban-prazo-registrado',
])

/**
 * Notificações do Kanban: apenas
 * - 3 dias úteis antes do vencimento
 * - 1 dia útil antes do vencimento
 * - vencido (data de vencimento antes de hoje)
 */
export function runKanbanDeadlineChecks(tickets: KanbanTicket[]): KanbanDeadlineCheckResult {
  const { notifications, add, remove } = useNotificationStore.getState()

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const overdueTitles: string[] = []

  const hasCat = (taskId: string, cat: string) =>
    notifications.some((n) => n.dados?.kanbanTicketId === taskId && n.dados?.categoria === cat)

  // Limpar notificações de regras antigas
  ;[...notifications].forEach((n) => {
    const cat = n.dados?.categoria
    if (cat && DEPRECATED_KANBAN_CATS.has(cat)) {
      remove(n.id)
    }
  })

  for (const task of tickets) {
    if (!task.dueDate || task.status === 'done') continue

    const due = parseLocalDateFromYmd(task.dueDate)
    if (!due) continue

    const dateLabel = due.toLocaleDateString('pt-BR')
    const bd = businessDaysFromTomorrowToDueInclusive(todayStart, due)

    if (bd < 0) {
      overdueTitles.push(task.title)
      if (!hasCat(task.id, 'kanban-overdue')) {
        add({
          titulo: 'Tarefa vencida',
          mensagem: `A tarefa "${task.title}" está vencida (prazo ${dateLabel}).`,
          tipo: 'sistema',
          prioridade: 'urgente',
          dados: { categoria: 'kanban-overdue', kanbanTicketId: task.id },
          dedupeKey: `kanban-overdue-${task.id}`,
        })
      }
      continue
    }

    if (bd === 3) {
      if (!hasCat(task.id, 'kanban-3bd')) {
        add({
          titulo: 'Prazo: 3 dias úteis',
          mensagem: `A tarefa "${task.title}" vence em 3 dias úteis (${dateLabel}).`,
          tipo: 'sistema',
          prioridade: 'media',
          dados: { categoria: 'kanban-3bd', kanbanTicketId: task.id },
          dedupeKey: `kanban-3bd-${task.id}`,
        })
      }
      continue
    }

    if (bd === 1) {
      if (!hasCat(task.id, 'kanban-1bd')) {
        add({
          titulo: 'Prazo: 1 dia útil',
          mensagem: `A tarefa "${task.title}" vence em 1 dia útil (${dateLabel}).`,
          tipo: 'sistema',
          prioridade: 'alta',
          dados: { categoria: 'kanban-1bd', kanbanTicketId: task.id },
          dedupeKey: `kanban-1bd-${task.id}`,
        })
      }
    }
  }

  const finalNotes = useNotificationStore.getState().notifications

  // Remover notificações kanban de tarefas concluídas ou fora da janela (ex.: já passou de “3 úteis”)
  ;[...finalNotes].forEach((notification) => {
    const cat = notification.dados?.categoria
    const tid = notification.dados?.kanbanTicketId
    if (!cat?.startsWith('kanban-') || !tid) return

    const task = tickets.find((t) => t.id === tid)
    if (task?.status === 'done') {
      remove(notification.id)
      return
    }

    if (!task?.dueDate) return
    const dueD = parseLocalDateFromYmd(task.dueDate)
    if (!dueD) return
    const bdNow = businessDaysFromTomorrowToDueInclusive(todayStart, dueD)

    if (cat === 'kanban-3bd' && bdNow !== 3) remove(notification.id)
    if (cat === 'kanban-1bd' && bdNow !== 1) remove(notification.id)
    if (cat === 'kanban-overdue' && bdNow >= 0) remove(notification.id)
  })

  return { overdueTitles }
}
