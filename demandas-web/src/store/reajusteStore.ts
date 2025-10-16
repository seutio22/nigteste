import { create } from 'zustand'
import type { ReajusteEntry } from '../types/reajuste'
import { useTimelineStore } from './timelineStore'
import { useAuthStore } from './authStore'
import { useMasterDataStore } from './masterDataStore'
import { api } from '../lib/api'

interface ReajusteState {
  items: ReajusteEntry[]
  add: (e: Omit<ReajusteEntry, 'id' | 'createdAt'>) => Promise<ReajusteEntry>
  remove: (id: string) => Promise<void>
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
        try {
          console.log('🗑️ Removendo reajuste:', id)
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          // Excluir do backend primeiro
          await api.deleteReajuste(id)
          console.log('✅ Reajuste excluído com sucesso no backend')
          
          // Registrar evento de remoção
          const currentItem = get().items.find(item => item.id === id)
          if (currentItem) {
            const timelineStore = useTimelineStore.getState()
            const authStore = useAuthStore.getState()
            timelineStore.addEvent({
              reajusteId: id,
              type: 'comment',
              comment: `Reajuste removido: ${currentItem.mes}/${currentItem.ano}`,
              user: authStore.user?.name || 'Administrador'
            })
          }
          
          // Remover do estado local
          set((s) => ({ items: s.items.filter((x) => x.id !== id) }))
          console.log('✅ Reajuste removido do estado local')
          
        } catch (error) {
          console.error('❌ Erro ao excluir reajuste:', error)
          throw error
        }
      },
      
      upsert: async (entry) => {
        try {
          const existing = get().items.find((x) => x.id === entry.id)
          
          if (existing) {
            console.log('🔄 ReajusteStore.upsert: Atualizando reajuste existente:', entry.id)
            
            // Identificar campos alterados
            const changes: string[] = []
            Object.keys(entry).forEach(key => {
              if (entry[key as keyof ReajusteEntry] !== existing[key as keyof ReajusteEntry]) {
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
            
            // Registrar eventos de alteração
            if (changes.length > 0) {
              const timelineStore = useTimelineStore.getState()
              const authStore = useAuthStore.getState()
              
              // Função para converter IDs para nomes legíveis
              const getValueLabel = (value: any, fieldName: string) => {
                if (value === null || value === undefined || value === '') return ''
                
                // Importar masterDataStore para conversão de IDs
                const masterDataStore = useMasterDataStore.getState()
                
                // Converter IDs para nomes baseado no campo
                switch (fieldName) {
                  case 'operadora':
                    return masterDataStore.operadoras.find(o => o.id === value)?.nome || String(value)
                  case 'cliente':
                    return masterDataStore.clientes.find(c => c.id === value)?.nome || String(value)
                  case 'contrato':
                    return masterDataStore.contratos.find(c => c.id === value)?.codigo || 
                           masterDataStore.contratos.find(c => c.id === value)?.numero || String(value)
                  case 'produto':
                    return masterDataStore.produtos.find(p => p.id === value)?.nome || String(value)
                  case 'responsavelAnalista':
                    return masterDataStore.analistas.find(a => a.id === value)?.nome || String(value)
                  case 'solicitante':
                    return masterDataStore.solicitantes.find(s => s.id === value)?.nome || String(value)
                  case 'dataInicio':
                  case 'dataFim':
                  case 'dataAtualizacao':
                    return value ? new Date(value).toLocaleDateString('pt-BR') : ''
                  default:
                    return String(value)
                }
              }
              
              // Função para obter o label do campo
              const getFieldLabel = (field: string): string => {
                const fieldLabels: { [key: string]: string } = {
                  'mes': 'Mês',
                  'ano': 'Ano',
                  'dataInicio': 'Data de Início',
                  'dataFim': 'Data de Finalização',
                  'status': 'Status',
                  'operadora': 'Operadora',
                  'qualidade': 'Qualidade (prazo)',
                  'qualidadeInformacao': 'Qualidade da Informação',
                  'planos': 'Planos',
                  'responsavelConta': 'Responsável da Conta',
                  'filial': 'Filial',
                  'ticket': 'Ticket',
                  'solicitante': 'Solicitante',
                  'responsavelAnalista': 'Analista Responsável',
                  'cliente': 'Cliente',
                  'contrato': 'Contrato',
                  'produto': 'Produto',
                  'dataAtualizacao': 'Data de Atualização',
                  'itensPendentes': 'Itens Pendentes',
                  'itensConcluidos': 'Itens Concluídos'
                }
                return fieldLabels[field] || field
              }
              
              changes.forEach(field => {
                const from = existing[field as keyof ReajusteEntry]
                const to = entry[field as keyof ReajusteEntry]
                
                const fromLabel = getValueLabel(from, field)
                const toLabel = getValueLabel(to, field)
                
                timelineStore.addEvent({
                  reajusteId: entry.id,
                  type: 'comment',
                  comment: `Campo '${getFieldLabel(field)}' alterado de '${fromLabel}' para '${toLabel}'`,
                  user: authStore.user?.name || 'Administrador'
                })
              })
            }
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
        timelineStore.addEvent({
          ...entry,
          type: 'comment' as const
        })
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


