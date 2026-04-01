export type Id = string

export interface SimpleEntity {
  id: Id
  nome: string
}

export interface Cliente {
  id: Id
  nome: string
  grupoEconomico?: string
}

export interface Contrato {
  id: Id
  numero: string
  codigo?: string
  grupoEconomico?: string
  clienteId: string
  valor?: number
  dataInicio?: string
  dataFim?: string
  status?: string
}

export type Operadora = SimpleEntity
export type Produto = SimpleEntity
export type Sistema = SimpleEntity
export type Grupo = SimpleEntity
export type Analista = SimpleEntity & { email?: string }
export type Area = SimpleEntity
export interface TipoDemanda {
  id: Id
  nome: string
  /** false = não listado no formulário de nova demanda */
  ativo?: boolean
}

export interface TipoCadastro {
  id: Id
  nome: string
  descricao?: string
}

export type TipoServico = SimpleEntity

export interface Solicitante {
  id: Id
  nome: string
}

export interface Relatorio {
  id: Id
  nome: string
}

export interface Modelo {
  id: Id
  nome: string
}


