import type { KanbanTicket } from '../store/kanbanStore'
import {
  businessDaysFromTomorrowToDueInclusive,
  diffCalendarDays,
  parseLocalDateFromYmd,
} from './kanbanDates'

export type KanbanDeadlineAlert = {
  titulo: string
  mensagem: string
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  dados: { categoria: string; kanbanTicketId: string }
  dedupeKey: string
}

/** Categorias Kanban de prazo (uma notificação por ticket por categoria). */
export const KANBAN_DEADLINE_CATEGORIES = [
  'kanban-overdue',
  'kanban-due-today',
  'kanban-due-tomorrow',
  'kanban-due-soon',
  'kanban-3bd',
  'kanban-1bd',
] as const

export function isKanbanDeadlineCategory(cat: string | undefined): boolean {
  return !!cat && (KANBAN_DEADLINE_CATEGORIES as readonly string[]).includes(cat)
}

/**
 * Regras de notificação (sem duplicar a mesma categoria para o mesmo ticket):
 * - Vencida (prazo antes de hoje)
 * - Vence hoje / amanhã / em breve (2–3 dias civis)
 * - 3 dias úteis / 1 dia útil (antecedência em dias úteis, quando não cai em hoje/amanhã)
 */
export function alertsForKanbanTicket(
  task: Pick<KanbanTicket, 'id' | 'title' | 'dueDate' | 'status'>,
  todayStart: Date
): KanbanDeadlineAlert[] {
  if (!task.dueDate || task.status === 'done') return []

  const due = parseLocalDateFromYmd(task.dueDate)
  if (!due) return []

  const dateLabel = due.toLocaleDateString('pt-BR')
  const diffDays = diffCalendarDays(todayStart, due)
  const bd = businessDaysFromTomorrowToDueInclusive(todayStart, due)
  const out: KanbanDeadlineAlert[] = []

  if (diffDays < 0) {
    out.push({
      titulo: 'Tarefa vencida',
      mensagem: `A tarefa "${task.title}" está vencida (prazo ${dateLabel}).`,
      prioridade: 'urgente',
      dados: { categoria: 'kanban-overdue', kanbanTicketId: task.id },
      dedupeKey: `kanban-overdue-${task.id}`,
    })
    return out
  }

  if (diffDays === 0) {
    out.push({
      titulo: 'Tarefa vence hoje',
      mensagem: `A tarefa "${task.title}" vence hoje (${dateLabel}).`,
      prioridade: 'urgente',
      dados: { categoria: 'kanban-due-today', kanbanTicketId: task.id },
      dedupeKey: `kanban-due-today-${task.id}`,
    })
    return out
  }

  if (diffDays === 1) {
    out.push({
      titulo: 'Tarefa vence amanhã',
      mensagem: `A tarefa "${task.title}" vence amanhã (${dateLabel}).`,
      prioridade: 'alta',
      dados: { categoria: 'kanban-due-tomorrow', kanbanTicketId: task.id },
      dedupeKey: `kanban-due-tomorrow-${task.id}`,
    })
    return out
  }

  if (diffDays >= 2 && diffDays <= 3) {
    out.push({
      titulo: 'Tarefa vence em breve',
      mensagem: `A tarefa "${task.title}" vence em ${diffDays} dias (${dateLabel}).`,
      prioridade: 'media',
      dados: { categoria: 'kanban-due-soon', kanbanTicketId: task.id },
      dedupeKey: `kanban-due-soon-${task.id}`,
    })
    return out
  }

  if (bd === 3) {
    out.push({
      titulo: 'Prazo: 3 dias úteis',
      mensagem: `A tarefa "${task.title}" vence em 3 dias úteis (${dateLabel}).`,
      prioridade: 'media',
      dados: { categoria: 'kanban-3bd', kanbanTicketId: task.id },
      dedupeKey: `kanban-3bd-${task.id}`,
    })
    return out
  }

  if (bd === 1) {
    out.push({
      titulo: 'Prazo: 1 dia útil',
      mensagem: `A tarefa "${task.title}" vence em 1 dia útil (${dateLabel}).`,
      prioridade: 'alta',
      dados: { categoria: 'kanban-1bd', kanbanTicketId: task.id },
      dedupeKey: `kanban-1bd-${task.id}`,
    })
  }

  return out
}

/** Uma categoria ativa por ticket (a mais urgente). */
export function activeCategoryForTicket(
  task: Pick<KanbanTicket, 'id' | 'title' | 'dueDate' | 'status'>,
  todayStart: Date
): string | null {
  const alerts = alertsForKanbanTicket(task, todayStart)
  return alerts[0]?.dados.categoria ?? null
}

export function buildKanbanDeadlineAlerts(
  tickets: Pick<KanbanTicket, 'id' | 'title' | 'dueDate' | 'status'>[]
): KanbanDeadlineAlert[] {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return tickets.flatMap((t) => alertsForKanbanTicket(t, todayStart))
}
