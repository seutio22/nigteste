import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

/** Listagem pública (somente leitura) para montar abas no front */
export async function registerAreaRoutes(app: FastifyInstance) {
  app.get('/areas', async (_req, reply) => {
    const areas = await prisma.portalArea.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        types: {
          where: { active: true },
          orderBy: { name: 'asc' },
          select: { id: true, slug: true, name: true, formSchema: true },
        },
      },
    })
    return reply.send({ areas })
  })
}
