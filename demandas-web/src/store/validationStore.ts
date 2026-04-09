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

function mapApiValidacaoToEntry(validacao: any): ValidationEntry {
  const parseArray = (v: any) => {
    if (!v) return []
    if (typeof v === 'string') {
      try { return Array.isArray(JSON.parse(v)) ? JSON.parse(v) : [] } catch { return [] }
    }
    return Array.isArray(v) ? v : []
  }
  const analistaId = validacao.analistaId ?? (typeof validacao.analista === 'object' ? validacao.analista?.id : validacao.analista)
  return {
    id: validacao.id,
    analistaId,
    analista: validacao.analista || validacao.analistaId || { nome: 'N/A' },
    dataInicio: validacao.dataInicio,
    dataFinal: validacao.dataFim,
    status: validacao.status,
    observacoes: validacao.observacoes,
    demanda: validacao.demandaId,
    ticket: validacao.ticket || `VAL-${validacao.id?.slice(0, 8) || ''}`,
    solicitante: validacao.solicitante || undefined,
    tipo: validacao.tipo || '',
    descricao: validacao.descricao || 'Validação de demanda',
    qualidade: validacao.qualidade || undefined,
    qtdRetornos: validacao.qtdRetornos || 0,
    vigencia: validacao.vigencia || undefined,
    total: validacao.total || 0,
    area: validacao.area || 'N/A',
    sistema: validacao.sistema || 'N/A',
    localizacao: validacao.localizacao || 'N/A',
    clienteId: validacao.clienteId,
    contratoId: validacao.contratoId,
    operadoraId: validacao.operadoraId,
    produtoId: validacao.produtoId,
    cliente: validacao.cliente || validacao.clienteObj || validacao.clienteId,
    contrato: validacao.contrato || validacao.contratoObj || validacao.contratoId,
    operadora: validacao.operadora || validacao.operadoraObj || validacao.operadoraId,
    produto: validacao.produto || validacao.produtoObj || validacao.produtoId,
    estruturaEdge: parseArray(validacao.estruturaEdge),
    estruturaMove: parseArray(validacao.estruturaMove),
    formalizacao: validacao.formalizacao,
    itensPendentes: validacao.itensPendentes,
    itensConcluidos: validacao.itensConcluidos,
    createdAt: validacao.createdAt,
    updatedAt: validacao.updatedAt
  }
}

interface ValidationState {
  items: ValidationEntry[]
  logs: ValidationLog[]
  loading: boolean
  error: string | null
  lastSync: number
  add: (e: Omit<ValidationEntry, 'id' | 'createdAt'>) => Promise<ValidationEntry>
  remove: (id: string) => Promise<void>
  clear: () => void
  clearError: () => void
  upsert: (entry: ValidationEntry) => Promise<void>
  log: (entry: { validationId: string; type: string; field: string; from: unknown; to: unknown; user?: string; userName?: string }) => void
  syncFromApi: (opts?: { force?: boolean }) => Promise<void>
  syncTimeline: (validationId: string) => Promise<void>
  saveValidationToDatabase: (validation: ValidationEntry) => Promise<ValidationEntry | undefined>
  updateValidationInDatabase: (validation: ValidationEntry) => Promise<unknown>
}

export const useValidationStore = create<ValidationState>()(
  persist(
    (set, get) => ({
      items: [],
      logs: [],
      loading: false,
      error: null,
      lastSync: 0,
      add: async (payload: Omit<ValidationEntry, 'id' | 'createdAt'>) => {
        try {
          const entry: ValidationEntry = { 
            id: crypto.randomUUID(), 
            createdAt: new Date().toISOString(), 
            ...payload 
          }
          const created = await get().saveValidationToDatabase(entry)
          if (!created?.id) throw new Error('API não retornou ID da validação criada')
          const mapped = mapApiValidacaoToEntry(created)
          set((s) => ({ items: [mapped, ...s.items] }))
          return mapped
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

          // Função para limpar ticket (converter string vazia em null)
          const cleanTicket = (ticketValue: any) => {
            if (!ticketValue || typeof ticketValue !== 'string') return null
            const trimmed = ticketValue.trim()
            return trimmed === '' ? null : trimmed
          }

          const requestBody = {
            id: validation.id,
            demandaId: validation.demanda,
            analistaId:
              validation.analista != null && typeof validation.analista === 'object'
                ? (validation.analista as { id?: string }).id
                : validation.analista,
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
            ticket: cleanTicket(validation.ticket), // Limpar ticket para evitar strings vazias
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
          
          // Retornar registro criado para que o chamador use o ID real
          return responseData
        } catch (error) {
          console.error('❌ Erro ao criar validação:', error)
          set({ error: `Erro ao criar validação: ${error}` })
          return undefined
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
            analistaId:
              validation.analista != null && typeof validation.analista === 'object'
                ? (validation.analista as { id?: string }).id
                : validation.analista,
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
          
          // Função para limpar ticket (converter string vazia em null)
          const cleanTicket = (ticketValue: any) => {
            if (!ticketValue || typeof ticketValue !== 'string') return null
            const trimmed = ticketValue.trim()
            return trimmed === '' ? null : trimmed
          }

          // Limpar ticket antes de enviar
          requestBody.ticket = cleanTicket(requestBody.ticket)
          
          console.log('📤 Enviando requisição PUT via API para ID:', validation.id)
          console.log('📤 Request body:', JSON.stringify(requestBody, null, 2))
          
          const responseData = await api.updateValidacao(validation.id, requestBody)
          console.log('✅ Validação atualizada com sucesso no banco!')
          console.log('✅ Resposta da API:', responseData)

          // Atualizar o estado local com o que veio do backend (evita depender do throttle do sync)
          try {
            const mapped = mapApiValidacaoToEntry(responseData)
            set((s) => ({
              items: s.items.map((x) => (x.id === validation.id ? mapped : x))
            }))
          } catch (e) {
            // fallback: mantém estado local; sync manual pode resolver depois
            console.warn('⚠️ Não foi possível mapear resposta de updateValidacao para o store:', e)
          }

          return responseData
        } catch (error) {
          console.error('❌ Erro ao atualizar validação:', error)
          console.error('❌ Stack trace:', error.stack)
          const msg = error instanceof Error ? error.message : String(error)
          set({ error: `Erro ao atualizar validação: ${msg}` })
          throw error
        }
      },

      remove: async (id: string) => {
        try {
          console.log('🗑️ Removendo validação:', id)
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          try {
            await api.deleteValidacao(id)
            console.log('✅ Validação excluída com sucesso no banco')
          } catch (apiError: any) {
            // Se for erro 404, a validação já foi excluída - apenas remover do estado local
            if (apiError?.response?.status === 404 || apiError?.message?.includes('404')) {
              console.log('⚠️ Validação já foi excluída (404) - removendo do cache local')
            } else {
              // Outros erros: apenas logar, não mostrar erro ao usuário
              console.error('❌ Erro ao excluir validação:', apiError)
            }
          }
          
          // Remover do estado local em qualquer caso
          set((s) => ({ items: s.items.filter((x) => x.id !== id) }))
          
        } catch (error) {
          // Erros gerais: apenas remover do estado local silenciosamente
          console.error('❌ Erro ao excluir validação:', error)
          // Remover do estado local mesmo em caso de erro
          set((s) => ({ items: s.items.filter((x) => x.id !== id) }))
        }
      },
      
      clear: () => set({ items: [], logs: [], lastSync: 0 }),
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
          
          try {
            await get().updateValidationInDatabase(entry)
          } catch (err: any) {
            const is404 = err?.message?.includes('404') || err?.statusCode === 404
            const isDupId =
              String(err?.message || '').includes('P2002') ||
              String(err?.message || '').includes('Unique constraint')
            if (is404) {
              console.warn('⚠️ Registro não encontrado no banco (404) - criando via POST com o ID do cliente')
              try {
                const created = await get().saveValidationToDatabase(entry)
                if (created?.id) {
                  set((s) => ({
                    items: s.items.map((x) =>
                      x.id === entry.id ? { ...entry, id: created.id, updatedAt: new Date().toISOString() } : x
                    )
                  }))
                  console.log('✅ Validação criada no banco após 404 no PUT')
                  return
                }
              } catch (postErr: any) {
                const dup =
                  String(postErr?.message || '').includes('P2002') ||
                  String(postErr?.message || '').includes('Unique constraint')
                if (dup) {
                  console.warn('⚠️ POST falhou com id duplicado — registro existe; tentando PUT novamente')
                  await get().updateValidationInDatabase(entry)
                  return
                }
                throw postErr
              }
            } else if (isDupId) {
              await get().updateValidationInDatabase(entry)
              return
            }
            throw err
          }
          
          // OBS: O estado local é atualizado a partir da resposta do backend em updateValidationInDatabase.
          console.log('✅ Upsert concluído')
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
      
      syncFromApi: async (opts?: { force?: boolean }) => {
        const state = get()
        if (state.loading) {
          return
        }
        const now = Date.now()
        if (!opts?.force && now - state.lastSync < 2 * 60 * 1000) {
          return
        }
        
        try {
          set({ loading: true, error: null })
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          const validacoes = await api.getValidacoes()
          const validacoesMapeadas: ValidationEntry[] = validacoes.map((v: any) => mapApiValidacaoToEntry(v))
          
          set({ items: validacoesMapeadas, loading: false, lastSync: now })
          
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