import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { generateProtocol } from '../lib/protocol.js'
import { PortalCaseStatus } from '@prisma/client'

async function requirePortalUser(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Não autenticado' })
  }
}

export async function registerCaseRoutes(app: FastifyInstance) {
  app.get(
    '/cases/mine',
    { preHandler: [requirePortalUser] },
    async (req, reply) => {
      const payload = req.user as { sub?: string }
      const userId = payload?.sub
      if (!userId) return reply.code(401).send({ error: 'Não autenticado' })

      const list = await prisma.portalCase.findMany({
        where: { portalUserId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          id: true,
          protocol: true,
          status: true,
          title: true,
          createdAt: true,
          updatedAt: true,
          area: { select: { id: true, name: true, slug: true } },
          requestType: { select: { id: true, name: true, slug: true } },
        },
      })
      return reply.send({ cases: list })
    }
  )

  app.post(
    '/cases',
    { preHandler: [requirePortalUser] },
    async (req, reply) => {
      const payload = req.user as { sub?: string }
      const userId = payload?.sub
      if (!userId) return reply.code(401).send({ error: 'Não autenticado' })

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
          portalUserId: userId,
          areaId: body.areaId ?? null,
          requestTypeId: body.requestTypeId ?? null,
          title: body.title?.trim() || null,
          answers: answersJson,
          status,
        },
        select: {
          id: true,
          protocol: true,
          status: true,
          title: true,
          createdAt: true,
        },
      })

      return reply.code(201).send({ case: created })
    }
  )

  app.get(
    '/cases/:id',
    { preHandler: [requirePortalUser] },
    async (req, reply) => {
      const payload = req.user as { sub?: string }
      const userId = payload?.sub
      if (!userId) return reply.code(401).send({ error: 'Não autenticado' })

      const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
      if (!params.success) return reply.code(400).send({ error: 'ID inválido' })

      const c = await prisma.portalCase.findFirst({
        where: { id: params.data.id, portalUserId: userId },
        include: {
          area: { select: { id: true, name: true, slug: true } },
          requestType: { select: { id: true, name: true, slug: true } },
        },
      })
      if (!c) return reply.code(404).send({ error: 'Não encontrado' })
      return reply.send({ case: c })
    }
  )
}
