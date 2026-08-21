import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

const MAX_BATCH = 80

function getActorUserId(request: any): string | null {
  const fromAuth = request?.authUser?.id
  if (typeof fromAuth === 'string' && fromAuth.trim()) return fromAuth.trim()
  const u = request?.user
  const id = u?.sub ?? u?.id ?? u?.userId
  return typeof id === 'string' && id.trim() ? id.trim() : null
}

function isAdminRoleHeader(request: any): boolean {
  const role = request?.authUser?.role ?? request?.user?.role
  return String(role || '').trim().toLowerCase() === 'admin'
}

type AuditEntryInput = {
  entityType: string
  entityId?: string | null
  action: 'create' | 'update' | 'delete' | string
  targetLabel?: string | null
  metadata?: Record<string, unknown> | null
}

export default async function projectWorkAuditRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options

  fastify.post('/projetos/:projectId/work-audit-logs', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const body = request.body as { entries?: AuditEntryInput[] }
      const entries = Array.isArray(body?.entries) ? body.entries : []

      if (entries.length === 0) {
        return reply.status(400).send({ error: 'Informe entries (array) com ao menos um evento.' })
      }
      if (entries.length > MAX_BATCH) {
        return reply.status(400).send({ error: `No máximo ${MAX_BATCH} eventos por requisição.` })
      }

      const project = await prisma.project.findUnique({ where: { id: projectId } })
      if (!project) {
        return reply.status(404).send({ error: 'Projeto não encontrado' })
      }

      const actorUserId = getActorUserId(request) ?? null

      const allowedActions = new Set(['create', 'update', 'delete'])
      const rows = entries.map((e) => {
        const action = String(e.action || '').toLowerCase()
        if (!allowedActions.has(action)) {
          throw new Error(`action inválida: ${e.action}`)
        }
        const entityType = String(e.entityType || '').trim()
        if (!entityType) {
          throw new Error('entityType é obrigatório')
        }
        let metadataStr: string | null = null
        if (e.metadata != null && typeof e.metadata === 'object') {
          try {
            metadataStr = JSON.stringify(e.metadata)
          } catch {
            metadataStr = null
          }
        }
        return {
          projectId,
          entityType,
          entityId: e.entityId != null && String(e.entityId).trim() ? String(e.entityId).trim() : null,
          action,
          actorUserId,
          targetLabel: e.targetLabel != null ? String(e.targetLabel).slice(0, 500) : null,
          metadata: metadataStr
        }
      })

      await prisma.projectWorkAuditLog.createMany({ data: rows })

      return { success: true, count: rows.length }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar auditoria'
      if (msg.startsWith('action') || msg.startsWith('entityType')) {
        return reply.status(400).send({ error: msg })
      }
      console.error('projectWorkAudit POST:', err)
      return reply.status(500).send({ error: 'Erro interno ao registrar log de trabalho' })
    }
  })

  fastify.get('/projetos/:projectId/work-audit-logs', async (request, reply) => {
    try {
      if (!isAdminRoleHeader(request)) {
        return reply.status(403).send({ error: 'Apenas administradores podem consultar o log de trabalho do projeto.' })
      }

      const { projectId } = request.params as { projectId: string }
      const q = request.query as {
        from?: string
        to?: string
        entityType?: string
        action?: string
        limit?: string
      }

      const project = await prisma.project.findUnique({ where: { id: projectId } })
      if (!project) {
        return reply.status(404).send({ error: 'Projeto não encontrado' })
      }

      const limit = Math.min(500, Math.max(1, parseInt(String(q.limit || '100'), 10) || 100))

      const where: {
        projectId: string
        createdAt?: { gte?: Date; lte?: Date }
        entityType?: string
        action?: string
      } = { projectId }

      if (q.from) {
        const d = new Date(q.from)
        if (!isNaN(d.getTime())) {
          where.createdAt = { ...where.createdAt, gte: d }
        }
      }
      if (q.to) {
        const d = new Date(q.to)
        if (!isNaN(d.getTime())) {
          where.createdAt = { ...where.createdAt, lte: d }
        }
      }
      if (q.entityType?.trim()) {
        where.entityType = q.entityType.trim()
      }
      if (q.action?.trim()) {
        where.action = q.action.trim().toLowerCase()
      }

      const logs = await prisma.projectWorkAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: {
          actor: { select: { id: true, name: true, email: true } }
        }
      })

      return {
        logs: logs.map((l) => ({
          id: l.id,
          projectId: l.projectId,
          entityType: l.entityType,
          entityId: l.entityId,
          action: l.action,
          actorUserId: l.actorUserId,
          actor: l.actor,
          targetLabel: l.targetLabel,
          metadata: l.metadata
            ? (() => {
                try {
                  return JSON.parse(l.metadata)
                } catch {
                  return null
                }
              })()
            : null,
          createdAt: l.createdAt
        }))
      }
    } catch (err) {
      console.error('projectWorkAudit GET:', err)
      return reply.status(500).send({ error: 'Erro ao listar log de trabalho' })
    }
  })
}
