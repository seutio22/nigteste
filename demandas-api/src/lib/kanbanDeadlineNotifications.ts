import { businessDaysFromTomorrowToDueInclusive } from './kanbanBusinessDays'

function toDateOnlyYmd(value: string | Date): string {
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(value).trim()
  if (s.includes('T')) return s.split('T')[0].slice(0, 10)
  return s.slice(0, 10)
}

function parseLocalDateFromYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  const dt = new Date(y, mo, day)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== day) return null
  return dt
}

function diffCalendarDays(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

export type KanbanDeadlineNotificationDto = {
  titulo: string
  mensagem: string
  tipo: 'sistema'
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  dados: { categoria: string; kanbanTicketId: string }
  link: string
}

type TicketRow = {
  id: string
  title: string
  dueDate: Date | string | null
  status: string
}

export function buildKanbanDeadlineNotifications(
  tickets: TicketRow[],
  today: Date
): KanbanDeadlineNotificationDto[] {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const out: KanbanDeadlineNotificationDto[] = []

  for (const ticket of tickets) {
    if (!ticket.dueDate || ticket.status === 'done') continue
    const ymd = toDateOnlyYmd(ticket.dueDate)
    const due = parseLocalDateFromYmd(ymd)
    if (!due) continue

    const dateLabel = due.toLocaleDateString('pt-BR')
    const diffDays = diffCalendarDays(todayStart, due)
    const bd = businessDaysFromTomorrowToDueInclusive(todayStart, due)
    const link = '/kanban'

    if (diffDays < 0) {
      out.push({
        titulo: 'Tarefa vencida',
        mensagem: `A tarefa "${ticket.title}" está vencida (prazo ${dateLabel}).`,
        tipo: 'sistema',
        prioridade: 'urgente',
        dados: { categoria: 'kanban-overdue', kanbanTicketId: ticket.id },
        link,
      })
      continue
    }
    if (diffDays === 0) {
      out.push({
        titulo: 'Tarefa vence hoje',
        mensagem: `A tarefa "${ticket.title}" vence hoje (${dateLabel}).`,
        tipo: 'sistema',
        prioridade: 'urgente',
        dados: { categoria: 'kanban-due-today', kanbanTicketId: ticket.id },
        link,
      })
      continue
    }
    if (diffDays === 1) {
      out.push({
        titulo: 'Tarefa vence amanhã',
        mensagem: `A tarefa "${ticket.title}" vence amanhã (${dateLabel}).`,
        tipo: 'sistema',
        prioridade: 'alta',
        dados: { categoria: 'kanban-due-tomorrow', kanbanTicketId: ticket.id },
        link,
      })
      continue
    }
    if (diffDays >= 2 && diffDays <= 3) {
      out.push({
        titulo: 'Tarefa vence em breve',
        mensagem: `A tarefa "${ticket.title}" vence em ${diffDays} dias (${dateLabel}).`,
        tipo: 'sistema',
        prioridade: 'media',
        dados: { categoria: 'kanban-due-soon', kanbanTicketId: ticket.id },
        link,
      })
      continue
    }
    if (bd === 3) {
      out.push({
        titulo: 'Prazo: 3 dias úteis',
        mensagem: `A tarefa "${ticket.title}" vence em 3 dias úteis (${dateLabel}).`,
        tipo: 'sistema',
        prioridade: 'media',
        dados: { categoria: 'kanban-3bd', kanbanTicketId: ticket.id },
        link,
      })
      continue
    }
    if (bd === 1) {
      out.push({
        titulo: 'Prazo: 1 dia útil',
        mensagem: `A tarefa "${ticket.title}" vence em 1 dia útil (${dateLabel}).`,
        tipo: 'sistema',
        prioridade: 'alta',
        dados: { categoria: 'kanban-1bd', kanbanTicketId: ticket.id },
        link,
      })
    }
  }

  return out
}
