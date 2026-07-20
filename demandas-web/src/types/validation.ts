export interface ValidationEntry {
  id: string
  dataInicio?: string
  dataFinal?: string
  status?: string
  periodicidade?: string
  ticket?: string
  solicitante?: string
  area?: string
  /** ID (string) ou objeto populado pela API */
  demanda?: string | { id: string; [key: string]: any }
  tipo?: string
  descricao?: string
  total?: number
  sistema?: string
  localizacao?: string
  observacoes?: string
  // IDs dos relacionamentos
  clienteId?: string
  contratoId?: string
  operadoraId?: string
  produtoId?: string
  analistaId?: string
  // Campos do formulário (nomes originais)
  cliente?: string
  contrato?: string
  operadora?: string
  produto?: string
  analista?: string
  // Objetos relacionados (populados pela API)
  analistaObj?: { id: string; nome: string; createdAt: string; updatedAt: string }
  clienteObj?: { id: string; nome: string; grupoEconomico?: string; cnpj?: string; telefone?: string; email?: string; endereco?: string; createdAt: string; updatedAt: string }
  contratoObj?: { id: string; numero: string; codigo?: string; grupoEconomico?: string; clienteId: string; valor?: number; dataInicio?: string; dataFim?: string; status: string; createdAt: string; updatedAt: string }
  operadoraObj?: { id: string; nome: string; cnpj?: string; telefone?: string; email?: string; endereco?: string; createdAt: string; updatedAt: string }
  produtoObj?: { id: string; nome: string; descricao?: string; operadoraId?: string; createdAt: string; updatedAt: string }
  user?: { id: string; name: string; email: string; role: string; [key: string]: any }
  // Novos campos para estruturas EDGE, MOVE e formalização
  estruturaEdge?: string[]  // Array para multi-seleção
  estruturaMove?: string[]  // Array para multi-seleção
  formalizacao?: string
  // Novos campos para itens
  itensPendentes?: number
  itensConcluidos?: number
  itensConcluidosDetalhe?: { contrato?: number; subs?: number }
  // Campos adicionais
  qualidade?: string
  qtdRetornos?: number
  vigencia?: string
  createdAt: string
  updatedAt: string
}


