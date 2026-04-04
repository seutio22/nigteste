// Dev: proxy Vite /api → API local. Produção: obrigatório VITE_API_URL = URL da API (Railway), sem sufixo /api.
const envApi = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '') ?? ''
const base = import.meta.env.DEV ? envApi || '/api' : envApi

if (import.meta.env.PROD && !envApi) {
  console.error(
    '[portal-web] Defina VITE_API_URL na Vercel (Settings → Environment Variables). URL pública da API Railway, sem / no final, ex. https://….up.railway.app. Sem isso o browser envia POST para este domínio (405/404).'
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
  if (import.meta.env.PROD && !envApi) {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        'API não configurada: em Vercel → Environment Variables adicione VITE_API_URL com a URL da API (Railway), ex. https://portal-colaborador-api-production.up.railway.app — depois faça Redeploy.',
    }
  }
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
  const fallback404 =
    res.status === 404 && !errObj?.error
      ? 'Não encontrado (404). Verifique se VITE_API_URL na Vercel aponta para a API Railway e redeploy da API após atualizações.'
      : res.statusText
  return {
    ok: res.ok,
    status: res.status,
    data,
    error: !res.ok ? errObj?.error || fallback404 : undefined,
  }
}
