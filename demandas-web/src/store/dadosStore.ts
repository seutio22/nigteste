import { create } from 'zustand'

export interface DadosItem {
  id: string
  tipo: 'configuracao' | 'parametro' | 'configuracaoSistema'
  chave: string
  valor: string
  descricao?: string
  categoria?: 'sistema' | 'negocio' | 'interface' | 'seguranca'
  ativo: boolean
  dataInicio: string
  dataFim?: string
  criadoPor?: string
  atualizadoPor?: string
  createdAt: string
  updatedAt: string
}

interface DadosState {
  items: DadosItem[]
  add: (item: Omit<DadosItem, 'id' | 'createdAt' | 'updatedAt'>) => DadosItem
  update: (id: string, updates: Partial<DadosItem>) => void
  remove: (id: string) => void
  upsert: (item: DadosItem) => void
  getByTipo: (tipo: DadosItem['tipo']) => DadosItem[]
  getByCategoria: (categoria: DadosItem['categoria']) => DadosItem[]
  getByChave: (chave: string) => DadosItem | undefined
  syncFromApi: () => Promise<void>
}

export const useDadosStore = create<DadosState>()(
  (set, get) => ({
      items: [],
      
      add: (payload) => {
        const item: DadosItem = {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...payload
        }
        set((state) => ({ items: [item, ...state.items] }))
        return item
      },
      
      update: (id, updates) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
          )
        }))
      },
      
      remove: (id) => {
        set((state) => ({ 
          items: state.items.filter((item) => item.id !== id) 
        }))
      },
      
      upsert: (item) => {
        const existing = get().items.find((i) => i.id === item.id)
        if (existing) {
          get().update(item.id, item)
        } else {
          get().add(item)
        }
      },
      
      getByTipo: (tipo) => {
        return get().items.filter(item => item.tipo === tipo)
      },
      
      getByCategoria: (categoria) => {
        return get().items.filter(item => item.categoria === categoria)
      },
      
      getByChave: (chave) => {
        return get().items.find(item => item.chave === chave)
      },
      
      async syncFromApi() {
        try {
          console.log('🔍 DadosStore: Iniciando syncFromApi...')
          const { api } = await import('../lib/api.local')
          
          console.log('🔍 DadosStore: Chamando API de dados...')
          const dados = await api.getDados()
          
          console.log('🔍 DadosStore: Dados recebidos:', dados.length, 'dados')
          if (dados.length > 0) {
            console.log('🔍 DadosStore: Primeiro dado:', dados[0])
          }
          
          // Se a API retornou array vazio, aceitar (banco pode estar vazio)
          if (dados.length === 0) {
            console.log('🔍 DadosStore: API retornou array vazio - banco pode estar vazio')
            
            // Se não há dados no banco, manter dados locais existentes
            const currentItems = get().items
            if (currentItems.length > 0) {
              console.log('🔍 DadosStore: Mantendo dados locais existentes (banco vazio)')
              console.log('🔍 DadosStore: Dados locais mantidos:', currentItems.length, 'itens')
            } else {
              console.log('🔍 DadosStore: Aplicando array vazio (nenhum dado local ou no banco)')
              set({ items: [] })
            }
            
            console.log('✅ DadosStore: syncFromApi concluído com sucesso!')
            return
          }
          
          // Mapear os dados para o formato esperado pelo frontend
          const dadosMapeados = dados.map((dado: any) => ({
            id: dado.id,
            tipo: dado.tipo || 'configuracao',
            chave: dado.chave || '',
            valor: dado.valor || '',
            descricao: dado.descricao || '',
            categoria: dado.categoria || 'sistema',
            ativo: dado.ativo !== undefined ? dado.ativo : true,
            dataInicio: dado.dataInicio || dado.createdAt || new Date().toISOString(),
            dataFim: dado.dataFim || undefined,
            criadoPor: dado.criadoPor || undefined,
            atualizadoPor: dado.atualizadoPor || undefined,
            createdAt: dado.createdAt || new Date().toISOString(),
            updatedAt: dado.updatedAt || new Date().toISOString()
          }))
          
          console.log('🔍 DadosStore: Dados mapeados:', dadosMapeados.length, 'dados')
          if (dadosMapeados.length > 0) {
            console.log('🔍 DadosStore: Primeiro dado mapeado:', dadosMapeados[0])
          }
          
          console.log('🔍 DadosStore: Aplicando dados ao store...')
          set({ items: dadosMapeados })
          
          console.log('✅ DadosStore: syncFromApi concluído com sucesso!')
        } catch (error) {
          console.error('❌ DadosStore: Erro no syncFromApi:', error)
          console.log('🔍 DadosStore: Erro na sincronização, mantendo dados existentes')
          // Em caso de erro, manter dados existentes em vez de limpar
        }
      }
    })
  )
