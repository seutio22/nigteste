import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PortalCasePriority, PortalCaseStatus, PortalUserRole, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { assertRole, requirePortalUser } from '../lib/authz.js'
import { atuacaoDueFrom, resumeAtuacaoDue } from '../lib/sla.js'

const opRoles = [PortalUserRole.PORTAL_OPERATOR, PortalUserRole.PORTAL_ADMIN]

async function requireOps(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  const u = await requirePortalUser(req, reply)
  if (!u) return null
  if (!assertRole(u, opRoles, reply)) return null
  return u
}

export async function registerOperationsRoutes(app: FastifyInstance) {
  app.get('/operations/queue', async (req, reply) => {
    if (!(await requireOps(req, reply))) return

    const raw = req.query as Record<string, string | undefined>
    const where: Prisma.PortalCaseWhereInput = {}
    const st = raw.status as PortalCaseStatus | undefined
    if (st && Object.values(PortalCaseStatus).includes(st)) {
      where.status = st
    } else {
      where.status = {
        notIn: [PortalCaseStatus.DRAFT, PortalCaseStatus.COMPLETED, PortalCaseStatus.CANCELLED],
      }
    }
    if (raw.queueLabel !== undefined) {
      where.queueLabel = raw.queueLabel === '' ? null : raw.queueLabel
    }

    const list = await prisma.portalCase.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      take: 400,
      include: {
        user: { select: { id: true, name: true, email: true } },
        area: { select: { id: true, name: true, slug: true } },
        requestType: { select: { id: true, name: true, slug: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    })
    return reply.send({ cases: list })
  })

  app.get('/operations/operators', async (req, reply) => {
    if (!(await requireOps(req, reply))) return
    const ops = await prisma.portalUser.findMany({
      where: {
        active: true,
        role: { in: [PortalUserRole.PORTAL_OPERATOR, PortalUserRole.PORTAL_ADMIN] },
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true, role: true },
    })
    return reply.send({ operators: ops })
  })

  app.patch('/operations/cases/:id', async (req, reply) => {
    if (!(await requireOps(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })

    const bodySchema = z.object({
      assignedToUserId: z.string().uuid().nullable().optional(),
      priority: z.nativeEnum(PortalCasePriority).optional(),
      queueLabel: z.string().max(80).nullable().optional(),
      status: z.nativeEnum(PortalCaseStatus).optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    if (body.assignedToUserId) {
      const assignee = await prisma.portalUser.findFirst({
        where: {
          id: body.assignedToUserId,
          active: true,
          role: { in: [PortalUserRole.PORTAL_OPERATOR, PortalUserRole.PORTAL_ADMIN] },
        },
      })
      if (!assignee) return reply.code(400).send({ error: 'Responsável deve ser operador ou admin' })
    }

    const existing = await prisma.portalCase.findUnique({
      where: { id: params.data.id },
      include: { requestType: { include: { slaProfile: true } } },
    })
    if (!existing) return reply.code(404).send({ error: 'Caso não encontrado' })

    const now = new Date()
    const p = existing.requestType?.slaProfile

    const data: Prisma.PortalCaseUpdateInput = {}
    if (body.assignedToUserId !== undefined) {
      data.assignee =
        body.assignedToUserId === null ? { disconnect: true } : { connect: { id: body.assignedToUserId } }
    }
    if (body.priority !== undefined) data.priority = body.priority
    if (body.queueLabel !== undefined) data.queueLabel = body.queueLabel

    if (body.status !== undefined) {
      data.status = body.status
      if (p && body.status !== existing.status) {
        if (body.status === PortalCaseStatus.AWAITING_REQUESTER && p.pausarQuandoAguardandoDemanda) {
          data.slaPausedAt = now
        }
        if (body.status === PortalCaseStatus.IN_ANALYSIS) {
          if (existing.status === PortalCaseStatus.AWAITING_REQUESTER && p.pausarQuandoAguardandoDemanda) {
            data.slaPausedAt = null
            data.slaAtuacaoDueAt = resumeAtuacaoDue(now, p)
          } else if (
            existing.status === PortalCaseStatus.SUBMITTED ||
            existing.status === PortalCaseStatus.IN_TRIAGE
          ) {
            data.slaAtuacaoDueAt = atuacaoDueFrom(now, p)
          }
        }
      }
      if (
        body.status !== PortalCaseStatus.AWAITING_REQUESTER &&
        existing.slaPausedAt
      ) {
        data.slaPausedAt = null
      }
    }

    try {
      const c = await prisma.portalCase.update({
        where: { id: params.data.id },
        data,
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          area: true,
          requestType: true,
        },
      })
      return reply.send({ case: c })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        return reply.code(404).send({ error: 'Caso não encontrado' })
      }
      throw e
    }
  })
}
