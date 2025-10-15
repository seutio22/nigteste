import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ValidationEntry } from '../types/validation'

interface ValidationLog {
  validationId: string
  type: string
  field: string
  from: unknown
  to: unknown
  timestamp: string
  user?: string
  userName?: string
}

interface ValidationState {
  items: ValidationEntry[]
  logs: ValidationLog[]
  loading: boolean
  error: string | null
  add: (e: Omit<ValidationEntry, 'id' | 'createdAt'>) => Promise<ValidationEntry>
  remove: (id: string) => Promise<void>
  clear: () => void
  clearError: () => void
  upsert: (entry: ValidationEntry) => Promise<void>
  log: (entry: { validationId: string; type: string; field: string; from: unknown; to: unknown; user?: string; userName?: string }) => void
  syncFromApi: () => Promise<void>
  syncTimeline: (validationId: string) => Promise<void>
  saveValidationToDatabase: (validation: ValidationEntry) => Promise<void>
  updateValidationInDatabase: (validation: ValidationEntry) => Promise<void>
}

export const useValidationStore = create<ValidationState>()(
  persist(
    (set, get) => ({
      items: [],
      logs: [],
      loading: false,
      error: null,
      add: async (payload: Omit<ValidationEntry, 'id' | 'createdAt'>) => {
        try {
          console.log('🔄 Adicionando nova validação:', payload)
          console.log('🔄 Estrutura EDGE no payload:', payload.estruturaEdge)
          console.log('🔄 Estrutura MOVE no payload:', payload.estruturaMove)
          
          const entry: ValidationEntry = { 
            id: crypto.randomUUID(), 
            createdAt: new Date().toISOString(), 
            ...payload 
          }
          
          console.log('📝 Validação criada localmente:', entry.id)
          console.log('📝 Estrutura EDGE na entrada:', entry.estruturaEdge)
          console.log('📝 Estrutura MOVE na entrada:', entry.estruturaMove)
          set((s) => ({ items: [entry, ...s.items] }))
          
          // Salvar no banco de dados
          console.log('💾 Salvando no banco de dados...')
          await get().saveValidationToDatabase(entry)
          
          console.log('✅ Validação adicionada com sucesso!')
          return entry
        } catch (error) {
          console.error('❌ Erro ao adicionar validação:', error)
          set({ error: `Erro ao adicionar validação: ${error}` })
          throw error
        }
      },
      
      // Função para salvar validação no banco - seguindo padrão do demandStore
      saveValidationToDatabase: async (validation: ValidationEntry) => {
        try {
          console.log('🔄 Salvando nova validação no banco:', validation.id)
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          // Função para validar e limpar campos de data
          const cleanDateField = (dateValue: any) => {
            if (!dateValue || dateValue === 'N/A' || dateValue === '') {
              return undefined
            }
            if (typeof dateValue === 'string') {
              const date = new Date(dateValue)
              return isNaN(date.getTime()) ? undefined : dateValue
            }
            return dateValue
          }

          // Função para converter strings para números
          const parseNumber = (value: any) => {
            if (value === null || value === undefined || value === '') return null
            if (typeof value === 'number') return value
            if (typeof value === 'string') {
              const parsed = parseInt(value, 10)
              return isNaN(parsed) ? null : parsed
            }
            return null
          }

          const requestBody = {
            demandaId: validation.demanda,
            analistaId: typeof validation.analista === 'object' ? validation.analista?.id : validation.analista,
            status: validation.status,
            dataInicio: cleanDateField(validation.dataInicio),
            dataFim: cleanDateField(validation.dataFinal),
            observacoes: validation.observacoes,
            clienteId: validation.cliente,
            contratoId: validation.contrato,
            operadoraId: validation.operadora,
            produtoId: validation.produto,
            estruturaEdge: validation.estruturaEdge,
            estruturaMove: validation.estruturaMove,
            formalizacao: validation.formalizacao,
            itensPendentes: parseNumber(validation.itensPendentes),
            itensConcluidos: parseNumber(validation.itensConcluidos),
            total: parseNumber(validation.total),
            ticket: validation.ticket,
            solicitante: validation.solicitante,
            tipo: validation.tipo,
            descricao: validation.descricao,
            qualidade: validation.qualidade,
            qtdRetornos: parseNumber(validation.qtdRetornos),
            vigencia: cleanDateField(validation.vigencia)
          }
          
          console.log('📤 Enviando requisição POST via API:', requestBody)
          
          const responseData = await api.createValidacao(requestBody)
          console.log('✅ Validação criada com sucesso no banco:', responseData)
          
          // Recarregar dados da API após salvar
          await get().syncFromApi()
          
        } catch (error) {
          console.error('❌ Erro ao criar validação:', error)
          set({ error: `Erro ao criar validação: ${error}` })
        }
      },

      // Função para atualizar validação no banco - seguindo padrão do demandStore
      updateValidationInDatabase: async (validation: ValidationEntry) => {
        try {
          console.log('🔄 Atualizando validação no banco:', validation.id)
          console.log('🔄 Dados completos da validação:', validation)
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          // Função para validar e limpar campos de data
          const cleanDateField = (dateValue: any) => {
            if (!dateValue || dateValue === 'N/A' || dateValue === '') {
              return undefined
            }
            if (typeof dateValue === 'string') {
              const date = new Date(dateValue)
              return isNaN(date.getTime()) ? undefined : dateValue
            }
            return dateValue
          }

          // Função para converter strings para números
          const parseNumber = (value: any) => {
            if (value === null || value === undefined || value === '') return null
            if (typeof value === 'number') return value
            if (typeof value === 'string') {
              const parsed = parseInt(value, 10)
              return isNaN(parsed) ? null : parsed
            }
            return null
          }

          const requestBody = {
            analistaId: typeof validation.analista === 'object' ? validation.analista?.id : validation.analista,
            status: validation.status,
            dataInicio: cleanDateField(validation.dataInicio),
            dataFim: cleanDateField(validation.dataFinal),
            observacoes: validation.observacoes,
            clienteId: validation.cliente,
            contratoId: validation.contrato,
            operadoraId: validation.operadora,
            produtoId: validation.produto,
            estruturaEdge: Array.isArray(validation.estruturaEdge) && validation.estruturaEdge.length > 0 ? validation.estruturaEdge : null,
            estruturaMove: Array.isArray(validation.estruturaMove) && validation.estruturaMove.length > 0 ? validation.estruturaMove : null,
            formalizacao: validation.formalizacao,
            itensPendentes: parseNumber(validation.itensPendentes),
            itensConcluidos: parseNumber(validation.itensConcluidos),
            total: parseNumber(validation.total),
            ticket: validation.ticket,
            solicitante: validation.solicitante,
            tipo: validation.tipo,
            descricao: validation.descricao,
            qualidade: validation.qualidade,
            qtdRetornos: parseNumber(validation.qtdRetornos),
            vigencia: cleanDateField(validation.vigencia)
          }
          
          console.log('📤 Enviando requisição PUT via API para ID:', validation.id)
          console.log('📤 Request body:', JSON.stringify(requestBody, null, 2))
          
          const responseData = await api.updateValidacao(validation.id, requestBody)
          console.log('✅ Validação atualizada com sucesso no banco!')
          console.log('✅ Resposta da API:', responseData)
          
          // Recarregar dados da API após atualizar
          console.log('🔄 Recarregando dados da API...')
          await get().syncFromApi()
          console.log('✅ Dados recarregados!')
          
        } catch (error) {
          console.error('❌ Erro ao atualizar validação:', error)
          console.error('❌ Stack trace:', error.stack)
          set({ error: `Erro ao atualizar validação: ${error}` })
        }
      },

      remove: async (id: string) => {
        try {
          console.log('🗑️ Removendo validação:', id)
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          await api.deleteValidacao(id)
          console.log('✅ Validação excluída com sucesso no banco')
          
          // Remover do estado local
          set((s) => ({ items: s.items.filter((x) => x.id !== id) }))
          
        } catch (error) {
          console.error('❌ Erro ao excluir validação:', error)
          set({ error: `Erro ao excluir validação: ${error}` })
        }
      },
      
      clear: () => set({ items: [], logs: [] }),
      clearError: () => set({ error: null }),
      
      upsert: async (entry: ValidationEntry) => {
        console.log('🔄 upsert chamado para:', entry.id)
        console.log('🔄 Dados recebidos no upsert:', entry)
        
        const existing = get().items.find((x) => x.id === entry.id)
        console.log('🔍 Item existente encontrado:', !!existing)
        
        if (existing) {
          console.log('📝 Atualizando item existente no banco...')
          console.log('📝 Dados originais:', existing)
          console.log('📝 Dados novos:', entry)
          
          // Atualizar no banco de dados
          await get().updateValidationInDatabase(entry)
          
          // Atualizar estado local
          set((s) => ({
            items: s.items.map((x) =>
              x.id === entry.id ? { ...entry, updatedAt: new Date().toISOString() } : x
            )
          }))
          console.log('✅ Estado local atualizado')
        } else {
          console.log('➕ Adicionando novo item...')
          get().add(entry)
        }
      },
      
      log: async (entry: { validationId: string; type: string; field: string; from: unknown; to: unknown }) => {
        const logEntry: ValidationLog = {
          ...entry,
          timestamp: new Date().toISOString()
        }
        
        // Adicionar ao store local imediatamente
        set((s) => ({ logs: [logEntry, ...s.logs] }))
        
        // Salvar no banco de dados em background
        try {
          const { api } = await import('../lib/api.local')
          const { useAuthStore } = await import('./authStore')
          const user = useAuthStore.getState().user
          
          await api.createTimelineEvent({
            entityId: entry.validationId,
            entityType: 'validacao',
            eventType: entry.type,
            field: entry.field,
            fromValue: String(entry.from ?? ''),
            toValue: String(entry.to ?? ''),
            comment: undefined,
            userId: user?.id
          })
          
          console.log('✅ Evento de timeline de validação salvo no banco:', logEntry)
        } catch (error) {
          console.error('❌ Erro ao salvar evento de timeline no banco:', error)
        }
      },
      
      syncFromApi: async () => {
        const state = get()
        if (state.loading) {
          return
        }
        
        try {
          set({ loading: true, error: null })
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          const validacoes = await api.getValidacoes()
          console.log('🔍 ValidationStore: Dados recebidos da API:', validacoes.length, 'itens')
          
          // Mapear os dados para o formato esperado pelo frontend - seguindo padrão do demandStore
          const validacoesMapeadas: ValidationEntry[] = validacoes.map((validacao: any) => ({
            id: validacao.id,
            analista: validacao.analista || { nome: 'N/A' },
            dataInicio: validacao.dataInicio,
            dataFinal: validacao.dataFim,
            status: validacao.status,
            observacoes: validacao.observacoes,
            demanda: validacao.demandaId,
            ticket: validacao.ticket || `VAL-${validacao.id.slice(0, 8)}`,
            solicitante: validacao.solicitante || undefined,
            tipo: validacao.tipo || 'Validação',
            descricao: validacao.descricao || 'Validação de demanda',
            qualidade: validacao.qualidade || undefined,
            qtdRetornos: validacao.qtdRetornos || 0,
            vigencia: validacao.vigencia || undefined,
            total: validacao.total || 0,
            // Campos adicionais para compatibilidade
            area: validacao.area || 'N/A',
            sistema: validacao.sistema || 'N/A',
            localizacao: validacao.localizacao || 'N/A',
            // Objetos completos dos relacionamentos - API já retorna com include
            cliente: validacao.cliente,
            contrato: validacao.contrato,
            operadora: validacao.operadora,
            produto: validacao.produto,
            // Campos para compatibilidade com formulário
            clienteId: validacao.clienteId,
            contratoId: validacao.contratoId,
            operadoraId: validacao.operadoraId,
            produtoId: validacao.produtoId,
            // Novos campos para estruturas EDGE, MOVE e formalização
            estruturaEdge: (() => {
              console.log('🔍 Estrutura EDGE da API:', validacao.estruturaEdge, 'Tipo:', typeof validacao.estruturaEdge)
              if (!validacao.estruturaEdge) return []
              if (typeof validacao.estruturaEdge === 'string') {
                try {
                  const parsed = JSON.parse(validacao.estruturaEdge)
                  console.log('✅ Estrutura EDGE parseada:', parsed)
                  return parsed
                } catch (e) {
                  console.error('❌ Erro ao fazer parse da estrutura EDGE:', e)
                  return []
                }
              }
              return validacao.estruturaEdge
            })(),
            estruturaMove: (() => {
              console.log('🔍 Estrutura MOVE da API:', validacao.estruturaMove, 'Tipo:', typeof validacao.estruturaMove)
              if (!validacao.estruturaMove) return []
              if (typeof validacao.estruturaMove === 'string') {
                try {
                  const parsed = JSON.parse(validacao.estruturaMove)
                  console.log('✅ Estrutura MOVE parseada:', parsed)
                  return parsed
                } catch (e) {
                  console.error('❌ Erro ao fazer parse da estrutura MOVE:', e)
                  return []
                }
              }
              return validacao.estruturaMove
            })(),
            formalizacao: validacao.formalizacao,
            itensPendentes: validacao.itensPendentes,
            itensConcluidos: validacao.itensConcluidos,
            createdAt: validacao.createdAt,
            updatedAt: validacao.updatedAt
          }));
          
          // Aplicar dados ao store
          set({ items: validacoesMapeadas, loading: false })
          console.log('✅ ValidationStore: syncFromApi concluído com sucesso!')
          
        } catch (error) {
          console.error('❌ ValidationStore: Erro no syncFromApi:', error)
          set({ error: error instanceof Error ? error.message : 'Erro desconhecido', loading: false })
        }
      },
      async syncTimeline(validationId: string) {
        try {
          console.log('🔄 Sincronizando timeline da validação:', validationId)
          
          const { api } = await import('../lib/api.local')
          const events = await api.getTimelineEvents(validationId, 'validacao')
          
          console.log('✅ Timeline sincronizada:', events.length, 'eventos do banco')
          
          const mappedEvents = events.map((event: any) => ({
            validationId: event.entityId,
            type: event.eventType,
            field: event.field || '',
            from: event.fromValue,
            to: event.toValue,
            timestamp: event.createdAt,
            user: event.userName || event.userId || 'Usuário desconhecido'
          }))
          
          set((s) => {
            const otherEvents = s.logs.filter((e: any) => e.validationId !== validationId)
            const localEvents = s.logs.filter((e: any) => e.validationId === validationId)
            const mergedEvents = [...mappedEvents]
            
            localEvents.forEach(localEvent => {
              const existsInBank = mappedEvents.some(bankEvent => {
                const timeDiff = Math.abs(new Date(bankEvent.timestamp).getTime() - new Date(localEvent.timestamp).getTime())
                return timeDiff < 5000 &&
                       bankEvent.field === localEvent.field &&
                       bankEvent.from === localEvent.from &&
                       bankEvent.to === localEvent.to
              })
              if (!existsInBank) mergedEvents.push(localEvent)
            })
            
            return { logs: [...mergedEvents, ...otherEvents] }
          })
        } catch (error) {
          console.error('❌ Erro ao sincronizar timeline de validação:', error)
        }
      }
    }),
    { 
      name: 'validation-storage',
      version: 6, // Incrementar versão para forçar limpeza
      partialize: (state) => ({ 
        // Não persistir items, apenas configurações
        logs: state.logs 
      })
    }
  )
)