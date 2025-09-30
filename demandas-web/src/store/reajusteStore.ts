import { create } from 'zustand'
import type { ReajusteEntry } from '../types/reajuste'
import { useTimelineStore } from './timelineStore'
import { useAuthStore } from './authStore'
import { useMasterDataStore } from './masterDataStore'
import { api } from '../lib/api'

interface ReajusteState {
  items: ReajusteEntry[]
  add: (e: Omit<ReajusteEntry, 'id' | 'createdAt'>) => ReajusteEntry
  remove: (id: string) => void
  upsert: (entry: ReajusteEntry) => void
  log: (entry: { reajusteId: string; type: string; field: string; from: unknown; to: unknown }) => void
  syncFromApi: () => Promise<void>
}

export const useReajusteStore = create<ReajusteState>()(
  (set, get) => ({
      items: [],
      
      add: (payload) => {
        const entry: ReajusteEntry = { 
          id: crypto.randomUUID(), 
          createdAt: new Date().toISOString(), 
          ...payload 
        }
        set((s) => ({ items: [entry, ...s.items] }))
        
        // Registrar evento de criação
        const timelineStore = useTimelineStore.getState()
        const authStore = useAuthStore.getState()
        timelineStore.addEvent({
          reajusteId: entry.id,
          type: 'create',
          comment: `Reajuste criado: ${entry.mes}/${entry.ano}`,
          user: authStore.user?.name || 'Administrador'
        })
        
        return entry
      },
      
      remove: (id) => {
        const currentItem = get().items.find(item => item.id === id)
        if (currentItem) {
          // Registrar evento de remoção
          const timelineStore = useTimelineStore.getState()
          const authStore = useAuthStore.getState()
          timelineStore.addEvent({
            reajusteId: id,
            type: 'comment',
            comment: `Reajuste removido: ${currentItem.mes}/${currentItem.ano}`,
            user: authStore.user?.name || 'Administrador'
          })
        }
        
        set((s) => ({ items: s.items.filter((x) => x.id !== id) }))
      },
      
      upsert: (entry) => {
        const existing = get().items.find((x) => x.id === entry.id)
        if (existing) {
          // Identificar campos alterados
          const changes: string[] = []
          Object.keys(entry).forEach(key => {
            if (entry[key as keyof ReajusteEntry] !== existing[key as keyof ReajusteEntry]) {
              changes.push(key)
            }
          })
          
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
          get().add(entry)
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
          const reajustes = response.data || []
          
          console.log('🔍 ReajusteStore: Dados recebidos da API:', reajustes.length, 'itens')
          
          set({ items: reajustes })
          
          console.log('✅ ReajusteStore: syncFromApi concluído com sucesso!')
        } catch (error) {
          console.error('❌ ReajusteStore: Erro no syncFromApi:', error)
          // Em caso de erro, manter dados locais
        }
      },
    })
  )


