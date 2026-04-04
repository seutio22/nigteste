import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { NexusFieldValueType, PortalSlaProfile, Prisma, PortalUserRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { assertRole, requirePortalUser } from '../lib/authz.js'
import { slaTotalReference } from '../lib/sla.js'

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
        types: {
          orderBy: { name: 'asc' },
          include: {
            slaProfile: {
              select: {
                id: true,
                name: true,
                slug: true,
                prazoEmDiasUteis: true,
                triagemDiasUteis: true,
                atuacaoDiasUteis: true,
                adicionalDiasUteisAposRetorno: true,
                slaTriagemMinutos: true,
                slaAtuacaoMinutos: true,
                minutosAdicionalAposRetornoDemanda: true,
              },
            },
          },
        },
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

  async function deletePortalAreaById(
    req: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply
  ) {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    // Solicitações existentes: FKs no Postgres usam ON DELETE SET NULL em areaId/requestTypeId;
    // tipos da área somem em cascade. Não bloquear exclusão só porque há casos (ex.: "Solicitações gerais").
    try {
      await prisma.portalArea.delete({ where: { id: params.data.id } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        return reply.code(404).send({ error: 'Área não encontrada' })
      }
      throw e
    }
    return reply.code(204).send()
  }

  app.delete('/admin/areas/:id', deletePortalAreaById)
  // POST: proxies que falham em DELETE; deve vir antes de /:areaId/types (segmento fixo diferente).
  app.post('/admin/areas/:id/delete', deletePortalAreaById)

  app.post('/admin/areas/:areaId/types', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ areaId: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'Área inválida' })
    const bodySchema = z.object({
      slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
      name: z.string().min(1).max(120),
      active: z.boolean().optional(),
      formSchema: z.unknown().optional(),
      slaProfileId: z.string().uuid().nullable().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    const area = await prisma.portalArea.findUnique({ where: { id: params.data.areaId } })
    if (!area) return reply.code(404).send({ error: 'Área não encontrada' })
    if (body.slaProfileId) {
      const sp = await prisma.portalSlaProfile.findFirst({
        where: { id: body.slaProfileId, active: true },
      })
      if (!sp) return reply.code(400).send({ error: 'Perfil SLA inválido ou inativo' })
    }
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
          slaProfileId: body.slaProfileId ?? null,
        },
        include: {
          slaProfile: {
            select: {
              id: true,
              name: true,
              slug: true,
              prazoEmDiasUteis: true,
              triagemDiasUteis: true,
              atuacaoDiasUteis: true,
              adicionalDiasUteisAposRetorno: true,
              slaTriagemMinutos: true,
              slaAtuacaoMinutos: true,
              minutosAdicionalAposRetornoDemanda: true,
            },
          },
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

  app.patch('/admin/types/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
      name: z.string().min(1).max(120).optional(),
      active: z.boolean().optional(),
      formSchema: z.unknown().nullable().optional(),
      slaProfileId: z.string().uuid().nullable().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    if (body.slaProfileId) {
      const sp = await prisma.portalSlaProfile.findFirst({
        where: { id: body.slaProfileId, active: true },
      })
      if (!sp) return reply.code(400).send({ error: 'Perfil SLA inválido ou inativo' })
    }
    const data: Prisma.PortalRequestTypeUpdateInput = {}
    if (body.slug !== undefined) data.slug = body.slug
    if (body.name !== undefined) data.name = body.name
    if (body.active !== undefined) data.active = body.active
    if (body.formSchema !== undefined) {
      data.formSchema =
        body.formSchema === null ? Prisma.JsonNull : (JSON.parse(JSON.stringify(body.formSchema)) as Prisma.InputJsonValue)
    }
    if (body.slaProfileId !== undefined) {
      data.slaProfile =
        body.slaProfileId === null ? { disconnect: true } : { connect: { id: body.slaProfileId } }
    }
    try {
      const t = await prisma.portalRequestType.update({
        where: { id: params.data.id },
        data,
        include: {
          slaProfile: {
            select: {
              id: true,
              name: true,
              slug: true,
              prazoEmDiasUteis: true,
              triagemDiasUteis: true,
              atuacaoDiasUteis: true,
              adicionalDiasUteisAposRetorno: true,
              slaTriagemMinutos: true,
              slaAtuacaoMinutos: true,
              minutosAdicionalAposRetornoDemanda: true,
            },
          },
        },
      })
      return reply.send({ type: t })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Slug já existe nesta área' })
      }
      throw e
    }
  })

  app.delete('/admin/types/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const linked = await prisma.portalCase.count({ where: { requestTypeId: params.data.id } })
    if (linked > 0) {
      return reply.code(409).send({
        error: 'Existem solicitações vinculadas a este tipo. Não é possível excluir.',
      })
    }
    await prisma.portalRequestType.delete({ where: { id: params.data.id } })
    return reply.code(204).send()
  })

  const nexusValueTypeSchema = z.nativeEnum(NexusFieldValueType)

  app.get('/admin/nexus-fields', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const list = await prisma.portalNexusField.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    })
    return reply.send({ fields: list })
  })

  app.post('/admin/nexus-fields', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const bodySchema = z.object({
      key: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/),
      label: z.string().min(1).max(160),
      description: z.string().max(500).nullable().optional(),
      valueType: nexusValueTypeSchema,
      enumOptions: z.array(z.string()).optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos (key: apenas minúsculas, números e _)' })
    }
    const enumOpts: Prisma.InputJsonValue | typeof Prisma.JsonNull =
      body.valueType === NexusFieldValueType.SELECT && body.enumOptions?.length
        ? (JSON.parse(JSON.stringify(body.enumOptions)) as Prisma.InputJsonValue)
        : Prisma.JsonNull
    try {
      const row = await prisma.portalNexusField.create({
        data: {
          key: body.key,
          label: body.label,
          description: body.description ?? null,
          valueType: body.valueType,
          enumOptions: enumOpts,
          sortOrder: body.sortOrder ?? 0,
          active: body.active ?? true,
        },
      })
      return reply.code(201).send({ field: row })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Chave já existe' })
      }
      throw e
    }
  })

  app.patch('/admin/nexus-fields/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      key: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/).optional(),
      label: z.string().min(1).max(160).optional(),
      description: z.string().max(500).nullable().optional(),
      valueType: nexusValueTypeSchema.optional(),
      enumOptions: z.array(z.string()).nullable().optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    const data: Prisma.PortalNexusFieldUpdateInput = {}
    if (body.key !== undefined) data.key = body.key
    if (body.label !== undefined) data.label = body.label
    if (body.description !== undefined) data.description = body.description
    if (body.valueType !== undefined) data.valueType = body.valueType
    if (body.enumOptions !== undefined) {
      data.enumOptions =
        body.enumOptions === null || body.enumOptions.length === 0
          ? Prisma.JsonNull
          : (JSON.parse(JSON.stringify(body.enumOptions)) as Prisma.InputJsonValue)
    }
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    if (body.active !== undefined) data.active = body.active
    try {
      const row = await prisma.portalNexusField.update({
        where: { id: params.data.id },
        data,
      })
      return reply.send({ field: row })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Chave já existe' })
      }
      throw e
    }
  })

  app.delete('/admin/nexus-fields/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    try {
      await prisma.portalNexusField.delete({ where: { id: params.data.id } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        return reply.code(404).send({ error: 'Campo não encontrado' })
      }
      throw e
    }
    return reply.code(204).send()
  })

  const slaSlugSchema = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/)

  function slaTotalMinutes(p: {
    slaTriagemMinutos: number
    slaAtuacaoMinutos: number
    minutosAdicionalAposRetornoDemanda: number
  }) {
    return p.slaTriagemMinutos + p.slaAtuacaoMinutos + p.minutosAdicionalAposRetornoDemanda
  }

  function enrichSlaProfile(p: PortalSlaProfile) {
    const ref = slaTotalReference(p)
    return {
      ...p,
      slaTotalReferencia: ref,
      slaTotalMinutos: slaTotalMinutes(p),
    }
  }

  app.get('/admin/sla-profiles', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const list = await prisma.portalSlaProfile.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    })
    return reply.send({
      profiles: list.map((p) => enrichSlaProfile(p)),
    })
  })

  app.post('/admin/sla-profiles', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const bodySchema = z.object({
      slug: slaSlugSchema,
      name: z.string().min(1).max(160),
      description: z.string().max(500).nullable().optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
      prazoEmDiasUteis: z.boolean().optional(),
      triagemDiasUteis: z.number().int().min(0).max(3650).optional(),
      atuacaoDiasUteis: z.number().int().min(0).max(3650).optional(),
      adicionalDiasUteisAposRetorno: z.number().int().min(0).max(3650).optional(),
      slaTriagemMinutos: z.number().int().min(0).max(1_000_000),
      slaAtuacaoMinutos: z.number().int().min(0).max(1_000_000),
      minutosAdicionalAposRetornoDemanda: z.number().int().min(0).max(1_000_000).optional(),
      pausarQuandoAguardandoDemanda: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    try {
      const row = await prisma.portalSlaProfile.create({
        data: {
          slug: body.slug,
          name: body.name,
          description: body.description ?? null,
          sortOrder: body.sortOrder ?? 0,
          active: body.active ?? true,
          prazoEmDiasUteis: body.prazoEmDiasUteis ?? true,
          triagemDiasUteis: body.triagemDiasUteis ?? 1,
          atuacaoDiasUteis: body.atuacaoDiasUteis ?? 5,
          adicionalDiasUteisAposRetorno: body.adicionalDiasUteisAposRetorno ?? 0,
          slaTriagemMinutos: body.slaTriagemMinutos,
          slaAtuacaoMinutos: body.slaAtuacaoMinutos,
          minutosAdicionalAposRetornoDemanda: body.minutosAdicionalAposRetornoDemanda ?? 0,
          pausarQuandoAguardandoDemanda: body.pausarQuandoAguardandoDemanda ?? true,
        },
      })
      return reply.code(201).send({ profile: enrichSlaProfile(row) })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Slug já existe' })
      }
      throw e
    }
  })

  app.patch('/admin/sla-profiles/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      slug: slaSlugSchema.optional(),
      name: z.string().min(1).max(160).optional(),
      description: z.string().max(500).nullable().optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
      prazoEmDiasUteis: z.boolean().optional(),
      triagemDiasUteis: z.number().int().min(0).max(3650).optional(),
      atuacaoDiasUteis: z.number().int().min(0).max(3650).optional(),
      adicionalDiasUteisAposRetorno: z.number().int().min(0).max(3650).optional(),
      slaTriagemMinutos: z.number().int().min(0).max(1_000_000).optional(),
      slaAtuacaoMinutos: z.number().int().min(0).max(1_000_000).optional(),
      minutosAdicionalAposRetornoDemanda: z.number().int().min(0).max(1_000_000).optional(),
      pausarQuandoAguardandoDemanda: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    try {
      const row = await prisma.portalSlaProfile.update({
        where: { id: params.data.id },
        data: body,
      })
      return reply.send({ profile: enrichSlaProfile(row) })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return reply.code(409).send({ error: 'Slug já existe' })
      }
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        return reply.code(404).send({ error: 'Perfil não encontrado' })
      }
      throw e
    }
  })

  app.delete('/admin/sla-profiles/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    try {
      await prisma.portalSlaProfile.delete({ where: { id: params.data.id } })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        return reply.code(404).send({ error: 'Perfil não encontrado' })
      }
      throw e
    }
    return reply.code(204).send()
  })
}
