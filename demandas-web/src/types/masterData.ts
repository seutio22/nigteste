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
  grupoEconomico: string
  codigo: string
}

export type Operadora = SimpleEntity
export type Produto = SimpleEntity
export type Sistema = SimpleEntity
export type Analista = SimpleEntity
export type Area = SimpleEntity
export interface TipoDemanda {
  id: Id
  nome: string
  tipoServicoId?: Id
}
export type TipoServico = SimpleEntity


