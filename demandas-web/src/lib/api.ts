import { useAuthStore } from '@/store/authStore'

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3333'

async function request(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Erro HTTP ${res.status}`)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('application/json') ? res.json() : res.text()
}

export const api = {
  login: (email: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  get: (path: string) => request(path),
  post: (path: string, body: any) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: any) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path: string) => request(path, { method: 'DELETE' }),
}

export function endpoint(resource: string) {
  return `/${resource}`
}


