/**
 * Mesmos endpoints que o Nexus (demandas-web) usa em masterDataStore.syncFromApi.
 * GET com token Bearer (usuário de serviço ou admin no Nexus).
 */
export const NEXUS_ENTITY_PATHS: Record<string, string> = {
  clientes: '/clientes',
  contratos: '/contratos',
  operadoras: '/operadoras',
  produtos: '/produtos',
  sistemas: '/sistemas',
  grupos: '/grupos',
  analistas: '/analistas',
  areas: '/areas',
  tiposCadastro: '/tiposCadastro',
  tiposServico: '/tiposServico',
  tiposDemanda: '/tiposDemanda',
  solicitantes: '/solicitantes',
  relatorios: '/relatorios',
  modelos: '/modelos',
  padrao: '/padrao',
  areasMailling: '/areas-mailling',
  cargosMailling: '/cargos-mailling',
  filiaisMailling: '/filiais-mailling',
}

export function getNexusBaseUrl(): string | null {
  const u = (process.env.NEXUS_API_BASE_URL || process.env.NEXUS_API_URL || '').trim().replace(/\/$/, '')
  return u || null
}

export function getNexusToken(): string | null {
  const t = (process.env.NEXUS_API_TOKEN || '').trim()
  return t || null
}

export async function fetchNexusEntityList(baseUrl: string, path: string, token: string | null): Promise<unknown[]> {
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, { headers })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Nexus HTTP ${res.status} ${text.slice(0, 200)}`)
  }
  const data: unknown = await res.json()
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: unknown[] }).data
  }
  return []
}
