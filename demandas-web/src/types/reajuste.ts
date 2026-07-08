export interface ReajusteEntry {
  id: string
  mes: string
  ano: string
  dataInicio?: string
  dataFim?: string
  /** Alias (UI / export) — mesmo significado que `dataFim` quando a API envia outro nome */
  dataFinal?: string
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
  contratosVinculos?: unknown
  dataAtualizacao?: string
  itensPendentes?: number
  itensConcluidos?: number
  /** Total exibido na lista (pode espelhar `valorTotal` ou soma de itens) */
  total?: number
  valorTotal?: number
  descricao?: string
  tipoReajuste?: string
  percentual?: number
  dataAplicacao?: string
  observacoes?: string
  createdAt: string
  updatedAt: string
}


