import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SystemPermissions } from '../types/permissions'
import { clearAllSystemData } from '../utils/logoutCleanup'

interface User {
  id: string
  name: string
  email: string
  role: string
  photo?: string
  permissions?: SystemPermissions
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  setAuth: (token: string, user: User) => void
  updateUserPhoto: (photo: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  isAdmin: () => boolean
  initialize: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: true, // Começa como true para verificar autenticação
      
      setAuth: (token: string, user: User) => {
        set({ token, user, loading: false })
      },
      
      updateUserPhoto: (photo: string) => {
        const { user } = get()
        if (user) {
          set({ user: { ...user, photo } })
        }
      },
      
      logout: () => {
        console.log('🔒 Iniciando logout seguro...')
        
        // 1. Limpar estado do auth
        set({ token: null, user: null, loading: false })
        
        // 2. Limpar TODOS os dados do localStorage
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
      
      // Função para inicializar o estado
      initialize: () => {
        const { token, user } = get()
        if (token && user) {
          set({ loading: false })
        } else {
          set({ loading: false })
        }
      }
    }),
    { 
      name: 'auth-store',
      version: 8, // Incrementado para forçar limpeza do cache após correção do campo analista
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        // Quando o estado é reidratado do localStorage, inicializar loading
        if (state) {
          state.initialize()
        }
      }
    }
  )
)


