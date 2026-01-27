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
  lastSync: number
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
      lastSync: 0,
      
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
          const state = get()
          const now = Date.now()
          if (now - state.lastSync < 2 * 60 * 1000) return
          console.log('🔍 DashboardStore: Iniciando syncFromApi...')
          
          // Dashboard não tem endpoints específicos na API ainda
          // Manter arrays vazios por enquanto
          console.log('🔍 DashboardStore: Dashboard sem endpoints específicos, mantendo vazio...')
          
          set({ 
            dashboards: [],
            widgets: [],
            currentDashboard: null,
            lastSync: now
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
