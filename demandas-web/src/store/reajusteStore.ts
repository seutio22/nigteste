import { create } from 'zustand'
import type { ReajusteEntry } from '../types/reajuste'
import { useTimelineStore } from './timelineStore'
import { useAuthStore } from './authStore'
import { useMasterDataStore } from './masterDataStore'
import { api } from '../lib/api'

interface ReajusteState {
  items: ReajusteEntry[]
  add: (e: Omit<ReajusteEntry, 'id' | 'createdAt'>) => Promise<ReajusteEntry>
  remove: (id: string | string[]) => Promise<void>
  upsert: (entry: ReajusteEntry) => Promise<void>
  log: (entry: { reajusteId: string; type: string; field: string; from: unknown; to: unknown }) => void
  syncFromApi: () => Promise<void>
}

export const useReajusteStore = create<ReajusteState>()(
  (set, get) => ({
      items: [],
      
      add: async (payload) => {
        try {
          console.log('🔍 ReajusteStore.add: Iniciando criação de reajuste...')
          console.log('🔍 ReajusteStore.add: Payload recebido:', payload)
          
          // Sanitizar payload: converter strings vazias em null e garantir formato ISO de datas
          const sanitizedPayload = Object.entries(payload).reduce((acc, [key, value]) => {
            // Campos de data que precisam ser convertidos
            if (['dataInicio', 'dataFim', 'dataAtualizacao', 'dataAplicacao'].includes(key)) {
              if (!value || value === '') {
                acc[key] = null
              } else {
                // Se já é uma data válida em formato ISO, manter
                // Se é uma string de data (YYYY-MM-DD), converter para ISO
                try {
                  const date = new Date(value as string)
                  acc[key] = date.toISOString()
                } catch {
                  acc[key] = null
                }
              }
            } else if (value === '' || value === undefined) {
              // Converter strings vazias e undefined em null
              acc[key] = null
            } else {
              acc[key] = value
            }
            return acc
          }, {} as any)
          
          console.log('🔍 ReajusteStore.add: Payload sanitizado:', sanitizedPayload)
          
          // Salvar no banco de dados primeiro
          const response = await api.post('/reajusteLancamentos', sanitizedPayload)
          console.log('✅ ReajusteStore.add: Resposta da API:', response)
          console.log('✅ ReajusteStore.add: Tipo da resposta:', typeof response)
          
          // A resposta pode vir como response.data ou diretamente como response
          const data = response?.data || response
          console.log('✅ ReajusteStore.add: Data extraído:', data)
          
          const entry: ReajusteEntry = {
            id: data?.id || crypto.randomUUID(),
            createdAt: data?.createdAt || new Date().toISOString(),
            ...payload
          }
          
          console.log('✅ ReajusteStore.add: Entry criado:', entry)
          
          // Adicionar ao estado local
          set((s) => ({ items: [entry, ...s.items] }))
          console.log('✅ ReajusteStore.add: Reajuste adicionado ao estado local')
          
          // Registrar evento de criação na timeline
          const timelineStore = useTimelineStore.getState()
          const authStore = useAuthStore.getState()
          timelineStore.addEvent({
            reajusteId: entry.id,
            type: 'create',
            comment: `Reajuste criado: ${entry.mes}/${entry.ano}`,
            user: authStore.user?.name || 'Administrador'
          })
          
          console.log('✅ ReajusteStore.add: Reajuste criado com sucesso! ID:', entry.id)
          return entry
        } catch (error) {
          console.error('❌ ReajusteStore.add: Erro ao criar reajuste:', error)
          throw error
        }
      },
      
      remove: async (id) => {
        const ids = Array.isArray(id) ? id : [id]
        console.log('🗑️ Removendo reajuste:', ids)
        
        // Remover do estado local imediatamente (otimista)
        const idSet = new Set(ids)
        set((s) => ({ items: s.items.filter((x) => !idSet.has(x.id)) }))
        console.log('✅ Reajuste removido do estado local')
        
        try {
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          // Excluir do backend
          for (const targetId of ids) {
            try {
              await api.deleteReajuste(targetId)
              console.log('✅ Reajuste excluído com sucesso no backend:', targetId)
            } catch (error: any) {
              if (error?.statusCode === 404) {
                console.log('⚠️ Reajuste não encontrado no backend (já foi deletado), continuando...', targetId)
                continue
              }
              throw error
            }
          }
          
        } catch (error: any) {
          // Se erro 404, o registro já foi deletado ou não existe - ignorar (já tratado no loop)
          if (error?.statusCode === 404) {
            return
          }
          console.error('⚠️ Erro ao excluir reajuste no backend:', error)
        }
      },
      
      upsert: async (entry) => {
        try {
          const existing = get().items.find((x) => x.id === entry.id)
          
          if (existing) {
            console.log('🔄 ReajusteStore.upsert: Atualizando reajuste existente:', entry.id)
            
            // Função para normalizar valores (converter vazio em null)
            const normalize = (val: any): any => {
              if (val === '' || val === undefined || val === null) return null
              return val
            }
            
            // Identificar campos alterados (ignorar mudanças de vazio para vazio)
            const changes: string[] = []
            Object.keys(entry).forEach(key => {
              // Ignorar campos de sistema que não devem ser logados
              if (['id', 'createdAt', 'updatedAt'].includes(key)) return
              
              const oldVal = normalize(existing[key as keyof ReajusteEntry])
              const newVal = normalize(entry[key as keyof ReajusteEntry])
              
              // Só adicionar se houve mudança real
              if (oldVal !== newVal) {
                changes.push(key)
              }
            })
            
            console.log('🔄 ReajusteStore.upsert: Campos alterados:', changes)
            
            // Sanitizar entry: converter strings vazias em null e garantir formato ISO de datas
            const sanitizedEntry = Object.entries(entry).reduce((acc, [key, value]) => {
              // Campos de data que precisam ser convertidos
              if (['dataInicio', 'dataFim', 'dataAtualizacao', 'dataAplicacao'].includes(key)) {
                if (!value || value === '') {
                  acc[key] = null
                } else {
                  // Se já é uma data válida em formato ISO, manter
                  // Se é uma string de data (YYYY-MM-DD), converter para ISO
                  try {
                    const date = new Date(value as string)
                    acc[key] = date.toISOString()
                  } catch {
                    acc[key] = null
                  }
                }
              } else if (value === '' || value === undefined) {
                // Converter strings vazias e undefined em null
                acc[key] = null
              } else {
                acc[key] = value
              }
              return acc
            }, {} as any)
            
            console.log('🔍 ReajusteStore.upsert: Entry sanitizado:', sanitizedEntry)
            
            // Atualizar no banco de dados
            const response = await api.put(`/reajusteLancamentos/${entry.id}`, sanitizedEntry)
            console.log('✅ ReajusteStore.upsert: Reajuste atualizado no banco de dados')
            console.log('✅ ReajusteStore.upsert: Resposta da API:', response)
            
            // Atualizar estado local
            set((s) => ({
              items: s.items.map((x) =>
                x.id === entry.id ? { ...entry, updatedAt: new Date().toISOString() } : x
              )
            }))
            
            // NÃO registrar eventos automaticamente aqui
            // O logging será feito manualmente na página Detail.tsx apenas para campos realmente alterados
            console.log('✅ ReajusteStore.upsert: Atualização concluída (sem log automático)')
          } else {
            console.log('🆕 ReajusteStore.upsert: Criando novo reajuste')
            await get().add(entry)
          }
        } catch (error) {
          console.error('❌ ReajusteStore.upsert: Erro ao atualizar reajuste:', error)
          throw error
        }
      },
      
      log: (entry) => {
        const timelineStore = useTimelineStore.getState()
        timelineStore.addEvent(entry)
      },
      
      syncFromApi: async () => {
        try {
          console.log('🔍 ReajusteStore: Iniciando syncFromApi...')
          
          const response = await api.get('/reajusteLancamentos')
          console.log('🔍 ReajusteStore: Resposta bruta da API:', response)
          console.log('🔍 ReajusteStore: Tipo da resposta:', typeof response, Array.isArray(response) ? '(array)' : '')
          
          // A resposta pode vir como array diretamente ou como response.data
          const reajustes = Array.isArray(response) ? response : (response?.data || [])
          
          console.log('🔍 ReajusteStore: Dados recebidos da API:', reajustes.length, 'itens')
          console.log('🔍 ReajusteStore: Dados:', reajustes)
          
          set({ items: reajustes })
          
          console.log('✅ ReajusteStore: syncFromApi concluído com sucesso!')
        } catch (error) {
          console.error('❌ ReajusteStore: Erro no syncFromApi:', error)
          // Em caso de erro, manter dados locais
        }
      },
    })
  )


