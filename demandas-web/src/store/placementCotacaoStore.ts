import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api.local'
import {
  COTACAO_FILA_STATUSES,
  PLACEMENT_STATUS_RASCUNHO,
  type CotacaoStatus,
} from '../pages/Placement/Fila/placementCotacaoStatus'

export { COTACAO_FILA_STATUSES as COTACAO_STATUSES, PLACEMENT_STATUS_RASCUNHO }
export type { CotacaoStatus }

export interface PlacementCotacao {
  id: string
  ticket: string
  status: CotacaoStatus | string
  analistaId?: string | null
  userId?: string | null
  clienteId?: string | null
  prospectId?: string | null
  condicaoId?: string | null
  filialId?: string | null
  corretorParceiroId?: string | null
  projetoId?: string | null
  pedidoId?: string | null
  solicitante?: string | null
  temperaturaId?: string | null
  ramo?: string | null
  operadorasIds?: string[] | null
  operadorasSugestaoIds?: string[] | null
  itensMapeamento?: unknown[] | null
  planosCobertura?: unknown[] | null
  vidas?: number | null
  valorEstimadoCents?: number | null
  dataInicio?: string | null
  dataLimite?: string | null
  vigenciaApolice?: string | null
  tipoContratacaoId?: string | null
  modalidadeContratoId?: string | null
  prazoVigenciaContratoId?: string | null
  breakEven?: string | null
  formularioTipo?: string | null
  multaRescisaoContratual?: boolean | null
  multaRescisaoValor?: string | null
  multaRescisaoRegra?: string | null
  multaRescisaoAvisoPrevio?: string | null
  possuiConvencaoColetiva?: boolean | null
  descricao?: string | null
  observacoes?: string | null
  emCotacaoSubetapa?: string | null
  kickOffEstrategia?: unknown
  _count?: { beneficiarios?: number }
  createdAt?: string
  updatedAt?: string
  analista?: { id: string; nome: string } | null
  analistaResponsavelId?: string | null
  analistaResponsavel?: {
    id: string
    nome: string
    coordenadorAnalista: string
    gerenteAnalista: string
  } | null
  cliente?: { id: string; nome: string; cnpj?: string | null; grupoEconomico?: string | null } | null
  prospect?: {
    id: string
    razaoSocial: string
    cnpj?: string | null
    grupoEconomico?: string | null
    cnae?: string | null
  } | null
  condicao?: {
    id: string
    grupoEconomico?: string | null
    razaoSocial: string
    cnae: string
    cnpj?: string | null
  } | null
  filial?: {
    id: string
    razaoSocial: string
    cnpj: string
    status?: string
  } | null
  corretorParceiro?: {
    id: string
    nome: string
  } | null
  projeto?: { id: string; nome: string } | null
  pedido?: { id: string; nome: string } | null
  temperatura?: { id: string; nome: string } | null
  tipoContratacao?: { id: string; nome: string } | null
  modalidadeContrato?: { id: string; nome: string } | null
  prazoVigenciaContrato?: { id: string; nome: string } | null
  user?: { id: string; name: string; email?: string | null } | null
}

export type CotacaoInput = Partial<
  Omit<
    PlacementCotacao,
    | 'id'
    | 'createdAt'
    | 'updatedAt'
    | 'analista'
    | 'cliente'
    | 'user'
    | 'prospect'
    | 'condicao'
    | 'filial'
    | 'corretorParceiro'
    | 'tipoContratacao'
    | 'modalidadeContrato'
    | 'prazoVigenciaContrato'
  >
>

interface PlacementCotacaoState {
  cotacoes: PlacementCotacao[]
  rascunhos: PlacementCotacao[]
  isLoading: boolean
  isLoadingRascunhos: boolean
  lastSync: number
  lastSyncRascunhos: number

  syncCotacoes: (force?: boolean) => Promise<void>
  syncRascunhos: (userId: string, force?: boolean) => Promise<void>
  addCotacao: (input: CotacaoInput) => Promise<PlacementCotacao>
  updateCotacao: (id: string, input: CotacaoInput) => Promise<PlacementCotacao>
  iniciarProcesso: (id: string, input: CotacaoInput) => Promise<PlacementCotacao>
  removeCotacao: (id: string) => Promise<void>
  getById: (id: string) => PlacementCotacao | undefined
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export const usePlacementCotacaoStore = create<PlacementCotacaoState>()(
  persist(
    (set, get) => ({
      cotacoes: [],
      rascunhos: [],
      isLoading: false,
      isLoadingRascunhos: false,
      lastSync: 0,
      lastSyncRascunhos: 0,

      async syncCotacoes(force?: boolean) {
        const state = get()
        if (state.isLoading) return
        const now = Date.now()
        if (!force && now - state.lastSync < FIVE_MINUTES_MS) return

        try {
          set({ isLoading: true })
          const resp = (await api.get('/placement/cotacoes?scope=fila')) as
            | { cotacoes?: PlacementCotacao[] }
            | PlacementCotacao[]
          const cotacoes = Array.isArray(resp) ? resp : resp?.cotacoes ?? []
          set({ cotacoes, isLoading: false, lastSync: now })
        } catch (err) {
          console.error('❌ placementCotacaoStore.syncCotacoes:', err)
          set({ isLoading: false })
        }
      },

      async syncRascunhos(userId, force?: boolean) {
        if (!userId) return
        const state = get()
        if (state.isLoadingRascunhos) return
        const now = Date.now()
        if (!force && now - state.lastSyncRascunhos < FIVE_MINUTES_MS) return

        try {
          set({ isLoadingRascunhos: true })
          const resp = (await api.get(
            `/placement/cotacoes?scope=rascunhos&userId=${encodeURIComponent(userId)}`
          )) as { cotacoes?: PlacementCotacao[] } | PlacementCotacao[]
          const rascunhos = Array.isArray(resp) ? resp : resp?.cotacoes ?? []
          set({ rascunhos, isLoadingRascunhos: false, lastSyncRascunhos: now })
        } catch (err) {
          console.error('❌ placementCotacaoStore.syncRascunhos:', err)
          set({ isLoadingRascunhos: false })
        }
      },

      async addCotacao(input) {
        const created = (await api.post('/placement/cotacoes', input)) as PlacementCotacao
        const isDraft =
          String(created.status ?? '').toLowerCase() === PLACEMENT_STATUS_RASCUNHO.toLowerCase()
        set((s) =>
          isDraft
            ? { rascunhos: [created, ...s.rascunhos] }
            : { cotacoes: [created, ...s.cotacoes] }
        )
        return created
      },

      async updateCotacao(id, input) {
        const updated = (await api.put(`/placement/cotacoes/${id}`, input)) as PlacementCotacao
        const isDraft =
          String(updated.status ?? '').toLowerCase() === PLACEMENT_STATUS_RASCUNHO.toLowerCase()
        set((s) => ({
          cotacoes: isDraft
            ? s.cotacoes.filter((c) => c.id !== id)
            : s.cotacoes.map((c) => (c.id === id ? { ...c, ...updated } : c)),
          rascunhos: isDraft
            ? s.rascunhos.map((c) => (c.id === id ? { ...c, ...updated } : c))
            : s.rascunhos.filter((c) => c.id !== id),
        }))
        return updated
      },

      async iniciarProcesso(id, input) {
        const updated = (await api.post(
          `/placement/cotacoes/${id}/iniciar-processo`,
          input
        )) as PlacementCotacao
        set((s) => ({
          rascunhos: s.rascunhos.filter((c) => c.id !== id),
          cotacoes: [updated, ...s.cotacoes.filter((c) => c.id !== id)],
        }))
        return updated
      },

      async removeCotacao(id) {
        await api.delete(`/placement/cotacoes/${id}`)
        set((s) => ({
          cotacoes: s.cotacoes.filter((c) => c.id !== id),
          rascunhos: s.rascunhos.filter((c) => c.id !== id),
        }))
      },

      getById(id) {
        return get().cotacoes.find((c) => c.id === id) ?? get().rascunhos.find((c) => c.id === id)
      },
    }),
    {
      name: 'placement-cotacao-v1',
      partialize: (state) => ({
        cotacoes: state.cotacoes,
        lastSync: state.lastSync,
      }),
    }
  )
)
