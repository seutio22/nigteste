import { useAuthStore } from '../store/authStore'

/** Só dispara sync/API se houver token em memória (evita 401 no console sem sessão). */
export function hasAuthToken(): boolean {
  try {
    const t = useAuthStore.getState().token
    return typeof t === 'string' && t.trim().length > 10
  } catch {
    return false
  }
}

export function isPublicApiPath(endpoint: string): boolean {
  const p = (endpoint || '').split('?')[0].toLowerCase()
  if (p.endsWith('/auth/login') || p.includes('/auth/login')) return true
  if (p.includes('/auth/change-password')) return true
  if (p.includes('/share/')) return true
  if (p.endsWith('/health') || p === '/health') return true
  return false
}
