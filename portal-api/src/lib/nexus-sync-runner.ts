import { Prisma } from '@prisma/client'
import { prisma } from './prisma.js'
import { importNexusSegurosParaPortal } from './nexus-seguros-import.js'
import { NEXUS_ENTITY_PATHS, fetchNexusEntityList, getNexusBaseUrl, getNexusToken } from './nexus.js'

export type NexusSyncResultRow = { entityKey: string; ok: boolean; rowCount?: number; error?: string }

/**
 * Após sync dos snapshots, gravar contratos Nexus novos em PortalSeguro* (insert-only).
 * Default: ligado. Defina `NEXUS_IMPORT_SEGUROS_AFTER_SYNC=0` para desligar.
 */
export function getImportSegurosAfterSync(): boolean {
  const raw = (process.env.NEXUS_IMPORT_SEGUROS_AFTER_SYNC ?? '1').trim().toLowerCase()
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') return false
  return true
}

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

    if (getImportSegurosAfterSync()) {
      const contratosOk = results.some((r) => r.entityKey === 'contratos' && r.ok)
      if (contratosOk) {
        try {
          const imp = await importNexusSegurosParaPortal({ dryRun: false })
          results.push({
            entityKey: '_import_seguros_portal',
            ok: imp.errors.length === 0,
            rowCount: imp.apolicesCriadas + imp.estipulantesCriados,
            error: imp.errors.length > 0 ? imp.errors.slice(0, 5).join(' | ').slice(0, 500) + (imp.errors.length > 5 ? '…' : '') : undefined,
          })
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e)
          results.push({ entityKey: '_import_seguros_portal', ok: false, error: msg })
        }
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
