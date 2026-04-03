import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { PortalUserRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requirePortalUser } from '../lib/authz.js'
import {
  NEXUS_ENTITY_PATHS,
  fetchNexusEntityList,
  getNexusBaseUrl,
  getNexusToken,
} from '../lib/nexus.js'

async function requireAdmin(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  const u = await requirePortalUser(req, reply)
  if (!u) return null
  if (u.role !== PortalUserRole.PORTAL_ADMIN) {
    reply.code(403).send({ error: 'Apenas administrador' })
    return null
  }
  return u
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
    return reply.send({
      nexusConfigured: configured,
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
    const base = getNexusBaseUrl()
    const token = getNexusToken()
    if (!base) {
      return reply.code(400).send({
        error: 'Configure NEXUS_API_BASE_URL (ou NEXUS_API_URL) no servidor da API do portal.',
      })
    }

    let only: string[] | undefined
    try {
      only = z.object({ entities: z.array(z.string()).optional() }).parse(req.body ?? {}).entities
    } catch {
      return reply.code(400).send({ error: 'Body inválido' })
    }

    const keys = only?.length
      ? only.filter((k) => k in NEXUS_ENTITY_PATHS)
      : Object.keys(NEXUS_ENTITY_PATHS)

    const results: { entityKey: string; ok: boolean; rowCount?: number; error?: string }[] = []

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
            rows: [],
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

    return reply.send({ ok: true, results })
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
