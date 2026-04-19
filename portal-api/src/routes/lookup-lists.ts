import type { FastifyInstance } from 'fastify'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { PortalUserRole } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { assertRole, requirePortalUser } from '../lib/authz.js'

const BULK_MAX = 5000

/** Insere vários itens; valores duplicados na lista recebem sufixo _2, _3… */
export async function bulkInsertLookupItems(
  db: Prisma.TransactionClient | typeof prisma,
  listId: string,
  rawItems: { label: string; value?: string }[],
): Promise<{ created: number; skipped: number; warnings: string[] }> {
  const existing = await db.portalLookupItem.findMany({
    where: { listId },
    select: { value: true },
  })
  const used = new Set(existing.map((x) => x.value))
  const maxRow = await db.portalLookupItem.aggregate({
    where: { listId },
    _max: { sortOrder: true },
  })
  let sort = (maxRow._max.sortOrder ?? -1) + 1
  const warnings: string[] = []
  let skipped = 0
  const toCreate: {
    listId: string
    label: string
    value: string
    sortOrder: number
    active: boolean
  }[] = []

  let lineNo = 0
  for (const raw of rawItems) {
    lineNo++
    const label = raw.label.trim()
    if (!label) {
      skipped++
      if (warnings.length < 80) warnings.push(`Linha ${lineNo}: texto vazio`)
      continue
    }
    let explicit = raw.value?.trim()
    if (explicit && !/^[a-z0-9_]+$/.test(explicit)) {
      skipped++
      if (warnings.length < 80) warnings.push(`Linha ${lineNo}: valor técnico inválido (só minúsculas, números e _)`)
      continue
    }
    let base = explicit || slugKey(label)
    let finalValue = base
    let suffix = 2
    while (used.has(finalValue)) {
      finalValue = `${base}_${suffix}`
      suffix++
      if (suffix > 2000) {
        skipped++
        if (warnings.length < 80) warnings.push(`Linha ${lineNo}: não foi possível gerar valor único`)
        finalValue = ''
        break
      }
    }
    if (!finalValue) continue
    used.add(finalValue)
    toCreate.push({
      listId,
      label,
      value: finalValue,
      sortOrder: sort++,
      active: true,
    })
  }

  if (toCreate.length > 0) {
    await db.portalLookupItem.createMany({ data: toCreate })
  }
  return { created: toCreate.length, skipped, warnings }
}

function slugKey(input: string): string {
  const s = input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
  return s || 'lista'
}

async function requireAdmin(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  const u = await requirePortalUser(req, reply)
  if (!u) return null
  if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return null
  return u
}

export async function registerLookupListRoutes(app: FastifyInstance) {
  app.get('/admin/lookup-lists', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const lists = await prisma.portalLookupList.findMany({
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      include: { _count: { select: { items: true } } },
    })
    return reply.send({
      lists: lists.map((l) => ({
        id: l.id,
        key: l.key,
        label: l.label,
        description: l.description,
        sortOrder: l.sortOrder,
        active: l.active,
        itemCount: l._count.items,
      })),
    })
  })

  const bulkItemSchema = z.object({
    label: z.string().min(1).max(200),
    value: z.string().min(1).max(200).regex(/^[a-z0-9_]+$/).optional(),
  })

  app.post('/admin/lookup-lists', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const bodySchema = z.object({
      key: z.string().min(1).max(80).regex(/^[a-z0-9_]+$/).optional(),
      label: z.string().min(1).max(160),
      description: z.string().max(500).nullable().optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
      items: z.array(bulkItemSchema).max(BULK_MAX).optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    const key = body.key?.trim() || slugKey(body.label)
    try {
      const result = await prisma.$transaction(async (tx) => {
        const row = await tx.portalLookupList.create({
          data: {
            key,
            label: body.label.trim(),
            description: body.description ?? null,
            sortOrder: body.sortOrder ?? 0,
            active: body.active ?? true,
          },
        })
        let bulk: Awaited<ReturnType<typeof bulkInsertLookupItems>> | undefined
        if (body.items?.length) {
          bulk = await bulkInsertLookupItems(tx, row.id, body.items)
        }
        return { list: row, bulk }
      })
      return reply.code(201).send(result)
    } catch (e) {
      const err = e as { code?: string }
      if (err.code === 'P2002') return reply.code(409).send({ error: 'Já existe uma lista com esta chave' })
      throw e
    }
  })

  app.patch('/admin/lookup-lists/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      label: z.string().min(1).max(160).optional(),
      description: z.string().max(500).nullable().optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    const row = await prisma.portalLookupList.update({
      where: { id: params.data.id },
      data: body,
    })
    return reply.send({ list: row })
  })

  app.delete('/admin/lookup-lists/:id', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    await prisma.portalLookupList.delete({ where: { id: params.data.id } })
    return reply.code(204).send()
  })

  app.get('/admin/lookup-lists/:id/items', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const items = await prisma.portalLookupItem.findMany({
      where: { listId: params.data.id },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    })
    return reply.send({ items })
  })

  app.post('/admin/lookup-lists/:id/items/bulk', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      items: z.array(bulkItemSchema).min(1).max(BULK_MAX),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos (máx. ' + String(BULK_MAX) + ' itens)' })
    }
    const list = await prisma.portalLookupList.findUnique({ where: { id: params.data.id } })
    if (!list) return reply.code(404).send({ error: 'Lista não encontrada' })
    const bulk = await bulkInsertLookupItems(prisma, list.id, body.items)
    return reply.send(bulk)
  })

  app.post('/admin/lookup-lists/:id/items', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      label: z.string().min(1).max(200),
      value: z.string().min(1).max(200).regex(/^[a-z0-9_]+$/).optional(),
      sortOrder: z.number().int().optional(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos (valor: só minúsculas, números e _)' })
    }
    const list = await prisma.portalLookupList.findUnique({ where: { id: params.data.id } })
    if (!list) return reply.code(404).send({ error: 'Lista não encontrada' })
    const value = body.value?.trim() || slugKey(body.label)
    try {
      const row = await prisma.portalLookupItem.create({
        data: {
          listId: params.data.id,
          label: body.label.trim(),
          value,
          sortOrder: body.sortOrder ?? 0,
          active: body.active ?? true,
        },
      })
      return reply.code(201).send({ item: row })
    } catch (e) {
      const err = e as { code?: string }
      if (err.code === 'P2002') return reply.code(409).send({ error: 'Já existe um item com este valor nesta lista' })
      throw e
    }
  })

  app.patch('/admin/lookup-items/:itemId', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ itemId: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const bodySchema = z.object({
      label: z.string().min(1).max(200).optional(),
      value: z.string().min(1).max(200).regex(/^[a-z0-9_]+$/).optional(),
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
      const row = await prisma.portalLookupItem.update({
        where: { id: params.data.itemId },
        data: body,
      })
      return reply.send({ item: row })
    } catch (e) {
      const err = e as { code?: string }
      if (err.code === 'P2025') return reply.code(404).send({ error: 'Item não encontrado' })
      if (err.code === 'P2002') return reply.code(409).send({ error: 'Valor já usado nesta lista' })
      throw e
    }
  })

  app.delete('/admin/lookup-items/:itemId', async (req, reply) => {
    if (!(await requireAdmin(req, reply))) return
    const params = z.object({ itemId: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    try {
      await prisma.portalLookupItem.delete({ where: { id: params.data.itemId } })
    } catch (e) {
      const err = e as { code?: string }
      if (err.code === 'P2025') return reply.code(404).send({ error: 'Item não encontrado' })
      throw e
    }
    return reply.code(204).send()
  })

  /** Opções para selects do formulário (colaborador autenticado). */
  app.get('/portal/lookup-lists/:id/options', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    const params = z.object({ id: z.string().uuid() }).safeParse(req.params)
    if (!params.success) return reply.code(400).send({ error: 'ID inválido' })
    const list = await prisma.portalLookupList.findFirst({
      where: { id: params.data.id, active: true },
    })
    if (!list) return reply.code(404).send({ error: 'Lista não encontrada' })
    const items = await prisma.portalLookupItem.findMany({
      where: { listId: params.data.id, active: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
      select: { value: true, label: true },
    })
    return reply.send({
      options: items.map((i) => ({ value: i.value, label: i.label })),
    })
  })
}
