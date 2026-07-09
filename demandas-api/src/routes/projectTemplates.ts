import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

function getActorUserId(request: { headers: Record<string, string | string[] | undefined> }): string | null {
  const h = request.headers
  const raw = h['x-user-id'] ?? h['X-User-Id']
  const v = Array.isArray(raw) ? raw[0] : raw
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function isAdminRoleHeader(request: { headers: Record<string, string | string[] | undefined> }): boolean {
  const h = request.headers
  const raw = h['x-user-role'] ?? h['X-User-Role']
  const v = Array.isArray(raw) ? raw[0] : raw
  return String(v || '').trim().toLowerCase() === 'admin'
}

function parseTimelineInput(raw: unknown): string {
  if (raw == null) return JSON.stringify({ phases: [] })
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return JSON.stringify(parsed)
    } catch {
      return JSON.stringify({ phases: [] })
    }
    return JSON.stringify({ phases: [] })
  }
  if (typeof raw === 'object') {
    return JSON.stringify(raw)
  }
  return JSON.stringify({ phases: [] })
}

function serializeTemplate(row: {
  id: string
  name: string
  description: string
  timeline: string
  ownerId: string | null
  isGlobal: boolean
  createdAt: Date
  updatedAt: Date
}) {
  let timeline: unknown = { phases: [] }
  try {
    timeline = JSON.parse(row.timeline || '{}')
  } catch {
    timeline = { phases: [] }
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    timeline,
    ownerId: row.ownerId,
    isGlobal: row.isGlobal,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export default async function projectTemplatesRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options

  fastify.get('/project-templates', async (request, reply) => {
    try {
      const actorId = getActorUserId(request)
      const isAdmin = isAdminRoleHeader(request)
      const rows = await prisma.projectTemplate.findMany({
        where: isAdmin
          ? undefined
          : {
              OR: [
                { isGlobal: true },
                ...(actorId ? [{ ownerId: actorId }] : []),
              ],
            },
        orderBy: { updatedAt: 'desc' },
      })
      return rows.map(serializeTemplate)
    } catch (error) {
      console.error('GET /project-templates:', error)
      return reply.status(500).send({ error: 'Erro ao listar templates de projeto' })
    }
  })

  fastify.get('/project-templates/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const row = await prisma.projectTemplate.findUnique({ where: { id } })
      if (!row) return reply.status(404).send({ error: 'Template não encontrado' })
      return serializeTemplate(row)
    } catch (error) {
      console.error('GET /project-templates/:id:', error)
      return reply.status(500).send({ error: 'Erro ao buscar template' })
    }
  })

  fastify.post('/project-templates', async (request, reply) => {
    try {
      const body = request.body as {
        name?: string
        description?: string
        timeline?: unknown
        isGlobal?: boolean
      }
      const name = String(body?.name || '').trim()
      if (!name) return reply.status(400).send({ error: 'Nome do template é obrigatório' })

      const actorId = getActorUserId(request)
      const isAdmin = isAdminRoleHeader(request)
      const wantsGlobal = Boolean(body?.isGlobal)
      if (wantsGlobal && !isAdmin) {
        return reply.status(403).send({ error: 'Somente administradores podem criar templates globais' })
      }

      const created = await prisma.projectTemplate.create({
        data: {
          name,
          description: String(body?.description || '').trim(),
          timeline: parseTimelineInput(body?.timeline),
          ownerId: actorId,
          isGlobal: wantsGlobal,
        },
      })
      return reply.status(201).send(serializeTemplate(created))
    } catch (error) {
      console.error('POST /project-templates:', error)
      return reply.status(500).send({ error: 'Erro ao criar template de projeto' })
    }
  })

  fastify.put('/project-templates/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const existing = await prisma.projectTemplate.findUnique({ where: { id } })
      if (!existing) return reply.status(404).send({ error: 'Template não encontrado' })

      const actorId = getActorUserId(request)
      const isAdmin = isAdminRoleHeader(request)
      if (!isAdmin && existing.ownerId && actorId !== existing.ownerId) {
        return reply.status(403).send({ error: 'Sem permissão para editar este template' })
      }

      const body = request.body as {
        name?: string
        description?: string
        timeline?: unknown
        isGlobal?: boolean
      }
      const data: Record<string, unknown> = {}
      if (body?.name !== undefined) {
        const name = String(body.name).trim()
        if (!name) return reply.status(400).send({ error: 'Nome não pode ser vazio' })
        data.name = name
      }
      if (body?.description !== undefined) data.description = String(body.description).trim()
      if (body?.timeline !== undefined) data.timeline = parseTimelineInput(body.timeline)
      if (body?.isGlobal !== undefined) {
        if (body.isGlobal && !isAdmin) {
          return reply.status(403).send({ error: 'Somente administradores podem marcar template como global' })
        }
        data.isGlobal = Boolean(body.isGlobal)
      }

      const updated = await prisma.projectTemplate.update({ where: { id }, data })
      return serializeTemplate(updated)
    } catch (error) {
      console.error('PUT /project-templates/:id:', error)
      return reply.status(500).send({ error: 'Erro ao atualizar template' })
    }
  })

  fastify.delete('/project-templates/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const existing = await prisma.projectTemplate.findUnique({ where: { id } })
      if (!existing) return reply.status(404).send({ error: 'Template não encontrado' })

      const actorId = getActorUserId(request)
      const isAdmin = isAdminRoleHeader(request)
      if (!isAdmin && existing.ownerId && actorId !== existing.ownerId) {
        return reply.status(403).send({ error: 'Sem permissão para excluir este template' })
      }

      await prisma.projectTemplate.delete({ where: { id } })
      return { ok: true }
    } catch (error) {
      console.error('DELETE /project-templates/:id:', error)
      return reply.status(500).send({ error: 'Erro ao excluir template' })
    }
  })
}
