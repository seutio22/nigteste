/** Rascunho: não entra na fila/kanban operacional; vinculado ao usuário que criou. */
export const PLACEMENT_STATUS_RASCUNHO = 'Rascunho' as const

/** Etapas do workflow após «Iniciar processo» (geração de proposta ao cliente). */
export const PLACEMENT_COTACAO_WORKFLOW_STATUSES = [
  'Aberta',
  'Validação',
  'Kick off',
  'Estratégia',
  'Em cotação',
  'Aguardando operadora',
  'Proposta enviada',
  'Fechada',
  'Perdida',
  'Cancelada',
] as const

export type PlacementCotacaoWorkflowStatus = (typeof PLACEMENT_COTACAO_WORKFLOW_STATUSES)[number]

export const COTACAO_FILA_STATUSES = PLACEMENT_COTACAO_WORKFLOW_STATUSES

/** Todos os status persistidos (inclui rascunho). */
export const COTACAO_ALL_STATUSES = [
  PLACEMENT_STATUS_RASCUNHO,
  ...PLACEMENT_COTACAO_WORKFLOW_STATUSES,
] as const

export type CotacaoStatus = (typeof COTACAO_ALL_STATUSES)[number]

export function isRascunhoStatus(status: string | null | undefined): boolean {
  return String(status ?? '').trim().toLowerCase() === PLACEMENT_STATUS_RASCUNHO.toLowerCase()
}

export function isFilaOperacionalStatus(status: string | null | undefined): boolean {
  return !isRascunhoStatus(status)
}
