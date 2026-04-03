import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Prisma, PortalUserRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { assertRole, requirePortalUser } from '../lib/authz.js'

const emailSchema = z.string().email().max(254)
const roleSchema = z.nativeEnum(PortalUserRole)

async function requireAdmin(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  const u = await requirePortalUser(req, reply)
  if (!u) return null
  if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return null
  return u
}

export async function registerAdminRoutes(app: FastifyInstance) {
  app.get('/admin/users', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const list = await prisma.portalUser.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        parentManagerId: true,
        createdAt: true,
        parentManager: { select: { id: true, name: true, email: true } },
      },
    })
    return reply.send({ users: list })
  })

  app.post('/admin/users', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const bodySchema = z.object({
      email: emailSchema,
      password: z.string().min(8).max(128),
      name: z.string().min(2).max(120),
      role: roleSchema,
      parentManagerId: z.string().uuid().nullable().optional(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    if (body.parentManagerId) {
      const mgr = await prisma.portalUser.findFirst({
        where: { id: body.parentManagerId, role: PortalUserRole.REQUESTER_MANAGER, active: true },
      })
      if (!mgr) return reply.code(400).send({ error: 'Gestor inválido' })
    }
    const passwordHash = await bcrypt.hash(body.password, 12)
    try {
      const created = await prisma.portalUser.create({
        data: {
          email: body.email.toLowerCase(),
          passwordHash,
          name: body.name,
          role: body.role,
          active: body.active ?? true,
          parentManager: body.parentManagerId ? { connect: { id: body.parentManagerId } } : undefined,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          parentManagerId: true,
        },
      })
      return reply.code(201).send({ user: created })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'E-mail já cadastrado' })
      }
      throw e
    }
  })

  app.patch('/admin/users/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      name: z.string().min(2).max(120).optional(),
      role: roleSchema.optional(),
      active: z.boolean().optional(),
      parentManagerId: z.string().uuid().nullable().optional(),
      password: z.string().min(8).max(128).optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    if (body.parentManagerId) {
      const mgr = await prisma.portalUser.findFirst({
        where: { id: body.parentManagerId, role: PortalUserRole.REQUESTER_MANAGER, active: true },
      })
      if (!mgr) return reply.code(400).send({ error: 'Gestor inválido' })
    }
    const data: Prisma.PortalUserUpdateInput = {}
    if (body.name !== undefined) data.name = body.name
    if (body.role !== undefined) data.role = body.role
    if (body.active !== undefined) data.active = body.active
    if (body.parentManagerId !== undefined) {
      data.parentManager =
        body.parentManagerId === null ? { disconnect: true } : { connect: { id: body.parentManagerId } }
    }
    if (body.password !== undefined) data.passwordHash = await bcrypt.hash(body.password, 12)
    const updated = await prisma.portalUser.update({
      where: { id: params.data.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        parentManagerId: true,
      },
    })
    return reply.send({ user: updated })
  })

  app.get('/admin/areas', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const areas = await prisma.portalArea.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        types: { orderBy: { name: 'asc' } },
      },
    })
    return reply.send({ areas })
  })

  app.post('/admin/areas', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const bodySchema = z.object({
      slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(120),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos (slug: apenas minúsculas, números e hífen)' })
    }
    try {
      const a = await prisma.portalArea.create({
        data: {
          slug: body.slug,
          name: body.name,
          sortOrder: body.sortOrder ?? 0,
          active: body.active ?? true,
        },
      })
      return reply.code(201).send({ area: a })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Slug já existe' })
      }
      throw e
    }
  })

  app.patch('/admin/areas/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
      name: z.string().min(1).max(120).optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    try {
      const a = await prisma.portalArea.update({
        where: { id: params.data.id },
        data: body,
      })
      return reply.send({ area: a })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Slug já existe' })
      }
      throw e
    }
  })

  app.post('/admin/areas/:areaId/types', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ areaId: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'Área inválida' })
    const bodySchema = z.object({
      slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(120),
      active: z.boolean().optional(),
      formSchema: z.unknown().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    const area = await prisma.portalArea.findUnique({ where: { id: params.data.areaId } })
    if (!area) return reply.code(404).send({ error: 'Área não encontrada' })
    const formSchema =
      body.formSchema === undefined ? undefined : (JSON.parse(JSON.stringify(body.formSchema)) as Prisma.InputJsonValue)
    try {
      const t = await prisma.portalRequestType.create({
        data: {
          areaId: params.data.areaId,
          slug: body.slug,
          name: body.name,
          active: body.active ?? true,
          formSchema,
        },
      })
      return reply.code(201).send({ type: t })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Slug já existe nesta área' })
      }
      throw e
    }
  })

  app.patch('/admin/types/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
      name: z.string().min(1).max(120).optional(),
      active: z.boolean().optional(),
      formSchema: z.unknown().nullable().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    const data: Prisma.PortalRequestTypeUpdateInput = {}
    if (body.slug !== undefined) data.slug = body.slug
    if (body.name !== undefined) data.name = body.name
    if (body.active !== undefined) data.active = body.active
    if (body.formSchema !== undefined) {
      data.formSchema =
        body.formSchema === null ? Prisma.JsonNull : (JSON.parse(JSON.stringify(body.formSchema)) as Prisma.InputJsonValue)
    }
    try {
      const t = await prisma.portalRequestType.update({
        where: { id: params.data.id },
        data,
      })
      return reply.send({ type: t })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Slug já existe nesta área' })
      }
      throw e
    }
  })
}
