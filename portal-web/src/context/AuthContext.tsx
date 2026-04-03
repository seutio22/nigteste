import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, setToken } from '../lib/api'

export type PortalUser = {
  id: string
  email: string
  name: string
  role: string
}

type AuthState = {
  user: PortalUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<string | undefined>
  register: (name: string, email: string, password: string) => Promise<string | undefined>
  logout: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PortalUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    const { ok, data } = await api<{ user: PortalUser }>('/auth/me')
    if (ok && data?.user) setUser(data.user)
    else {
      setUser(null)
      setToken(null)
    }
  }, [])

  useEffect(() => {
    const t = localStorage.getItem('portal_token')
    if (!t) {
      setLoading(false)
      return
    }
    refreshMe().finally(() => setLoading(false))
  }, [refreshMe])

  const login = useCallback(async (email: string, password: string) => {
    const { ok, data, error } = await api<{ token: string; user: PortalUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!ok || !data?.token) return error || 'Falha no login'
    setToken(data.token)
    setUser(data.user)
    return undefined
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { ok, data, error } = await api<{ token: string; user: PortalUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    if (!ok || !data?.token) return error || 'Falha no cadastro'
    setToken(data.token)
    setUser(data.user)
    return undefined
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading, login, register, logout, refreshMe]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth fora do AuthProvider')
  return ctx
}
