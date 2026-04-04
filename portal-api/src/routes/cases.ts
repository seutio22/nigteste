import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Prisma, PortalCaseStatus, PortalUserRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { requirePortalUser } from '../lib/authz.js'
import { generateProtocol } from '../lib/protocol.js'
import { buildSlaEtapas, triagemDueFrom } from '../lib/sla.js'

async function canViewCase(
  userId: string,
  role: PortalUserRole,
  caseUserId: string
): Promise<boolean> {
  if (caseUserId === userId) return true
  if (role === PortalUserRole.PORTAL_ADMIN || role === PortalUserRole.PORTAL_OPERATOR) return true
  if (role === PortalUserRole.REQUESTER_MANAGER) {
    const sub = await prisma.portalUser.findFirst({
      where: { id: caseUserId, parentManagerId: userId, active: true },
    })
    return !!sub
  }
  return false
}

export async function registerCaseRoutes(app: FastifyInstance) {
  app.get('/cases/mine', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const list = await prisma.portalCase.findMany({
      where: { portalUserId: u.id },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        protocol: true,
        status: true,
        priority: true,
        queueLabel: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        slaTriagemDueAt: true,
        slaAtuacaoDueAt: true,
        slaPausedAt: true,
        area: { select: { id: true, name: true, slug: true } },
        requestType: {
          select: {
            id: true,
            name: true,
            slug: true,
            formSchema: true,
            slaProfile: {
              select: {
                id: true,
                name: true,
                prazoEmDiasUteis: true,
                triagemDiasUteis: true,
                atuacaoDiasUteis: true,
              },
            },
          },
        },
        assignee: { select: { id: true, name: true, email: true } },
      },
    })
    return reply.send({ cases: list })
  })

  app.post('/cases', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const bodySchema = z.object({
      areaId: z.string().uuid().optional(),
      requestTypeId: z.string().uuid().optional(),
      title: z.string().max(200).optional(),
      answers: z.record(z.string(), z.unknown()).optional(),
      submit: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const protocol = generateProtocol()
    const status = body.submit ? PortalCaseStatus.SUBMITTED : PortalCaseStatus.DRAFT

    const answersJson: Prisma.InputJsonValue | undefined =
      body.answers === undefined ? undefined : (JSON.parse(JSON.stringify(body.answers)) as Prisma.InputJsonValue)

    const created = await prisma.portalCase.create({
      data: {
        protocol,
        portalUserId: u.id,
        areaId: body.areaId ?? null,
        requestTypeId: body.requestTypeId ?? null,
        title: body.title?.trim() || null,
        answers: answersJson,
        status,
      },
    })

    if (status === PortalCaseStatus.SUBMITTED && body.requestTypeId) {
      const rt = await prisma.portalRequestType.findUnique({
        where: { id: body.requestTypeId },
        include: { slaProfile: true },
      })
      if (rt?.slaProfile) {
        const now = new Date()
        await prisma.portalCase.update({
          where: { id: created.id },
          data: {
            slaSubmittedAt: now,
            slaTriagemDueAt: triagemDueFrom(now, rt.slaProfile),
          },
        })
      }
    }

    const out = await prisma.portalCase.findUniqueOrThrow({
      where: { id: created.id },
      select: {
        id: true,
        protocol: true,
        status: true,
        title: true,
        createdAt: true,
        slaSubmittedAt: true,
        slaTriagemDueAt: true,
        slaAtuacaoDueAt: true,
        slaPausedAt: true,
      },
    })

    return reply.code(201).send({ case: out })
  })

  app.get('/cases/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })

    const c = await prisma.portalCase.findFirst({
      where: { id: params.data.id },
      include: {
        area: { select: { id: true, name: true, slug: true } },
        requestType: {
          select: {
            id: true,
            name: true,
            slug: true,
            formSchema: true,
            slaProfile: true,
          },
        },
        user: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    })
    if (!c) return reply.code(404).send({ error: 'Não encontrado' })

    const allowed = await canViewCase(u.id, u.role, c.portalUserId)
    if (!allowed) return reply.code(403).send({ error: 'Sem permissão' })

    const profile = c.requestType?.slaProfile ?? null
    const sla = buildSlaEtapas(c, profile)

    return reply.send({
      case: {
        ...c,
        sla,
      },
    })
  })
}
