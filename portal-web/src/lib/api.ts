// Dev: proxy Vite /api → API local. Produção: obrigatório VITE_API_URL = URL da API (Railway), sem sufixo /api.
const envApi = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '') ?? ''
const base = import.meta.env.DEV ? envApi || '/api' : envApi

if (import.meta.env.PROD && !envApi) {
  console.error(
    '[portal-web] Defina VITE_API_URL na Vercel (URL pública da API, ex. https://….up.railway.app). Sem isso as chamadas vão para /api neste domínio e retornam 404.'
  )
}

function getToken(): string | null {
  return localStorage.getItem('portal_token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('portal_token', token)
  else localStorage.removeItem('portal_token')
}

export async function api<T>(
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const token = getToken()
  const headers: HeadersInit = {
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) || {}),
  }
  const res = await fetch(url, { ...init, headers })
  let data: T | null = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text) as T
    } catch {
      data = null
    }
  }
  const errObj = data as { error?: string } | null
  return {
    ok: res.ok,
    status: res.status,
    data,
    error: !res.ok ? errObj?.error || res.statusText : undefined,
  }
}
