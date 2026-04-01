// Tipos para indicadores do Dashboard
export type PeriodType = 'daily' | 'monthly' | 'quarterly'
export type CategoryType = 'primary' | 'secondary' | 'tertiary'
export type ChangeType = 'increase' | 'decrease' | 'neutral'

export interface DashboardIndicator {
  id: string
  page: string
  title: string
  value: number
  previousValue?: number
  /** Texto curto para o rodapé do card (ex.: "mês anterior"). */
  comparisonPeriodLabel?: string
  change?: number
  changeType: ChangeType
  period: PeriodType
  category: CategoryType
  icon: string
  color: string
  description?: string
}

export interface PageMetrics {
  page: string
  daily: {
    total: number
    created: number
    updated: number
    /** Concluídos de produção (não inclui cancelados). */
    completed: number
    /** Encerrados por cancelamento — separado de `completed` para indicadores. */
    canceled: number
    /** Itens em andamento/em aberto (produção): total - concluídos - cancelados. */
    inProgress: number
  }
  monthly: {
    total: number
    created: number
    updated: number
    completed: number
    canceled: number
    inProgress: number
  }
  quarterly: {
    total: number
    created: number
    updated: number
    completed: number
    canceled: number
    inProgress: number
  }
}

export interface IndicatorConfig {
  page: string
  title: string
  icon: string
  color: string
  category: CategoryType
  fields: {
    total: string
    created: string
    updated: string
    completed: string
  }
}

// Configuração das páginas do sistema
export const PAGE_CONFIGS: IndicatorConfig[] = [
  // Páginas Principais (Primary)
  {
    page: 'demandas',
    title: 'Cadastro',
    icon: 'Assignment',
    color: '#009FDF',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'dataInicio', // Usar dataInicio como campo principal (fallback para createdAt)
      updated: 'updatedAt',
      completed: 'status'
    }
  },
  {
    page: 'atendimentos',
    title: 'Atendimentos',
    icon: 'Support',
    color: '#00A649',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'dataAbertura', // Usar dataAbertura como campo principal
      updated: 'updatedAt',
      completed: 'status'
    }
  },
  {
    page: 'validacoes',
    title: 'Validações',
    icon: 'CheckCircle',
    color: '#E5B800',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'dataInicio', // Usar dataInicio como campo principal (fallback para createdAt)
      updated: 'updatedAt',
      completed: 'status'
    }
  },
  {
    page: 'reajustes',
    title: 'Reajustes',
    icon: 'AttachMoney',
    color: '#8b5cf6',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'createdAt',
      updated: 'updatedAt',
      completed: 'status'
    }
  },
  {
    page: 'manutencoes',
    title: 'Manutenções',
    icon: 'Build',
    color: '#DA3832',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'dataInicio', // Usar dataInicio como campo principal (fallback para createdAt)
      updated: 'updatedAt',
      completed: 'status'
    }
  },
  {
    page: 'analytics',
    title: 'Analytics',
    icon: 'BarChart',
    color: '#06b6d4',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'dataInicio', // Usar dataInicio como campo principal (fallback para dataCriacao ou createdAt)
      updated: 'dataAtualizacao',
      completed: 'status'
    }
  },
  // Páginas Secundárias (Secondary)
  {
    page: 'mailling',
    title: 'Mailling',
    icon: 'Email',
    color: '#00A649',
    category: 'secondary',
    fields: {
      total: 'status',
      created: 'createdAt',
      updated: 'updatedAt',
      completed: 'status'
    }
  },
  {
    page: 'comunicados',
    title: 'Comunicados',
    icon: 'Notifications',
    color: '#f97316',
    category: 'secondary',
    fields: {
      total: 'status',
      created: 'createdAt',
      updated: 'updatedAt',
      completed: 'status'
    }
  },
  {
    page: 'projetos',
    title: 'Projetos',
    icon: 'Folder',
    color: '#6366f1',
    category: 'secondary',
    fields: {
      total: 'status',
      created: 'createdAt',
      updated: 'updatedAt',
      completed: 'status'
    }
  }
]

// Status que indicam conclusão por página
export const COMPLETION_STATUS: Record<string, string[]> = {
  demandas: ['Concluída', 'Finalizada', 'Resolvida'],
  atendimentos: ['Resolvido', 'Finalizado', 'Concluído'],
  validacoes: ['Aprovada', 'Validada', 'Concluída'],
  reajustes: ['Aprovado', 'Finalizado', 'Concluído'],
  manutencoes: ['Concluída', 'Finalizada', 'Resolvida'],
  analytics: ['Concluída', 'Concluído', 'concluido', 'CONCLUIDO', 'Finalizado', 'Gerado'],
  mailling: ['Ativo', 'Enviado', 'Processado'],
  comunicados: ['Enviado', 'Lido', 'Processado'],
  projetos: ['Concluído', 'Finalizado', 'Entregue']
}

// Status que indicam pendência (não concluído) por página
export const PENDING_STATUS: Record<string, string[]> = {
  demandas: ['Pendente', 'Aberta', 'Em andamento', 'Em Andamento', 'Aguardando aprovação', 'Com erros'],
  atendimentos: ['Aberto', 'Em Andamento', 'Em andamento'],
  validacoes: ['Pendente', 'Em validação', 'Em andamento', 'Aguardando validação'],
  manutencoes: ['Pendente', 'Aberta', 'Em andamento', 'Em Andamento', 'Aguardando validação', 'Com erros'],
  analytics: ['Pendente', 'pendente', 'PENDENTE', 'Em andamento', 'em_andamento', 'EM ANDAMENTO']
}

/** Verifica se item está concluído (por página). Reajustes usam aprovado. */
export function isItemConcluido(page: string, item: any): boolean {
  if (page === 'reajustes') {
    return item.aprovado === true || (COMPLETION_STATUS.reajustes || []).includes(String(item.status || ''))
  }
  const statuses = COMPLETION_STATUS[page]
  if (!statuses) return false
  const s = String(item.status || '').trim()
  return statuses.some(st => st.toLowerCase() === s.toLowerCase())
}

/** Status de cancelamento (encerramento sem conclusão de produção). */
export function isItemCancelado(page: string, item: any): boolean {
  const s = String(item?.status ?? '').trim()
  if (!s) return false
  const t = normalizeStatusParaPendencia(s)
  if (t.includes('cancelad')) return true
  // Transferido de analista: status de encerramento sem produção (equivalente a cancelado para o Dashboard).
  if (t.includes('transf') && t.includes('analista')) return true
  return false
}

/**
 * Conclusão para indicadores de produção: concluído pelo fluxo normal e **não** cancelado.
 * Cancelados ficam só em `canceled`, não em `completed`.
 */
export function isItemConcluidoProducao(page: string, item: any): boolean {
  if (isItemCancelado(page, item)) return false
  // Compatível com métricas antigas que tratavam `status === true` como concluído
  if (item?.status === true) return true
  return isItemConcluido(page, item)
}

/** Verifica se item está pendente (por página). Reajustes: !aprovado. */
export function isItemPendente(page: string, item: any): boolean {
  if (page === 'reajustes') return item.aprovado !== true
  const statuses = PENDING_STATUS[page]
  if (!statuses) return !isItemConcluido(page, item)
  const s = String(item.status || '').trim()
  return statuses.some(st => st.toLowerCase() === s.toLowerCase())
}

/** Normaliza status para comparação (minúsculas, sem acentos). */
export function normalizeStatusParaPendencia(raw: string | undefined | null): string {
  if (raw == null) return ''
  return String(raw)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Status que fecham o chamado para a lista/export "pendências do meu usuário" na Home:
 * Concluído (e Concluída), Concluído Parcialmente, Cancelado (e Cancelada),
 * além de Resolvido/Finalizado (encerrados em atendimentos) e Aprovado/Aprovada/Validada (encerrados em validação).
 * Retorna true se o item deve ser EXCLUÍDO da lista (está fechado/cancelado).
 */
export function isStatusFechadoOuCanceladoParaListaUsuario(statusRaw: string | undefined | null): boolean {
  const t = normalizeStatusParaPendencia(statusRaw)
  if (!t) return false
  if (t.includes('cancelad')) return true
  // Transferido para outro analista: para o analista atual, trata como encerrado (não pendente).
  if (t.includes('transf') && t.includes('analista')) return true
  if (t.includes('parcialmente') && t.includes('concluid')) return true
  if (t.includes('concluid')) return true
  if (t.includes('resolvid')) return true
  if (t.includes('finaliz')) return true
  // Validação encerrada (evita confundir com "aguardando aprovação" / "não aprovado")
  if (t === 'aprovada' || t === 'aprovado' || t === 'validada' || t === 'validado') return true
  return false
}

/**
 * Chamado "em aberto" para pendências do usuário na Home / export CSV:
 * não cancelado, não concluído, não concluído parcialmente; reajustes não aprovados.
 */
export function isItemAbertoParaPendenciasUsuario(page: string, item: any): boolean {
  if (page === 'reajustes' && item?.aprovado === true) return false
  return !isStatusFechadoOuCanceladoParaListaUsuario(item?.status)
}
