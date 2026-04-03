import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { NEXUS_ENTITY_PATHS, fetchNexusEntityList, getNexusBaseUrl, getNexusToken } from './nexus.js'

export type NexusSyncResultRow = { entityKey: string; ok: boolean; rowCount?: number; error?: string }

let syncInProgress = false

/**
 * Sincroniza snapshots a partir da API Nexus (GETs da página Dados).
 * Usado pelo POST admin e pelo agendador periódico.
 */
export async function runNexusSnapshotSync(options?: {
  entities?: string[]
}): Promise<
  | { skipped: true; reason: 'not_configured' | 'already_running' }
  | { ok: true; results: NexusSyncResultRow[] }
> {
  const base = getNexusBaseUrl()
  if (!base) {
    return { skipped: true, reason: 'not_configured' }
  }
  if (syncInProgress) {
    return { skipped: true, reason: 'already_running' }
  }

  const token = getNexusToken()
  const only = options?.entities?.filter((k) => k in NEXUS_ENTITY_PATHS)
  const keys = only && only.length > 0 ? only : Object.keys(NEXUS_ENTITY_PATHS)

  const results: NexusSyncResultRow[] = []
  syncInProgress = true
  try {
    for (const entityKey of keys) {
      const path = NEXUS_ENTITY_PATHS[entityKey]
      if (!path) continue
      try {
        const list = await fetchNexusEntityList(base, path, token)
        const json = JSON.parse(JSON.stringify(list)) as Prisma.InputJsonValue
        await prisma.portalNexusEntitySnapshot.upsert({
          where: { entityKey },
          create: {
            entityKey,
            rows: json,
            rowCount: list.length,
            syncedAt: new Date(),
            lastError: null,
          },
          update: {
            rows: json,
            rowCount: list.length,
            syncedAt: new Date(),
            lastError: null,
          },
        })
        results.push({ entityKey, ok: true, rowCount: list.length })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await prisma.portalNexusEntitySnapshot.upsert({
          where: { entityKey },
          create: {
            entityKey,
            rows: [] as Prisma.InputJsonValue,
            rowCount: 0,
            syncedAt: new Date(),
            lastError: msg,
          },
          update: {
            lastError: msg,
            syncedAt: new Date(),
          },
        })
        results.push({ entityKey, ok: false, error: msg })
      }
    }
    return { ok: true, results }
  } finally {
    syncInProgress = false
  }
}

/**
 * Minutos entre syncs automáticos.
 * - Não definido → 15 (recomendado: dados mestres mudam pouco; não sobrecarrega a API Nexus).
 * - 0 → desliga o agendador.
 * - Entre 1–4 → sobe para 5 (mínimo seguro).
 * - Máximo 1440 (24 h).
 */
export function getNexusSyncIntervalMinutes(): number {
  const raw = process.env.NEXUS_SYNC_INTERVAL_MINUTES
  if (raw === '0') return 0
  if (raw === undefined || raw === '') return 15
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return 15
  if (n <= 0) return 0
  return Math.min(1440, Math.max(5, n))
}
