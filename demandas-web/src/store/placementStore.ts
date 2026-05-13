import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../lib/api.local'

export type PlacementFilialStatus = 'Ativo' | 'Inativo'

export interface PlacementFilial {
  id: string
  razaoSocial: string
  cnpj: string
  status: PlacementFilialStatus
  createdAt?: string
  updatedAt?: string
}

interface PlacementState {
  filiais: PlacementFilial[]
  isLoading: boolean
  lastSync: number

  syncFiliais: (force?: boolean) => Promise<void>
  addFilial: (input: { razaoSocial: string; cnpj: string; status?: PlacementFilialStatus }) => Promise<PlacementFilial>
  updateFilial: (id: string, input: Partial<Pick<PlacementFilial, 'razaoSocial' | 'cnpj' | 'status'>>) => Promise<PlacementFilial>
  removeFilial: (id: string) => Promise<void>
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export const usePlacementStore = create<PlacementState>()(
  persist(
    (set, get) => ({
      filiais: [],
      isLoading: false,
      lastSync: 0,

      async syncFiliais(force?: boolean) {
        const state = get()
        if (state.isLoading) return
        const now = Date.now()
        if (!force && now - state.lastSync < FIVE_MINUTES_MS) return

        try {
          set({ isLoading: true })
          const resp = await api.get('/placement/filiais') as { filiais?: PlacementFilial[] } | PlacementFilial[]
          const filiais = Array.isArray(resp) ? resp : (resp?.filiais ?? [])
          set({ filiais, isLoading: false, lastSync: now })
        } catch (err) {
          console.error('❌ placementStore.syncFiliais:', err)
          set({ isLoading: false })
        }
      },

      async addFilial(input) {
        const created = (await api.post('/placement/filiais', {
          razaoSocial: input.razaoSocial,
          cnpj: input.cnpj,
          status: input.status ?? 'Ativo',
        })) as PlacementFilial
        set((s) => ({ filiais: [created, ...s.filiais] }))
        return created
      },

      async updateFilial(id, input) {
        const updated = (await api.put(`/placement/filiais/${id}`, input)) as PlacementFilial
        set((s) => ({
          filiais: s.filiais.map((f) => (f.id === id ? { ...f, ...updated } : f)),
        }))
        return updated
      },

      async removeFilial(id) {
        await api.delete(`/placement/filiais/${id}`)
        set((s) => ({ filiais: s.filiais.filter((f) => f.id !== id) }))
      },
    }),
    {
      name: 'placement-v1',
      partialize: (state) => ({
        filiais: state.filiais,
        lastSync: state.lastSync,
      }),
    }
  )
)
