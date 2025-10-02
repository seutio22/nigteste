import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { SystemPermissions } from '../types/permissions'

interface User {
  id: string
  name: string
  email: string
  role: string
  permissions?: SystemPermissions
}

interface AuthState {
  token: string | null
  user: User | null
  loading: boolean
  setAuth: (token: string, user: User) => void
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
      
      logout: () => {
        set({ token: null, user: null, loading: false })
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
        set({ loading: false })
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


