import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Area, Analista, Cliente, Contrato, Operadora, Produto, Sistema, Grupo, TipoDemanda, TipoServico, TipoCadastro, Solicitante, Relatorio, Modelo } from '../types/masterData'

const isDev = import.meta.env.DEV
const logDev = (...args: unknown[]) => {
  if (isDev) console.log(...args)
}

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
  syncFromApi?: (options?: boolean | { force?: boolean; entities?: Array<keyof MasterDataState> }) => Promise<void>
  // Estado de sincronização
  isSyncing: boolean
  lastSync: string | null
  lastSyncMs: number
  lastSyncByEntity: Record<string, number>
  // Controle de filtro de contratos
  showOnlyActiveContracts: boolean
  toggleActiveContractsFilter: () => void
  // Lista de exclusões locais permanentes (por ID)
  localExclusions: Record<string, string[]>
  addLocalExclusion: (entity: string, id: string) => void
  removeLocalExclusion: (entity: string, id: string) => void
  isLocallyExcluded: (entity: string, id: string) => boolean
  // Exclusões por nome (evita que registros com mesmo nome voltem após sync/recriação)
  localExclusionsByNome: Record<string, string[]>
  addLocalExclusionByNome: (entity: string, nome: string) => void
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
        lastSyncMs: 0,
        lastSyncByEntity: {},
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
        localExclusionsByNome: {},
        addLocalExclusionByNome: (entity: string, nome: string) => {
          const normalized = (nome || '').trim()
          if (!normalized) return
          set((state) => {
            const existing = state.localExclusionsByNome[entity] || []
            if (existing.some((n) => n.toLowerCase() === normalized.toLowerCase())) return state
            return {
              localExclusionsByNome: {
                ...state.localExclusionsByNome,
                [entity]: [...existing, normalized]
              }
            }
          })
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
          
          const now = Date.now()
          set((state) => {
            const newState = { 
              ...state, 
              ...payload,
              lastSync: new Date().toISOString(),
              lastSyncMs: now
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
          isSyncing: false, lastSync: null, lastSyncMs: 0, lastSyncByEntity: {},
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
          localExclusions: {},
          localExclusionsByNome: {}
        }),

        forceCleanSync: async () => {
          
          // Limpar todos os dados locais
          set({
            clientes: [], contratos: [], operadoras: [], produtos: [], sistemas: [], analistas: [], areas: [], tiposCadastro: [], tiposServico: [], padrao: [],
            areasMailling: [], cargosMailling: [], filiaisMailling: [], categorias: [], periodicidades: [], status: [],
            isSyncing: false, lastSync: null, lastSyncMs: 0, lastSyncByEntity: {},
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
          localExclusions: {},
          localExclusionsByNome: {}
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
        
        async syncFromApi(options: boolean | { force?: boolean; entities?: Array<keyof MasterDataState> } = false) {
          logDev('🔄 MasterDataStore: Iniciando sincronização com API...')
          
          const force = typeof options === 'boolean' ? options : !!options?.force
          const requestedEntities = typeof options === 'object' ? options?.entities : undefined
          const state = get()
          if (state.isSyncing) {
            logDev('🔍 MasterDataStore: Sincronização já em andamento, ignorando...')
            return
          }
          const now = Date.now()
          if (!force && !requestedEntities && now - state.lastSyncMs < 2 * 60 * 1000) {
            return
          }
          
          set({ isSyncing: true })
          
          try {
            logDev('🔍 MasterDataStore: Fazendo requisições para API...')
            const fetchJson = (url: string) => fetch(url).then(r => r.json()).catch(() => [])

            const fetchMap: Record<string, () => Promise<any[]>> = {
              clientes: () => fetchJson('https://nigteste-production.up.railway.app/clientes'),
              contratos: () => fetchJson('https://nigteste-production.up.railway.app/contratos'),
              operadoras: () => fetchJson('https://nigteste-production.up.railway.app/operadoras'),
              produtos: () => fetchJson('https://nigteste-production.up.railway.app/produtos'),
              sistemas: () => fetchJson('https://nigteste-production.up.railway.app/sistemas'),
              grupos: () => fetchJson('https://nigteste-production.up.railway.app/grupos'),
              analistas: () => fetchJson('https://nigteste-production.up.railway.app/analistas'),
              areas: () => fetchJson('https://nigteste-production.up.railway.app/areas'),
              tiposCadastro: () => fetchJson('https://nigteste-production.up.railway.app/tiposCadastro'),
              tiposServico: () => fetchJson('https://nigteste-production.up.railway.app/tiposServico'),
              tiposDemanda: () => fetchJson('https://nigteste-production.up.railway.app/tiposDemanda'),
              solicitantes: () => fetchJson('https://nigteste-production.up.railway.app/solicitantes'),
              relatorios: () => fetchJson('https://nigteste-production.up.railway.app/relatorios'),
              modelos: () => fetchJson('https://nigteste-production.up.railway.app/modelos'),
              padrao: () => fetchJson('https://nigteste-production.up.railway.app/padrao'),
              areasMailling: () => fetchJson('https://nigteste-production.up.railway.app/areas-mailling'),
              cargosMailling: () => fetchJson('https://nigteste-production.up.railway.app/cargos-mailling'),
              filiaisMailling: () => fetchJson('https://nigteste-production.up.railway.app/filiais-mailling')
            }

            const allEntities = Object.keys(fetchMap)
            const entities = (requestedEntities && requestedEntities.length > 0)
              ? requestedEntities.map(String).filter((e) => allEntities.includes(e))
              : allEntities

            const ttlMs = 2 * 60 * 1000
            const toFetch = (requestedEntities && requestedEntities.length > 0 && !force)
              ? entities.filter((entity) => now - (state.lastSyncByEntity?.[entity] || 0) >= ttlMs)
              : entities

            if (toFetch.length === 0) {
              set({ isSyncing: false })
              return
            }

            const results = await Promise.all(
              toFetch.map(async (entity) => [entity, await fetchMap[entity]()] as const)
            )
            const dataMap = Object.fromEntries(results)
            
            // Fazer merge inteligente dos dados
            const mergeData = (apiData: any[], localData: any[], entityName: string) => {
              const excludedIds = get().localExclusions[entityName] || []
              const excludedNomes = get().localExclusionsByNome[entityName] || []
              const byId = (item: any) => !excludedIds.includes(item.id)
              const byNome = (item: any) => {
                if (excludedNomes.length === 0) return true
                const n = (item.nome || '').trim().toLowerCase()
                return !excludedNomes.some((ex) => ex.toLowerCase() === n)
              }
              const filterItem = (item: any) => byId(item) && byNome(item)
              
              if (apiData && apiData.length > 0) {
                const filteredApiData = apiData.filter(filterItem)
                logDev(`✅ MasterDataStore: Usando dados da API para ${entityName}: ${filteredApiData.length} registros (${excludedIds.length} ids, ${excludedNomes.length} nomes excluídos)`)
                return filteredApiData
              }
              if (localData && localData.length > 0) {
                const filteredLocalData = localData.filter(filterItem)
                logDev(`⚠️ MasterDataStore: API vazia para ${entityName}, mantendo dados locais: ${filteredLocalData.length} registros`)
                return filteredLocalData
              }
              logDev(`❌ MasterDataStore: Nenhum dado disponível para ${entityName}`)
              return []
            }

            logDev('✅ MasterDataStore: Dados recebidos da API:', Object.fromEntries(
              toFetch.map((entity) => [entity, dataMap[entity]?.length || 0])
            ))

            set((state) => {
              const nextState: MasterDataState = { ...state }
              toFetch.forEach((entity) => {
                const localData = (state as any)[entity] || []
                const apiData = dataMap[entity] || []
                ;(nextState as any)[entity] = mergeData(apiData, localData, entity)
              })
              nextState.isSyncing = false
              if (!requestedEntities || requestedEntities.length === 0) {
                nextState.lastSync = new Date().toISOString()
                nextState.lastSyncMs = now
              }
              nextState.lastSyncByEntity = {
                ...state.lastSyncByEntity,
                ...Object.fromEntries(toFetch.map((entity) => [entity, now]))
              }
              const indexes = buildIndexes(nextState)
              return { ...nextState, ...indexes }
            })
            
            // Sincronização concluída
            logDev('✅ MasterDataStore: Sincronização concluída com sucesso!')
            
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
          lastSyncMs: state.lastSyncMs,
          lastSyncByEntity: state.lastSyncByEntity,
          localExclusions: state.localExclusions,
          localExclusionsByNome: state.localExclusionsByNome
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
                    lastSyncMs: essential.lastSyncMs || 0,
                    lastSyncByEntity: essential.lastSyncByEntity || {},
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
                  lastSyncMs: data.lastSyncMs || 0,
                  lastSyncByEntity: data.lastSyncByEntity || {},
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


