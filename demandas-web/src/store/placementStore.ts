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

export interface PlacementProspect {
  id: string
  razaoSocial: string
  grupoEconomico?: string | null
  cnpj: string
  cnae?: string
  createdAt?: string
  updatedAt?: string
}

export interface PlacementCondicao {
  id: string
  grupoEconomico?: string | null
  razaoSocial: string
  cnpj?: string | null
  cnae: string
  createdAt?: string
  updatedAt?: string
}

export interface PlacementCorretorParceiro {
  id: string
  nome: string
  createdAt?: string
  updatedAt?: string
}

export interface PlacementAnalista {
  id: string
  nome: string
  coordenadorAnalista: string
  gerenteAnalista: string
  createdAt?: string
  updatedAt?: string
}

export interface PlacementPlano {
  id: string
  operadoraId: string
  categoria: string
  plano: string
  reembolso?: string | null
  eventosReembolsaveis?: string | null
  acomodacao?: string | null
  abrangencia?: string | null
  createdAt?: string
  updatedAt?: string
  operadora?: { id: string; nome: string }
}

export interface PlacementDiferencial {
  id: string
  operadoraId: string
  placementPlanoId: string
  itemKey: string
  texto: string
  createdAt?: string
  updatedAt?: string
  operadora?: { id: string; nome: string }
  placementPlano?: { id: string; plano: string; categoria: string; operadoraId: string }
}

/** Condição contratual (Dados → Placement). Matriz por fornecedor; opcionalmente por plano. */
export interface PlacementCondicaoContratual {
  id: string
  operadoraId: string
  porPlano: boolean
  placementPlanoId?: string | null
  itemKey: string
  texto: string
  createdAt?: string
  updatedAt?: string
  operadora?: { id: string; nome: string }
  placementPlano?: { id: string; plano: string; categoria: string; operadoraId: string } | null
}

/** Indicador da operadora (Dados → Placement). Matriz por fornecedor. */
export interface PlacementIndicadorOperadora {
  id: string
  operadoraId: string
  itemKey: string
  texto: string
  createdAt?: string
  updatedAt?: string
  operadora?: { id: string; nome: string }
}

/** Cadastros nome único (tipo contratação, modalidade, prazo vigência). */
export interface PlacementNomeCadastro {
  id: string
  nome: string
  createdAt?: string
  updatedAt?: string
}

interface PlacementState {
  filiais: PlacementFilial[]
  corretoresParceiros: PlacementCorretorParceiro[]
  prospects: PlacementProspect[]
  condicoes: PlacementCondicao[]
  tiposContratacao: PlacementNomeCadastro[]
  modalidadesContrato: PlacementNomeCadastro[]
  prazosVigenciaContrato: PlacementNomeCadastro[]
  projetos: PlacementNomeCadastro[]
  pedidos: PlacementNomeCadastro[]
  temperaturas: PlacementNomeCadastro[]
  analistas: PlacementAnalista[]
  planos: PlacementPlano[]
  diferenciais: PlacementDiferencial[]
  condicoesContratuais: PlacementCondicaoContratual[]
  indicadoresOperadoras: PlacementIndicadorOperadora[]
  isLoading: boolean
  isLoadingAnalistas: boolean
  isLoadingPlanos: boolean
  isLoadingDiferenciais: boolean
  isLoadingCondicoesContratuais: boolean
  isLoadingIndicadoresOperadoras: boolean
  isLoadingCorretores: boolean
  isLoadingProspects: boolean
  isLoadingCondicoes: boolean
  isLoadingContratoCatalogos: boolean
  isLoadingProjetosPedidos: boolean
  lastSync: number
  lastSyncCorretores: number
  lastSyncProspects: number
  lastSyncCondicoes: number
  lastSyncContratoCatalogos: number
  lastSyncProjetosPedidos: number
  lastSyncAnalistas: number
  lastSyncPlanos: number
  lastSyncDiferenciais: number
  lastSyncCondicoesContratuais: number
  lastSyncIndicadoresOperadoras: number

  syncFiliais: (force?: boolean) => Promise<void>
  addFilial: (input: { razaoSocial: string; cnpj: string; status?: PlacementFilialStatus }) => Promise<PlacementFilial>
  updateFilial: (id: string, input: Partial<Pick<PlacementFilial, 'razaoSocial' | 'cnpj' | 'status'>>) => Promise<PlacementFilial>
  removeFilial: (id: string) => Promise<void>

  syncCorretoresParceiros: (force?: boolean) => Promise<void>
  addCorretorParceiro: (input: { nome: string }) => Promise<PlacementCorretorParceiro>
  updateCorretorParceiro: (id: string, input: Partial<Pick<PlacementCorretorParceiro, 'nome'>>) => Promise<PlacementCorretorParceiro>
  removeCorretorParceiro: (id: string) => Promise<void>

  syncProspects: (force?: boolean) => Promise<void>
  addProspect: (input: {
    razaoSocial: string
    cnpj: string
    grupoEconomico?: string | null
    cnae: string
  }) => Promise<PlacementProspect>
  updateProspect: (
    id: string,
    input: Partial<Pick<PlacementProspect, 'razaoSocial' | 'cnpj' | 'grupoEconomico' | 'cnae'>>
  ) => Promise<PlacementProspect>
  removeProspect: (id: string) => Promise<void>

  syncCondicoes: (force?: boolean) => Promise<void>
  addCondicao: (input: {
    grupoEconomico: string | null
    razaoSocial: string
    cnae: string
    cnpj?: string | null
  }) => Promise<PlacementCondicao>
  updateCondicao: (
    id: string,
    input: Partial<Pick<PlacementCondicao, 'grupoEconomico' | 'razaoSocial' | 'cnae' | 'cnpj'>>
  ) => Promise<PlacementCondicao>
  removeCondicao: (id: string) => Promise<void>

  syncPlacementContratoCatalogos: (force?: boolean) => Promise<void>
  addTipoContratacao: (input: { nome: string }) => Promise<PlacementNomeCadastro>
  updateTipoContratacao: (id: string, input: Partial<Pick<PlacementNomeCadastro, 'nome'>>) => Promise<PlacementNomeCadastro>
  removeTipoContratacao: (id: string) => Promise<void>
  addModalidadeContrato: (input: { nome: string }) => Promise<PlacementNomeCadastro>
  updateModalidadeContrato: (id: string, input: Partial<Pick<PlacementNomeCadastro, 'nome'>>) => Promise<PlacementNomeCadastro>
  removeModalidadeContrato: (id: string) => Promise<void>
  addPrazoVigenciaContrato: (input: { nome: string }) => Promise<PlacementNomeCadastro>
  updatePrazoVigenciaContrato: (id: string, input: Partial<Pick<PlacementNomeCadastro, 'nome'>>) => Promise<PlacementNomeCadastro>
  removePrazoVigenciaContrato: (id: string) => Promise<void>

  syncProjetosPedidos: (force?: boolean) => Promise<void>
  addProjeto: (input: { nome: string }) => Promise<PlacementNomeCadastro>
  updateProjeto: (id: string, input: Partial<Pick<PlacementNomeCadastro, 'nome'>>) => Promise<PlacementNomeCadastro>
  removeProjeto: (id: string) => Promise<void>
  addPedido: (input: { nome: string }) => Promise<PlacementNomeCadastro>
  updatePedido: (id: string, input: Partial<Pick<PlacementNomeCadastro, 'nome'>>) => Promise<PlacementNomeCadastro>
  removePedido: (id: string) => Promise<void>
  addTemperatura: (input: { nome: string }) => Promise<PlacementNomeCadastro>
  updateTemperatura: (id: string, input: Partial<Pick<PlacementNomeCadastro, 'nome'>>) => Promise<PlacementNomeCadastro>
  removeTemperatura: (id: string) => Promise<void>

  syncAnalistas: (force?: boolean) => Promise<void>
  addAnalista: (input: {
    nome: string
    coordenadorAnalista: string
    gerenteAnalista: string
  }) => Promise<PlacementAnalista>
  updateAnalista: (
    id: string,
    input: Partial<Pick<PlacementAnalista, 'nome' | 'coordenadorAnalista' | 'gerenteAnalista'>>
  ) => Promise<PlacementAnalista>
  removeAnalista: (id: string) => Promise<void>

  syncPlanos: (force?: boolean) => Promise<void>
  addPlano: (input: {
    operadoraId: string
    categoria: string
    plano: string
    reembolso?: string | null
    eventosReembolsaveis?: string | null
    acomodacao?: string | null
    abrangencia?: string | null
  }) => Promise<PlacementPlano>
  updatePlano: (
    id: string,
    input: Partial<
      Pick<
        PlacementPlano,
        'operadoraId' | 'categoria' | 'plano' | 'reembolso' | 'eventosReembolsaveis' | 'acomodacao' | 'abrangencia'
      >
    >
  ) => Promise<PlacementPlano>
  removePlano: (id: string) => Promise<void>

  syncDiferenciais: (force?: boolean) => Promise<void>
  addDiferencial: (input: {
    operadoraId: string
    placementPlanoId: string
    itemKey: string
    texto: string
  }) => Promise<PlacementDiferencial>
  updateDiferencial: (
    id: string,
    input: Partial<Pick<PlacementDiferencial, 'operadoraId' | 'placementPlanoId' | 'itemKey' | 'texto'>>
  ) => Promise<PlacementDiferencial>
  removeDiferencial: (id: string) => Promise<void>
  upsertDiferenciaisBatch: (
    items: Array<{
      operadoraId: string
      placementPlanoId: string
      itemKey: string
      texto: string
    }>
  ) => Promise<{ synced: number; skipped: number; diferenciais: PlacementDiferencial[] }>

  syncCondicoesContratuais: (force?: boolean) => Promise<void>
  addCondicaoContratual: (input: {
    operadoraId: string
    porPlano: boolean
    placementPlanoId?: string | null
    itemKey: string
    texto: string
  }) => Promise<PlacementCondicaoContratual>
  updateCondicaoContratual: (
    id: string,
    input: Partial<
      Pick<PlacementCondicaoContratual, 'operadoraId' | 'porPlano' | 'placementPlanoId' | 'itemKey' | 'texto'>
    >
  ) => Promise<PlacementCondicaoContratual>
  removeCondicaoContratual: (id: string) => Promise<void>
  upsertCondicoesContratuaisBatch: (
    items: Array<{
      operadoraId: string
      porPlano: boolean
      placementPlanoId?: string | null
      itemKey: string
      texto: string
    }>
  ) => Promise<{ synced: number; skipped: number; condicoes: PlacementCondicaoContratual[] }>

  syncIndicadoresOperadoras: (force?: boolean) => Promise<void>
  addIndicadorOperadora: (input: {
    operadoraId: string
    itemKey: string
    texto: string
  }) => Promise<PlacementIndicadorOperadora>
  updateIndicadorOperadora: (
    id: string,
    input: Partial<Pick<PlacementIndicadorOperadora, 'operadoraId' | 'itemKey' | 'texto'>>
  ) => Promise<PlacementIndicadorOperadora>
  removeIndicadorOperadora: (id: string) => Promise<void>
  upsertIndicadoresOperadorasBatch: (
    items: Array<{ operadoraId: string; itemKey: string; texto: string }>
  ) => Promise<{ synced: number; skipped: number; indicadores: PlacementIndicadorOperadora[] }>
}

const FIVE_MINUTES_MS = 5 * 60 * 1000

export const usePlacementStore = create<PlacementState>()(
  persist(
    (set, get) => ({
      filiais: [],
      corretoresParceiros: [],
      prospects: [],
      condicoes: [],
      tiposContratacao: [],
      modalidadesContrato: [],
      prazosVigenciaContrato: [],
      projetos: [],
      pedidos: [],
      temperaturas: [],
      analistas: [],
      planos: [],
      diferenciais: [],
      condicoesContratuais: [],
      indicadoresOperadoras: [],
      isLoading: false,
      isLoadingAnalistas: false,
      isLoadingPlanos: false,
      isLoadingDiferenciais: false,
      isLoadingCondicoesContratuais: false,
      isLoadingIndicadoresOperadoras: false,
      isLoadingCorretores: false,
      isLoadingProspects: false,
      isLoadingCondicoes: false,
      isLoadingContratoCatalogos: false,
      isLoadingProjetosPedidos: false,
      lastSync: 0,
      lastSyncCorretores: 0,
      lastSyncProspects: 0,
      lastSyncCondicoes: 0,
      lastSyncContratoCatalogos: 0,
      lastSyncProjetosPedidos: 0,
      lastSyncAnalistas: 0,
      lastSyncPlanos: 0,
      lastSyncDiferenciais: 0,
      lastSyncCondicoesContratuais: 0,
      lastSyncIndicadoresOperadoras: 0,

      async syncFiliais(force?: boolean) {
        const state = get()
        if (state.isLoading) return
        const now = Date.now()
        if (!force && state.filiais.length > 0 && now - state.lastSync < FIVE_MINUTES_MS) return

        try {
          set({ isLoading: true })
          const resp = (await api.get('/placement/filiais')) as { filiais?: PlacementFilial[] } | PlacementFilial[]
          const filiais = Array.isArray(resp) ? resp : resp?.filiais ?? []
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

      async syncCorretoresParceiros(force?: boolean) {
        const state = get()
        if (state.isLoadingCorretores) return
        const now = Date.now()
        if (!force && now - state.lastSyncCorretores < FIVE_MINUTES_MS) return

        try {
          set({ isLoadingCorretores: true })
          const resp = (await api.get('/placement/corretores-parceiros')) as
            | { corretoresParceiros?: PlacementCorretorParceiro[] }
            | PlacementCorretorParceiro[]
          const corretoresParceiros = Array.isArray(resp)
            ? resp
            : resp?.corretoresParceiros ?? []
          set({ corretoresParceiros, isLoadingCorretores: false, lastSyncCorretores: now })
        } catch (err) {
          console.error('❌ placementStore.syncCorretoresParceiros:', err)
          set({ isLoadingCorretores: false })
        }
      },

      async addCorretorParceiro(input) {
        const created = (await api.post('/placement/corretores-parceiros', {
          nome: input.nome,
        })) as PlacementCorretorParceiro
        set((s) => ({ corretoresParceiros: [created, ...s.corretoresParceiros] }))
        return created
      },

      async updateCorretorParceiro(id, input) {
        const updated = (await api.put(`/placement/corretores-parceiros/${id}`, input)) as PlacementCorretorParceiro
        set((s) => ({
          corretoresParceiros: s.corretoresParceiros.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removeCorretorParceiro(id) {
        await api.delete(`/placement/corretores-parceiros/${id}`)
        set((s) => ({ corretoresParceiros: s.corretoresParceiros.filter((c) => c.id !== id) }))
      },

      async syncProspects(force?: boolean) {
        const state = get()
        if (state.isLoadingProspects) return
        const now = Date.now()
        if (!force && now - state.lastSyncProspects < FIVE_MINUTES_MS) return

        try {
          set({ isLoadingProspects: true })
          const resp = (await api.get('/placement/prospects')) as
            | { prospects?: PlacementProspect[] }
            | PlacementProspect[]
          const prospects = Array.isArray(resp) ? resp : resp?.prospects ?? []
          set({ prospects, isLoadingProspects: false, lastSyncProspects: now })
        } catch (err) {
          console.error('❌ placementStore.syncProspects:', err)
          set({ isLoadingProspects: false })
        }
      },

      async addProspect(input) {
        const created = (await api.post('/placement/prospects', {
          razaoSocial: input.razaoSocial,
          cnpj: input.cnpj,
          grupoEconomico: input.grupoEconomico ?? null,
          cnae: input.cnae,
        })) as PlacementProspect
        set((s) => ({ prospects: [created, ...s.prospects] }))
        return created
      },

      async updateProspect(id, input) {
        const updated = (await api.put(`/placement/prospects/${id}`, input)) as PlacementProspect
        set((s) => ({
          prospects: s.prospects.map((p) => (p.id === id ? { ...p, ...updated } : p)),
        }))
        return updated
      },

      async removeProspect(id) {
        await api.delete(`/placement/prospects/${id}`)
        set((s) => ({ prospects: s.prospects.filter((p) => p.id !== id) }))
      },

      async syncCondicoes(force?: boolean) {
        const state = get()
        if (state.isLoadingCondicoes) return
        const now = Date.now()
        if (!force && now - state.lastSyncCondicoes < FIVE_MINUTES_MS) return

        try {
          set({ isLoadingCondicoes: true })
          const resp = (await api.get('/placement/condicoes')) as
            | { condicoes?: PlacementCondicao[] }
            | PlacementCondicao[]
          const condicoes = Array.isArray(resp) ? resp : resp?.condicoes ?? []
          set({ condicoes, isLoadingCondicoes: false, lastSyncCondicoes: now })
        } catch (err) {
          console.error('❌ placementStore.syncCondicoes:', err)
          set({ isLoadingCondicoes: false })
        }
      },

      async addCondicao(input) {
        const created = (await api.post('/placement/condicoes', {
          grupoEconomico: input.grupoEconomico ?? null,
          razaoSocial: input.razaoSocial,
          cnae: input.cnae,
          cnpj: input.cnpj ?? null,
        })) as PlacementCondicao
        set((s) => ({ condicoes: [created, ...s.condicoes] }))
        return created
      },

      async updateCondicao(id, input) {
        const updated = (await api.put(`/placement/condicoes/${id}`, input)) as PlacementCondicao
        set((s) => ({
          condicoes: s.condicoes.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removeCondicao(id) {
        await api.delete(`/placement/condicoes/${id}`)
        set((s) => ({ condicoes: s.condicoes.filter((c) => c.id !== id) }))
      },

      async syncPlacementContratoCatalogos(force?: boolean) {
        const state = get()
        if (state.isLoadingContratoCatalogos) return
        const now = Date.now()
        if (!force && now - state.lastSyncContratoCatalogos < FIVE_MINUTES_MS) return

        try {
          set({ isLoadingContratoCatalogos: true })
          const [r1, r2, r3] = await Promise.all([
            api.get('/placement/tipos-contratacao') as Promise<{ tiposContratacao?: PlacementNomeCadastro[] }>,
            api.get('/placement/modalidades-contrato') as Promise<{ modalidadesContrato?: PlacementNomeCadastro[] }>,
            api.get('/placement/prazos-vigencia-contrato') as Promise<{
              prazosVigenciaContrato?: PlacementNomeCadastro[]
            }>,
          ])
          set({
            tiposContratacao: r1?.tiposContratacao ?? [],
            modalidadesContrato: r2?.modalidadesContrato ?? [],
            prazosVigenciaContrato: r3?.prazosVigenciaContrato ?? [],
            isLoadingContratoCatalogos: false,
            lastSyncContratoCatalogos: now,
          })
        } catch (err) {
          console.error('❌ placementStore.syncPlacementContratoCatalogos:', err)
          set({ isLoadingContratoCatalogos: false })
        }
      },

      async addTipoContratacao(input) {
        const created = (await api.post('/placement/tipos-contratacao', {
          nome: input.nome,
        })) as PlacementNomeCadastro
        set((s) => ({ tiposContratacao: [created, ...s.tiposContratacao] }))
        return created
      },

      async updateTipoContratacao(id, input) {
        const updated = (await api.put(`/placement/tipos-contratacao/${id}`, input)) as PlacementNomeCadastro
        set((s) => ({
          tiposContratacao: s.tiposContratacao.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removeTipoContratacao(id) {
        await api.delete(`/placement/tipos-contratacao/${id}`)
        set((s) => ({ tiposContratacao: s.tiposContratacao.filter((c) => c.id !== id) }))
      },

      async addModalidadeContrato(input) {
        const created = (await api.post('/placement/modalidades-contrato', {
          nome: input.nome,
        })) as PlacementNomeCadastro
        set((s) => ({ modalidadesContrato: [created, ...s.modalidadesContrato] }))
        return created
      },

      async updateModalidadeContrato(id, input) {
        const updated = (await api.put(`/placement/modalidades-contrato/${id}`, input)) as PlacementNomeCadastro
        set((s) => ({
          modalidadesContrato: s.modalidadesContrato.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removeModalidadeContrato(id) {
        await api.delete(`/placement/modalidades-contrato/${id}`)
        set((s) => ({ modalidadesContrato: s.modalidadesContrato.filter((c) => c.id !== id) }))
      },

      async addPrazoVigenciaContrato(input) {
        const created = (await api.post('/placement/prazos-vigencia-contrato', {
          nome: input.nome,
        })) as PlacementNomeCadastro
        set((s) => ({ prazosVigenciaContrato: [created, ...s.prazosVigenciaContrato] }))
        return created
      },

      async updatePrazoVigenciaContrato(id, input) {
        const updated = (await api.put(`/placement/prazos-vigencia-contrato/${id}`, input)) as PlacementNomeCadastro
        set((s) => ({
          prazosVigenciaContrato: s.prazosVigenciaContrato.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removePrazoVigenciaContrato(id) {
        await api.delete(`/placement/prazos-vigencia-contrato/${id}`)
        set((s) => ({ prazosVigenciaContrato: s.prazosVigenciaContrato.filter((c) => c.id !== id) }))
      },

      async syncProjetosPedidos(force?: boolean) {
        const state = get()
        if (state.isLoadingProjetosPedidos) return
        const now = Date.now()
        if (!force && now - state.lastSyncProjetosPedidos < FIVE_MINUTES_MS) return

        try {
          set({ isLoadingProjetosPedidos: true })
          const [r1, r2, r3] = await Promise.all([
            api.get('/placement/projetos') as Promise<{ projetos?: PlacementNomeCadastro[] }>,
            api.get('/placement/pedidos') as Promise<{ pedidos?: PlacementNomeCadastro[] }>,
            api.get('/placement/temperaturas') as Promise<{ temperaturas?: PlacementNomeCadastro[] }>,
          ])
          set({
            projetos: r1?.projetos ?? [],
            pedidos: r2?.pedidos ?? [],
            temperaturas: r3?.temperaturas ?? [],
            isLoadingProjetosPedidos: false,
            lastSyncProjetosPedidos: now,
          })
        } catch (err) {
          console.error('❌ placementStore.syncProjetosPedidos:', err)
          set({ isLoadingProjetosPedidos: false })
        }
      },

      async addProjeto(input) {
        const created = (await api.post('/placement/projetos', { nome: input.nome })) as PlacementNomeCadastro
        set((s) => ({ projetos: [created, ...s.projetos] }))
        return created
      },

      async updateProjeto(id, input) {
        const updated = (await api.put(`/placement/projetos/${id}`, input)) as PlacementNomeCadastro
        set((s) => ({
          projetos: s.projetos.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removeProjeto(id) {
        await api.delete(`/placement/projetos/${id}`)
        set((s) => ({ projetos: s.projetos.filter((c) => c.id !== id) }))
      },

      async addPedido(input) {
        const created = (await api.post('/placement/pedidos', { nome: input.nome })) as PlacementNomeCadastro
        set((s) => ({ pedidos: [created, ...s.pedidos] }))
        return created
      },

      async updatePedido(id, input) {
        const updated = (await api.put(`/placement/pedidos/${id}`, input)) as PlacementNomeCadastro
        set((s) => ({
          pedidos: s.pedidos.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removePedido(id) {
        await api.delete(`/placement/pedidos/${id}`)
        set((s) => ({ pedidos: s.pedidos.filter((c) => c.id !== id) }))
      },

      async addTemperatura(input) {
        const created = (await api.post('/placement/temperaturas', { nome: input.nome })) as PlacementNomeCadastro
        set((s) => ({ temperaturas: [created, ...s.temperaturas] }))
        return created
      },

      async updateTemperatura(id, input) {
        const updated = (await api.put(`/placement/temperaturas/${id}`, input)) as PlacementNomeCadastro
        set((s) => ({
          temperaturas: s.temperaturas.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removeTemperatura(id) {
        await api.delete(`/placement/temperaturas/${id}`)
        set((s) => ({ temperaturas: s.temperaturas.filter((c) => c.id !== id) }))
      },

      async syncAnalistas(force?: boolean) {
        const state = get()
        if (state.isLoadingAnalistas) return
        const now = Date.now()
        if (!force && now - state.lastSyncAnalistas < FIVE_MINUTES_MS) return
        try {
          set({ isLoadingAnalistas: true })
          const resp = (await api.get('/placement/analistas')) as
            | { analistas?: PlacementAnalista[] }
            | PlacementAnalista[]
          const analistas = Array.isArray(resp) ? resp : resp?.analistas ?? []
          set({ analistas, isLoadingAnalistas: false, lastSyncAnalistas: now })
        } catch (err) {
          console.error('❌ placementStore.syncAnalistas:', err)
          set({ isLoadingAnalistas: false })
        }
      },

      async addAnalista(input) {
        const created = (await api.post('/placement/analistas', input)) as PlacementAnalista
        set((s) => ({ analistas: [created, ...s.analistas] }))
        return created
      },

      async updateAnalista(id, input) {
        const updated = (await api.put(`/placement/analistas/${id}`, input)) as PlacementAnalista
        set((s) => ({
          analistas: s.analistas.map((c) => (c.id === id ? { ...c, ...updated } : c)),
        }))
        return updated
      },

      async removeAnalista(id) {
        await api.delete(`/placement/analistas/${id}`)
        set((s) => ({ analistas: s.analistas.filter((c) => c.id !== id) }))
      },

      async syncPlanos(force?: boolean) {
        const state = get()
        if (state.isLoadingPlanos) return
        const now = Date.now()
        if (!force && state.planos.length > 0 && now - state.lastSyncPlanos < FIVE_MINUTES_MS) return

        try {
          set({ isLoadingPlanos: true })
          const resp = (await api.get('/placement/planos')) as
            | { planos?: PlacementPlano[] }
            | PlacementPlano[]
          const planos = Array.isArray(resp) ? resp : resp?.planos ?? []
          set({ planos, isLoadingPlanos: false, lastSyncPlanos: now })
        } catch (err) {
          console.error('❌ placementStore.syncPlanos:', err)
          set({ isLoadingPlanos: false })
        }
      },

      async addPlano(input) {
        const created = (await api.post('/placement/planos', input)) as PlacementPlano
        set((s) => ({ planos: [created, ...s.planos] }))
        return created
      },

      async updatePlano(id, input) {
        const updated = (await api.put(`/placement/planos/${id}`, input)) as PlacementPlano
        set((s) => ({
          planos: s.planos.map((p) => (p.id === id ? { ...p, ...updated } : p)),
        }))
        return updated
      },

      async removePlano(id) {
        await api.delete(`/placement/planos/${id}`)
        set((s) => ({ planos: s.planos.filter((p) => p.id !== id) }))
      },

      async syncDiferenciais(force?: boolean) {
        const state = get()
        if (state.isLoadingDiferenciais) return
        const now = Date.now()
        if (!force && state.diferenciais.length > 0 && now - state.lastSyncDiferenciais < FIVE_MINUTES_MS) return

        try {
          set({ isLoadingDiferenciais: true })
          const resp = (await api.get('/placement/diferenciais')) as
            | { diferenciais?: PlacementDiferencial[] }
            | PlacementDiferencial[]
          const diferenciais = Array.isArray(resp) ? resp : resp?.diferenciais ?? []
          set({ diferenciais, isLoadingDiferenciais: false, lastSyncDiferenciais: now })
        } catch (err) {
          console.error('❌ placementStore.syncDiferenciais:', err)
          set({ isLoadingDiferenciais: false })
        }
      },

      async addDiferencial(input) {
        const created = (await api.post('/placement/diferenciais', input)) as PlacementDiferencial
        set((s) => ({ diferenciais: [created, ...s.diferenciais] }))
        return created
      },

      async updateDiferencial(id, input) {
        const updated = (await api.put(`/placement/diferenciais/${id}`, input)) as PlacementDiferencial
        set((s) => ({
          diferenciais: s.diferenciais.map((d) => (d.id === id ? { ...d, ...updated } : d)),
        }))
        return updated
      },

      async removeDiferencial(id) {
        await api.delete(`/placement/diferenciais/${id}`)
        set((s) => ({ diferenciais: s.diferenciais.filter((d) => d.id !== id) }))
      },

      async upsertDiferenciaisBatch(items) {
        if (!items.length) return { synced: 0, skipped: 0, diferenciais: [] }
        const resp = (await api.post('/placement/diferenciais/upsert-batch', { items })) as {
          synced?: number
          skipped?: number
          diferenciais?: PlacementDiferencial[]
        }
        const upserted = resp?.diferenciais ?? []
        if (upserted.length) {
          set((s) => {
            const byKey = new Map(
              s.diferenciais.map((d) => [`${d.operadoraId}|${d.placementPlanoId}|${d.itemKey}`, d])
            )
            for (const row of upserted) {
              byKey.set(`${row.operadoraId}|${row.placementPlanoId}|${row.itemKey}`, row)
            }
            return {
              diferenciais: Array.from(byKey.values()).sort((a, b) =>
                a.operadoraId.localeCompare(b.operadoraId)
              ),
              lastSyncDiferenciais: Date.now(),
            }
          })
        }
        return {
          synced: resp?.synced ?? upserted.length,
          skipped: resp?.skipped ?? 0,
          diferenciais: upserted,
        }
      },

      async syncCondicoesContratuais(force?: boolean) {
        const state = get()
        if (state.isLoadingCondicoesContratuais) return
        const now = Date.now()
        if (
          !force &&
          state.condicoesContratuais.length > 0 &&
          now - state.lastSyncCondicoesContratuais < FIVE_MINUTES_MS
        ) {
          return
        }
        try {
          set({ isLoadingCondicoesContratuais: true })
          const resp = (await api.get('/placement/condicoes-contratuais')) as
            | { condicoes?: PlacementCondicaoContratual[] }
            | PlacementCondicaoContratual[]
          const condicoesContratuais = Array.isArray(resp) ? resp : resp?.condicoes ?? []
          set({
            condicoesContratuais,
            isLoadingCondicoesContratuais: false,
            lastSyncCondicoesContratuais: now,
          })
        } catch (err) {
          console.error('❌ placementStore.syncCondicoesContratuais:', err)
          set({ isLoadingCondicoesContratuais: false })
        }
      },

      async addCondicaoContratual(input) {
        const created = (await api.post(
          '/placement/condicoes-contratuais',
          input
        )) as PlacementCondicaoContratual
        set((s) => ({ condicoesContratuais: [created, ...s.condicoesContratuais] }))
        return created
      },

      async updateCondicaoContratual(id, input) {
        const updated = (await api.put(
          `/placement/condicoes-contratuais/${id}`,
          input
        )) as PlacementCondicaoContratual
        set((s) => ({
          condicoesContratuais: s.condicoesContratuais.map((d) =>
            d.id === id ? { ...d, ...updated } : d
          ),
        }))
        return updated
      },

      async removeCondicaoContratual(id) {
        await api.delete(`/placement/condicoes-contratuais/${id}`)
        set((s) => ({
          condicoesContratuais: s.condicoesContratuais.filter((d) => d.id !== id),
        }))
      },

      async upsertCondicoesContratuaisBatch(items) {
        if (!items.length) return { synced: 0, skipped: 0, condicoes: [] }
        const resp = (await api.post('/placement/condicoes-contratuais/upsert-batch', { items })) as {
          synced?: number
          skipped?: number
          condicoes?: PlacementCondicaoContratual[]
        }
        const upserted = resp?.condicoes ?? []
        if (upserted.length) {
          set((s) => {
            const keyOf = (d: PlacementCondicaoContratual) =>
              `${d.operadoraId}|${d.porPlano ? d.placementPlanoId ?? '' : ''}|${d.itemKey}|${d.porPlano ? '1' : '0'}`
            const byKey = new Map(s.condicoesContratuais.map((d) => [keyOf(d), d]))
            for (const row of upserted) byKey.set(keyOf(row), row)
            return {
              condicoesContratuais: Array.from(byKey.values()).sort((a, b) =>
                a.operadoraId.localeCompare(b.operadoraId)
              ),
              lastSyncCondicoesContratuais: Date.now(),
            }
          })
        }
        return {
          synced: resp?.synced ?? upserted.length,
          skipped: resp?.skipped ?? 0,
          condicoes: upserted,
        }
      },

      async syncIndicadoresOperadoras(force?: boolean) {
        const state = get()
        if (state.isLoadingIndicadoresOperadoras) return
        const now = Date.now()
        if (
          !force &&
          state.indicadoresOperadoras.length > 0 &&
          now - state.lastSyncIndicadoresOperadoras < FIVE_MINUTES_MS
        ) {
          return
        }
        try {
          set({ isLoadingIndicadoresOperadoras: true })
          const resp = (await api.get('/placement/indicadores-operadoras')) as
            | { indicadores?: PlacementIndicadorOperadora[] }
            | PlacementIndicadorOperadora[]
          const indicadoresOperadoras = Array.isArray(resp) ? resp : resp?.indicadores ?? []
          set({
            indicadoresOperadoras,
            isLoadingIndicadoresOperadoras: false,
            lastSyncIndicadoresOperadoras: now,
          })
        } catch (err) {
          console.error('❌ placementStore.syncIndicadoresOperadoras:', err)
          set({ isLoadingIndicadoresOperadoras: false })
        }
      },

      async addIndicadorOperadora(input) {
        const created = (await api.post(
          '/placement/indicadores-operadoras',
          input
        )) as PlacementIndicadorOperadora
        set((s) => ({ indicadoresOperadoras: [created, ...s.indicadoresOperadoras] }))
        return created
      },

      async updateIndicadorOperadora(id, input) {
        const updated = (await api.put(
          `/placement/indicadores-operadoras/${id}`,
          input
        )) as PlacementIndicadorOperadora
        set((s) => ({
          indicadoresOperadoras: s.indicadoresOperadoras.map((d) =>
            d.id === id ? { ...d, ...updated } : d
          ),
        }))
        return updated
      },

      async removeIndicadorOperadora(id) {
        await api.delete(`/placement/indicadores-operadoras/${id}`)
        set((s) => ({
          indicadoresOperadoras: s.indicadoresOperadoras.filter((d) => d.id !== id),
        }))
      },

      async upsertIndicadoresOperadorasBatch(items) {
        if (!items.length) return { synced: 0, skipped: 0, indicadores: [] }
        const resp = (await api.post('/placement/indicadores-operadoras/upsert-batch', { items })) as {
          synced?: number
          skipped?: number
          indicadores?: PlacementIndicadorOperadora[]
        }
        const upserted = resp?.indicadores ?? []
        if (upserted.length) {
          set((s) => {
            const keyOf = (d: PlacementIndicadorOperadora) => `${d.operadoraId}|${d.itemKey}`
            const byKey = new Map(s.indicadoresOperadoras.map((d) => [keyOf(d), d]))
            for (const row of upserted) byKey.set(keyOf(row), row)
            return {
              indicadoresOperadoras: Array.from(byKey.values()).sort((a, b) =>
                a.operadoraId.localeCompare(b.operadoraId)
              ),
              lastSyncIndicadoresOperadoras: Date.now(),
            }
          })
        }
        return {
          synced: resp?.synced ?? upserted.length,
          skipped: resp?.skipped ?? 0,
          indicadores: upserted,
        }
      },
    }),
    {
      name: 'placement-v1',
      partialize: (state) => ({
        filiais: state.filiais,
        corretoresParceiros: state.corretoresParceiros,
        prospects: state.prospects,
        condicoes: state.condicoes,
        tiposContratacao: state.tiposContratacao,
        modalidadesContrato: state.modalidadesContrato,
        prazosVigenciaContrato: state.prazosVigenciaContrato,
        projetos: state.projetos,
        pedidos: state.pedidos,
        temperaturas: state.temperaturas,
        lastSync: state.lastSync,
        lastSyncCorretores: state.lastSyncCorretores,
        lastSyncProspects: state.lastSyncProspects,
        lastSyncCondicoes: state.lastSyncCondicoes,
        lastSyncContratoCatalogos: state.lastSyncContratoCatalogos,
        lastSyncProjetosPedidos: state.lastSyncProjetosPedidos,
        analistas: state.analistas,
        lastSyncAnalistas: state.lastSyncAnalistas,
        planos: state.planos,
        lastSyncPlanos: state.lastSyncPlanos,
        diferenciais: state.diferenciais,
        lastSyncDiferenciais: state.lastSyncDiferenciais,
        condicoesContratuais: state.condicoesContratuais,
        lastSyncCondicoesContratuais: state.lastSyncCondicoesContratuais,
        indicadoresOperadoras: state.indicadoresOperadoras,
        lastSyncIndicadoresOperadoras: state.lastSyncIndicadoresOperadoras,
      }),
    }
  )
)
