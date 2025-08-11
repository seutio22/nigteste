import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Area, Analista, Cliente, Contrato, Operadora, Produto, Sistema, TipoDemanda, TipoServico } from '@/types/masterData'

export interface MasterDataState {
  clientes: Cliente[]
  contratos: Contrato[]
  operadoras: Operadora[]
  produtos: Produto[]
  sistemas: Sistema[]
  analistas: Analista[]
  areas: Area[]
  tiposDemanda: TipoDemanda[]
  tiposServico: TipoServico[]
  upsertMany: (payload: Partial<MasterDataState>) => void
  clearAll: () => void
  syncFromApi?: () => Promise<void>
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
      tiposDemanda: [],
      tiposServico: [
        { id: 'CAD', nome: 'Cadastro' },
        { id: 'MAN', nome: 'Manutenção' },
      ],
      upsertMany: (payload) => set((state) => ({ ...state, ...payload })),
      clearAll: () => set({
        clientes: [], contratos: [], operadoras: [], produtos: [], sistemas: [], analistas: [], areas: [], tiposDemanda: [], tiposServico: [
          { id: 'CAD', nome: 'Cadastro' },
          { id: 'MAN', nome: 'Manutenção' },
        ],
      }),
      async syncFromApi() {
        const { api } = await import('@/lib/api')
        const [clientes, contratos, operadoras, produtos, sistemas, analistas, areas, tiposDemanda, tiposServico] = await Promise.all([
          api.get('/clientes'),
          api.get('/contratos'),
          api.get('/operadoras'),
          api.get('/produtos'),
          api.get('/sistemas'),
          api.get('/analistas'),
          api.get('/areas'),
          api.get('/tiposDemanda'),
          api.get('/tiposServico'),
        ])
        set({ clientes, contratos, operadoras, produtos, sistemas, analistas, areas, tiposDemanda, tiposServico })
      },
    }),
    {
      name: 'master-data-v1',
      version: 2,
      migrate: (state: any, version) => {
        const required = [
          { id: 'CAD', nome: 'Cadastro' },
          { id: 'MAN', nome: 'Manutenção' },
        ]
        const current: any[] = state?.tiposServico ?? []
        const ids = new Set(current.map((x: any) => x.id))
        const merged = [...current]
        required.forEach((r) => { if (!ids.has(r.id)) merged.push(r) })
        return { ...state, tiposServico: merged }
      },
    }
  )
)


