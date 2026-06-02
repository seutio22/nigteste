import { api } from '../../../lib/api.local'

/** Evita repetir GET /image para IDs que já falharam nesta sessão. */
const failedOperadoraLogoIds = new Set<string>()

export function resetFailedOperadoraLogoCache(): void {
  failedOperadoraLogoIds.clear()
}

/** IDs de operadoras que possuem logo cadastrado em Dados → Placement. */
export async function fetchOperadoraIdsComLogo(): Promise<Set<string>> {
  try {
    const res = (await api.get('/placement/operadora-logos')) as {
      logos?: { operadoraId: string }[]
    }
    return new Set((res.logos ?? []).map((l) => l.operadoraId))
  } catch {
    return new Set()
  }
}

/** Carrega logos como object URLs (autenticado) para uso em &lt;img&gt; e export PNG. */
export async function loadOperadoraLogoObjectUrls(
  operadoraIds: string[],
  idsComLogo: Set<string>
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  const unique = [
    ...new Set(
      operadoraIds.filter(
        (id) => id && idsComLogo.has(id) && !failedOperadoraLogoIds.has(id)
      )
    ),
  ]
  await Promise.all(
    unique.map(async (operadoraId) => {
      try {
        const blob = await api.getBlob(`/placement/operadora-logos/${operadoraId}/image`)
        map.set(operadoraId, URL.createObjectURL(blob))
      } catch {
        failedOperadoraLogoIds.add(operadoraId)
      }
    })
  )
  return map
}

export function revokeOperadoraLogoUrls(urls: Map<string, string>): void {
  for (const url of urls.values()) {
    URL.revokeObjectURL(url)
  }
}
