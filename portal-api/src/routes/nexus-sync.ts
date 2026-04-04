import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PortalUserRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requirePortalUser } from '../lib/authz.js'
import { NEXUS_ENTITY_PATHS, getNexusBaseUrl } from '../lib/nexus.js'
import { getNexusSyncIntervalMinutes, runNexusSnapshotSync } from '../lib/nexus-sync-runner.js'

async function requireAdmin(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  const u = await requirePortalUser(req, reply)
  if (!u) return null
  if (u.role !== PortalUserRole.PORTAL_ADMIN) {
    reply.code(403).send({ error: 'Apenas administrador' })
    return null
  }
  return u
}

function collectSnapshotColumns(slice: unknown[]): string[] {
  const keys = new Set<string>()
  for (const r of slice) {
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      for (const k of Object.keys(r as Record<string, unknown>)) keys.add(k)
    }
  }
  const preferred = ['id', 'nome', 'name', 'email', 'ativo', 'createdAt', 'updatedAt']
  const rest = [...keys].filter((k) => !preferred.includes(k)).sort((a, b) => a.localeCompare(b))
  return [...preferred.filter((k) => keys.has(k)), ...rest]
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function getNested(obj: unknown, path: string): unknown {
  const parts = path.split('.').filter(Boolean)
  let cur: unknown = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p]
    } else {
      return undefined
    }
  }
  return cur
}

export async function registerNexusSyncRoutes(app: FastifyInstance) {
  app.get('/admin/nexus-sync/status', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const rows = await prisma.portalNexusEntitySnapshot.findMany({
      orderBy: { entityKey: 'asc' },
    })
    const configured = !!getNexusBaseUrl()
    const autoSyncIntervalMinutes = getNexusSyncIntervalMinutes()
    return reply.send({
      nexusConfigured: configured,
      autoSyncIntervalMinutes,
      autoSyncHint:
        autoSyncIntervalMinutes > 0
          ? `Sincronização automática a cada ${autoSyncIntervalMinutes} min no servidor.`
          : 'Automático desligado (defina NEXUS_SYNC_INTERVAL_MINUTES, ex.: 15).',
      entities: rows.map((r) => ({
        entityKey: r.entityKey,
        rowCount: r.rowCount,
        syncedAt: r.syncedAt,
        lastError: r.lastError,
      })),
    })
  })

  app.post('/admin/nexus-sync/run', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    if (!getNexusBaseUrl()) {
      return reply.code(400).send({
        error:
          'Defina NEXUS_API_BASE_URL e NEXUS_API_TOKEN no serviço portal-colaborador-api (Railway: Variables ou CLI railway variable set; repo: portal-api/configure-nexus-railway.ps1).',
      })
    }

    let only: string[] | undefined
    try {
      only = z.object({ entities: z.array(z.string()).optional() }).parse(req.body ?? {}).entities
    } catch {
      return reply.code(400).send({ error: 'Body inválido' })
    }

    const out = await runNexusSnapshotSync({ entities: only })
    if ('skipped' in out && out.skipped) {
      if (out.reason === 'already_running') {
        return reply.code(409).send({ error: 'Sincronização já em andamento. Tente em instantes.' })
      }
      return reply.code(400).send({
        error:
          'Defina NEXUS_API_BASE_URL e NEXUS_API_TOKEN no serviço portal-colaborador-api (Railway: Variables ou CLI railway variable set; repo: portal-api/configure-nexus-railway.ps1).',
      })
    }
    if (!('ok' in out) || !out.ok) {
      return reply.code(500).send({ error: 'Falha na sincronização' })
    }
    return reply.send({ ok: true, results: out.results })
  })

  /**
   * Pré-visualização dos registros sincronizados (admin) — paginado.
   * GET /admin/nexus-sync/snapshot?entity=clientes&limit=100&offset=0
   */
  app.get('/admin/nexus-sync/snapshot', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return

    const q = z
      .object({
        entity: z.string().min(1).max(64),
        limit: z.coerce.number().min(1).max(500).default(100),
        offset: z.coerce.number().min(0).default(0),
      })
      .safeParse(req.query)

    if (!q.success) return reply.code(400).send({ error: 'Query inválida' })
    const { entity, limit, offset } = q.data

    if (!NEXUS_ENTITY_PATHS[entity]) {
      return reply.code(400).send({ error: 'Entidade não suportada' })
    }

    const snap = await prisma.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: entity },
    })
    if (!snap) {
      return reply.code(404).send({ error: 'Snapshot não encontrado. Sincronize primeiro.' })
    }

    const all = snap.rows
    const list = Array.isArray(all) ? all : []
    const total = list.length
    const slice = list.slice(offset, offset + limit)
    const sampleCols = list.slice(0, Math.min(100, list.length))
    const columns = collectSnapshotColumns(sampleCols)

    const rows = slice.map((row) => {
      const rec: Record<string, string> = {}
      if (row && typeof row === 'object' && !Array.isArray(row)) {
        for (const c of columns) {
          const v = (row as Record<string, unknown>)[c]
          rec[c] = formatCell(v)
        }
      }
      return rec
    })

    return reply.send({
      entityKey: entity,
      syncedAt: snap.syncedAt,
      rowCount: snap.rowCount,
      total,
      limit,
      offset,
      columns,
      rows,
    })
  })

  /**
   * Metadados do snapshot para montar selects no admin (colunas disponíveis, sem enviar todas as linhas).
   * GET /admin/nexus-sync/entity-fields?entity=clientes
   */
  app.get('/admin/nexus-sync/entity-fields', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return

    const q = z.object({ entity: z.string().min(1).max(64) }).safeParse(req.query)
    if (!q.success) return reply.code(400).send({ error: 'Query inválida' })

    const { entity } = q.data
    if (!NEXUS_ENTITY_PATHS[entity]) {
      return reply.code(400).send({ error: 'Entidade não suportada' })
    }

    const snap = await prisma.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: entity },
    })
    if (!snap) {
      return reply.code(404).send({
        error: 'Nenhum snapshot desta entidade. Na aba Banco de dados Nexus, execute a sincronização.',
        needsSync: true,
      })
    }

    const list = Array.isArray(snap.rows) ? snap.rows : []
    const sampleCols = list.slice(0, Math.min(100, list.length))
    const columns = collectSnapshotColumns(sampleCols)

    return reply.send({
      entityKey: entity,
      rowCount: snap.rowCount,
      syncedAt: snap.syncedAt,
      lastError: snap.lastError,
      columns,
    })
  })

  /** Lista valores para campos select alimentados pelo snapshot Nexus (colaborador autenticado). */
  app.get('/nexus/options', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const q = z
      .object({
        entity: z.string().min(1).max(64),
        value: z.string().min(1).max(80).default('id'),
        label: z.string().min(1).max(80).default('nome'),
      })
      .safeParse(req.query)

    if (!q.success) return reply.code(400).send({ error: 'Query inválida' })

    if (!NEXUS_ENTITY_PATHS[q.data.entity]) {
      return reply.code(400).send({ error: 'Entidade não suportada' })
    }

    const snap = await prisma.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: q.data.entity },
    })
    if (!snap || snap.rowCount === 0) {
      return reply.code(503).send({
        error: 'Dados Nexus ainda não sincronizados. Peça ao administrador para configurar NEXUS_API_* e executar sincronização.',
      })
    }

    const rows = snap.rows
    if (!Array.isArray(rows)) {
      return reply.send({ options: [] })
    }

    const options: { value: string; label: string }[] = []
    for (const row of rows) {
      const v = getNested(row, q.data.value)
      const l = getNested(row, q.data.label)
      if (v === undefined || v === null) continue
      const vs = String(v)
      const ls = l !== undefined && l !== null ? String(l) : vs
      options.push({ value: vs, label: ls })
    }

    return reply.send({ options, syncedAt: snap.syncedAt })
  })
}
