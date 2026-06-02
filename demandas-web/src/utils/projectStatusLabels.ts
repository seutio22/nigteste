/** Normaliza chave de status (projeto, fase, tarefa, subtarefa). */
export function normalizeProjectStatus(status: unknown): string {
  return String(status ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0300/g, '')
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  cancelado: 'Cancelado',
  concluido: 'Concluído',
  concluida: 'Concluída',
  concluída: 'Concluída',
  finalizado: 'Finalizado',
  finalizada: 'Finalizada',
  done: 'Concluído',
  em_andamento: 'Em andamento',
  'in-progress': 'Em andamento',
  in_progress: 'Em andamento',
  nao_iniciado: 'Não iniciado',
  'nao iniciado': 'Não iniciado',
  not_started: 'Não iniciado',
  pending: 'Não iniciado',
  pendente: 'Pendente',
  todo: 'A fazer',
  review: 'Em revisão',
  overdue: 'Em atraso',
  em_atraso: 'Em atraso',
  blocked: 'Bloqueado',
  aguardando: 'Aguardando',
}

const STATUS_COLORS: Record<string, string> = {
  active: '#00A649',
  completed: '#00A649',
  concluido: '#00A649',
  concluida: '#00A649',
  concluída: '#00A649',
  finalizado: '#00A649',
  finalizada: '#00A649',
  done: '#00A649',
  paused: '#E5B800',
  cancelled: '#DA3832',
  cancelado: '#DA3832',
  todo: '#6b7a80',
  in_progress: '#009FDF',
  em_andamento: '#009FDF',
  'in-progress': '#009FDF',
  review: '#E5B800',
  nao_iniciado: '#E5B800',
  'nao iniciado': '#E5B800',
  not_started: '#E5B800',
  pending: '#E5B800',
  pendente: '#009FDF',
  aguardando: '#E5B800',
  overdue: '#DA3832',
  em_atraso: '#DA3832',
  blocked: '#DA3832',
}

function humanizeStatusKey(key: string): string {
  return key.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function getProjectStatusLabel(status: unknown): string {
  const key = normalizeProjectStatus(status)
  if (!key) return 'Não iniciado'
  return (
    STATUS_LABELS[key] ??
    STATUS_LABELS[key.replace(/\s+/g, '_')] ??
    humanizeStatusKey(key)
  )
}

export function getProjectStatusColor(status: unknown): string {
  const key = normalizeProjectStatus(status)
  if (!key) return STATUS_COLORS.nao_iniciado
  return STATUS_COLORS[key] ?? STATUS_COLORS[key.replace(/\s+/g, '_')] ?? '#6b7a80'
}

/** Status considerados "não iniciado" (fases e tarefas). */
export function isPendingProjectStatus(status: unknown): boolean {
  const key = normalizeProjectStatus(status)
  return (
    !key ||
    key === 'pending' ||
    key === 'nao_iniciado' ||
    key === 'nao iniciado' ||
    key === 'not_started' ||
    key === 'todo' ||
    key === 'aguardando'
  )
}
