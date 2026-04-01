import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SystemPermissions } from '../types/permissions'
import { clearAllSystemData } from '../utils/logoutCleanup'
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

// Função para verificar se passou 1 dia desde o login
function hasPassedOneDay(loginDate: string | null): boolean {
  if (!loginDate) return true
  
  const login = new Date(loginDate)
  const now = new Date()
  
  // Calcular diferença em horas
  const diffInHours = (now.getTime() - login.getTime()) / (1000 * 60 * 60)
  
  // Se passou mais de 12 horas, considera expirado
  return diffInHours > 12
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
        console.log('✅ Login realizado às:', now)
        set({ token, user, loading: false, loginDate: now })
      },
      
      updateUserPhoto: (photo: string) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, photo } })
        }
      },
      
      logout: () => {
        console.log('🔒 Iniciando logout seguro...')
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
        
        console.log('✅ Logout seguro concluído - todos os dados foram removidos')
      },
      
      setLoading: (loading: boolean) => {
        set({ loading })
      },
      
      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },
      
      // Verificar se o login expirou (mais de 12 horas)
      checkLoginExpiration: () => {
        const { loginDate, token, user } = get()
        
        if (!token || !user) return false
        
        if (hasPassedOneDay(loginDate)) {
          console.log('⏰ Login expirado (passou mais de 12 horas)')
          console.log('🔒 Fazendo logout automático...')
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
            if (hasPassedOneDay(loginDate)) {
              console.log('⏰ Login expirado ao inicializar (passou mais de 12 horas)')
              console.log('🔒 Limpando dados antigos...')
              get().logout()
              set({ loading: false })
            } else {
              const login = new Date(loginDate || '')
              const now = new Date()
              const hoursAgo = ((now.getTime() - login.getTime()) / (1000 * 60 * 60)).toFixed(1)
              console.log(`✅ Login ainda válido (${hoursAgo}h atrás)`)
              set({ loading: false })
            }
          } else {
            set({ loading: false })
          }
        } catch (error) {
          console.error('❌ Erro ao inicializar authStore:', error)
          set({ loading: false })
        }
      }
    }),
    { 
      name: 'auth-store',
      version: 9, // Incrementado para aplicar nova lógica de expiração
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        loginDate: state.loginDate 
      }),
      onRehydrateStorage: () => (state) => {
        // Quando o estado é reidratado do localStorage, verificar expiração
        if (state) {
          // Usar setTimeout para garantir que o estado está completamente reidratado
          setTimeout(() => {
            state.initialize()
          }, 0)
        }
      }
    }
  )
)


