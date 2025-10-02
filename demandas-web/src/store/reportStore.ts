import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Report {
  id: string
  titulo: string
  descricao?: string
  ticket?: string
  total?: string
  tipo: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'personalizado'
  status: 'pendente' | 'em_andamento' | 'concluido' | 'entregue' | 'cancelado'
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
  upsert: (report: Report) => void
  log: (entry: { reportId: string; type: string; field: string; from: any; to: any }) => void
  addTimelineEvent: (event: Omit<TimelineEvent, 'id' | 'timestamp'>) => void
  getEventsByReport: (reportId: string) => TimelineEvent[]
  clearTimeline: () => void
  syncFromApi: () => Promise<void>
}

export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      items: [],
      timeline: [], // Timeline limpa para evitar poluição
      add: async (payload) => {
        try {
          // Importar API dinamicamente
          const { api } = await import('../lib/api.local')
          const { useAuthStore } = await import('./authStore')
          
          // Adicionar userId do usuário logado
          const userId = useAuthStore.getState().user?.id
          const payloadWithUserId = { ...payload, userId }
          
          // Enviar dados para o backend
          const response = await api.post('/analytics', payloadWithUserId)
          
              const report: Report = {
                id: response.id,
                dataCriacao: response.createdAt,
                dataAtualizacao: response.updatedAt,
                ...payloadWithUserId
              }
              
              set((state) => ({ items: [report, ...state.items] }))
              return report
        } catch (error) {
          console.error('❌ Erro ao criar relatório:', error)
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
      upsert: (report) => {
        const existing = get().items.find((r) => r.id === report.id)
        if (existing) {
          // Atualizar sem criar eventos de timeline
          set((state) => ({
            items: state.items.map((r) =>
              r.id === report.id
                ? { ...r, ...report, dataAtualizacao: new Date().toISOString() }
                : r
            )
          }))
        } else {
          // Adicionar sem criar eventos de timeline
          set((state) => ({
            items: [{ ...report, dataCriacao: new Date().toISOString(), dataAtualizacao: new Date().toISOString() }, ...state.items]
          }))
        }
      },
      log: (entry) => {
        // Implementar log de mudanças se necessário
      },
      async syncFromApi() {
        try {
          console.log('🔍 SYNC DEBUG: Iniciando syncFromApi')
          console.log('🔍 SYNC DEBUG: Timeline antes da sincronização:', get().timeline.length)
          
          const { api } = await import('../lib/api.local')
          
          const response = await api.getAnalytics()
          console.log('🔍 ReportStore: Resposta da API:', response)
          
          // A resposta agora tem estrutura { analytics: [], reports: [] }
          let reports = []
          
          if (response.reports && Array.isArray(response.reports)) {
            console.log('🔍 ReportStore: Encontrados', response.reports.length, 'relatórios salvos')
            // Mapear os relatórios salvos para o formato esperado pelo frontend
            reports = response.reports.map((report: any) => ({
              id: report.id,
              titulo: report.titulo,
              descricao: report.descricao,
              ticket: report.ticket,
              total: report.total,
              tipo: report.tipo as any,
              status: report.status as any,
              analista: report.analista,
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
              observacoes: report.observacoes,
              arquivo: undefined
            }))
          } else if (Array.isArray(response)) {
            // Fallback para estrutura antiga
            reports = response.map((analytics: any) => ({
              id: analytics.id,
              titulo: analytics.tipo || 'Relatório',
              descricao: analytics.descricao || `Relatório de ${analytics.tipo}`,
              tipo: analytics.categoria || 'personalizado',
              status: analytics.status === 'ativo' ? 'entregue' : 'pendente',
              analista: analytics.analistaMaisAtivo || 'N/A',
              area: analytics.areaMaisAtiva || 'N/A',
              cliente: analytics.clienteMaisAtivo || 'N/A',
              contrato: 'N/A',
              dataInicio: analytics.createdAt || new Date().toISOString(),
              dataFinalizacao: undefined,
              dataEntrega: analytics.createdAt || new Date().toISOString(),
              dataCriacao: analytics.createdAt || new Date().toISOString(),
              dataAtualizacao: analytics.updatedAt || new Date().toISOString(),
              prioridade: 'media',
              solicitante: undefined,
              solicitacao: undefined,
              tipoSolicitacao: undefined,
              observacoes: `Relatório de ${analytics.tipo} para período ${analytics.periodo}`,
              arquivo: undefined
            }))
          }
          
          console.log('🔍 ReportStore: Relatórios mapeados:', reports.length, 'itens')
          set({ items: reports })
          
          console.log('🔍 SYNC DEBUG: Timeline após sincronização:', get().timeline.length)
          console.log('🔍 SYNC DEBUG: syncFromApi finalizada')
        } catch (error) {
          console.error('❌ Erro ao sincronizar analytics:', error)
          // Em caso de erro, manter array vazio
          set({ items: [] })
          
          console.log('🔍 SYNC DEBUG: Erro na sincronização, timeline:', get().timeline.length)
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
      }
    }),
    { name: 'reports-v1' }
  )
)
