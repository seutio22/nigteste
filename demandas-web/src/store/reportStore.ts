import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Report {
  id: string
  titulo: string
  descricao?: string
  ticket?: string
  total?: string
  tipo: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'personalizado'
  status: string // Padrão Cadastro: Pendente, Em andamento, Transf. Analista, Concluída, Entregue, Cancelada
  analista: string
  area: string
  cliente?: string
  contrato?: string
  dataInicio: string
  dataFinalizacao?: string
  dataEntrega: string
  dataCriacao: string
  dataAtualizacao: string
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente'
  solicitante?: string
  solicitacao?: string
  tipoSolicitacao?: string
  tipoServico?: string
  observacoes?: string
  arquivo?: string
  userId?: string // ID do usuário que criou o relatório
}

export interface TimelineEvent {
  id: string
  reportId: string
  type: 'created' | 'updated' | 'status_changed' | 'comment'
  field?: string
  from?: string
  to?: string
  message: string
  timestamp: string
  user: string
}

interface ReportState {
  items: Report[]
  timeline: TimelineEvent[]
  add: (report: Omit<Report, 'id' | 'dataCriacao' | 'dataAtualizacao'>) => Promise<Report>
  update: (id: string, updates: Partial<Report>) => void
  remove: (id: string) => Promise<void>
  upsert: (report: Report) => Promise<void>
  log: (entry: { reportId: string; type: string; field: string; from: any; to: any }) => void
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
  getEventsByReport: (reportId: string) => TimelineEvent[]
  clearTimeline: () => void
  syncFromApi: () => Promise<void>
  syncTimeline: (reportId: string) => Promise<void>
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      items: [],
      timeline: [], // Timeline limpa para evitar poluição
      add: async (payload) => {
        try {
          console.log('🔍 ReportStore.add: Iniciando criação de relatório')
          console.log('🔍 ReportStore.add: Payload recebido:', JSON.stringify(payload, null, 2))
          console.log('🔍 ReportStore.add: Campo analista no payload:', payload.analista)
          
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          const { useAuthStore } = await import('./authStore')
          
          // Adicionar userId do usuário logado
          const userId = useAuthStore.getState().user?.id
          const payloadWithUserId = { ...payload, userId }
          
          console.log('🔍 ReportStore.add: Payload com userId:', JSON.stringify(payloadWithUserId, null, 2))
          console.log('🔍 ReportStore.add: Confirmando analista antes de enviar:', payloadWithUserId.analista)
          
          // Enviar dados para o backend
          console.log('🔍 ReportStore.add: Enviando para API /analytics...')
          let response
          try {
            // Tentar com userId primeiro (novo schema)
            response = await api.post('/analytics', payloadWithUserId)
          } catch (error: any) {
            // Verificar se o erro é sobre userId desconhecido usando responseText
            const errorText = error.responseText || ''
            const errorString = JSON.stringify(error)
            const isUserIdError = 
              errorText.includes('Unknown argument `userId`') ||
              errorText.includes('Unknown argument userId') ||
              errorString.includes('Unknown argument `userId`') ||
              errorString.includes('Unknown argument userId')
            
            if (isUserIdError) {
              console.log('⚠️ ReportStore.add: Schema antigo detectado (erro userId), tentando sem userId...')
              console.log('⚠️ ReportStore.add: Texto do erro:', errorText.substring(0, 300))
              const payloadSemUserId = { ...payload }
              response = await api.post('/analytics', payloadSemUserId)
              console.log('✅ ReportStore.add: Sucesso na segunda tentativa (sem userId)')
            } else {
              console.error('❌ ReportStore.add: Erro diferente de userId:', error)
              console.error('❌ ReportStore.add: Texto do erro:', errorText.substring(0, 300))
              throw error
            }
          }
          console.log('✅ ReportStore.add: Resposta da API:', response)
          console.log('✅ ReportStore.add: Analista retornado pela API:', response.analista)
          
              const report: Report = {
                id: response.id,
                dataCriacao: response.createdAt,
                dataAtualizacao: response.updatedAt,
                ...payloadWithUserId
              }
              
              console.log('✅ ReportStore.add: Report final criado:', JSON.stringify(report, null, 2))
              console.log('✅ ReportStore.add: Analista no report final:', report.analista)
              
              set((state) => ({ items: [report, ...state.items] }))
              return report
        } catch (error) {
          console.error('❌ Erro ao criar relatório:', error)
          console.error('❌ Detalhes do erro:', JSON.stringify(error, null, 2))
          throw error
        }
      },
      update: (id, updates) => {
        set((state) => ({
          items: state.items.map((report) =>
            report.id === id
              ? { ...report, ...updates, dataAtualizacao: new Date().toISOString() }
              : report
          )
        }))
      },
      remove: async (id) => {
        try {
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          
          // Excluir do backend primeiro
          await api.delete(`/analytics/${id}`)
          
          // Se excluiu do backend, excluir do frontend
          set((state) => ({ items: state.items.filter((report) => report.id !== id) }))
          console.log('✅ ReportStore: Relatório excluído do backend e frontend:', id)
        } catch (error) {
          console.error('❌ ReportStore: Erro ao excluir relatório:', error)
          throw error
        }
      },
      log: async (entry) => {
        const eventId = crypto.randomUUID()
        const timestamp = new Date().toISOString()
        
        // Buscar nome do usuário logado
        const { useAuthStore } = await import('./authStore')
        const user = useAuthStore.getState().user
        const userName = user?.name || 'Usuário desconhecido'
        
        const event = {
          id: eventId,
          reportId: entry.reportId,
          type: entry.type as any,
          field: entry.field,
          from: String(entry.from ?? ''),
          to: String(entry.to ?? ''),
          message: `Campo "${entry.field}" alterado`,
          timestamp,
          user: userName
        }
        
        // Adicionar ao store local imediatamente
        set((s) => ({ timeline: [event, ...s.timeline] }))
        
        // Salvar no banco de dados em background
        try {
          const { api } = await import('../lib/api.local')
          
          await api.createTimelineEvent({
            entityId: entry.reportId,
            entityType: 'analytics',
            eventType: entry.type,
            field: entry.field,
            fromValue: String(entry.from ?? ''),
            toValue: String(entry.to ?? ''),
            comment: undefined,
            userId: user?.id
          })
          
          console.log('✅ Evento de timeline de analytics salvo no banco:', event)
        } catch (error) {
          console.error('❌ Erro ao salvar evento de timeline no banco:', error)
        }
      },
      async syncFromApi() {
        try {
          const { api } = await import('../lib/api.local')
          
          const response = await api.getAnalytics()
          
          // A resposta agora tem estrutura { analytics: [], reports: [] }
          let reports = []
          
          if (response.reports && Array.isArray(response.reports)) {
            console.log('🔍 ReportStore: Encontrados', response.reports.length, 'relatórios salvos')
            
            // Buscar analistas para converter IDs em nomes (para relatórios antigos)
            const { useMasterDataStore } = await import('./masterDataStore')
            const masterData = useMasterDataStore.getState()
            
            // Buscar dados do usuário para preencher analista vazio
            const { useAuthStore } = await import('./authStore')
            const currentUser = useAuthStore.getState().user
            
            // Mapear os relatórios salvos para o formato esperado pelo frontend
            reports = response.reports.map((report: any) => {
              // Determinar nome do analista (IGUAL À PÁGINA DEMANDAS)
              let analistaNome = report.analista
              
              // 1. Se analista está vazio mas tem userId → buscar pelo userId
              if (!analistaNome && report.userId) {
                const analistaPorUserId = masterData.analistas.find(a => a.id === report.userId)
                if (analistaPorUserId) {
                  analistaNome = analistaPorUserId.nome
                  console.log('🔄 Analista vazio - usando userId:', report.userId, '→', analistaNome)
                }
              }
              
              // 2. Se ainda está vazio e o userId é do usuário atual → usar nome do usuário
              if (!analistaNome && report.userId === currentUser?.id) {
                analistaNome = currentUser.name
                console.log('🔄 Analista vazio - usando nome do usuário logado:', analistaNome)
              }
              
              // 3. Se analista parece ser um ID (UUID) → converter para nome
              if (analistaNome && analistaNome.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                const analistaEncontrado = masterData.analistas.find(a => a.id === analistaNome)
                analistaNome = analistaEncontrado?.nome || analistaNome
                console.log('🔄 Convertendo analista ID para nome:', report.analista, '→', analistaNome)
              }
              
              // 4. Fallback final: usar userId direto ou 'N/A'
              if (!analistaNome) {
                analistaNome = report.userId || 'N/A'
                console.log('⚠️ Analista indefinido - usando fallback:', analistaNome)
              }
              
              console.log('✅ ReportStore: Analista final mapeado:', analistaNome)
              
              return {
                id: report.id,
                titulo: report.titulo,
                descricao: report.descricao,
                ticket: report.ticket,
                total: report.total,
                tipo: report.tipo as any,
                status: report.status as any,
                analista: analistaNome, // Campo analista direto (igual Demandas)
                area: report.area || 'N/A',
                cliente: report.cliente,
                contrato: report.contrato,
                dataInicio: report.dataInicio ? new Date(report.dataInicio).toISOString() : new Date().toISOString(),
                dataFinalizacao: report.dataFinalizacao ? new Date(report.dataFinalizacao).toISOString() : undefined,
                dataEntrega: report.dataEntrega ? new Date(report.dataEntrega).toISOString() : new Date().toISOString(),
                dataCriacao: report.createdAt || new Date().toISOString(),
                dataAtualizacao: report.updatedAt || new Date().toISOString(),
                prioridade: report.prioridade as any,
                solicitante: report.solicitante,
                userId: report.userId, // Incluir userId do backend
                solicitacao: report.solicitacao,
                tipoSolicitacao: report.tipoSolicitacao,
                tipoServico: report.tipoServico,
                observacoes: report.observacoes,
                arquivo: undefined
              }
            })
          } else if (Array.isArray(response)) {
            // Buscar master data para converter UUIDs
            const { useMasterDataStore } = await import('./masterDataStore')
            const { useAuthStore } = await import('./authStore')
            const masterData = useMasterDataStore.getState()
            const currentUser = useAuthStore.getState().user
            
            // Mapear cada relatório aplicando conversão de UUID
            reports = response.map((report: any) => {
              // Determinar nome do analista
              let analistaNome = report.analista
              
              // Se analista é UUID → converter para nome
              if (analistaNome && analistaNome.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
                const analistaEncontrado = masterData.analistas.find(a => a.id === analistaNome)
                analistaNome = analistaEncontrado?.nome || analistaNome
              }
              
              // Se ainda está vazio e tem userId
              if (!analistaNome && report.userId) {
                const analistaPorUserId = masterData.analistas.find(a => a.id === report.userId)
                analistaNome = analistaPorUserId?.nome || currentUser?.name || 'N/A'
              }
              
              return {
                id: report.id,
                titulo: report.titulo,
                descricao: report.descricao,
                ticket: report.ticket,
                total: report.total,
                tipo: report.tipo as any,
                status: report.status as any,
                analista: analistaNome || 'N/A',
                area: report.area || 'N/A',
                cliente: report.cliente,
                contrato: report.contrato,
                dataInicio: report.dataInicio ? new Date(report.dataInicio).toISOString() : new Date().toISOString(),
                dataFinalizacao: report.dataFinalizacao ? new Date(report.dataFinalizacao).toISOString() : undefined,
                dataEntrega: report.dataEntrega ? new Date(report.dataEntrega).toISOString() : new Date().toISOString(),
                dataCriacao: report.createdAt || new Date().toISOString(),
                dataAtualizacao: report.updatedAt || new Date().toISOString(),
                prioridade: report.prioridade as any,
                solicitante: report.solicitante,
                userId: report.userId,
                solicitacao: report.solicitacao,
                tipoSolicitacao: report.tipoSolicitacao,
                tipoServico: report.tipoServico,
                observacoes: report.observacoes,
                arquivo: undefined
              }
            })
          }
          
          set({ items: reports })
        } catch (error) {
          console.error('❌ Erro ao sincronizar analytics:', error)
          set({ items: [] })
        }
      },
      addTimelineEvent: (event) => {
        console.log('🔍 TIMELINE DEBUG: Adicionando evento:', event)
        console.trace('🔍 TIMELINE TRACE: Stack trace do evento')
        
        const newEvent: TimelineEvent = {
          ...event,
          id: `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        }
        set((state) => ({
          timeline: [newEvent, ...state.timeline]
        }))
        
        console.log('✅ TIMELINE DEBUG: Evento adicionado, total:', get().timeline.length)
      },
      getEventsByReport: (reportId) => {
        const state = get()
        return state.timeline
          .filter(event => event.reportId === reportId)
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      },
      clearTimeline: () => {
        set({ timeline: [] })
      },
      
      upsert: async (report: Report) => {
        const exists = get().items.some((r) => r.id === report.id)
        
        if (exists) {
          // Atualizar no backend
          try {
            const { api } = await import('../lib/api.local')
            await api.put(`/analytics/${report.id}`, report)
            console.log('✅ ReportStore.upsert: Relatório atualizado no backend')
          } catch (error) {
            console.error('❌ ReportStore.upsert: Erro ao atualizar no backend:', error)
            throw error
          }
          
          // Atualizar estado local
          set((state) => ({
            items: state.items.map((r) =>
              r.id === report.id ? { ...report, dataAtualizacao: new Date().toISOString() } : r
            )
          }))
        } else {
          // Adicionar novo (usar método add)
          await get().add(report)
        }
      },
      
      async syncTimeline(reportId: string) {
        try {
          console.log('🔄 Sincronizando timeline do analytics:', reportId)
          
          const { api } = await import('../lib/api.local')
          const events = await api.getTimelineEvents(reportId, 'analytics')
          
          console.log('✅ Timeline sincronizada:', events.length, 'eventos do banco')
          
          const mappedEvents = events.map((event: any) => ({
            id: event.id,
            reportId: event.entityId,
            type: event.eventType,
            field: event.field,
            from: event.fromValue,
            to: event.toValue,
            message: `Campo "${event.field}" alterado`,
            timestamp: event.createdAt,
            user: event.userName || event.userId || 'Usuário desconhecido'
          }))
          
          set((s) => {
            const otherEvents = s.timeline.filter((e: any) => e.reportId !== reportId)
            const localEvents = s.timeline.filter((e: any) => e.reportId === reportId)
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
            
            return { timeline: [...mergedEvents, ...otherEvents] }
          })
        } catch (error) {
          console.error('❌ Erro ao sincronizar timeline de analytics:', error)
        }
      }
    }),
    { name: 'reports-v1' }
  )
)
