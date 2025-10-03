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
  clearAreasLocalData: () => void
  syncFromApi?: () => Promise<void>
  // Estado de sincronização
  isSyncing: boolean
  lastSync: string | null
  // Controle de filtro de contratos
  showOnlyActiveContracts: boolean
  toggleActiveContractsFilter: () => void
  // Lista de exclusões locais permanentes
  localExclusions: Record<string, string[]>
  addLocalExclusion: (entity: string, id: string) => void
  removeLocalExclusion: (entity: string, id: string) => void
  isLocallyExcluded: (entity: string, id: string) => boolean
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
        // Controle de filtro de contratos
        showOnlyActiveContracts: false,
        toggleActiveContractsFilter: () => set((state) => ({ showOnlyActiveContracts: !state.showOnlyActiveContracts })),
        
        // Lista de exclusões locais permanentes
        localExclusions: {},
        addLocalExclusion: (entity: string, id: string) => {
          set((state) => ({
            localExclusions: {
              ...state.localExclusions,
              [entity]: [...(state.localExclusions[entity] || []), id]
            }
          }))
        },
        removeLocalExclusion: (entity: string, id: string) => {
          set((state) => ({
            localExclusions: {
              ...state.localExclusions,
              [entity]: (state.localExclusions[entity] || []).filter(excludedId => excludedId !== id)
            }
          }))
        },
        isLocallyExcluded: (entity: string, id: string) => {
          const state = get()
          return (state.localExclusions[entity] || []).includes(id)
        },
        
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
        
        // Função específica para limpar dados locais das áreas
        clearAreasLocalData: () => {
          console.log('🧹 MasterDataStore: Limpando dados locais das áreas...')
          set((state) => ({
            areas: [] // Limpar apenas dados locais das áreas
          }))
        },
        
        async syncFromApi(force = false) {
          console.log('🔄 MasterDataStore: Iniciando sincronização com API...')
          
          const state = get()
          if (state.isSyncing) {
            console.log('🔍 MasterDataStore: Sincronização já em andamento, ignorando...')
            return
          }
          
          set({ isSyncing: true })
          
          try {
            console.log('🔍 MasterDataStore: Fazendo requisições para API...')
            
            // Fazer requisições paralelas para todos os endpoints
            const [
              clientes, contratos, operadoras, produtos, sistemas, analistas, areas,
              tiposCadastro, tiposServico, tiposDemanda, solicitantes, relatorios, modelos, padrao,
              areasMailling, cargosMailling, filiaisMailling
            ] = await Promise.all([
              fetch('https://nigteste-production.up.railway.app/clientes').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/contratos').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/operadoras').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/produtos').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/sistemas').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/analistas').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/areas').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/tiposCadastro').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/tiposServico').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/tiposDemanda').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/solicitantes').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/relatorios').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/modelos').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/padrao').then(r => r.json()).catch(() => []),
              // Endpoints de Mailling não implementados no backend - retornar arrays vazios
              Promise.resolve([]), // areasMailling
              Promise.resolve([]), // cargosMailling  
              Promise.resolve([])  // filiaisMailling
            ])
            
            console.log('✅ MasterDataStore: Dados recebidos da API:', {
              clientes: clientes?.length || 0,
              contratos: contratos?.length || 0,
              operadoras: operadoras?.length || 0,
              produtos: produtos?.length || 0,
              sistemas: sistemas?.length || 0,
              analistas: analistas?.length || 0,
              areas: areas?.length || 0
            })
            
            // Fazer merge inteligente dos dados
            const localState = get()
            const mergeData = (apiData: any[], localData: any[], entityName: string) => {
              // Filtrar dados excluídos localmente
              const excludedIds = get().localExclusions[entityName] || []
              
              // Se API retornou dados, usar API (filtrando exclusões locais)
              if (apiData && apiData.length > 0) {
                const filteredApiData = apiData.filter(item => !excludedIds.includes(item.id))
                console.log(`✅ MasterDataStore: Usando dados da API para ${entityName}: ${filteredApiData.length} registros (${excludedIds.length} excluídos localmente)`)
                return filteredApiData
              }
              // Se não há dados da API mas há dados locais, manter locais (filtrando exclusões locais)
              if (localData && localData.length > 0) {
                const filteredLocalData = localData.filter(item => !excludedIds.includes(item.id))
                console.log(`⚠️ MasterDataStore: API vazia para ${entityName}, mantendo dados locais: ${filteredLocalData.length} registros (${excludedIds.length} excluídos localmente)`)
                return filteredLocalData
              }
              // Se não há dados nem da API nem locais, retornar array vazio
              console.log(`❌ MasterDataStore: Nenhum dado disponível para ${entityName}`)
              return []
            }
            
            // Função para usar apenas dados da API (sem merge com dados locais)
            const useOnlyApiData = (apiData: any[], entityName: string) => {
              if (apiData && apiData.length > 0) {
                // Filtrar dados excluídos localmente
                const excludedIds = get().localExclusions[entityName] || []
                const filteredData = apiData.filter(item => !excludedIds.includes(item.id))
                
                console.log(`✅ MasterDataStore: Usando APENAS dados da API para ${entityName}: ${filteredData.length} registros (${excludedIds.length} excluídos localmente)`)
                return filteredData
              }
              console.log(`❌ MasterDataStore: API vazia para ${entityName}, retornando array vazio`)
              return []
            }
            
            // Merge especial para contratos - preservar contratos inativos locais
            const mergeContratos = (apiContratos: any[], localContratos: any[]) => {
              console.log(`🔍 MasterDataStore: Merge contratos - API: ${apiContratos?.length || 0}, Locais: ${localContratos?.length || 0}`)
              
              if (apiContratos && apiContratos.length > 0) {
                // Se há dados da API, usar como base
                const apiIds = new Set(apiContratos.map(c => c.id))
                
                // Adicionar contratos locais que não existem na API (ex: contratos inativos recém-criados)
                const contratosLocaisNaoNaApi = localContratos.filter(local => !apiIds.has(local.id))
                
                // Log detalhado dos contratos locais únicos
                if (contratosLocaisNaoNaApi.length > 0) {
                  console.log(`🔍 MasterDataStore: Contratos locais únicos encontrados:`, contratosLocaisNaoNaApi.map(c => ({ id: c.id, status: c.status, codigo: c.codigo })))
                }
                
                const resultado = [...apiContratos, ...contratosLocaisNaoNaApi]
                console.log(`🔍 MasterDataStore: Merge contratos - API: ${apiContratos.length}, Locais únicos: ${contratosLocaisNaoNaApi.length}, Total: ${resultado.length}`)
                
                return resultado
              }
              
              // Se não há dados da API, manter locais
              console.log(`🔍 MasterDataStore: Nenhum dado da API, mantendo contratos locais: ${localContratos?.length || 0}`)
              return localContratos
            }
            
            // Atualizar store com dados do backend
            set({
              clientes: mergeData(clientes, localState.clientes, 'clientes'),
              contratos: mergeContratos(contratos, localState.contratos),
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
            console.log('✅ MasterDataStore: Sincronização concluída com sucesso!')
            
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


