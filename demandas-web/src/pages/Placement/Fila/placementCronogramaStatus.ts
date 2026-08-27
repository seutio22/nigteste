export type PlacementCronogramaStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'overdue'
  | 'cancelado'

export const PLACEMENT_CRONOGRAMA_STATUS_OPTIONS: Array<{
  value: PlacementCronogramaStatus
  label: string
}> = [
  { value: 'pending', label: 'Não iniciado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'overdue', label: 'Em atraso' },
  { value: 'cancelado', label: 'Cancelado' },
]

/** Opções manuais — «Em atraso» é calculado automaticamente. */
export const CRONOGRAMA_STATUS_MANUAL_OPTIONS = PLACEMENT_CRONOGRAMA_STATUS_OPTIONS.filter(
  (o) => o.value !== 'overdue'
)

export function normalizeCronogramaStatus(raw: unknown): PlacementCronogramaStatus {
  const v = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  if (v === 'completed' || v === 'concluido' || v === 'concluida' || v === 'concluído') return 'completed'
  if (v === 'in_progress' || v === 'em_andamento' || v === 'emandamento') return 'in_progress'
  if (v === 'overdue' || v === 'atrasado' || v === 'em_atraso') return 'overdue'
  if (v === 'cancelado' || v === 'cancelada') return 'cancelado'
  if (v === 'pending' || v === 'nao_iniciado' || v === 'naoiniciado' || v === 'pendente') return 'pending'
  return 'pending'
}

export function cronogramaStatusLabel(status: PlacementCronogramaStatus | string | null | undefined): string {
  const hit = PLACEMENT_CRONOGRAMA_STATUS_OPTIONS.find((o) => o.value === status)
  return hit?.label ?? String(status ?? 'Não iniciado')
}

export function cronogramaStatusColor(
  status: PlacementCronogramaStatus | string | null | undefined
): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  const s = normalizeCronogramaStatus(status)
  switch (s) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'primary'
    case 'overdue':
      return 'error'
    case 'cancelado':
      return 'default'
    default:
      return 'warning'
  }
}

export function isCronogramaTerminalStatus(status: PlacementCronogramaStatus | string | null | undefined): boolean {
  const s = normalizeCronogramaStatus(status)
  return s === 'completed' || s === 'cancelado'
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Calcula status efetivo (inclui atraso automático como em Projetos). */
export function resolveEffectiveCronogramaStatus(input: {
  status?: PlacementCronogramaStatus | string | null
  dataPrevista?: string | null
  dataConclusao?: string | null
  concluida?: boolean
  today?: string
}): PlacementCronogramaStatus {
  const today = input.today ?? todayIsoDate()
  const stored = normalizeCronogramaStatus(input.status)

  if (input.dataConclusao) return 'completed'
  if (input.concluida) return 'completed'
  if (stored === 'cancelado') return 'cancelado'
  if (stored === 'completed') return 'completed'

  const prevista = input.dataPrevista?.trim()
  if (prevista && prevista < today) {
    return 'overdue'
  }

  if (stored === 'overdue' && prevista && prevista >= today) {
    return 'in_progress'
  }

  return stored
}

export function validateCronogramaStatusPatch(patch: {
  status?: PlacementCronogramaStatus | string | null
  dataConclusao?: string | null
}): { ok: true } | { ok: false; message: string } {
  const status = patch.status ? normalizeCronogramaStatus(patch.status) : null
  if (status === 'completed') {
    const conclusao = patch.dataConclusao?.trim()
    if (!conclusao) {
      return { ok: false, message: 'Para marcar como Concluído, informe a data de conclusão.' }
    }
  }
  return { ok: true }
}
