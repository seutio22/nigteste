export type DemandId = string

export interface Demand {
  id: DemandId
  status: string
  ticket?: string
  analista?: string // nome do Analista
  analistaId?: string // id do Analista
  solicitante?: string
  area?: string // nome da Área
  areaId?: string // id da Área
  tipo?: string // nome do TipoDemanda
  tipoId?: string // id do TipoDemanda
  descricao?: string
  cliente: string // nome do Cliente
  clienteId?: string // id do Cliente
  contrato: string // nome do Contrato
  contratoId?: string // id do Contrato
  operadora: string // nome da Operadora
  operadoraId?: string // id da Operadora
  produto: string // nome do Produto
  produtoId?: string // id do Produto
  tipoServico?: string // nome do TipoServico
  tipoServicoId?: string // id do TipoServico
  sistema?: string // nome do Sistema
  sistemaId?: string // id do Sistema
  dataInicio?: string // ISO date
  dataFinal?: string // ISO date
  qtdUsuarios?: string
  qtdRetornos?: number
  qualidade?: string
  qtdClientesVinculados?: number  // QTD CLIENTES VINCULADOS - EDGE
  usuariosEmpresa?: number        // USUÁRIOS EMPRESA - MOVE
  observacoes?: string
  /** Opcional — enviado na criação quando a API exige vínculo com o usuário */
  userId?: string
  createdAt: string
  updatedAt: string
}


