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
        const { token, user } = get()
        if (token && user) {
          set({ loading: false })
        } else {
          // Criar usuário padrão para teste
          const defaultUser: User = {
            id: '1',
            name: 'Usuário Teste',
            email: 'teste@teste.com',
            role: 'admin',
            permissions: {
              home: { view: true, create: false, edit: false, delete: false },
              dashboard: { view: true, create: false, edit: false, delete: false },
              cadastro: { view: true, create: true, edit: true, delete: true },
              manutencao: { view: true, create: true, edit: true, delete: true },
              atendimento: { view: true, create: true, edit: true, delete: true },
              comunicados: { view: true, create: true, edit: true, delete: true },
              validacao: { view: true, create: true, edit: true, delete: true },
              reajuste: { view: true, create: true, edit: true, delete: true },
              mailling: { view: true, create: true, edit: true, delete: true },
              analytics: { view: true, create: true, edit: true, delete: true },
              kanban: { view: true, create: true, edit: true, delete: true },
              projetos: { view: true, create: true, edit: true, delete: true },
              dados: { view: true, create: true, edit: true, delete: true },
              usuarios: { view: true, create: true, edit: true, delete: true },
              configuracoes: { view: true, create: true, edit: true, delete: true },
              relatorios: { view: true, create: true, edit: true, delete: true }
            }
          }
          set({ user: defaultUser, loading: false })
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


