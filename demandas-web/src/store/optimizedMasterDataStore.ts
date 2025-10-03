import { create } from 'zustand'
import type { Area, Analista, Cliente, Contrato, Operadora, Produto, Sistema, TipoDemanda, TipoServico, TipoCadastro, Solicitante, Relatorio, Modelo } from '../types/masterData'

export interface OptimizedMasterDataState {
  // Dados principais (sem persistência - sempre do servidor)
  clientes: Cliente[]
  contratos: Contrato[]
  operadoras: Operadora[]
  produtos: Produto[]
  sistemas: Sistema[]
  analistas: Analista[]
  areas: Area[]
  tiposCadastro: TipoCadastro[]
  tiposServico: TipoServico[]
  tiposDemanda: TipoDemanda[]
  solicitantes: Solicitante[]
  relatorios: Relatorio[]
  modelos: Modelo[]
  padrao: any[]

  // Estado de carregamento
  isLoading: boolean
  lastSync: string | null
  error: string | null

  // Ações
  setData: <K extends keyof Omit<OptimizedMasterDataState, 'isLoading' | 'lastSync' | 'error' | 'setData' | 'clearData' | 'getEntityById'>>(
    entity: K,
    data: OptimizedMasterDataState[K]
  ) => void
  clearData: () => void
  getEntityById: <T>(entity: keyof OptimizedMasterDataState, id: string) => T | null
}

export const useOptimizedMasterDataStore = create<OptimizedMasterDataState>((set, get) => ({
  // Dados principais
  clientes: [],
  contratos: [],
  operadoras: [],
  produtos: [],
  sistemas: [],
  analistas: [],
  areas: [],
  tiposCadastro: [],
  tiposServico: [],
  tiposDemanda: [],
  solicitantes: [],
  relatorios: [],
  modelos: [],
  padrao: [],

  // Estado
  isLoading: false,
  lastSync: null,
  error: null,

  // Ações
  setData: (entity, data) => {
    console.log(`🎯 OptimizedMasterDataStore: Atualizando ${entity} com ${Array.isArray(data) ? data.length : '1'} item(s)`)
    set((state) => ({
      ...state,
      [entity]: data,
      lastSync: new Date().toISOString(),
      error: null
    }))
  },

  clearData: () => {
    console.log('🧹 OptimizedMasterDataStore: Limpando todos os dados')
    set({
      clientes: [],
      contratos: [],
      operadoras: [],
      produtos: [],
      sistemas: [],
      analistas: [],
      areas: [],
      tiposCadastro: [],
      tiposServico: [],
      tiposDemanda: [],
      solicitantes: [],
      relatorios: [],
      modelos: [],
      padrao: [],
      isLoading: false,
      lastSync: null,
      error: null
    })
  },

  getEntityById: (entity, id) => {
    const data = get()[entity as keyof OptimizedMasterDataState] as any[]
    if (!Array.isArray(data)) return null
    return data.find(item => item.id === id) || null
  }
}))

// Hook para usar dados mestres otimizados
export function useOptimizedMasterData() {
  const store = useOptimizedMasterDataStore()
  
  return {
    ...store,
    // Helpers para facilitar o uso
    getClienteById: (id: string) => store.getEntityById<Cliente>('clientes', id),
    getContratoById: (id: string) => store.getEntityById<Contrato>('contratos', id),
    getAnalistaById: (id: string) => store.getEntityById<Analista>('analistas', id),
    getAreaById: (id: string) => store.getEntityById<Area>('areas', id),
    getOperadoraById: (id: string) => store.getEntityById<Operadora>('operadoras', id),
    getProdutoById: (id: string) => store.getEntityById<Produto>('produtos', id),
    getSistemaById: (id: string) => store.getEntityById<Sistema>('sistemas', id),
    getTipoServicoById: (id: string) => store.getEntityById<TipoServico>('tiposServico', id),
    getTipoDemandaById: (id: string) => store.getEntityById<TipoDemanda>('tiposDemanda', id),
  }
}
