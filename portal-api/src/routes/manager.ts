import type { FastifyInstance } from 'fastify'
import { PortalUserRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { assertRole, requirePortalUser } from '../lib/authz.js'

export async function registerManagerRoutes(app: FastifyInstance) {
  app.get('/manager/cases', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.REQUESTER_MANAGER], reply)) return

    const reports = await prisma.portalUser.findMany({
      where: { parentManagerId: u.id, active: true },
      select: { id: true },
    })
    const ids = reports.map((r) => r.id)
    if (ids.length === 0) return reply.send({ cases: [] })

    const list = await prisma.portalCase.findMany({
      where: { portalUserId: { in: ids } },
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        user: { select: { id: true, name: true, email: true } },
        area: { select: { id: true, name: true, slug: true } },
        requestType: { select: { id: true, name: true, slug: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
    })
    return reply.send({ cases: list })
  })

  app.get('/manager/team', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.REQUESTER_MANAGER], reply)) return

    const members = await prisma.portalUser.findMany({
      where: { parentManagerId: u.id },
      orderBy: { name: 'asc' },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    })
    return reply.send({ members })
  })
}
