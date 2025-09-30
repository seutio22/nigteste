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
export type Analista = SimpleEntity
export type Area = SimpleEntity
export interface TipoDemanda {
  id: Id
  nome: string
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


