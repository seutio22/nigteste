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
    color: '#3b82f6',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'createdAt',
      updated: 'updatedAt',
      completed: 'status'
    }
  },
  {
    page: 'atendimentos',
    title: 'Atendimentos',
    icon: 'Support',
    color: '#10b981',
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
    color: '#f59e0b',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'createdAt',
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
    color: '#ef4444',
    category: 'primary',
    fields: {
      total: 'status',
      created: 'createdAt',
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
      created: 'dataCriacao',
      updated: 'dataAtualizacao',
      completed: 'status'
    }
  },
  // Páginas Secundárias (Secondary)
  {
    page: 'mailling',
    title: 'Mailling',
    icon: 'Email',
    color: '#84cc16',
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
export const COMPLETION_STATUS = {
  demandas: ['Concluída', 'Finalizada', 'Resolvida'],
  atendimentos: ['Resolvido', 'Finalizado', 'Concluído'],
  validacoes: ['Aprovada', 'Validada', 'Concluída'],
  reajustes: ['Aprovado', 'Finalizado', 'Concluído'],
  manutencoes: ['Concluída', 'Finalizada', 'Resolvida'],
  analytics: ['Concluído', 'Finalizado', 'Gerado'],
  mailling: ['Ativo', 'Enviado', 'Processado'],
  comunicados: ['Enviado', 'Lido', 'Processado'],
  projetos: ['Concluído', 'Finalizado', 'Entregue']
}
