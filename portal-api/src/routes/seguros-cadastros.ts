import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PortalApoliceProduto, PortalSeguroItemTipo, PortalUserRole } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { assertRole, requirePortalUser } from '../lib/authz.js'
import { buildNexusGruposEconomicosEmpresas } from '../lib/nexus-grupos-economicos-view.js'
import {
  filterContratosForEstipulante,
  findContratoById,
  parseContratosSnapshot,
} from '../lib/nexus-seguros-contratos.js'

const uuid = z.string().uuid()

const produtoSchema = z.nativeEnum(PortalApoliceProduto)
const itemTipoSchema = z.nativeEnum(PortalSeguroItemTipo)

const createApoliceSchema = z
  .object({
    estipulanteId: uuid,
    numeroApolice: z.string().max(120).optional().nullable(),
    nexusContratoId: z.string().max(120).optional().nullable(),
    produto: produtoSchema,
    fornecedor: z.string().min(1).max(500),
    subestipulante: z.string().min(1).max(500),
    plano: z.string().max(2000).optional().nullable(),
    coberturas: z.string().max(8000).optional().nullable(),
    vigenciaInicio: z.string().max(40).optional().nullable(),
    vigenciaFim: z.string().max(40).optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const hasNum = !!(data.numeroApolice ?? '').toString().trim()
    const hasNex = !!(data.nexusContratoId ?? '').toString().trim()
    if (!hasNum && !hasNex) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Informe o número da apólice ou selecione um contrato Nexus.',
        path: ['numeroApolice'],
      })
    }
    if (data.produto === PortalApoliceProduto.SAUDE || data.produto === PortalApoliceProduto.ODONTO) {
      if (!(data.plano ?? '').toString().trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Plano é obrigatório para Saúde ou Odonto.', path: ['plano'] })
      }
    }
    if (data.produto === PortalApoliceProduto.VIDA_GRUPO) {
      if (!(data.coberturas ?? '').toString().trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Coberturas são obrigatórias para Vida em grupo.',
          path: ['coberturas'],
        })
      }
    }
  })

const patchApoliceSchema = z.object({
  numeroApolice: z.string().min(1).max(120).optional(),
  nexusContratoId: z.string().max(120).optional().nullable(),
  produto: produtoSchema.optional(),
  fornecedor: z.string().min(1).max(500).optional(),
  subestipulante: z.string().min(1).max(500).optional(),
  plano: z.string().max(2000).optional().nullable(),
  coberturas: z.string().max(8000).optional().nullable(),
  vigenciaInicio: z.string().max(40).optional().nullable(),
  vigenciaFim: z.string().max(40).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
})

function normalizeApolicePayload(body: {
  produto: PortalApoliceProduto
  plano?: string | null
  coberturas?: string | null
}) {
  const plano =
    body.produto === PortalApoliceProduto.SAUDE || body.produto === PortalApoliceProduto.ODONTO
      ? (body.plano ?? '').trim() || null
      : null
  const coberturas =
    body.produto === PortalApoliceProduto.VIDA_GRUPO ? (body.coberturas ?? '').trim() || null : null
  return { plano, coberturas }
}

function normCnpjDigitsSeg(s: string) {
  return (s || '').replace(/\D/g, '')
}

function normRazaoSeg(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Mesmo critério que `GET /seguros/estipulantes?grupoNome=` (Nexus OU grupo local). */
function whereEstipulantesPorNomeGrupoNexus(nome: string): Prisma.PortalSeguroEstipulanteWhereInput {
  const n = nome.trim()
  return {
    OR: [
      { grupoEconomicoNome: { equals: n, mode: 'insensitive' } },
      { grupo: { nome: { equals: n, mode: 'insensitive' } } },
    ],
  }
}

/**
 * IDs de estipulantes equivalentes no mesmo grupo (duplicados: Nexus vs cadastro manual,
 * ou dois UUIDs para a mesma empresa). Usado para listar apólices/contratos mesmo quando
 * o vínculo no banco ficou num registo diferente do selecionado na UI.
 *
 * @param grupoNexusNome — nome do grupo no dropdown (Nexus), alinha com `GET /estipulantes?grupoNome=`.
 */
async function estipulanteSiblingIds(estipulanteId: string, grupoNexusNome?: string | null): Promise<string[]> {
  const est = await prisma.portalSeguroEstipulante.findUnique({
    where: { id: estipulanteId },
    select: {
      id: true,
      grupoEconomicoNome: true,
      grupoEconomicoId: true,
      nexusClienteId: true,
      cnpj: true,
      razaoSocial: true,
      grupo: { select: { nome: true } },
    },
  })
  if (!est) return [estipulanteId]

  const nomeGrupo =
    (grupoNexusNome && grupoNexusNome.trim()) ||
    est.grupoEconomicoNome.trim() ||
    est.grupo?.nome?.trim() ||
    ''

  const peers = nomeGrupo
    ? await prisma.portalSeguroEstipulante.findMany({
        where: whereEstipulantesPorNomeGrupoNexus(nomeGrupo),
        select: { id: true, nexusClienteId: true, cnpj: true, razaoSocial: true },
      })
    : [{ id: est.id, nexusClienteId: est.nexusClienteId, cnpj: est.cnpj, razaoSocial: est.razaoSocial }]

  const nid = est.nexusClienteId?.trim() || ''
  const dEst = normCnpjDigitsSeg(est.cnpj)
  const rsEst = normRazaoSeg(est.razaoSocial)
  const matched = peers.filter((p) => {
    if (p.id === est.id) return true
    if (nid && p.nexusClienteId?.trim() === nid) return true
    if (dEst.length >= 8 && normCnpjDigitsSeg(p.cnpj) === dEst) return true
    if (rsEst.length >= 6 && normRazaoSeg(p.razaoSocial) === rsEst) return true
    return false
  })
  const ids = [...new Set(matched.map((p) => p.id))]
  return ids.length ? ids : [est.id]
}

export async function registerSeguroCadastroRoutes(app: FastifyInstance) {
  /**
   * Visão leitura para a página Apólice — empresas (clientes Nexus) agrupadas por `grupoEconomico`.
   * Fonte: snapshot `clientes` sincronizado da API Nexus.
   */
  app.get('/seguros/nexus/grupos-economicos-view', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const snap = await prisma.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: 'clientes' },
    })
    if (!snap || !Array.isArray(snap.rows) || snap.rowCount === 0) {
      return reply.send({
        ok: false,
        needsSync: true,
        entityKey: 'clientes',
        message:
          'Dados de clientes Nexus ainda não sincronizados. Peça ao administrador para configurar NEXUS_API_* e executar a sincronização em Banco de dados.',
        syncedAt: snap?.syncedAt ?? null,
        lastError: snap?.lastError ?? null,
        rowCount: snap?.rowCount ?? 0,
        empresas: [],
      })
    }

    const empresas = buildNexusGruposEconomicosEmpresas(snap.rows)
    return reply.send({
      ok: true,
      needsSync: false,
      entityKey: 'clientes',
      syncedAt: snap.syncedAt,
      lastError: snap.lastError,
      rowCount: snap.rowCount,
      empresas,
    })
  })

  /** Nomes distintos de grupo econômico (Nexus) para seletores de cadastro. */
  app.get('/seguros/nexus/grupos-economicos-nomes', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const snap = await prisma.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: 'clientes' },
    })
    if (!snap || !Array.isArray(snap.rows) || snap.rowCount === 0) {
      return reply.send({
        ok: false,
        needsSync: true,
        nomes: [] as string[],
        message:
          'Dados de clientes Nexus ainda não sincronizados. Peça ao administrador para configurar NEXUS_API_* e executar a sincronização em Banco de dados.',
      })
    }
    const empresas = buildNexusGruposEconomicosEmpresas(snap.rows)
    const nomes = [...new Set(empresas.map((e) => e.grupoEconomicoNome))].sort((a, b) =>
      a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
    )
    return reply.send({ ok: true, needsSync: false, nomes })
  })

  /** Clientes Nexus de um grupo (para pré-preencher estipulante / CNPJ). */
  app.get('/seguros/nexus/clientes-do-grupo', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const q = z.object({ grupoNome: z.string().min(1).max(500) })
    let grupoNome: string
    try {
      grupoNome = q.parse(req.query).grupoNome.trim()
    } catch {
      return reply.code(400).send({ error: 'Informe grupoNome na query.' })
    }

    const snap = await prisma.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: 'clientes' },
    })
    if (!snap || !Array.isArray(snap.rows) || snap.rowCount === 0) {
      return reply.send({
        ok: false,
        needsSync: true,
        empresas: [],
        message:
          'Dados de clientes Nexus ainda não sincronizados. Peça ao administrador para configurar NEXUS_API_* e executar a sincronização em Banco de dados.',
      })
    }
    const gNorm = grupoNome.toLowerCase()
    const empresas = buildNexusGruposEconomicosEmpresas(snap.rows).filter(
      (e) => e.grupoEconomicoNome.trim().toLowerCase() === gNorm,
    )
    return reply.send({ ok: true, needsSync: false, empresas })
  })

  /** Contratos Nexus filtrados pelo estipulante (grupo + cliente Nexus quando houver). */
  app.get('/seguros/nexus/contratos-opcoes', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const qCo = z.object({
      estipulanteId: uuid,
      grupoNome: z.string().min(1).max(500).optional(),
    })
    let qParsed: z.infer<typeof qCo>
    try {
      qParsed = qCo.parse(req.query)
    } catch {
      return reply.code(400).send({ error: 'Informe estipulanteId (UUID) na query.' })
    }
    const estipulanteId = qParsed.estipulanteId
    const grupoNomeContratos = qParsed.grupoNome?.trim() || null

    const est = await prisma.portalSeguroEstipulante.findUnique({ where: { id: estipulanteId } })
    if (!est) return reply.code(404).send({ error: 'Estipulante não encontrado.' })

    const snap = await prisma.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: 'contratos' },
    })
    if (!snap || !Array.isArray(snap.rows) || snap.rowCount === 0) {
      return reply.send({
        ok: false,
        needsSync: true,
        contratos: [],
        message:
          'Dados de contratos Nexus ainda não sincronizados. Peça ao administrador para sincronizar a entidade contratos em Banco de dados.',
      })
    }

    const siblingIds = await estipulanteSiblingIds(estipulanteId, grupoNomeContratos)
    const ests = await prisma.portalSeguroEstipulante.findMany({ where: { id: { in: siblingIds } } })
    const all = parseContratosSnapshot(snap.rows)
    const byContratoId = new Map<string, (typeof all)[0]>()
    for (const e of ests) {
      const nomeGrupoContrato = grupoNomeContratos || e.grupoEconomicoNome
      for (const c of filterContratosForEstipulante(all, {
        grupoEconomicoNome: nomeGrupoContrato,
        nexusClienteId: e.nexusClienteId,
        cnpj: e.cnpj,
      })) {
        byContratoId.set(c.nexusContratoId, c)
      }
    }
    const contratos = [...byContratoId.values()].sort((a, b) =>
      a.numero.localeCompare(b.numero, 'pt-BR', { numeric: true }),
    )

    return reply.send({ ok: true, needsSync: false, contratos })
  })

  // --- Grupos econômicos ---
  app.get('/seguros/grupos-economicos', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    const list = await prisma.portalGrupoEconomico.findMany({
      orderBy: { nome: 'asc' },
      take: 500,
      include: { _count: { select: { estipulantes: true } } },
    })
    return reply.send({ grupos: list })
  })

  app.post('/seguros/grupos-economicos', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const schema = z.object({
      nome: z.string().min(1).max(500),
      cnpj: z.string().max(20).optional().nullable(),
      observacoes: z.string().max(2000).optional().nullable(),
    })
    let body: z.infer<typeof schema>
    try {
      body = schema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const row = await prisma.portalGrupoEconomico.create({
      data: {
        nome: body.nome.trim(),
        cnpj: body.cnpj?.trim() || null,
        observacoes: body.observacoes?.trim() || null,
      },
    })
    return reply.code(201).send({ grupo: row })
  })

  app.patch('/seguros/grupos-economicos/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    const schema = z.object({
      nome: z.string().min(1).max(500).optional(),
      cnpj: z.string().max(20).optional().nullable(),
      observacoes: z.string().max(2000).optional().nullable(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof schema>
    try {
      body = schema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const data: Prisma.PortalGrupoEconomicoUpdateInput = {}
    if (body.nome !== undefined) data.nome = body.nome.trim()
    if (body.cnpj !== undefined) data.cnpj = body.cnpj?.trim() || null
    if (body.observacoes !== undefined) data.observacoes = body.observacoes?.trim() || null
    if (body.active !== undefined) data.active = body.active

    try {
      const row = await prisma.portalGrupoEconomico.update({ where: { id }, data })
      return reply.send({ grupo: row })
    } catch {
      return reply.code(404).send({ error: 'Grupo não encontrado' })
    }
  })

  app.delete('/seguros/grupos-economicos/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    try {
      await prisma.portalGrupoEconomico.delete({ where: { id } })
      return reply.send({ ok: true })
    } catch {
      return reply.code(404).send({ error: 'Grupo não encontrado' })
    }
  })

  // --- Estipulantes ---
  app.get('/seguros/estipulantes', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const q = z.object({
      grupoId: uuid.optional(),
      grupoNome: z.string().min(1).max(500).optional(),
    })
    let filter: z.infer<typeof q>
    try {
      filter = q.parse(req.query)
    } catch {
      return reply.code(400).send({ error: 'Query inválida (grupoId UUID ou grupoNome).' })
    }
    if (!filter.grupoId && !filter.grupoNome?.trim()) {
      return reply.code(400).send({ error: 'Informe grupoId (UUID) ou grupoNome na query.' })
    }

    const where: Prisma.PortalSeguroEstipulanteWhereInput = {}
    if (filter.grupoId) where.grupoEconomicoId = filter.grupoId
    else Object.assign(where, whereEstipulantesPorNomeGrupoNexus(filter.grupoNome!.trim()))

    const list = await prisma.portalSeguroEstipulante.findMany({
      where,
      orderBy: { razaoSocial: 'asc' },
      include: { grupo: { select: { id: true, nome: true } }, _count: { select: { apolices: true } } },
    })
    return reply.send({ estipulantes: list })
  })

  app.post('/seguros/estipulantes', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const schema = z
      .object({
        grupoEconomicoNome: z.string().max(500).optional().nullable(),
        grupoEconomicoId: uuid.optional().nullable(),
        nexusClienteId: z.string().max(120).optional().nullable(),
        razaoSocial: z.string().min(1).max(500),
        cnpj: z.string().min(8).max(20),
        nomeFantasia: z.string().max(500).optional().nullable(),
        observacoes: z.string().max(2000).optional().nullable(),
      })
      .superRefine((d, ctx) => {
        const nome = (d.grupoEconomicoNome ?? '').trim()
        if (!nome && !d.grupoEconomicoId) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Informe grupoEconomicoNome (Nexus) ou grupoEconomicoId (grupo local).',
            path: ['grupoEconomicoNome'],
          })
        }
      })
    let body: z.infer<typeof schema>
    try {
      body = schema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    let grupoEconomicoNome = (body.grupoEconomicoNome ?? '').trim()
    const grupoEconomicoId = body.grupoEconomicoId ?? null

    if (!grupoEconomicoNome && grupoEconomicoId) {
      const g = await prisma.portalGrupoEconomico.findUnique({ where: { id: grupoEconomicoId } })
      if (!g) return reply.code(400).send({ error: 'Grupo econômico local não encontrado.' })
      grupoEconomicoNome = g.nome
    } else if (grupoEconomicoId) {
      const g = await prisma.portalGrupoEconomico.findUnique({ where: { id: grupoEconomicoId } })
      if (!g) return reply.code(400).send({ error: 'Grupo econômico local não encontrado.' })
    }

    if (!grupoEconomicoNome) {
      return reply.code(400).send({ error: 'Nome do grupo econômico (Nexus) é obrigatório.' })
    }

    try {
      const row = await prisma.portalSeguroEstipulante.create({
        data: {
          grupoEconomicoNome,
          grupoEconomicoId,
          nexusClienteId: body.nexusClienteId?.trim() || null,
          razaoSocial: body.razaoSocial.trim(),
          cnpj: body.cnpj.trim(),
          nomeFantasia: body.nomeFantasia?.trim() || null,
          observacoes: body.observacoes?.trim() || null,
        },
      })
      return reply.code(201).send({ estipulante: row })
    } catch {
      return reply.code(400).send({ error: 'CNPJ já cadastrado neste grupo ou dados inválidos.' })
    }
  })

  app.patch('/seguros/estipulantes/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    const schema = z.object({
      razaoSocial: z.string().min(1).max(500).optional(),
      cnpj: z.string().min(8).max(20).optional(),
      nomeFantasia: z.string().max(500).optional().nullable(),
      observacoes: z.string().max(2000).optional().nullable(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof schema>
    try {
      body = schema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const data: Prisma.PortalSeguroEstipulanteUpdateInput = {}
    if (body.razaoSocial !== undefined) data.razaoSocial = body.razaoSocial.trim()
    if (body.cnpj !== undefined) data.cnpj = body.cnpj.trim()
    if (body.nomeFantasia !== undefined) data.nomeFantasia = body.nomeFantasia?.trim() || null
    if (body.observacoes !== undefined) data.observacoes = body.observacoes?.trim() || null
    if (body.active !== undefined) data.active = body.active

    try {
      const row = await prisma.portalSeguroEstipulante.update({ where: { id }, data })
      return reply.send({ estipulante: row })
    } catch {
      return reply.code(404).send({ error: 'Estipulante não encontrado ou CNPJ duplicado no grupo.' })
    }
  })

  app.delete('/seguros/estipulantes/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    try {
      await prisma.portalSeguroEstipulante.delete({ where: { id } })
      return reply.send({ ok: true })
    } catch {
      return reply.code(404).send({ error: 'Estipulante não encontrado' })
    }
  })

  // --- Apólices ---
  app.get('/seguros/apolices', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const q = z.object({
      estipulanteId: uuid.optional(),
      grupoId: uuid.optional(),
      grupoNome: z.string().min(1).max(500).optional(),
    })
    let filter: z.infer<typeof q>
    try {
      filter = q.parse(req.query)
    } catch {
      return reply.code(400).send({ error: 'Query inválida (estipulanteId, grupoId ou grupoNome).' })
    }
    if (!filter.estipulanteId && !filter.grupoId && !filter.grupoNome?.trim()) {
      return reply.code(400).send({ error: 'Informe estipulanteId, grupoId ou grupoNome na query.' })
    }

    const where: Prisma.PortalSeguroApoliceWhereInput = {}
    if (filter.estipulanteId) {
      const ids = await estipulanteSiblingIds(filter.estipulanteId, filter.grupoNome?.trim() || null)
      where.estipulanteId = ids.length === 1 ? ids[0] : { in: ids }
    } else if (filter.grupoId) where.estipulante = { grupoEconomicoId: filter.grupoId }
    else {
      where.estipulante = whereEstipulantesPorNomeGrupoNexus(filter.grupoNome!.trim())
    }

    const list = await prisma.portalSeguroApolice.findMany({
      where,
      orderBy: { numeroApolice: 'asc' },
      take: 500,
      include: {
        estipulante: {
          include: {
            grupo: { select: { id: true, nome: true } },
          },
        },
        _count: { select: { itens: true } },
      },
    })
    return reply.send({ apolices: list })
  })

  /** Lista plana para seletores (ex.: itens da apólice). */
  app.get('/seguros/apolices/lista', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const q = z.object({
      grupoId: uuid.optional(),
      grupoNome: z.string().min(1).max(500).optional(),
      estipulanteId: uuid.optional(),
    })
    let filter: z.infer<typeof q>
    try {
      filter = q.parse(req.query)
    } catch {
      return reply.code(400).send({ error: 'Query inválida.' })
    }

    const where: Prisma.PortalSeguroApoliceWhereInput = { active: true }
    if (filter.estipulanteId) {
      const ids = await estipulanteSiblingIds(filter.estipulanteId, filter.grupoNome?.trim() || null)
      where.estipulanteId = ids.length === 1 ? ids[0] : { in: ids }
    } else if (filter.grupoId) where.estipulante = { grupoEconomicoId: filter.grupoId }
    else if (filter.grupoNome?.trim()) {
      where.estipulante = whereEstipulantesPorNomeGrupoNexus(filter.grupoNome.trim())
    } else {
      return reply.code(400).send({ error: 'Informe estipulanteId, grupoId ou grupoNome na query.' })
    }

    const list = await prisma.portalSeguroApolice.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: 500,
      select: {
        id: true,
        numeroApolice: true,
        produto: true,
        estipulante: {
          select: {
            id: true,
            razaoSocial: true,
            grupoEconomicoNome: true,
            grupo: { select: { id: true, nome: true } },
          },
        },
      },
    })
    return reply.send({ apolices: list })
  })

  app.post('/seguros/apolices', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    let body: z.infer<typeof createApoliceSchema>
    try {
      body = createApoliceSchema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const est = await prisma.portalSeguroEstipulante.findUnique({ where: { id: body.estipulanteId } })
    if (!est) return reply.code(400).send({ error: 'Estipulante não encontrado.' })

    let numeroApolice = (body.numeroApolice ?? '').trim()
    let nexusContratoId = (body.nexusContratoId ?? '').trim() || null

    if (nexusContratoId) {
      const snap = await prisma.portalNexusEntitySnapshot.findUnique({
        where: { entityKey: 'contratos' },
      })
      if (!snap || !Array.isArray(snap.rows) || snap.rowCount === 0) {
        return reply
          .code(400)
          .send({ error: 'Snapshot de contratos Nexus indisponível. Sincronize a entidade contratos em Banco de dados.' })
      }
      const all = parseContratosSnapshot(snap.rows)
      const c = findContratoById(all, nexusContratoId)
      if (!c) return reply.code(400).send({ error: 'Contrato Nexus não encontrado.' })
      const ok = filterContratosForEstipulante(
        [c],
        {
          grupoEconomicoNome: est.grupoEconomicoNome,
          nexusClienteId: est.nexusClienteId,
          cnpj: est.cnpj,
        },
      ).length
      if (!ok) {
        return reply.code(400).send({ error: 'Contrato não pertence ao estipulante / grupo econômico selecionado.' })
      }
      numeroApolice = c.numero.trim()
    } else if (!numeroApolice) {
      return reply.code(400).send({ error: 'Informe o número da apólice ou selecione um contrato Nexus.' })
    }

    const { plano, coberturas } = normalizeApolicePayload(body)

    try {
      const row = await prisma.portalSeguroApolice.create({
        data: {
          estipulanteId: body.estipulanteId,
          nexusContratoId,
          numeroApolice,
          produto: body.produto,
          fornecedor: body.fornecedor.trim(),
          subestipulante: body.subestipulante.trim(),
          plano,
          coberturas,
          vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : null,
          vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : null,
          observacoes: body.observacoes?.trim() || null,
        },
      })
      return reply.code(201).send({ apolice: row })
    } catch {
      return reply.code(400).send({ error: 'Número de apólice já existe para este estipulante.' })
    }
  })

  app.patch('/seguros/apolices/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    let body: z.infer<typeof patchApoliceSchema>
    try {
      body = patchApoliceSchema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const current = await prisma.portalSeguroApolice.findUnique({
      where: { id },
      include: { estipulante: true },
    })
    if (!current) return reply.code(404).send({ error: 'Apólice não encontrada' })

    const produto = body.produto ?? current.produto
    const merged = {
      produto,
      plano: body.plano !== undefined ? body.plano : current.plano,
      coberturas: body.coberturas !== undefined ? body.coberturas : current.coberturas,
    }
    const { plano, coberturas } = normalizeApolicePayload(merged as { produto: PortalApoliceProduto; plano: string | null; coberturas: string | null })

    if (produto === PortalApoliceProduto.SAUDE || produto === PortalApoliceProduto.ODONTO) {
      if (!(plano ?? '').trim()) {
        return reply.code(400).send({ error: 'Plano é obrigatório para Saúde ou Odonto.' })
      }
    }
    if (produto === PortalApoliceProduto.VIDA_GRUPO) {
      if (!(coberturas ?? '').trim()) {
        return reply.code(400).send({ error: 'Coberturas são obrigatórias para Vida em grupo.' })
      }
    }

    const data: Prisma.PortalSeguroApoliceUpdateInput = {}
    let numeroDefinidoPorContratoNexus = false
    if (body.nexusContratoId !== undefined) {
      const raw = body.nexusContratoId
      if (raw === null || (typeof raw === 'string' && !raw.trim())) {
        data.nexusContratoId = null
      } else {
        const nid = String(raw).trim()
        const snap = await prisma.portalNexusEntitySnapshot.findUnique({
          where: { entityKey: 'contratos' },
        })
        if (!snap || !Array.isArray(snap.rows) || snap.rowCount === 0) {
          return reply
            .code(400)
            .send({ error: 'Snapshot de contratos Nexus indisponível. Sincronize a entidade contratos em Banco de dados.' })
        }
        const all = parseContratosSnapshot(snap.rows)
        const c = findContratoById(all, nid)
        if (!c) return reply.code(400).send({ error: 'Contrato Nexus não encontrado.' })
        const est = current.estipulante
        const ok = filterContratosForEstipulante(
          [c],
          {
            grupoEconomicoNome: est.grupoEconomicoNome,
            nexusClienteId: est.nexusClienteId,
            cnpj: est.cnpj,
          },
        ).length
        if (!ok) {
          return reply.code(400).send({ error: 'Contrato não pertence ao estipulante / grupo econômico selecionado.' })
        }
        data.nexusContratoId = nid
        data.numeroApolice = c.numero.trim()
        numeroDefinidoPorContratoNexus = true
      }
    }
    if (body.numeroApolice !== undefined && !numeroDefinidoPorContratoNexus) {
      data.numeroApolice = body.numeroApolice.trim()
    }
    if (body.produto !== undefined) data.produto = body.produto
    if (body.fornecedor !== undefined) data.fornecedor = body.fornecedor.trim()
    if (body.subestipulante !== undefined) data.subestipulante = body.subestipulante.trim()
    data.plano = plano
    data.coberturas = coberturas
    if (body.vigenciaInicio !== undefined) data.vigenciaInicio = body.vigenciaInicio ? new Date(body.vigenciaInicio) : null
    if (body.vigenciaFim !== undefined) data.vigenciaFim = body.vigenciaFim ? new Date(body.vigenciaFim) : null
    if (body.observacoes !== undefined) data.observacoes = body.observacoes?.trim() || null
    if (body.active !== undefined) data.active = body.active

    try {
      const row = await prisma.portalSeguroApolice.update({ where: { id }, data })
      return reply.send({ apolice: row })
    } catch {
      return reply.code(400).send({ error: 'Não foi possível atualizar (número duplicado?).' })
    }
  })

  app.delete('/seguros/apolices/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    try {
      await prisma.portalSeguroApolice.delete({ where: { id } })
      return reply.send({ ok: true })
    } catch {
      return reply.code(404).send({ error: 'Apólice não encontrada' })
    }
  })

  // --- Itens da apólice ---
  app.get('/seguros/apolices/:apoliceId/itens', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const apoliceId = (req.params as { apoliceId?: string }).apoliceId
    if (!apoliceId || !uuid.safeParse(apoliceId).success) return reply.code(400).send({ error: 'apoliceId inválido' })

    const list = await prisma.portalSeguroApoliceItem.findMany({
      where: { apoliceId },
      orderBy: [{ sortOrder: 'asc' }, { descricao: 'asc' }],
    })
    return reply.send({ itens: list })
  })

  app.post('/seguros/apolices/:apoliceId/itens', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const apoliceId = (req.params as { apoliceId?: string }).apoliceId
    if (!apoliceId || !uuid.safeParse(apoliceId).success) return reply.code(400).send({ error: 'apoliceId inválido' })

    const schema = z.object({
      tipo: itemTipoSchema,
      descricao: z.string().min(1).max(500),
      detalhes: z.string().max(4000).optional().nullable(),
      sortOrder: z.number().int().min(0).max(9999).optional(),
    })
    let body: z.infer<typeof schema>
    try {
      body = schema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const ap = await prisma.portalSeguroApolice.findUnique({ where: { id: apoliceId } })
    if (!ap) return reply.code(404).send({ error: 'Apólice não encontrada' })

    const row = await prisma.portalSeguroApoliceItem.create({
      data: {
        apoliceId,
        tipo: body.tipo,
        descricao: body.descricao.trim(),
        detalhes: body.detalhes?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return reply.code(201).send({ item: row })
  })

  app.patch('/seguros/apolice-itens/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    const schema = z.object({
      tipo: itemTipoSchema.optional(),
      descricao: z.string().min(1).max(500).optional(),
      detalhes: z.string().max(4000).optional().nullable(),
      sortOrder: z.number().int().min(0).max(9999).optional(),
      active: z.boolean().optional(),
    })
    let body: z.infer<typeof schema>
    try {
      body = schema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const data: Prisma.PortalSeguroApoliceItemUpdateInput = {}
    if (body.tipo !== undefined) data.tipo = body.tipo
    if (body.descricao !== undefined) data.descricao = body.descricao.trim()
    if (body.detalhes !== undefined) data.detalhes = body.detalhes?.trim() || null
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder
    if (body.active !== undefined) data.active = body.active

    try {
      const row = await prisma.portalSeguroApoliceItem.update({ where: { id }, data })
      return reply.send({ item: row })
    } catch {
      return reply.code(404).send({ error: 'Item não encontrado' })
    }
  })

  app.delete('/seguros/apolice-itens/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    try {
      await prisma.portalSeguroApoliceItem.delete({ where: { id } })
      return reply.send({ ok: true })
    } catch {
      return reply.code(404).send({ error: 'Item não encontrado' })
    }
  })
}
