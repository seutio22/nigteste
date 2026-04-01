import type { KanbanTicket } from '../store/kanbanStore'
import { useKanbanStore } from '../store/kanbanStore'

export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function mapNotificationPriorityToKanban(prioridade?: string): KanbanTicket['priority'] {
  const p = (prioridade || '').toLowerCase()
  if (p === 'urgente' || p === 'alta') return 'high'
  if (p === 'baixa') return 'low'
  return 'medium'
}

/**
 * Cria ticket no Kanban a partir de uma notificação (ex.: alerta da caixa de entrada).
 */
export async function createKanbanTicketFromNotification(
  notification: { titulo?: string; mensagem?: string; prioridade?: string },
  userId: string
): Promise<KanbanTicket> {
  const title = (notification.titulo || 'Alerta').trim().slice(0, 500) || 'Alerta'
  const description = htmlToPlainText(notification.mensagem || '').slice(0, 8000)

  return useKanbanStore.getState().addTicket({
    title,
    description,
    status: 'todo',
    priority: mapNotificationPriorityToKanban(notification.prioridade),
    assignee: userId || 'unassigned',
    tags: 'origem:caixa-entrada'
  } as Omit<KanbanTicket, 'id' | 'createdAt' | 'updatedAt'>)
}
