import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type User = { id: string; name: string; email: string; role: 'admin'|'analista'|'solicitante'|'viewer' }

interface AuthState {
  token: string | null
  user: User | null
  setAuth: (token: string, user: User) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => set({ token, user }),
      clear: () => set({ token: null, user: null }),
    }),
    { name: 'auth-v1' }
  )
)


