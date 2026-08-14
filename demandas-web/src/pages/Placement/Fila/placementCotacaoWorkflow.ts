import {
  PLACEMENT_COTACAO_WORKFLOW_STATUSES,
  PLACEMENT_STATUS_RASCUNHO,
  isRascunhoStatus,
  type PlacementCotacaoWorkflowStatus,
} from './placementCotacaoStatus'

export { PLACEMENT_STATUS_RASCUNHO }

export type WorkflowStageKey =
  | 'base_atual'
  | 'validacao'
  | 'kick_off'
  | 'estrategia'
  | 'em_cotacao'
  | 'aguardando_operadora'
  | 'consolidando_dados'
  | 'validacao_proposta'
  | 'proposta_enviada'
  | 'fechada'
  | 'perdida'
  | 'cancelada'

export type WorkflowStageMeta = {
  status: PlacementCotacaoWorkflowStatus
  key: WorkflowStageKey
  label: string
  description: string
  /** Objetivo operacional desta etapa. */
  objective: string
  /** Índice no fluxo principal (null = etapa terminal/lateral). */
  mainFlowIndex: number | null
  /** Etapa com trilha interna de subetapas (ex.: Análise, Solicitação Mercado). */
  hasSubetapas?: boolean
}

/** Etapas do fluxo principal (avanço sequencial). */
export const PLACEMENT_WORKFLOW_MAIN_STAGES: WorkflowStageMeta[] = [
  {
    status: 'Aberta',
    key: 'base_atual',
    label: 'Premissa',
    description: 'Premissas e situação atual do cliente',
    objective:
      'Documente a situação atual do cliente: estipulante, produtos, fornecedores, planos vigentes e quesito financeiro do contrato em vigor. Esta é a base para montar a proposta.',
    mainFlowIndex: 0,
  },
  {
    status: 'Validação',
    key: 'validacao',
    label: 'Análise',
    description: 'Beneficiários e slides iniciais',
    objective:
      'Antecipe a análise da base de beneficiários, grupo elegível, contrato atual e distribuição por localidade — antes do Kick off e da cotação formal.',
    mainFlowIndex: 1,
    hasSubetapas: true,
  },
  {
    status: 'Kick off',
    key: 'kick_off',
    label: 'Kick off',
    description: 'Reunião de alinhamento',
    objective:
      'Conduza a reunião de kick off: apresente o resumo da abertura e a análise da base importada para alinhar premissas e direcionamento da cotação.',
    mainFlowIndex: 2,
  },
  {
    status: 'Estratégia',
    key: 'estrategia',
    label: 'Estratégia',
    description: 'Formalização da estratégia',
    objective:
      'Formalize a estratégia acordada na reunião (premissas, condições e mercado analisado) e valide antes de iniciar a Solicitação Mercado.',
    mainFlowIndex: 3,
  },
  {
    status: 'Em cotação',
    key: 'em_cotacao',
    label: 'Solicitação Mercado',
    description: 'Cenário de estudo e comunicação',
    objective:
      'Monte o cenário de estudo financeiro, revise as bases validadas e comunique as operadoras do mercado analisado antes de aguardar retorno.',
    mainFlowIndex: 4,
    hasSubetapas: true,
  },
  {
    status: 'Aguardando operadora',
    key: 'aguardando_operadora',
    label: 'Aguardando operadora',
    description: 'Retorno das operadoras',
    objective: 'Aguarde e registre retornos, documentação e condições das operadoras.',
    mainFlowIndex: 5,
  },
  {
    status: 'Consolidando dados',
    key: 'consolidando_dados',
    label: 'Consolidando dados',
    description: 'Diferenciais, coberturas e condições',
    objective:
      'Consolide diferenciais por fornecedor, resumo de coberturas e condições contratuais para a proposta.',
    mainFlowIndex: 6,
  },
  {
    status: 'Validação proposta',
    key: 'validacao_proposta',
    label: 'Validação',
    description: 'Revisão do consolidado da proposta',
    objective:
      'Valide apenas os dados consolidados para a proposta (resumo, condições, diferenciais, indicadores) e itens adicionais. Não é revisão da abertura do processo. Com ajustes, devolva para Consolidando dados.',
    mainFlowIndex: 7,
  },
  {
    status: 'Proposta enviada',
    key: 'proposta_enviada',
    label: 'Proposta enviada',
    description: 'Proposta ao cliente',
    objective: 'Proposta formal enviada ao cliente para análise e negociação.',
    mainFlowIndex: 8,
  },
  {
    status: 'Fechada',
    key: 'fechada',
    label: 'Fechada',
    description: 'Negócio concluído',
    objective: 'Oportunidade concluída com sucesso.',
    mainFlowIndex: 9,
  },
]

export const PLACEMENT_WORKFLOW_TERMINAL_STAGES: WorkflowStageMeta[] = [
  {
    status: 'Perdida',
    key: 'perdida',
    label: 'Perdida',
    description: 'Sem fechamento',
    objective: 'Oportunidade encerrada sem fechamento.',
    mainFlowIndex: null,
  },
  {
    status: 'Cancelada',
    key: 'cancelada',
    label: 'Cancelada',
    description: 'Processo cancelado',
    objective: 'Processo cancelado antes da conclusão.',
    mainFlowIndex: null,
  },
]

/** Metadados de todas as etapas (stepper + encerramentos). */
export const PLACEMENT_WORKFLOW_STAGES: WorkflowStageMeta[] = [
  ...PLACEMENT_WORKFLOW_MAIN_STAGES,
  ...PLACEMENT_WORKFLOW_TERMINAL_STAGES,
]

export function getWorkflowStageMeta(status: string): WorkflowStageMeta | undefined {
  return PLACEMENT_WORKFLOW_STAGES.find(
    (s) => s.status.toLowerCase() === String(status).trim().toLowerCase()
  )
}

export function getWorkflowStageKey(status: string): WorkflowStageKey {
  return getWorkflowStageMeta(status)?.key ?? 'base_atual'
}

/** Próximo status no fluxo principal (null se já terminal ou último). */
export function nextMainFlowStatus(current: string): PlacementCotacaoWorkflowStatus | null {
  const meta = getWorkflowStageMeta(current)
  if (!meta || meta.mainFlowIndex == null) return null
  const next = PLACEMENT_WORKFLOW_MAIN_STAGES.find((s) => s.mainFlowIndex === meta.mainFlowIndex + 1)
  return next?.status ?? null
}

export function workflowStageIndex(status: string): number {
  if (isRascunhoStatus(status)) return -1
  const idx = PLACEMENT_COTACAO_WORKFLOW_STATUSES.findIndex(
    (s) => s.toLowerCase() === String(status).trim().toLowerCase()
  )
  return idx >= 0 ? idx : 0
}

/** @deprecated Use nextMainFlowStatus */
export function nextWorkflowStatus(current: string): PlacementCotacaoWorkflowStatus | null {
  return nextMainFlowStatus(current)
}

export function canAdvanceMainFlow(status: string): boolean {
  return nextMainFlowStatus(status) != null
}

/** Etapa anterior no fluxo principal (null se já na primeira). */
export function previousMainFlowStatus(current: string): PlacementCotacaoWorkflowStatus | null {
  const meta = getWorkflowStageMeta(current)
  if (!meta || meta.mainFlowIndex == null || meta.mainFlowIndex <= 0) return null
  const prev = PLACEMENT_WORKFLOW_MAIN_STAGES.find(
    (s) => s.mainFlowIndex === meta.mainFlowIndex! - 1
  )
  return prev?.status ?? null
}

export function canRetreatMainFlow(status: string): boolean {
  return previousMainFlowStatus(status) != null
}
