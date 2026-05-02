// Dev: proxy Vite /api → API local. Produção: VITE_API_URL = URL pública da API (Railway).
// Muitos 404 vêm de VITE_API_URL com /api no fim — a API não usa prefixo; só o Vite em dev reescreve /api.
function normalizeApiBase(raw: string | undefined): string {
  let u = (raw ?? '').trim().replace(/\/+$/, '')
  if (u.endsWith('/api')) {
    u = u.slice(0, -4).replace(/\/+$/, '')
  }
  return u
}

const envApi = normalizeApiBase(import.meta.env.VITE_API_URL as string | undefined)
const base = import.meta.env.DEV ? envApi || '/api' : envApi

if (import.meta.env.PROD && !envApi) {
  console.error(
    '[portal-web] Defina VITE_API_URL na Vercel (Settings → Environment Variables). URL pública da API Railway, sem / no final, ex. https://….up.railway.app. Sem isso o browser envia POST para este domínio (405/404).'
  )
}

/** Base da API efetiva (após normalização), para diagnóstico na UI. */
export function getPortalApiBaseDisplay(): string {
  if (import.meta.env.PROD) {
    return envApi || '(VITE_API_URL não definida no build)'
  }
  return envApi ? `${envApi}` : '/api (proxy Vite em desenvolvimento)'
}

function getToken(): string | null {
  return localStorage.getItem('portal_token')
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('portal_token', token)
  else localStorage.removeItem('portal_token')
}

/** Base normalizada para pedidos ao servidor. */
function buildApiUrl(path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export async function apiBlob(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; blob: Blob | null; error?: string; filenameHint?: string }> {
  if (import.meta.env.PROD && !envApi) {
    return {
      ok: false,
      status: 0,
      blob: null,
      error:
        'API não configurada: em Vercel → Environment Variables adicione VITE_API_URL com a URL da API (Railway).',
    }
  }
  const url = buildApiUrl(path)
  const token = getToken()
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((init?.headers as Record<string, string>) || {}),
      },
    })
    const cd = res.headers.get('Content-Disposition')
    let filenameHint: string | undefined
    if (cd) {
      const m = /filename\*?=(?:UTF-8'')?["']?([^"';]+)/i.exec(cd) || /filename="([^"]+)"/i.exec(cd)
      if (m) filenameHint = decodeURIComponent(m[1].replace(/["']/g, ''))
    }
    if (!res.ok) {
      const text = await res.text()
      let err = res.statusText
      try {
        const j = JSON.parse(text) as { error?: string }
        if (j.error) err = j.error
      } catch {
        if (text.length && text.length < 800) err = text
      }
      return { ok: false, status: res.status, blob: null, error: err }
    }
    const blob = await res.blob()
    return { ok: true, status: res.status, blob, filenameHint }
  } catch {
    return {
      ok: false,
      status: 0,
      blob: null,
      error:
        'Não foi possível contactar a API. Verifique VITE_API_URL, rede e CORS.',
    }
  }
}

/** POST multipart (não definir Content-Type manualmente — o browser define o boundary). */
export async function apiFormData<T>(
  path: string,
  formData: FormData,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  if (import.meta.env.PROD && !envApi) {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        'API não configurada: em Vercel → Environment Variables adicione VITE_API_URL com a URL da API (Railway).',
    }
  }
  const url = buildApiUrl(path)
  const token = getToken()
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Não foi possível contactar a API.',
    }
  }
  const text = await res.text()
  let data: T | null = null
  let jsonParseFailed = false
  if (text) {
    try {
      data = JSON.parse(text) as T
    } catch {
      jsonParseFailed = true
      data = null
    }
  }
  const parseErrorMsg = jsonParseFailed
    ? 'A API devolveu uma resposta que não é JSON.'
    : undefined
  const errObj = data as { error?: string; message?: string } | null
  const serverMsg = errObj?.error || errObj?.message
  const httpOk = res.ok && !jsonParseFailed
  const errorMsg = !httpOk ? parseErrorMsg || serverMsg || res.statusText : undefined
  return {
    ok: httpOk,
    status: res.status,
    data,
    error: errorMsg,
  }
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
  const url = buildApiUrl(path)
  const token = getToken()
  const headers: HeadersInit = {
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((init?.headers as Record<string, string>) || {}),
  }
  let res: Response
  try {
    res = await fetch(url, { ...init, headers })
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error:
        'Não foi possível contactar a API. Verifique a rede, CORS e se VITE_API_URL na Vercel aponta para o domínio Railway da API (ex. https://….up.railway.app), não para o URL do site no Vercel.',
    }
  }

  let data: T | null = null
  const text = await res.text()
  let jsonParseFailed = false
  if (text) {
    try {
      data = JSON.parse(text) as T
    } catch {
      jsonParseFailed = true
      data = null
    }
  }

  // Ex.: VITE_API_URL a apontar para o front (Vercel devolve index.html em 200) → HTML não é JSON.
  const parseErrorMsg = jsonParseFailed
    ? 'A URL da API devolveu uma página em vez de JSON. Na Vercel, em VITE_API_URL use só o domínio público da API no Railway (sem /api no fim). Depois faça Redeploy do portal-web.'
    : undefined

  const errObj = data as { error?: string; message?: string } | null
  const serverMsg = errObj?.error || errObj?.message
  const fallback404 =
    res.status === 404 && !serverMsg
      ? 'Não encontrado (404). Confirme VITE_API_URL na Vercel (URL da API Railway **sem** /api no final, ex. https://….up.railway.app). Se a API ainda não tiver as rotas /admin/sla-profiles, faça redeploy da API.'
      : res.statusText

  const httpOk = res.ok && !jsonParseFailed
  const errorMsg = !httpOk ? parseErrorMsg || serverMsg || (res.status === 404 ? fallback404 : res.statusText || 'Erro ao contactar a API.') : undefined

  return {
    ok: httpOk,
    status: res.status,
    data,
    error: errorMsg,
  }
}
