import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Area, Analista, Cliente, Contrato, Operadora, Produto, Sistema, TipoDemanda, TipoServico, TipoCadastro, Solicitante, Relatorio, Modelo } from '../types/masterData'

export interface MasterDataState {
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
  // Dados de Mailling
  areasMailling: any[]
  cargosMailling: any[]
  filiaisMailling: any[]
  // Propriedades para Analytics
  categorias: any[]
  periodicidades: any[]
  status: any[]
  upsertMany: (payload: Partial<MasterDataState>) => void
  clearAll: () => void
  forceCleanSync: () => Promise<void>
  syncFromApi?: () => Promise<void>
  // Estado de sincronização
  isSyncing: boolean
  lastSync: string | null
}

export const useMasterDataStore = create<MasterDataState>()(
  persist(
    (set, get) => ({
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
        // Dados de Mailling
        areasMailling: [],
        cargosMailling: [],
        filiaisMailling: [],
        // Propriedades para Analytics
        categorias: [],
        periodicidades: [],
        status: [],
        // Estado de sincronização
        isSyncing: false,
        lastSync: null,
        
        upsertMany: (payload) => {
          console.log('🔍 MasterDataStore: Estado atual antes de upsertMany:', {
            clientes: get().clientes.length,
            contratos: get().contratos.length,
            operadoras: get().operadoras.length,
            produtos: get().produtos.length,
            sistemas: get().sistemas.length,
            analistas: get().analistas.length,
            areas: get().areas.length,
            tiposCadastro: get().tiposCadastro.length,
            tiposServico: get().tiposServico.length,
            padrao: get().padrao.length
          })
          
          set((state) => {
            const newState = { 
              ...state, 
              ...payload,
              lastSync: new Date().toISOString()
            }
            console.log('🔍 MasterDataStore: Estado após upsertMany:', {
              clientes: newState.clientes.length,
              contratos: newState.contratos.length,
              operadoras: newState.operadoras.length,
              produtos: newState.produtos.length,
              sistemas: newState.sistemas.length,
              analistas: newState.analistas.length,
              areas: newState.areas.length,
              tiposDemanda: newState.tiposDemanda.length,
              tiposCadastro: newState.tiposCadastro.length,
              tiposServico: newState.tiposServico.length,
              padrao: newState.padrao.length
            })
            return newState
          })
        },
        
        clearAll: () => set({
          clientes: [], contratos: [], operadoras: [], produtos: [], sistemas: [], analistas: [], areas: [], tiposCadastro: [], tiposServico: [], padrao: [],
          areasMailling: [], cargosMailling: [], filiaisMailling: [], categorias: [], periodicidades: [], status: [],
          isSyncing: false, lastSync: null
        }),

        forceCleanSync: async () => {
          
          // Limpar todos os dados locais
          set({
            clientes: [], contratos: [], operadoras: [], produtos: [], sistemas: [], analistas: [], areas: [], tiposCadastro: [], tiposServico: [], padrao: [],
            areasMailling: [], cargosMailling: [], filiaisMailling: [], categorias: [], periodicidades: [], status: [],
            isSyncing: false, lastSync: null
          })
          
          // Limpar localStorage
          localStorage.removeItem('masterDataStore')
          localStorage.removeItem('demands-v1')
          localStorage.removeItem('validations-v1')
          localStorage.removeItem('comunicados-v1')
          localStorage.removeItem('manutencoes-v1')
          localStorage.removeItem('projects-v1')
          
          console.log('✅ MasterDataStore: Dados locais limpos, iniciando sincronização...')
          
          // Forçar sincronização
          if (get().syncFromApi) {
            await get().syncFromApi!()
          }
        },
        
        async syncFromApi() {
          const state = get()
          if (state.isSyncing) {
            return
          }
          
          try {
            // console.log('🔍 MasterDataStore: Iniciando syncFromApi...')
            set({ isSyncing: true })
            
            // Verificar se há dados locais importantes antes de sincronizar
            const currentState = get()
            const hasImportantLocalData = currentState.clientes.length > 0 || 
                                         currentState.contratos.length > 0 ||
                                         currentState.analistas.length > 0 ||
                                         currentState.tiposCadastro.length > 0
            
            // Só limpar se não há dados recentes (última sincronização há mais de 5 minutos)
            const lastSync = currentState.lastSync
            const shouldForceSync = !lastSync || 
                                  (new Date().getTime() - new Date(lastSync).getTime()) > 5 * 60 * 1000
            
            if (hasImportantLocalData && shouldForceSync) {
              
              // Limpar dados locais inconsistentes
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
                padrao: []
              })
              
              // Forçar limpeza do localStorage
              localStorage.removeItem('masterDataStore')
            } else if (hasImportantLocalData) {
              // Dados locais recentes encontrados, mantendo
            }
            
            // Importar API dinamicamente
            const { api } = await import('../lib/api.local')
            
            
            // Sincronizar todas as entidades em paralelo
            const [
              clientes,
              contratos,
              operadoras,
              produtos,
              sistemas,
              analistas,
              areas,
              tiposCadastro,
              tiposServico,
              tiposDemanda,
              solicitantes,
              relatorios,
              modelos,
              padrao,
              areasMailling,
              cargosMailling,
              filiaisMailling
            ] = await Promise.all([
              api.getClientes().catch(() => []),
              api.getContratos().catch(() => []),
              api.getOperadoras().catch(() => []),
              api.getProdutos().catch(() => []),
              api.getSistemas().catch(() => []),
              api.getAnalistas().catch(() => []),
              api.getAreas().catch(() => []),
              api.get('/tiposCadastro').catch(() => []),
              api.getTiposServico().catch(() => []),
              api.getTiposDemanda().catch(() => []),
              api.get('/solicitantes').catch(() => []),
              api.get('/relatorios').catch(() => []),
              api.get('/modelos').catch(() => []),
              api.getPadrao().catch(() => []),
              api.get('/areas-mailling').catch(() => []),
              api.get('/cargos-mailling').catch(() => []),
              api.get('/filiais-mailling').catch(() => [])
            ])
            
            // Fazer merge inteligente dos dados
            const localState = get()
            const mergeData = (apiData: any[], localData: any[], entityName: string) => {
              // Se API retornou dados, usar API
              if (apiData && apiData.length > 0) {
                // console.log(`✅ MasterDataStore: Usando dados da API para ${entityName}: ${apiData.length} registros`)
                return apiData
              }
              // Se não há dados da API mas há dados locais, manter locais
              if (localData && localData.length > 0) {
                console.log(`⚠️ MasterDataStore: API vazia para ${entityName}, mantendo dados locais: ${localData.length} registros`)
                return localData
              }
              // Se não há dados nem da API nem locais, retornar array vazio
              console.log(`❌ MasterDataStore: Nenhum dado disponível para ${entityName}`)
              return []
            }
            
            // Atualizar store com dados do backend
            set({
              clientes: mergeData(clientes, localState.clientes, 'clientes'),
              contratos: mergeData(contratos, localState.contratos, 'contratos'),
              operadoras: mergeData(operadoras, localState.operadoras, 'operadoras'),
              produtos: mergeData(produtos, localState.produtos, 'produtos'),
              sistemas: mergeData(sistemas, localState.sistemas, 'sistemas'),
              analistas: mergeData(analistas, localState.analistas, 'analistas'),
              areas: mergeData(areas, localState.areas, 'areas'),
              tiposCadastro: mergeData(tiposCadastro, localState.tiposCadastro, 'tiposCadastro'),
              tiposServico: mergeData(tiposServico, localState.tiposServico, 'tiposServico'),
              tiposDemanda: mergeData(tiposDemanda, localState.tiposDemanda, 'tiposDemanda'),
              solicitantes: mergeData(solicitantes, localState.solicitantes, 'solicitantes'),
              relatorios: mergeData(relatorios, localState.relatorios, 'relatorios'),
              modelos: mergeData(modelos, localState.modelos, 'modelos'),
              padrao: mergeData(padrao, localState.padrao, 'padrao'),
              areasMailling: mergeData(areasMailling, localState.areasMailling, 'areasMailling'),
              cargosMailling: mergeData(cargosMailling, localState.cargosMailling, 'cargosMailling'),
              filiaisMailling: mergeData(filiaisMailling, localState.filiaisMailling, 'filiaisMailling'),
              isSyncing: false,
              lastSync: new Date().toISOString()
            })
            
            // Sincronização concluída
            
            
          } catch (error) {
            console.error('❌ MasterDataStore: Erro na sincronização:', error)
            set({ isSyncing: false })
          }
        }
    }),
    {
      name: 'master-data-store', // Nome da chave no localStorage
      partialize: (state) => ({
        // Persistir apenas os dados, não as funções
        clientes: state.clientes,
        contratos: state.contratos,
        operadoras: state.operadoras,
        produtos: state.produtos,
        sistemas: state.sistemas,
        analistas: state.analistas,
        areas: state.areas,
        tiposDemanda: state.tiposDemanda,
        tiposCadastro: state.tiposCadastro,
        tiposServico: state.tiposServico,
        solicitantes: state.solicitantes,
        relatorios: state.relatorios,
        modelos: state.modelos,
        padrao: state.padrao,
        areasMailling: state.areasMailling,
        cargosMailling: state.cargosMailling,
        filiaisMailling: state.filiaisMailling,
        categorias: state.categorias,
        periodicidades: state.periodicidades,
        status: state.status,
        lastSync: state.lastSync
      }),
      onRehydrateStorage: () => (state) => {
        // Dados restaurados do localStorage
      }
    }
  )
)


