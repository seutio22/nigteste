const STORAGE_KEY = 'placementShareToken'

/** Token ativo do viewer público — usado pelo api.local para reescrever rotas Placement. */
export function setPlacementShareToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (!token) {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, token)
}

export function getPlacementShareToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(STORAGE_KEY)
}

/** Reescreve GETs autenticados de cotação para endpoints públicos do share.
 *  PUT/PATCH em modo share viram no-op local (permite filtros/visibilidade sem gravar). */
export function rewritePlacementShareEndpoint(endpoint: string, method = 'GET'): string | { localNoop: true } {
  const token = getPlacementShareToken()
  if (!token) return endpoint
  const upper = method.toUpperCase()
  if (upper === 'PUT' || upper === 'PATCH' || upper === 'POST' || upper === 'DELETE') {
    return { localNoop: true }
  }
  if (upper !== 'GET') {
    throw new Error('Apresentação pública é somente leitura.')
  }
  const m = endpoint.match(/^\/placement\/cotacoes\/[^/?]+(\/[^?]*)?/)
  if (!m) return endpoint
  const rest = m[1] ?? ''
  if (!rest || rest === '/') return `/share/placement/${token}/cotacao`
  if (rest === '/beneficiarios') return `/share/placement/${token}/beneficiarios`
  return endpoint
}
