import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface DashboardWidget {
  id: string
  tipo: 'grafico' | 'tabela' | 'metrica' | 'lista'
  titulo: string
  configuracao: string
  posicaoX: number
  posicaoY: number
  largura: number
  altura: number
  ativo: boolean
  ordem: number
}

export interface Dashboard {
  id: string
  usuarioId: string
  nome: string
  tipo: 'personalizado' | 'padrao'
  layout: string
  widgets: string
  filtros?: string
  ativo: boolean
  padrao: boolean
  ordem: number
  dashboardWidgets: DashboardWidget[]
}

interface DashboardState {
  dashboards: Dashboard[]
  widgets: DashboardWidget[]
  currentDashboard: Dashboard | null
  addDashboard: (dashboard: Omit<Dashboard, 'id'>) => Dashboard
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void
  removeDashboard: (id: string) => void
  setCurrentDashboard: (dashboard: Dashboard | null) => void
  addWidget: (widget: Omit<DashboardWidget, 'id'>) => DashboardWidget
  updateWidget: (id: string, updates: Partial<DashboardWidget>) => void
  removeWidget: (id: string) => void
  syncFromApi: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      dashboards: [],
      widgets: [],
      currentDashboard: null,
      
      addDashboard: (payload) => {
        const dashboard: Dashboard = {
          id: crypto.randomUUID(),
          ...payload
        }
        set((state) => ({ dashboards: [dashboard, ...state.dashboards] }))
        return dashboard
      },
      
      updateDashboard: (id, updates) => {
        set((state) => ({
          dashboards: state.dashboards.map((dashboard) =>
            dashboard.id === id ? { ...dashboard, ...updates } : dashboard
          )
        }))
      },
      
      removeDashboard: (id) => {
        set((state) => ({ 
          dashboards: state.dashboards.filter((dashboard) => dashboard.id !== id) 
        }))
      },
      
      setCurrentDashboard: (dashboard) => {
        set({ currentDashboard: dashboard })
      },
      
      addWidget: (payload) => {
        const widget: DashboardWidget = {
          id: crypto.randomUUID(),
          ...payload
        }
        set((state) => ({ widgets: [widget, ...state.widgets] }))
        return widget
      },
      
      updateWidget: (id, updates) => {
        set((state) => ({
          widgets: state.widgets.map((widget) =>
            widget.id === id ? { ...widget, ...updates } : widget
          )
        }))
      },
      
      removeWidget: (id) => {
        set((state) => ({ 
          widgets: state.widgets.filter((widget) => widget.id !== id) 
        }))
      },
      
      async syncFromApi() {
        try {
          console.log('🔍 DashboardStore: Iniciando syncFromApi...')
          const { api } = await import('../lib/api.local')
          
          console.log('🔍 DashboardStore: Chamando APIs...')
          const [dashboards, widgets] = await Promise.all([
            api.getDashboards().catch(() => []),
            api.getDashboardWidgets().catch(() => [])
          ])
          
          console.log('🔍 DashboardStore: Dados recebidos:', {
            dashboards: dashboards.length,
            widgets: widgets.length
          })
          
          // Usar dados da API ou arrays vazios
          // Não criar dados de exemplo automaticamente
          
          console.log('🔍 DashboardStore: Aplicando dados ao store...')
          set({ 
            dashboards: dashboards,
            widgets: widgets,
            currentDashboard: dashboards.find(d => d.padrao) || dashboards[0] || null
          })
          
          console.log('✅ DashboardStore: syncFromApi concluído com sucesso!')
        } catch (error) {
          console.error('❌ DashboardStore: Erro no syncFromApi:', error)
          // Em caso de erro, manter arrays vazios
          set({ 
            dashboards: [],
            widgets: [],
            currentDashboard: null
          })
        }
      }
    }),
    { 
      name: 'dashboard-storage',
      partialize: (state) => ({ 
        currentDashboard: state.currentDashboard 
      })
    }
  )
)
