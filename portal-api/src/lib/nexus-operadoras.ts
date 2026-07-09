import { NEXUS_ENTITY_PATHS, fetchNexusEntityList, getNexusBaseUrl, getNexusToken } from './nexus.js'
import { prisma } from './prisma.js'

export type NexusOperadoraOption = { id: string; nome: string }

function isRowInactive(o: Record<string, unknown>): boolean {
  const a = o.ativo ?? o.active ?? o.Ativo ?? o.Active
  if (a === false) return true
  if (a === 'false' || a === '0' || a === 0) return true
  return false
}

/** Alguns drivers / migrações guardam JSON como string. */
function deepParseJsonIfNeeded(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const s = value.trim()
  if (!s.startsWith('[') && !s.startsWith('{')) return value
  try {
    return JSON.parse(s) as unknown
  } catch {
    return value
  }
}

/** Aceita array direto ou objeto com chaves habituais (API / snapshot). */
export function extractOperadorasRows(rows: unknown): unknown[] | null {
  const v = deepParseJsonIfNeeded(rows)
  if (Array.isArray(v)) return v
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const o = v as Record<string, unknown>
    for (const k of ['data', 'rows', 'items', 'results', 'operadoras', 'records', 'list']) {
      const inner = o[k]
      if (Array.isArray(inner)) return inner
      if (typeof inner === 'string') {
        const parsed = deepParseJsonIfNeeded(inner)
        if (Array.isArray(parsed)) return parsed
      }
    }
  }
  return null
}

/** Normaliza linhas vindas do snapshot Nexus ou GET `/operadoras`. */
export function parseOperadorasFromSnapshotRows(rows: unknown): NexusOperadoraOption[] {
  const arr = extractOperadorasRows(rows)
  if (!arr) return []
  const out: NexusOperadoraOption[] = []
  for (const r of arr) {
    if (!r || typeof r !== 'object' || Array.isArray(r)) continue
    const o = r as Record<string, unknown>
    if (isRowInactive(o)) continue
    const rawId = o.id ?? o.Id ?? o.ID
    if (rawId === null || rawId === undefined) continue
    const id = String(rawId).trim()
    if (!id) continue
    const nomeRaw = o.nome ?? o.name ?? o.Nome ?? o.razaoSocial ?? o.label ?? o.titulo
    const nome = String(nomeRaw ?? '').trim()
    if (!nome) continue
    out.push({ id, nome })
  }
  out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))
  return out
}

function mergeOperadorasPreferLive(a: NexusOperadoraOption[], b: NexusOperadoraOption[]): NexusOperadoraOption[] {
  const m = new Map<string, string>()
  for (const o of a) m.set(o.id, o.nome)
  for (const o of b) m.set(o.id, o.nome)
  return [...m.entries()]
    .map(([id, nome]) => ({ id, nome }))
    .sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR', { sensitivity: 'base' }))
}

/** Cache só para listas não vazias (evita «congelar» erro ou resposta vazia por 45 s). */
let liveOperadorasCache: { t: number; ops: NexusOperadoraOption[] } | null = null
const LIVE_CACHE_MS = 45_000

async function fetchOperadorasLiveUncached(): Promise<NexusOperadoraOption[]> {
  const base = getNexusBaseUrl()
  if (!base) return []
  const token = getNexusToken()
  const list = await fetchNexusEntityList(base, NEXUS_ENTITY_PATHS.operadoras, token)
  return parseOperadorasFromSnapshotRows(list)
}

async function fetchOperadorasLive(): Promise<NexusOperadoraOption[]> {
  const now = Date.now()
  if (
    liveOperadorasCache &&
    liveOperadorasCache.ops.length > 0 &&
    now - liveOperadorasCache.t < LIVE_CACHE_MS
  ) {
    return liveOperadorasCache.ops
  }
  const ops = await fetchOperadorasLiveUncached()
  if (ops.length > 0) {
    liveOperadorasCache = { t: now, ops }
  }
  return ops
}

/**
 * Catálogo para o portal: combina snapshot em BD + consulta em tempo real ao Nexus quando possível.
 * Evita dropdown vazio quando o snapshot está desatualizado ou mal formatado.
 */
export async function loadNexusOperadorasFromSnapshot(): Promise<{
  operadoras: NexusOperadoraOption[]
  needsSync: boolean
  syncedAt: Date | null
  lastError: string | null
}> {
  const snap = await prisma.portalNexusEntitySnapshot.findUnique({
    where: { entityKey: 'operadoras' },
  })
  const syncedAt = snap?.syncedAt ?? null
  const snapshotLastError = snap?.lastError ?? null

  let snapOps: NexusOperadoraOption[] = []
  if (snap?.rows != null) {
    const rawRows = extractOperadorasRows(snap.rows)
    if (rawRows && rawRows.length > 0) {
      snapOps = parseOperadorasFromSnapshotRows(rawRows)
    }
  }

  let liveOps: NexusOperadoraOption[] = []
  let liveErr: string | null = null
  if (getNexusBaseUrl()) {
    try {
      liveOps = await fetchOperadorasLive()
    } catch (e) {
      liveErr = e instanceof Error ? e.message : String(e)
    }
  }

  const merged = mergeOperadorasPreferLive(snapOps, liveOps)

  if (merged.length > 0) {
    return {
      operadoras: merged,
      needsSync: false,
      syncedAt,
      lastError: snapshotLastError,
    }
  }

  return {
    operadoras: [],
    needsSync: true,
    syncedAt,
    lastError:
      snapshotLastError ??
      liveErr ??
      (getNexusBaseUrl()
        ? 'Não foi possível obter operadoras (snapshot + API Nexus vazios ou inacessíveis). Verifique token e URL da API de demandas.'
        : 'Defina NEXUS_API_BASE_URL (e de preferência NEXUS_API_TOKEN) na API do portal.'),
  }
}

export function operadoraNomePorId(operadoras: NexusOperadoraOption[], operadoraId: string | null | undefined): string | null {
  const id = operadoraId?.trim()
  if (!id) return null
  return operadoras.find((o) => o.id === id)?.nome ?? null
}

export function operadoraViewFromCatalogo(
  catalogo: Map<string, string>,
  operadoraId: string | null | undefined,
  fornecedor: string,
): { id: string; nome: string } | null {
  const id = operadoraId?.trim()
  if (!id) return null
  const nome = catalogo.get(id) ?? fornecedor?.trim() ?? ''
  return { id, nome: nome || '—' }
}
