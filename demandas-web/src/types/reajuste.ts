export interface ReajusteEntry {
  id: string
  mes: string
  ano: string
  dataInicio?: string
  dataFim?: string
  status: string
  operadora: string
  qualidade?: string
  qualidadeInformacao?: string
  planos?: string
  responsavelConta?: string
  filial?: string
  ticket?: string
  solicitante?: string
  responsavelAnalista: string
  cliente?: string
  contrato?: string
  produto?: string
  dataAtualizacao?: string
  itensPendentes?: number
  itensConcluidos?: number
  valorTotal?: number
  descricao?: string
  tipoReajuste?: string
  percentual?: number
  dataAplicacao?: string
  observacoes?: string
  createdAt: string
  updatedAt: string
}


