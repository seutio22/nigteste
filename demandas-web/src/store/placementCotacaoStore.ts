import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api.local'

export const COTACAO_STATUSES = [
  'Aberta',
  'Em cotação',
  'Aguardando operadora',
  'Proposta enviada',
  'Fechada',
  'Perdida',
  'Cancelada',
] as const

export type CotacaoStatus = (typeof COTACAO_STATUSES)[number]

export interface PlacementCotacao {
  id: string
  ticket: string
  status: CotacaoStatus | string
  analistaId?: string | null
  userId?: string | null
  clienteId?: string | null
  prospectId?: string | null
  ramo?: string | null
  operadorasIds?: string[] | null
  vidas?: number | null
  valorEstimadoCents?: number | null
  dataInicio?: string | null
  dataLimite?: string | null
  descricao?: string | null
  observacoes?: string | null
  createdAt?: string
  updatedAt?: string
  analista?: { id: string; nome: string } | null
  cliente?: { id: string; nome: string; cnpj?: string | null; grupoEconomico?: string | null } | null
  prospect?: { id: string; razaoSocial: string; cnpj?: string | null; grupoEconomico?: string | null } | null
  user?: { id: string; name: string; email?: string | null } | null
}

export type CotacaoInput = Partial<
  Omit<
    PlacementCotacao,
    'id' | 'createdAt' | 'updatedAt' | 'analista' | 'cliente' | 'user'
  >
>

interface PlacementCotacaoState {
  cotacoes: PlacementCotacao[]
  isLoading: boolean
  lastSync: number

  syncCotacoes: (force?: boolean) => Promise<void>
  addCotacao: (input: CotacaoInput) => Promise<PlacementCotacao>
  updateCotacao: (id: string, input: CotacaoInput) => Promise<PlacementCotacao>
  removeCotacao: (id: string) => Promise<void>
  getById: (id: string) => PlacementCotacao | undefined
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export const usePlacementCotacaoStore = create<PlacementCotacaoState>()(
  persist(
    (set, get) => ({
      cotacoes: [],
      isLoading: false,
      lastSync: 0,

      async syncCotacoes(force?: boolean) {
        const state = get()
        if (state.isLoading) return
        const now = Date.now()
        if (!force && now - state.lastSync < FIVE_MINUTES_MS) return

        try {
          set({ isLoading: true })
          const resp = (await api.get('/placement/cotacoes')) as
            | { cotacoes?: PlacementCotacao[] }
            | PlacementCotacao[]
          const cotacoes = Array.isArray(resp) ? resp : resp?.cotacoes ?? []
          set({ cotacoes, isLoading: false, lastSync: now })
        } catch (err) {
          console.error('❌ placementCotacaoStore.syncCotacoes:', err)
          set({ isLoading: false })
        }
      },

      async addCotacao(input) {
        const created = (await api.post('/placement/cotacoes', input)) as PlacementCotacao
        set((s) => ({ cotacoes: [created, ...s.cotacoes] }))
        return created
      },

      async updateCotacao(id, input) {
        const updated = (await api.put(`/placement/cotacoes/${id}`, input)) as PlacementCotacao
        set((s) => ({
          cotacoes: s.cotacoes.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removeCotacao(id) {
        await api.delete(`/placement/cotacoes/${id}`)
        set((s) => ({ cotacoes: s.cotacoes.filter((c) => c.id !== id) }))
      },

      getById(id) {
        return get().cotacoes.find((c) => c.id === id)
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
