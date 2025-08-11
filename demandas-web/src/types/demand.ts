export type DemandId = string

export interface Demand {
  id: DemandId
  status: string
  ticket?: string
  analista?: string // id de Analista
  solicitante?: string
  area?: string // id de Área
  tipo?: string // id de TipoDemanda
  descricao?: string
  cliente: string // id de Cliente
  contrato: string // id de Contrato
  operadora: string // id de Operadora
  produto: string // id de Produto
  tipoServico?: string // id de TipoServico
  sistema?: string // id de Sistema
  dataInicio?: string // ISO date
  dataFinal?: string // ISO date
  periodicidade?: string
  qtdRetornos?: number
  qualidade?: string
  observacoes?: string
  createdAt: string
  updatedAt: string
}


