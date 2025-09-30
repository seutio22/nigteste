export interface MaillingContact {
  id: string
  email: string
  nome: string
  cargo: string
  area: string
  filial: string
  superior?: string
  posicaoEmail: 'PARA' | 'CÓPIA OCULTA' | 'CÓPIA'
  
  // Parâmetros de Segmentação (Opcionais)
  informativos?: 'sim' | 'nao'
  cancelamento?: 'sim' | 'nao'
  alteracaoContratual?: 'sim' | 'nao'
  alteracaoDadosCliente?: 'sim' | 'nao'
  alteracaoServicos?: 'sim' | 'nao'
  aniversarioClientes?: 'sim' | 'nao'
  alteracaoRemuneracao?: 'sim' | 'nao'
  dexpara?: 'sim' | 'nao'
  curadoriaPortalRh?: 'sim' | 'nao'
  documentacaoContratual?: 'sim' | 'nao'
  
  createdAt: string
  updatedAt: string
  changeLog?: ChangeLogEntry[]
}

export interface ChangeLogEntry {
  id: string
  timestamp: string
  field: string
  oldValue: string
  newValue: string
  changedBy?: string
  description: string
}

export interface MaillingFilter {
  email?: string
  nome?: string
  cargo?: string
  area?: string
  filial?: string
  superior?: string
  posicaoEmail?: 'PARA' | 'CÓPIA OCULTA' | 'CÓPIA'
  
  // Parâmetros de Segmentação (Opcionais)
  informativos?: 'sim' | 'nao'
  cancelamento?: 'sim' | 'nao'
  alteracaoContratual?: 'sim' | 'nao'
  alteracaoDadosCliente?: 'sim' | 'nao'
  alteracaoServicos?: 'sim' | 'nao'
  aniversarioClientes?: 'sim' | 'nao'
  alteracaoRemuneracao?: 'sim' | 'nao'
  dexpara?: 'sim' | 'nao'
  curadoriaPortalRh?: 'sim' | 'nao'
  documentacaoContratual?: 'sim' | 'nao'
}

export interface MaillingTemplate {
  id: string
  nome: string
  assunto: string
  corpo: string
  filtros: MaillingFilter
  ativo: boolean
  createdAt: string
  updatedAt: string
}


