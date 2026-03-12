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
    completed: number
  }
  monthly: {
    total: number
    created: number
    updated: number
    completed: number
  }
  quarterly: {
    total: number
    created: number
    updated: number
    completed: number
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
    color: '#FCDA4F',
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
  demandas: ['Pendente', 'Aberta', 'Em andamento', 'Em Andamento', 'Transf. Analista', 'Aguardando aprovação', 'Com erros'],
  atendimentos: ['Aberto', 'Em Andamento', 'Em andamento'],
  validacoes: ['Pendente', 'Em validação', 'Em andamento', 'Transf. Analista', 'Aguardando validação'],
  manutencoes: ['Pendente', 'Aberta', 'Em andamento', 'Em Andamento', 'Transf. Analista', 'Aguardando validação', 'Com erros'],
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

/** Verifica se item está pendente (por página). Reajustes: !aprovado. */
export function isItemPendente(page: string, item: any): boolean {
  if (page === 'reajustes') return item.aprovado !== true
  const statuses = PENDING_STATUS[page]
  if (!statuses) return !isItemConcluido(page, item)
  const s = String(item.status || '').trim()
  return statuses.some(st => st.toLowerCase() === s.toLowerCase())
}
