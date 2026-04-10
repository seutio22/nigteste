import { useNotificationStore } from '../store/notificationStore'
import type { KanbanTicket } from '../store/kanbanStore'
import { diffCalendarDays, parseLocalDateFromYmd } from './kanbanDates'

export type KanbanDeadlineCheckResult = {
  overdueTitles: string[]
}

/**
 * Avalia prazos e cria/atualiza notificações do sistema.
 * - Vencido, hoje, amanhã
 * - Em breve: 2 a 7 dias (antes só até 3)
 * Prazos mais distantes: notificação ao criar/editar via `notifyKanbanPrazoRegistrado`.
 */
export function runKanbanDeadlineChecks(tickets: KanbanTicket[]): KanbanDeadlineCheckResult {
  const { notifications, add, remove } = useNotificationStore.getState()

  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const overdueTitles: string[] = []

  const hasCat = (taskId: string, cat: string) =>
    notifications.some((n) => n.dados?.kanbanTicketId === taskId && n.dados?.categoria === cat)

  for (const task of tickets) {
    if (!task.dueDate || task.status === 'done') continue

    const due = parseLocalDateFromYmd(task.dueDate)
    if (!due) continue

    const diffDays = diffCalendarDays(todayStart, due)
    const dateLabel = due.toLocaleDateString('pt-BR')

    if (diffDays < 0) {
      overdueTitles.push(task.title)
      if (!hasCat(task.id, 'kanban-overdue')) {
        add({
          titulo: 'Tarefa vencida',
          mensagem: `A tarefa "${task.title}" está vencida (prazo ${dateLabel}).`,
          tipo: 'sistema',
          prioridade: 'urgente',
          dados: { categoria: 'kanban-overdue', kanbanTicketId: task.id },
          dedupeKey: `kanban-kanban-overdue-${task.id}`,
        })
      }
      continue
    }

    if (diffDays === 0) {
      if (!hasCat(task.id, 'kanban-due-today')) {
        add({
          titulo: 'Tarefa vence hoje',
          mensagem: `A tarefa "${task.title}" vence hoje (${dateLabel}).`,
          tipo: 'sistema',
          prioridade: 'alta',
          dados: { categoria: 'kanban-due-today', kanbanTicketId: task.id },
          dedupeKey: `kanban-kanban-due-today-${task.id}`,
        })
      }
      continue
    }

    if (diffDays === 1) {
      if (!hasCat(task.id, 'kanban-due-tomorrow')) {
        add({
          titulo: 'Tarefa vence amanhã',
          mensagem: `A tarefa "${task.title}" vence amanhã (${dateLabel}).`,
          tipo: 'sistema',
          prioridade: 'alta',
          dados: { categoria: 'kanban-due-tomorrow', kanbanTicketId: task.id },
          dedupeKey: `kanban-kanban-due-tomorrow-${task.id}`,
        })
      }
      continue
    }

    if (diffDays >= 2 && diffDays <= 7) {
      if (!hasCat(task.id, 'kanban-due-soon')) {
        add({
          titulo: 'Prazo aproximando',
          mensagem: `A tarefa "${task.title}" vence em ${diffDays} dias (${dateLabel}).`,
          tipo: 'sistema',
          prioridade: 'media',
          dados: { categoria: 'kanban-due-soon', kanbanTicketId: task.id },
          dedupeKey: `kanban-kanban-due-soon-${task.id}`,
        })
      }
    }
  }

  // Remover notificações kanban de tarefas concluídas
  ;[...notifications].forEach((notification) => {
    if (!notification.dados?.categoria?.startsWith('kanban-')) return
    const tid = notification.dados?.kanbanTicketId
    if (!tid) return
    const task = tickets.find((t) => t.id === tid)
    if (task?.status === 'done') {
      remove(notification.id)
    }
  })

  return { overdueTitles }
}

/** Após criar tarefa com data de vencimento — confirma o registo do prazo na central de notificações. */
export function notifyKanbanPrazoRegistrado(task: KanbanTicket) {
  if (!task.dueDate) return
  const due = parseLocalDateFromYmd(task.dueDate)
  if (!due) return
  const dateLabel = due.toLocaleDateString('pt-BR')

  useNotificationStore.getState().add({
    titulo: 'Prazo registado',
    mensagem: `A tarefa "${task.title}" tem vencimento em ${dateLabel}.`,
    tipo: 'sistema',
    prioridade: 'baixa',
    dados: { categoria: 'kanban-prazo-registrado', kanbanTicketId: task.id },
    dedupeKey: `kanban-prazo-registrado-${task.id}`,
  })
}
