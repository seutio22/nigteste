import type { Area, Analista, Cliente, Contrato, Operadora, Produto, Sistema, Grupo, TipoDemanda, TipoServico, Solicitante, Relatorio, Modelo } from './masterData'

export type TabKey = 'clientes' | 'contratos' | 'operadoras' | 'produtos' | 'sistemas' | 'grupos' | 'analistas' | 'areas' | 'areasMailling' | 'cargosMailling' | 'filiaisMailling' | 'tipos' | 'tipos-cadastro' | 'servicos' | 'solicitantes' | 'relatorios' | 'modelos' | 'padrao' | 'categorias' | 'periodicidades' | 'status' | 'configuracoes'

export interface FormData {
  id?: string
  nome?: string
  email?: string
  grupoEconomico?: string
  codigo?: string
  tipoServicoId?: string
  chave?: string
  valor?: string
  tipo?: 'configuracao' | 'parametro' | 'configuracaoSistema'
  categoria?: 'sistema' | 'negocio' | 'interface' | 'seguranca'
  ativo?: boolean
  descricao?: string
  clienteId?: string
  status?: string
}

export interface SnackMessage {
  open: boolean
  message: string
  severity: 'success' | 'error' | 'info' | 'warning'
}

export interface EntityConfig {
  endpoint: string
  fields: string[]
  requiredFields: string[]
  displayName: string
}

export type EntityConfigs = Record<TabKey, EntityConfig>

export interface ImportResult {
  success: boolean
  message: string
  importedCount: number
  errors?: string[]
}

export interface DataMap {
  clientes: Cliente[]
  contratos: Contrato[]
  operadoras: Operadora[]
  produtos: Produto[]
  sistemas: Sistema[]
  grupos: Grupo[]
  analistas: Analista[]
  areas: Area[]
  areasMailling: Area[]
  cargosMailling: any[]
  filiaisMailling: any[]
  tipos: TipoDemanda[]
  'tipos-cadastro': TipoDemanda[]
  servicos: TipoServico[]
  solicitantes: Solicitante[]
  relatorios: Relatorio[]
  modelos: Modelo[]
  padrao: any[]
  // Propriedades para Analytics (que estavam faltando)
  categorias: any[]
  periodicidades: any[]
  status: any[]
  configuracoes: any[]
}
