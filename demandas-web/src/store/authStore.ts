import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SystemPermissions } from '../types/permissions'
import { clearAllSystemData } from '../utils/logoutCleanup'
import { logDev, logError } from '../utils/logger'
import { notifyServerLogout } from '../lib/monitoringClient'
import { flushPageDwellBeforeLogout } from '../hooks/usePageDwellTracking'
import { useNotificationStore } from './notificationStore'

interface User {
  id: string
  name: string
  email: string
  role: string
  photo?: string
  permissions?: SystemPermissions
  passwordUpdatedAt?: string
  /** Quando true, listagens e dashboard devem restringir ao analista vinculado ao usuário. */
  viewOwnDataOnly?: boolean
  /** Área/departamento (Dados → Áreas). */
  departmentId?: string | null
  department?: { id: string; nome: string } | null
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  loginDate: string | null // Data do último login
  setAuth: (token: string, user: User) => void
  updateUserPhoto: (photo: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  isAdmin: () => boolean
  initialize: () => void
  checkLoginExpiration: () => boolean
}

/** Logout total ao virar o dia civil (meia-noite local) — não basta renovar a sessão. */
function hasLoginDayEnded(loginDate: string | null): boolean {
  if (!loginDate) return true

  const login = new Date(loginDate)
  const now = new Date()
  return (
    now.getFullYear() !== login.getFullYear() ||
    now.getMonth() !== login.getMonth() ||
    now.getDate() !== login.getDate()
  )
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: true,
      loginDate: null,
      
      setAuth: (token: string, user: User) => {
        const now = new Date().toISOString()
        logDev('✅ Login realizado')
        set({ token, user, loading: false, loginDate: now })
      },
      
      updateUserPhoto: (photo: string) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, photo } })
        }
      },
      
      logout: () => {
        logDev('🔒 Iniciando logout seguro...')
        const { token, user } = get()
        flushPageDwellBeforeLogout()
        if (token && user?.id) {
          void notifyServerLogout(token, user.id)
        }

        // 1. Limpar estado do auth
        set({ token: null, user: null, loading: false, loginDate: null })
        
        // 2. Limpar notificações em memória (evita que outro usuário veja notificações do anterior)
        useNotificationStore.setState({ notifications: [], unreadCount: 0, dismissedKeys: [] })
        
        // 3. Limpar TODOS os dados do localStorage
        clearAllSystemData()
        
        logDev('✅ Logout seguro concluído')
      },
      
      setLoading: (loading: boolean) => {
        set({ loading })
      },
      
      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },
      
      // Verificar se o dia do login já acabou (meia-noite)
      checkLoginExpiration: () => {
        const { loginDate, token, user } = get()
        
        if (!token || !user) return false
        
        if (hasLoginDayEnded(loginDate)) {
          logDev('⏰ Login expirado (fim do dia)')
          logDev('🔒 Fazendo logout total...')
          get().logout()
          return true
        }
        
        return false
      },
      
      // Função para inicializar o estado
      initialize: () => {
        try {
          const { token, user, loginDate, loading } = get()
          
          // Evitar inicialização duplicada
          if (!loading && token && user) {
            return
          }
          
          // Se tem token e usuário, verificar se expirou
          if (token && user) {
            if (hasLoginDayEnded(loginDate)) {
              logDev('⏰ Login expirado ao inicializar (fim do dia)')
              logDev('🔒 Limpando dados antigos...')
              get().logout()
              set({ loading: false })
            } else {
              logDev('✅ Sessão válida')
              set({ loading: false })
            }
          } else {
            set({ loading: false })
          }
        } catch (error) {
          logError('❌ Erro ao inicializar authStore:', error)
          set({ loading: false })
        }
      }
    }),
    { 
      name: 'auth-store',
      version: 10, // Inclui departmentId/department no user persistido
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        loginDate: state.loginDate 
      }),
      onRehydrateStorage: () => (state, err) => {
        if (err) {
          logError('❌ Erro ao reidratar auth-store:', err)
          setTimeout(() => useAuthStore.getState().setLoading(false), 0)
          return
        }
        setTimeout(() => {
          try {
            if (state) {
              state.initialize()
            } else {
              useAuthStore.getState().setLoading(false)
            }
          } catch (error) {
            logError('❌ Erro ao inicializar auth após reidratação:', error)
            useAuthStore.getState().setLoading(false)
          }
        }, 0)
      },
    }
  )
)


