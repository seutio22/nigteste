import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useNotificationStore } from './notificationStore'
import { createSafePersistStorage, removeLocalStorageByPrefix } from '../lib/safePersistStorage'
import { hasAuthToken } from '../lib/authSession'

export function clearComunicadoLocalCache(): void {
  removeLocalStorageByPrefix('comunicado-storage')
}

export interface Comunicado {
  id: string
  titulo: string
  conteudo: string
  categoria: 'Urgente' | 'Informativo' | 'Evento' | 'Manutenção'
  prioridade: 'Alta' | 'Média' | 'Baixa'
  autor: string
  autorId: string
  publicado: boolean
  dataPublicacao?: string
  dataExpiracao?: string
  tags: string[]
  comentarios: Array<{
    id: string
    autor: string
    autorId: string
    autorRole?: string
    conteudo: string
    dataCriacao: string
    status: string
  }>
  visualizacoes: Array<{
    id: string
    usuarioId: string
    usuarioNome: string
    usuarioRole: string
    dataVisualizacao: string
    tempoVisualizacao?: number // em segundos
    ipAddress?: string
    userAgent?: string
  }>
  createdAt: string
  updatedAt: string
}

interface ComunicadoState {
  items: Comunicado[]
  loading: boolean
  error: string | null
  lastSync: number
  fetchComunicados: () => Promise<void>
  fetchComunicado: (id: string) => Promise<Comunicado | null>
  add: (comunicado: Omit<Comunicado, 'id' | 'createdAt' | 'updatedAt' | 'comentarios' | 'visualizacoes'>) => Promise<Comunicado | null>
  update: (id: string, comunicado: Partial<Comunicado>) => Promise<void>
  publicarRascunho: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  clear: () => void
  clearError: () => void // Função para limpar erro
  clearAll: () => void // Função para limpar tudo
  registrarVisualizacao: (comunicadoId: string, usuario: { id: string; name: string; role: string }) => Promise<void>
  addComentario: (comunicadoId: string, comentario: Omit<Comunicado['comentarios'][0], 'id' | 'dataCriacao' | 'status'>) => Promise<void>
  removeComentario: (comunicadoId: string, comentarioId: string) => Promise<void>
  getEstatisticasVisualizacao: (comunicadoId: string) => {
    totalVisualizacoes: number
    visualizacoesUnicas: number
    tempoMedio: number
    usuariosRecorrentes: number
  }
  syncFromApi: () => Promise<void>
}

export const useComunicadoStore = create<ComunicadoState>()(
  persist(
    (set, get) => {
      
      return {
        items: [],
        loading: false,
        error: null,
        lastSync: 0,
        
        fetchComunicados: async () => {
          try {
            set({ loading: true, error: null })
            
            const { api } = await import('../lib/api.local')
            const comunicados = await api.getComunicados()
            
            // Mapear os dados para o formato esperado pelo frontend
            const comunicadosMapeados = comunicados.map((comunicado: any) => ({
              ...comunicado,
              // O campo autor já vem correto da API, não precisa mapear
            }))
            
            set({ items: comunicadosMapeados, loading: false })
          } catch (error) {
            console.error('Erro ao buscar comunicados:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
            set({ error: errorMessage, loading: false })
          }
        },
        
        fetchComunicado: async (id: string) => {
          try {
            const { api } = await import('../lib/api.local')
            const comunicado = await api.getComunicado(id)
            
            if (comunicado) {
              // Atualizar o item específico no store
              set((s) => ({
                items: s.items.map((c) => (c.id === id ? comunicado : c))
              }))
            }
            
            return comunicado
          } catch (error) {
            console.error('Erro ao buscar comunicado:', error)
            throw error
          }
        },

        add: async (payload) => {
          try {
            const { api } = await import('../lib/api.local')
            const novoComunicado = await api.createComunicado(payload)
            
            if (novoComunicado) {
              set((s) => ({ items: [novoComunicado, ...s.items] }))
              return novoComunicado
            } else {
              return null
            }
          } catch (error) {
            console.error('Erro ao adicionar comunicado:', error)
            throw error
          }
        },

        update: async (id: string, comunicado: Partial<Comunicado>) => {
          try {
            const { api } = await import('../lib/api.local')
            await api.updateComunicado(id, comunicado)
            
            // Atualizar no store local
            set((s) => ({
              items: s.items.map((c) => 
                c.id === id ? { ...c, ...comunicado, updatedAt: new Date().toISOString() } : c
              )
            }))
          } catch (error) {
            console.error('Erro ao atualizar comunicado:', error)
            throw error
          }
        },

        publicarRascunho: async (id: string) => {
          try {
            const { api } = await import('../lib/api.local')
            const dataPublicacao = new Date().toISOString()
            
            await api.updateComunicado(id, {
              publicado: true,
              dataPublicacao
            })
            
            // Atualizar no store local
            set((s) => ({
              items: s.items.map((c) => 
                c.id === id ? { 
                  ...c, 
                  publicado: true, 
                  dataPublicacao,
                  updatedAt: new Date().toISOString() 
                } : c
              )
            }))
            
            console.log('✅ Rascunho publicado com sucesso')
          } catch (error) {
            console.error('❌ Erro ao publicar rascunho:', error)
            throw error
          }
        },

        remove: async (id: string) => {
          try {
            const { api } = await import('../lib/api.local')
            await api.deleteComunicado(id)
            
            // Remover do store local de forma segura
            set((state) => {
              const newItems = state.items.filter((c) => c.id !== id)
              return { items: newItems }
            })
          } catch (error) {
            console.error('Erro ao remover comunicado:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
            set({ error: errorMessage })
            throw error
          }
        },
        
        clear: () => set({ items: [], lastSync: 0 }),
        
        addComentario: async (comunicadoId, comentario) => {
          try {
            const { api } = await import('../lib/api.local')
            await api.addComentario(comunicadoId, comentario)
            
            // Buscar comunicado atualizado
            await get().fetchComunicado(comunicadoId)
          } catch (error) {
            console.error('Erro ao adicionar comentário:', error)
            set({ error: error instanceof Error ? error.message : 'Erro desconhecido' })
          }
        },
        
        removeComentario: async (comunicadoId, comentarioId) => {
          try {
            const { api } = await import('../lib/api.local')
            await api.removeComentario(comunicadoId, comentarioId)
            
            // Buscar comunicado atualizado
            await get().fetchComunicado(comunicadoId)
          } catch (error) {
            console.error('Erro ao remover comentário:', error)
            set({ error: error instanceof Error ? error.message : 'Erro desconhecido' })
          }
        },
        
        
        registrarVisualizacao: async (comunicadoId, usuario) => {
          try {
            // Verificar se já existe uma visualização para este usuário neste comunicado
            const comunicado = get().items.find(c => c.id === comunicadoId)
            if (comunicado?.visualizacoes?.some(v => v.usuarioId === usuario.id)) {
              return
            }
            
            const { api } = await import('../lib/api.local')
            await api.registrarVisualizacao(comunicadoId, {
              usuarioId: usuario.id,
              usuarioNome: usuario.name,
              usuarioRole: usuario.role
            })
          } catch (error) {
            console.error('Erro ao registrar visualização:', error)
            // Não definir erro para visualizações, pois não é crítico
          }
        },
        
        getEstatisticasVisualizacao: (comunicadoId) => {
          const comunicado = get().items.find(c => c.id === comunicadoId)
          
          if (!comunicado) {
            return {
              totalVisualizacoes: 0,
              visualizacoesUnicas: 0,
              tempoMedio: 0,
              usuariosRecorrentes: 0
            }
          }
          
          const totalVisualizacoes = comunicado.visualizacoes.length
          const usuariosUnicos = new Set(comunicado.visualizacoes.map(v => v.usuarioId))
          const visualizacoesUnicas = usuariosUnicos.size
          
          // Calcular usuários recorrentes (mais de 1 visualização)
          const contagemUsuarios = comunicado.visualizacoes.reduce((acc, v) => {
            acc[v.usuarioId] = (acc[v.usuarioId] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          
          const usuariosRecorrentes = Object.values(contagemUsuarios).filter(count => count > 1).length
          
          // Tempo médio (se disponível)
          const tempos = comunicado.visualizacoes.filter(v => v.tempoVisualizacao).map(v => v.tempoVisualizacao!)
          const tempoMedio = tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : 0
          
          return {
            totalVisualizacoes,
            visualizacoesUnicas,
            tempoMedio: Math.round(tempoMedio),
            usuariosRecorrentes
          }
        },

        syncFromApi: async () => {
          try {
            const state = get()
            const now = Date.now()
            if (now - state.lastSync < 2 * 60 * 1000) return
            // Limpar estado antes de começar
            set({ loading: true, error: null })
            
            await get().fetchComunicados()
            set({ lastSync: now })
          } catch (error) {
            console.error('Erro ao sincronizar comunicados:', error)
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
            set({ error: errorMessage, loading: false })
          }
        },
        
        clearError: () => set({ error: null }), // Função para limpar erro
        
        // Função para limpar completamente o localStorage e forçar nova sincronização
        clearAll: () => {
          clearComunicadoLocalCache()
          set({ items: [], loading: false, error: null, lastSync: 0 })
        }
      }
    },
    {
      name: 'comunicado-storage',
      version: 6,
      partialize: (state) => ({ lastSync: state.lastSync }),
      migrate: (persisted, version) => {
        if (version < 6) return { lastSync: 0 }
        return persisted as { lastSync: number }
      },
      storage: createSafePersistStorage<Pick<ComunicadoState, 'lastSync'>>('comunicado-storage', {
        onQuotaExceeded: clearComunicadoLocalCache,
      }),
      onRehydrateStorage: () => () => {
        queueMicrotask(() => {
          if (!hasAuthToken()) return
          const s = useComunicadoStore.getState()
          if (s.items.length === 0 && !s.loading) {
            void s.syncFromApi()
          }
        })
      },
    }
  )
)
