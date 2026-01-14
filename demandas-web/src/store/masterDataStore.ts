import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Area, Analista, Cliente, Contrato, Operadora, Produto, Sistema, Grupo, TipoDemanda, TipoServico, TipoCadastro, Solicitante, Relatorio, Modelo } from '../types/masterData'

export interface MasterDataState {
  clientes: Cliente[]
  contratos: Contrato[]
  operadoras: Operadora[]
  produtos: Produto[]
  sistemas: Sistema[]
  grupos: Grupo[]
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
  analistasById: Record<string, Analista>
  areasById: Record<string, Area>
  clientesById: Record<string, Cliente>
  contratosById: Record<string, Contrato>
  operadorasById: Record<string, Operadora>
  produtosById: Record<string, Produto>
  sistemasById: Record<string, Sistema>
  tiposServicoById: Record<string, TipoServico>
  tiposDemandaById: Record<string, TipoDemanda>
  solicitantesById: Record<string, Solicitante>
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

function indexById<T extends { id?: string | null | undefined }>(items: T[]): Record<string, T> {
  return items.reduce<Record<string, T>>((acc, item) => {
    if (item?.id) {
      acc[item.id] = item
    }
    return acc
  }, {})
}

function buildIndexes(state: Pick<
  MasterDataState,
  | 'analistas'
  | 'areas'
  | 'clientes'
  | 'contratos'
  | 'operadoras'
  | 'produtos'
  | 'sistemas'
  | 'tiposServico'
  | 'tiposDemanda'
  | 'solicitantes'
>): Pick<
  MasterDataState,
  | 'analistasById'
  | 'areasById'
  | 'clientesById'
  | 'contratosById'
  | 'operadorasById'
  | 'produtosById'
  | 'sistemasById'
  | 'tiposServicoById'
  | 'tiposDemandaById'
  | 'solicitantesById'
> {
  return {
    analistasById: indexById(state.analistas),
    areasById: indexById(state.areas),
    clientesById: indexById(state.clientes),
    contratosById: indexById(state.contratos),
    operadorasById: indexById(state.operadoras),
    produtosById: indexById(state.produtos),
    sistemasById: indexById(state.sistemas),
    tiposServicoById: indexById(state.tiposServico),
    tiposDemandaById: indexById(state.tiposDemanda),
    solicitantesById: indexById(state.solicitantes)
  }
}

export const useMasterDataStore = create<MasterDataState>()(
  persist(
    (set, get) => ({
        clientes: [],
        contratos: [],
        operadoras: [],
        produtos: [],
        sistemas: [],
        grupos: [],
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
        analistasById: {},
        areasById: {},
        clientesById: {},
        contratosById: {},
        operadorasById: {},
        produtosById: {},
        sistemasById: {},
        tiposServicoById: {},
        tiposDemandaById: {},
        solicitantesById: {},
        // Estado de sincronização
        isSyncing: false,
        lastSync: null,
        // Controle de filtro de contratos
        showOnlyActiveContracts: false,
        toggleActiveContractsFilter: () => set((state) => ({ showOnlyActiveContracts: !state.showOnlyActiveContracts })),
        
        // Lista de exclusões locais permanentes
        localExclusions: {},
        addLocalExclusion: (entity: string, id: string) => {
          set((state) => {
            const existing = state.localExclusions[entity] || []
            if (existing.includes(id)) {
              return state
            }
            return {
              localExclusions: {
                ...state.localExclusions,
                [entity]: [...existing, id]
              }
            }
          })
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
            const indexes = buildIndexes(newState)
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
            return {
              ...newState,
              ...indexes
            }
          })
        },
        
        clearAll: () => set({
          clientes: [], contratos: [], operadoras: [], produtos: [], sistemas: [], analistas: [], areas: [], tiposCadastro: [], tiposServico: [], padrao: [],
          areasMailling: [], cargosMailling: [], filiaisMailling: [], categorias: [], periodicidades: [], status: [],
          isSyncing: false, lastSync: null,
          analistasById: {},
          areasById: {},
          clientesById: {},
          contratosById: {},
          operadorasById: {},
          produtosById: {},
          sistemasById: {},
          tiposServicoById: {},
          tiposDemandaById: {},
          solicitantesById: {},
          localExclusions: {}
        }),

        forceCleanSync: async () => {
          
          // Limpar todos os dados locais
          set({
            clientes: [], contratos: [], operadoras: [], produtos: [], sistemas: [], analistas: [], areas: [], tiposCadastro: [], tiposServico: [], padrao: [],
            areasMailling: [], cargosMailling: [], filiaisMailling: [], categorias: [], periodicidades: [], status: [],
            isSyncing: false, lastSync: null,
            analistasById: {},
            areasById: {},
            clientesById: {},
            contratosById: {},
            operadorasById: {},
            produtosById: {},
            sistemasById: {},
            tiposServicoById: {},
            tiposDemandaById: {},
            solicitantesById: {},
            localExclusions: {}
          })
          
          // Limpar localStorage
          localStorage.removeItem('master-data-store')
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
              clientes, contratos, operadoras, produtos, sistemas, grupos, analistas, areas,
              tiposCadastro, tiposServico, tiposDemanda, solicitantes, relatorios, modelos, padrao,
              areasMailling, cargosMailling, filiaisMailling
            ] = await Promise.all([
              fetch('https://nigteste-production.up.railway.app/clientes').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/contratos').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/operadoras').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/produtos').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/sistemas').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/grupos').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/analistas').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/areas').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/tiposCadastro').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/tiposServico').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/tiposDemanda').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/solicitantes').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/relatorios').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/modelos').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/padrao').then(r => r.json()).catch(() => []),
              // Endpoints Mailling ATIVADOS - Dados agora vêm do banco de dados
              fetch('https://nigteste-production.up.railway.app/areas-mailling').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/cargos-mailling').then(r => r.json()).catch(() => []),
              fetch('https://nigteste-production.up.railway.app/filiais-mailling').then(r => r.json()).catch(() => [])
            ])
            
            console.log('✅ MasterDataStore: Dados recebidos da API:', {
              clientes: clientes?.length || 0,
              contratos: contratos?.length || 0,
              operadoras: operadoras?.length || 0,
              produtos: produtos?.length || 0,
              sistemas: sistemas?.length || 0,
              grupos: grupos?.length || 0,
              analistas: analistas?.length || 0,
              areas: areas?.length || 0,
              areasMailling: areasMailling?.length || 0,
              cargosMailling: cargosMailling?.length || 0,
              filiaisMailling: filiaisMailling?.length || 0
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
            
            // Atualizar store com dados do backend
            set((state) => {
              const nextState = {
                ...state,
                clientes: mergeData(clientes, localState.clientes, 'clientes'),
                contratos: mergeData(contratos, localState.contratos, 'contratos'),
                operadoras: mergeData(operadoras, localState.operadoras, 'operadoras'),
                produtos: mergeData(produtos, localState.produtos, 'produtos'),
                sistemas: mergeData(sistemas, localState.sistemas, 'sistemas'),
                grupos: mergeData(grupos, localState.grupos, 'grupos'),
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
              }
              const indexes = buildIndexes(nextState)
              return {
                ...nextState,
                ...indexes
              }
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
      partialize: (state) => {
        // Reduzir dados persistidos: apenas dados essenciais e limitar tamanho
        const maxItems = 1000; // Limitar quantidade de itens por array
        
        return {
          // Limitar arrays grandes para evitar exceder quota
          clientes: state.clientes.slice(0, maxItems),
          contratos: state.contratos.slice(0, maxItems),
          operadoras: state.operadoras.slice(0, maxItems),
          produtos: state.produtos.slice(0, maxItems),
          sistemas: state.sistemas.slice(0, maxItems),
          analistas: state.analistas.slice(0, maxItems),
          areas: state.areas.slice(0, maxItems),
          tiposDemanda: state.tiposDemanda,
          tiposCadastro: state.tiposCadastro,
          tiposServico: state.tiposServico,
          solicitantes: state.solicitantes.slice(0, maxItems),
          relatorios: state.relatorios,
          modelos: state.modelos,
          padrao: state.padrao.slice(0, 100), // Limitar padrões
          areasMailling: state.areasMailling.slice(0, 100),
          cargosMailling: state.cargosMailling.slice(0, 100),
          filiaisMailling: state.filiaisMailling.slice(0, 100),
          categorias: state.categorias,
          periodicidades: state.periodicidades,
          status: state.status,
          lastSync: state.lastSync,
          localExclusions: state.localExclusions
        };
      },
      // Tratamento de erro para quota excedida
      storage: {
        getItem: (name) => {
          try {
            return localStorage.getItem(name);
          } catch (error) {
            console.warn('⚠️ Erro ao ler localStorage:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            // Verificar tamanho antes de salvar
            const size = new Blob([value]).size;
            const maxSize = 4 * 1024 * 1024; // 4MB (deixar margem de segurança)
            
            if (size > maxSize) {
              console.warn('⚠️ Dados muito grandes para localStorage, limpando cache antigo...');
              // Limpar dados antigos e tentar novamente
              try {
                // Remover apenas este store para liberar espaço
                localStorage.removeItem(name);
                // Tentar salvar novamente
                if (new Blob([value]).size <= maxSize) {
                  localStorage.setItem(name, value);
                } else {
                  console.error('❌ Dados ainda muito grandes após limpeza. Não será persistido.');
                  // Salvar apenas dados essenciais
                  const essential = JSON.parse(value);
                  const minimal = {
                    lastSync: essential.lastSync,
                    localExclusions: essential.localExclusions || {}
                  };
                  localStorage.setItem(name, JSON.stringify(minimal));
                }
              } catch (retryError) {
                console.error('❌ Erro ao salvar no localStorage após limpeza:', retryError);
              }
            } else {
              localStorage.setItem(name, value);
            }
          } catch (error) {
            if (error instanceof DOMException && error.name === 'QuotaExceededError') {
              console.error('❌ Quota do localStorage excedida! Limpando cache...');
              try {
                // Limpar este store e tentar salvar apenas dados essenciais
                localStorage.removeItem(name);
                const data = JSON.parse(value);
                const minimal = {
                  lastSync: data.lastSync,
                  localExclusions: data.localExclusions || {}
                };
                localStorage.setItem(name, JSON.stringify(minimal));
                console.warn('⚠️ Apenas dados essenciais foram salvos. Faça uma nova sincronização.');
              } catch (cleanupError) {
                console.error('❌ Não foi possível salvar dados no localStorage:', cleanupError);
              }
            } else {
              console.error('❌ Erro ao salvar no localStorage:', error);
            }
          }
        },
        removeItem: (name) => {
          try {
            localStorage.removeItem(name);
          } catch (error) {
            console.warn('⚠️ Erro ao remover do localStorage:', error);
          }
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          Object.assign(state, buildIndexes(state as MasterDataState))
        }
      }
    }
  )
)


