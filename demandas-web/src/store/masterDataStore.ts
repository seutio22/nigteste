import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Area, Analista, Cliente, Contrato, Operadora, Produto, Sistema, Grupo, TipoDemanda, TipoServico, TipoCadastro, Solicitante, Relatorio, Modelo } from '../types/masterData'
import { createSafePersistStorage, removeLocalStorageByPrefix } from '../lib/safePersistStorage'

const isDev = import.meta.env.DEV
const logDev = (...args: unknown[]) => {
  if (isDev) console.log(...args)
}

export function clearMasterDataLocalCache(): void {
  removeLocalStorageByPrefix('master-data-store')
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
  /** Limpa exclusões por id/nome de uma entidade (ex.: tipos sumiram após sync) */
  clearExclusionsForEntity: (entity: string) => void
}

type MasterDataPersisted = Pick<
  MasterDataState,
  | 'lastSync'
  | 'lastSyncMs'
  | 'lastSyncByEntity'
  | 'localExclusions'
  | 'localExclusionsByNome'
  | 'showOnlyActiveContracts'
>

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

        clearExclusionsForEntity: (entity: string) => {
          set((state) => ({
            localExclusions: { ...state.localExclusions, [entity]: [] },
            localExclusionsByNome: { ...state.localExclusionsByNome, [entity]: [] }
          }))
        },
        
        upsertMany: (payload) => {
          logDev('🔍 MasterDataStore: Estado atual antes de upsertMany:', {
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
            logDev('🔍 MasterDataStore: Estado após upsertMany:', {
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
          
          logDev('✅ MasterDataStore: Dados locais limpos, iniciando sincronização...')
          
          // Forçar sincronização
          if (get().syncFromApi) {
            await get().syncFromApi!()
          }
        },
        
        // Função específica para limpar dados locais das áreas
        clearAreasLocalData: () => {
          logDev('🧹 MasterDataStore: Limpando dados locais das áreas...')
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
          const ttlMs = 2 * 60 * 1000
          const isEmptyInMemory = (entity: string) => {
            const data = (state as any)[entity]
            return !Array.isArray(data) || data.length === 0
          }
          const missingCritical = ['analistas', 'areas'].some(isEmptyInMemory)

          if (!force && !requestedEntities && now - state.lastSyncMs < ttlMs && !missingCritical) {
            return
          }
          
          set({ isSyncing: true })
          
          try {
            logDev('🔍 MasterDataStore: Fazendo requisições para API (mesma base + auth que DELETE/CRUD)...')
            const { getApi } = await import('../lib/apiConfig')
            const apiClient = getApi()

            const fetchList = async (path: string): Promise<any[]> => {
              try {
                const data = await apiClient.get<unknown>(path)
                if (Array.isArray(data)) return data
                if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
                  return (data as { data: any[] }).data
                }
                return []
              } catch (e) {
                logDev(`⚠️ MasterDataStore: GET ${path} falhou:`, e)
                return []
              }
            }

            const fetchMap: Record<string, () => Promise<any[]>> = {
              clientes: () => fetchList('/clientes'),
              contratos: () => fetchList('/contratos'),
              operadoras: () => fetchList('/operadoras'),
              produtos: () => fetchList('/produtos'),
              sistemas: () => fetchList('/sistemas'),
              grupos: () => fetchList('/grupos'),
              analistas: () => fetchList('/analistas'),
              areas: () => fetchList('/areas'),
              tiposCadastro: () => fetchList('/tiposCadastro'),
              tiposServico: () => fetchList('/tiposServico'),
              tiposDemanda: () => fetchList('/tiposDemanda'),
              solicitantes: () => fetchList('/solicitantes'),
              relatorios: () => fetchList('/relatorios'),
              modelos: () => fetchList('/modelos'),
              padrao: () => fetchList('/padrao'),
              areasMailling: () => fetchList('/areas-mailling'),
              cargosMailling: () => fetchList('/cargos-mailling'),
              filiaisMailling: () => fetchList('/filiais-mailling')
            }

            const allEntities = Object.keys(fetchMap)
            const entities = (requestedEntities && requestedEntities.length > 0)
              ? requestedEntities.map(String).filter((e) => allEntities.includes(e))
              : allEntities

            const toFetchBase = (requestedEntities && requestedEntities.length > 0 && !force)
              ? entities.filter((entity) => now - (state.lastSyncByEntity?.[entity] || 0) >= ttlMs)
              : entities

            // Listas não são mais persistidas no localStorage — recarrega entidades vazias na memória.
            const toFetch = [...new Set([
              ...toFetchBase,
              ...entities.filter(isEmptyInMemory),
            ])]

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
              const byId = (item: any) => !excludedIds.includes(item?.id)
              const byNome = (item: any) => {
                if (excludedNomes.length === 0) return true
                const n = (item.nome || '').trim().toLowerCase()
                if (!n) return true
                return !excludedNomes.some((ex) => ex.toLowerCase() === n)
              }
              const filterItem = (item: any) => byId(item) && byNome(item)
              
              if (apiData && apiData.length > 0) {
                let filteredApiData = apiData.filter(filterItem)
                // Se exclusões por nome/id zerarem a lista mas a API enviou dados, usar só filtro por id
                // (evita tabela vazia quando nomes excluídos coincidem com todos os registros atuais)
                if (filteredApiData.length === 0) {
                  const byIdOnly = apiData.filter((item: any) => !excludedIds.includes(item?.id))
                  if (byIdOnly.length > 0) {
                    logDev(
                      `⚠️ MasterDataStore: ${entityName} — merge por id+nome removeu tudo; mantendo ${byIdOnly.length} registro(s) só com filtro por id`
                    )
                    filteredApiData = byIdOnly
                  }
                }
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
      name: 'master-data-store',
      version: 2,
      partialize: (state): MasterDataPersisted => ({
        lastSync: state.lastSync,
        lastSyncMs: state.lastSyncMs,
        lastSyncByEntity: state.lastSyncByEntity,
        localExclusions: state.localExclusions,
        localExclusionsByNome: state.localExclusionsByNome,
        showOnlyActiveContracts: state.showOnlyActiveContracts,
      }),
      storage: createSafePersistStorage<MasterDataPersisted>('master-data-store', {
        onQuotaExceeded: clearMasterDataLocalCache,
      }),
      migrate: (persisted, version) => {
        if (version < 2 && persisted && typeof persisted === 'object') {
          const p = persisted as Record<string, unknown>
          return {
            lastSync: (p.lastSync as string | null) ?? null,
            lastSyncMs: Number(p.lastSyncMs) || 0,
            lastSyncByEntity: (p.lastSyncByEntity as MasterDataState['lastSyncByEntity']) ?? {},
            localExclusions: (p.localExclusions as MasterDataState['localExclusions']) ?? {},
            localExclusionsByNome: (p.localExclusionsByNome as MasterDataState['localExclusionsByNome']) ?? {},
            showOnlyActiveContracts: Boolean(p.showOnlyActiveContracts),
          }
        }
        return persisted as MasterDataPersisted
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          Object.assign(state, buildIndexes(state as MasterDataState))
        }
      },
    }
  )
)


