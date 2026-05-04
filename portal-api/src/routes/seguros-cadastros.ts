import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  PortalApoliceModeloDadosSeguro,
  PortalApoliceProduto,
  PortalApoliceTipoCustoPlano,
  PortalGrupoEconomicoClassificacao,
  PortalSeguroConeRegiao,
  PortalSeguroItemTipo,
  PortalSubestipulanteStatus,
  PortalUserRole,
  Prisma,
} from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { normalizarValoresPorFaixa } from '../lib/apolice-planos-faixas.js'
import { assertRole, requirePortalUser } from '../lib/authz.js'
import { buildNexusGruposEconomicosEmpresas } from '../lib/nexus-grupos-economicos-view.js'
import {
  filterContratosForEstipulante,
  findContratoById,
  parseContratosSnapshot,
} from '../lib/nexus-seguros-contratos.js'

const uuid = z.string().uuid()

const grupoClassificacaoSchema = z.nativeEnum(PortalGrupoEconomicoClassificacao)

async function nomesGruposEconomicosPortalAtivos(): Promise<string[]> {
  const rows = await prisma.portalGrupoEconomico.findMany({
    where: { active: true },
    select: { nome: true },
  })
  return rows.map((r) => r.nome.trim()).filter(Boolean)
}

function mergeSortedGrupoNomesNexusEPortal(nexusNomes: string[], portalNomes: string[]): string[] {
  const set = new Set<string>()
  for (const n of nexusNomes) {
    const t = (n || '').trim()
    if (t) set.add(t)
  }
  for (const n of portalNomes) {
    const t = (n || '').trim()
    if (t) set.add(t)
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
}

const produtoSchema = z.nativeEnum(PortalApoliceProduto)
const itemTipoSchema = z.nativeEnum(PortalSeguroItemTipo)

const subestipulanteStatusSchema = z.nativeEnum(PortalSubestipulanteStatus)
const subestipulanteRowInputSchema = z.object({
  razaoSocial: z.string().min(1).max(500),
  cnpj: z.string().max(20),
  codigoSub: z.string().max(120),
  status: subestipulanteStatusSchema,
})

const coneRegiaoSchema = z.nativeEnum(PortalSeguroConeRegiao)

const parcelas12Schema = z.array(z.number()).length(12).nullable().optional()

const putComissionamentoApoliceSchema = z.object({
  temCorretorParceiro: z.boolean().optional().nullable(),
  valorAgenciamentoContrato: z.number().optional().nullable(),
  valorVitalicioContrato: z.number().optional().nullable(),
  agenciamentoConsultoria: parcelas12Schema,
  vitalicioConsultoria: parcelas12Schema,
  agenciamentoCorretor: parcelas12Schema,
  vitalicioCorretor: parcelas12Schema,
})

const putFeeApoliceSchema = z.object({
  valorFeeMensal: z.number().optional().nullable(),
  feeConsultoria: z.number().optional().nullable(),
  feeCorretorParceiro: z.number().optional().nullable(),
})

function parseParcelas12Db(s: string | null | undefined): number[] | null {
  if (s == null || String(s).trim() === '') return null
  try {
    const j = JSON.parse(String(s)) as unknown
    if (!Array.isArray(j) || j.length !== 12) return null
    return j.map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0))
  } catch {
    return null
  }
}

function serializeParcelas12(arr: number[] | null | undefined): string | null {
  if (arr == null) return null
  return JSON.stringify(arr)
}

function mapComissionamentoApi(row: {
  id: string
  apoliceId: string
  temCorretorParceiro: boolean | null
  valorAgenciamentoContrato: Prisma.Decimal | null
  valorVitalicioContrato: Prisma.Decimal | null
  agenciamentoConsultoria: string | null
  vitalicioConsultoria: string | null
  agenciamentoCorretor: string | null
  vitalicioCorretor: string | null
}) {
  return {
    id: row.id,
    apoliceId: row.apoliceId,
    temCorretorParceiro: row.temCorretorParceiro,
    valorAgenciamentoContrato:
      row.valorAgenciamentoContrato != null ? Number(row.valorAgenciamentoContrato) : null,
    valorVitalicioContrato: row.valorVitalicioContrato != null ? Number(row.valorVitalicioContrato) : null,
    agenciamentoConsultoria: parseParcelas12Db(row.agenciamentoConsultoria),
    vitalicioConsultoria: parseParcelas12Db(row.vitalicioConsultoria),
    agenciamentoCorretor: parseParcelas12Db(row.agenciamentoCorretor),
    vitalicioCorretor: parseParcelas12Db(row.vitalicioCorretor),
  }
}

function mapFeeApi(row: {
  id: string
  apoliceId: string
  valorFeeMensal: Prisma.Decimal | null
  feeConsultoria: Prisma.Decimal | null
  feeCorretorParceiro: Prisma.Decimal | null
}) {
  return {
    id: row.id,
    apoliceId: row.apoliceId,
    valorFeeMensal: row.valorFeeMensal != null ? Number(row.valorFeeMensal) : null,
    feeConsultoria: row.feeConsultoria != null ? Number(row.feeConsultoria) : null,
    feeCorretorParceiro: row.feeCorretorParceiro != null ? Number(row.feeCorretorParceiro) : null,
  }
}

function comissionamentoToDb(body: z.infer<typeof putComissionamentoApoliceSchema>) {
  return {
    temCorretorParceiro: body.temCorretorParceiro ?? false,
    valorAgenciamentoContrato: body.valorAgenciamentoContrato ?? null,
    valorVitalicioContrato: body.valorVitalicioContrato ?? null,
    agenciamentoConsultoria: serializeParcelas12(body.agenciamentoConsultoria ?? null),
    vitalicioConsultoria: serializeParcelas12(body.vitalicioConsultoria ?? null),
    agenciamentoCorretor: serializeParcelas12(body.agenciamentoCorretor ?? null),
    vitalicioCorretor: serializeParcelas12(body.vitalicioCorretor ?? null),
  }
}

function isComissionamentoEmptyDb(payload: ReturnType<typeof comissionamentoToDb>): boolean {
  const jsonVoid = (s: string | null) =>
    s == null || s === '' || s === JSON.stringify([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
  const num0 = (n: number | null | undefined) => n == null || n === 0
  return (
    !payload.temCorretorParceiro &&
    num0(payload.valorAgenciamentoContrato as number | null | undefined) &&
    num0(payload.valorVitalicioContrato as number | null | undefined) &&
    jsonVoid(payload.agenciamentoConsultoria) &&
    jsonVoid(payload.vitalicioConsultoria) &&
    jsonVoid(payload.agenciamentoCorretor) &&
    jsonVoid(payload.vitalicioCorretor)
  )
}

function isFeeEmptyDb(body: z.infer<typeof putFeeApoliceSchema>): boolean {
  const isNullOrZero = (n: number | null | undefined) => n == null || n === 0
  return isNullOrZero(body.valorFeeMensal) && isNullOrZero(body.feeConsultoria) && isNullOrZero(body.feeCorretorParceiro)
}

const faturaMesInputSchema = z.object({
  competenciaAno: z.number().int().min(1990).max(2100),
  competenciaMes: z.number().int().min(1).max(12),
  vidas: z.number().int().min(0).max(50_000_000),
  valorFatura: z.number().nonnegative(),
  observacoes: z.string().max(500).optional().nullable(),
})

const createApoliceSchema = z
  .object({
    estipulanteId: uuid,
    numeroApolice: z.string().max(120).optional().nullable(),
    nexusContratoId: z.string().max(120).optional().nullable(),
    produto: produtoSchema,
    /** Obrigatório: catálogo PortalSeguroOperadora; o nome gravado em `fornecedor` copia o catálogo. */
    operadoraId: uuid,
    subestipulante: z.string().max(500).optional().nullable(),
    subestipulantes: z.array(subestipulanteRowInputSchema).max(200).optional(),
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
    if (!data.operadoraId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecione a operadora no catálogo.',
        path: ['operadoraId'],
      })
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

const patchApoliceSchema = z
  .object({
    estipulanteId: uuid.optional(),
    numeroApolice: z.string().min(1).max(120).optional(),
    nexusContratoId: z.string().max(120).optional().nullable(),
    produto: produtoSchema.optional(),
    operadoraId: uuid.optional(),
    subestipulante: z.string().max(500).optional().nullable(),
    subestipulantes: z.array(subestipulanteRowInputSchema).max(200).optional(),
    faturasMensais: z.array(faturaMesInputSchema).max(500).optional(),
    plano: z.string().max(2000).optional().nullable(),
    coberturas: z.string().max(8000).optional().nullable(),
    vigenciaInicio: z.string().max(40).optional().nullable(),
    vigenciaFim: z.string().max(40).optional().nullable(),
    observacoes: z.string().max(2000).optional().nullable(),
    active: z.boolean().optional(),
    trCone: coneRegiaoSchema.optional().nullable(),
    trDiretoria: z.string().max(500).optional().nullable(),
    trSuperintendente: z.string().max(500).optional().nullable(),
    trGerente: z.string().max(500).optional().nullable(),
    trExecutivoConsultor: z.string().max(500).optional().nullable(),
    trAnalista: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (!data.faturasMensais) return
    const seen = new Set<string>()
    for (let i = 0; i < data.faturasMensais.length; i++) {
      const r = data.faturasMensais[i]
      const k = `${r.competenciaAno}-${r.competenciaMes}`
      if (seen.has(k)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Competência duplicada: ${r.competenciaMes}/${r.competenciaAno}.`,
          path: ['faturasMensais', i],
        })
        return
      }
      seen.add(k)
    }
  })

const planoLinhaInputSchema = z
  .object({
    codigoPlano: z.string().min(1).max(500),
    tipoCusto: z.nativeEnum(PortalApoliceTipoCustoPlano),
    custoMedio: z.number().nonnegative().nullable().optional(),
    valoresPorFaixa: z.record(z.string(), z.union([z.number(), z.null()])).optional(),
  })
  .superRefine((row, ctx) => {
    if (row.tipoCusto === PortalApoliceTipoCustoPlano.CUSTO_MEDIO) {
      const v = row.custoMedio
      if (v == null || !Number.isFinite(v)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Indique o custo médio.', path: ['custoMedio'] })
      }
    } else {
      const norm = normalizarValoresPorFaixa(row.valoresPorFaixa ?? {})
      if (!norm) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Valores por faixa etária inválidos.', path: ['valoresPorFaixa'] })
        return
      }
      const hasAny = Object.values(norm).some((x) => x != null)
      if (!hasAny) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Preencha pelo menos uma faixa etária com valor.',
          path: ['valoresPorFaixa'],
        })
      }
    }
  })

const putApoliceDadosSeguroSchema = z
  .object({
    modeloDadosSeguro: z.nativeEnum(PortalApoliceModeloDadosSeguro),
    planoLinhas: z.array(planoLinhaInputSchema).max(200),
  })
  .superRefine((data, ctx) => {
    if (data.modeloDadosSeguro === PortalApoliceModeloDadosSeguro.PLANO && data.planoLinhas.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'No modelo Plano, adicione pelo menos uma linha de plano.',
        path: ['planoLinhas'],
      })
    }
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

/** Alinha nomes de grupo (Nexus vs cadastro local) para unir linhas que representam o mesmo grupo económico. */
function normGrupoNomeSeg(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

class UnionFind {
  private parent: number[]
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i)
  }
  find(i: number): number {
    if (this.parent[i] !== i) this.parent[i] = this.find(this.parent[i])
    return this.parent[i]
  }
  union(a: number, b: number): void {
    const ra = this.find(a)
    const rb = this.find(b)
    if (ra !== rb) this.parent[rb] = ra
  }
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

/** Inclui estipulantes ligados só por `grupoEconomicoId` (mesmo registo Portal), além do nome Nexus/local. */
function whereEstipulantesAgrupadosParaApolices(
  nomeGrupo: string,
  grupoEconomicoId: string | null,
): Prisma.PortalSeguroEstipulanteWhereInput {
  const byNome = whereEstipulantesPorNomeGrupoNexus(nomeGrupo.trim())
  if (!grupoEconomicoId) return byNome
  return { OR: [byNome, { grupoEconomicoId }] }
}

function looseRazaoMesmaEmpresa(a: string, b: string): boolean {
  const ca = normRazaoSeg(a)
  const cb = normRazaoSeg(b)
  if (ca.length < 6 || cb.length < 6) return false
  if (ca === cb) return true
  if (ca.localeCompare(cb, 'pt-BR', { sensitivity: 'base' }) === 0) return true
  const stop = new Set(['ltda', 'sa', 'me', 'eireli', 'ep', 'de', 'da', 'do', 'em', 'a'])
  const ta = [...new Set(ca.split(' ').filter((w) => w.length > 1 && !stop.has(w)))]
  const tb = new Set(cb.split(' ').filter((w) => w.length > 1 && !stop.has(w)))
  if (ta.length === 0 || tb.size === 0) return false
  let hit = 0
  for (const w of ta) {
    if (tb.has(w)) hit++
  }
  return hit >= 2 && hit >= Math.ceil(Math.min(ta.length, tb.size) * 0.45)
}

type EstLinhaContagem = {
  id: string
  razaoSocial: string
  cnpj: string
  nexusClienteId: string | null
  grupoEconomicoNome: string
  grupoEconomicoId: string | null
  /** `PortalGrupoEconomico.id` via relação `grupo`. */
  grupoPortalId: string | null
  /** `PortalGrupoEconomico.nome` — faz ponte com `grupoEconomicoNome` quando só um dos lados tem FK. */
  grupoNomePortal: string | null
}

/**
 * **Total de apólices do grupo económico** atribuído a cada linha de estipulante desse grupo.
 *
 * O modelo físico da BD liga apólice → estipulante; conceptualmente o agrupamento é por **grupo
 * económico**. Union-Find nas etiquetas (`local:*`, `nx:*`, `cnpj:*`) une linhas que representam o
 * mesmo grupo apesar de dados inconsistentes (FK vs Nexus vs nome local).
 */
function mergeApoliceCountsPorEstipulante(
  estipulantes: EstLinhaContagem[],
  countPorEstipulanteId: Map<string, number>,
): Map<string, number> {
  const n = estipulantes.length
  if (n === 0) return new Map()

  const uf = new UnionFind(n)
  const labelBuckets = new Map<string, number[]>()

  const touchLabel = (label: string, idx: number) => {
    if (!label) return
    let arr = labelBuckets.get(label)
    if (!arr) {
      arr = []
      labelBuckets.set(label, arr)
    }
    arr.push(idx)
  }

  for (let i = 0; i < n; i++) {
    const e = estipulantes[i]
    const geid = (e.grupoEconomicoId ?? e.grupoPortalId ?? '').trim()
    if (geid) touchLabel(`local:${geid}`, i)

    const nxNome = normGrupoNomeSeg(e.grupoEconomicoNome)
    if (nxNome) touchLabel(`nx:${nxNome}`, i)

    const nxPortal = normGrupoNomeSeg(e.grupoNomePortal ?? '')
    if (nxPortal) touchLabel(`nx:${nxPortal}`, i)

    const d = normCnpjDigitsSeg(e.cnpj)
    if (d.length >= 12) touchLabel(`cnpj:${d}`, i)
  }

  for (const indices of labelBuckets.values()) {
    if (indices.length < 2) continue
    const head = indices[0]
    for (let k = 1; k < indices.length; k++) uf.union(head, indices[k])
  }

  const rootSum = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    const r = uf.find(i)
    const add = countPorEstipulanteId.get(estipulantes[i].id) ?? 0
    rootSum.set(r, (rootSum.get(r) ?? 0) + add)
  }

  const out = new Map<string, number>()
  for (let i = 0; i < n; i++) {
    out.set(estipulantes[i].id, rootSum.get(uf.find(i)) ?? 0)
  }
  return out
}

function wideEstipulanteIdsNoGrupo(
  est: { id: string; razaoSocial: string; cnpj: string; nexusClienteId: string | null },
  groupEsts: Array<{ id: string; razaoSocial: string; cnpj: string; nexusClienteId: string | null }>,
): string[] {
  const nid = est.nexusClienteId?.trim() || ''
  const dEst = normCnpjDigitsSeg(est.cnpj)
  const rsEst = normRazaoSeg(est.razaoSocial)
  const out = new Set<string>()
  out.add(est.id)
  for (const p of groupEsts) {
    if (p.id === est.id) continue
    if (nid && p.nexusClienteId?.trim() === nid) out.add(p.id)
    else if (dEst.length >= 8 && normCnpjDigitsSeg(p.cnpj) === dEst) out.add(p.id)
    else if (rsEst.length >= 6 && normRazaoSeg(p.razaoSocial) === rsEst) out.add(p.id)
    else if (looseRazaoMesmaEmpresa(est.razaoSocial, p.razaoSocial)) out.add(p.id)
  }
  return [...out]
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
        where: whereEstipulantesAgrupadosParaApolices(nomeGrupo, est.grupoEconomicoId),
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
  /** Catálogo de operadoras (seguradoras) — opções persistidas no portal. */
  app.get('/seguros/operadoras', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    const operadoras = await prisma.portalSeguroOperadora.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, sortOrder: true },
    })
    return reply.send({ operadoras })
  })

  app.post('/seguros/operadoras', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return
    let body: { nome: string; sortOrder?: number }
    try {
      body = z
        .object({ nome: z.string().min(1).max(500), sortOrder: z.number().int().optional() })
        .parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }
    const row = await prisma.portalSeguroOperadora.create({
      data: { nome: body.nome.trim(), sortOrder: body.sortOrder ?? 0 },
    })
    return reply.code(201).send({ operadora: row })
  })

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

  /** Nomes distintos de grupo econômico (Nexus + grupos locais ativos) para seletores de cadastro. */
  app.get('/seguros/nexus/grupos-economicos-nomes', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const portalNomes = await nomesGruposEconomicosPortalAtivos()

    const snap = await prisma.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: 'clientes' },
    })
    if (!snap || !Array.isArray(snap.rows) || snap.rowCount === 0) {
      const nomes = mergeSortedGrupoNomesNexusEPortal([], portalNomes)
      return reply.send({
        ok: true,
        needsSync: true,
        nomes,
        message:
          nomes.length > 0
            ? 'Clientes Nexus não sincronizados; a lista inclui grupos locais do portal (incl. prospects). Sincronize o Nexus para ver clientes oficiais.'
            : 'Dados de clientes Nexus ainda não sincronizados. Peça ao administrador para configurar NEXUS_API_* e executar a sincronização em Banco de dados.',
      })
    }
    const empresas = buildNexusGruposEconomicosEmpresas(snap.rows)
    const nomesNexus = [...new Set(empresas.map((e) => e.grupoEconomicoNome))]
    const nomes = mergeSortedGrupoNomesNexusEPortal(nomesNexus, portalNomes)
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

  /**

   * Contratos Nexus: snapshot (filtrado por `limit`) ou filtrados por estipulante (grupo + cliente Nexus).
   * Sem `estipulanteId`, devolve até `limit` contratos (default 5000), nº apólice descendente — a visão geral usa isto para não enviar o snapshot inteiro.
   */
  app.get('/seguros/nexus/contratos-opcoes', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const qCo = z.object({
      estipulanteId: uuid.optional(),
      grupoNome: z.string().min(1).max(500).optional(),
      /** Limite de contratos devolvidos (snapshot pode ser enorme). Ordenação: nº apólice descendente. */
      limit: z.coerce.number().int().min(1).max(100_000).optional().default(5000),
    })
    let qParsed: z.infer<typeof qCo>
    try {
      qParsed = qCo.parse(req.query)
    } catch {
      return reply.code(400).send({ error: 'Query inválida: estipulanteId (UUID opcional), grupoNome e limit (1–100000).' })
    }
    const estipulanteId = qParsed.estipulanteId
    const grupoNomeContratos = qParsed.grupoNome?.trim() || null

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

    const contratosLim = qParsed.limit

    if (!estipulanteId) {
      const all = parseContratosSnapshot(snap.rows)
      const contratos = [...all]
        .sort((a, b) => b.numero.localeCompare(a.numero, 'pt-BR', { numeric: true }))
        .slice(0, contratosLim)
      return reply.send({ ok: true, needsSync: false, contratos, contratosMeta: { limit: contratosLim, returned: contratos.length } })
    }

    const est = await prisma.portalSeguroEstipulante.findUnique({ where: { id: estipulanteId } })
    if (!est) return reply.code(404).send({ error: 'Estipulante não encontrado.' })

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
    const contratos = [...byContratoId.values()]
      .sort((a, b) => b.numero.localeCompare(a.numero, 'pt-BR', { numeric: true }))
      .slice(0, contratosLim)

    return reply.send({
      ok: true,
      needsSync: false,
      contratos,
      contratosMeta: { limit: contratosLim, returned: contratos.length },
    })
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
      classificacao: grupoClassificacaoSchema.optional().default(PortalGrupoEconomicoClassificacao.CLIENTE),
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
        classificacao: body.classificacao,
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
      classificacao: grupoClassificacaoSchema.optional(),
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
    if (body.classificacao !== undefined) data.classificacao = body.classificacao
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
        cnae: z.string().max(50).optional().nullable(),
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
          cnae: body.cnae?.trim() || null,
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
      cnae: z.string().max(50).optional().nullable(),
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
    if (body.cnae !== undefined) data.cnae = body.cnae?.trim() || null
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

  const cadastroVisaoGeralQuery = z.object({
    /**
     * `apolices_recent`: até `limit` apólices mais recentes (comportamento antigo).
     * `hierarquia`: até `limit` estipulantes (ordenados por grupo → razão social) e **todas** as apólices
     * vinculadas a esses estipulantes.
     */
    carga: z.enum(['apolices_recent', 'hierarquia']).optional().default('apolices_recent'),
    /** Por pedido: em `apolices_recent` = máx. apólices; em `hierarquia` = máx. estipulantes (1–50000). */
    limit: z.coerce.number().int().min(1).max(50000).optional().default(2000),
    offset: z.coerce.number().int().min(0).max(10_000_000).optional().default(0),
    /** `recent`: últimas alteradas primeiro (`updatedAt` desc); `id_asc`: compatível com paginação antiga por UUID. */
    sort: z.enum(['recent', 'id_asc']).optional().default('recent'),
  })

  /**
   * Visão geral: contagens + lista plana de apólices (uma linha = grupo + estipulante + apólice).
   * Não envia `itens` aqui (payload pode estourar o JSON no browser); use GET /seguros/apolices/:id/itens ao abrir o detalhe.
   * Query: `carga=apolices_recent|hierarquia` (default apolices_recent), `limit`, `offset`, `sort=recent|id_asc`.
   */
  app.get('/seguros/cadastro-visao-geral', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    let q: z.infer<typeof cadastroVisaoGeralQuery>
    try {
      q = cadastroVisaoGeralQuery.parse(req.query)
    } catch {
      return reply.code(400).send({ error: 'Query inválida: carga, limit (1–50000), offset (≥ 0) e sort (recent|id_asc).' })
    }

    const apoliceOrderBy: Prisma.PortalSeguroApoliceOrderByWithRelationInput[] =
      q.sort === 'recent'
        ? [{ updatedAt: 'desc' }, { id: 'desc' }]
        : [{ id: 'asc' }]

    const apoliceVisaoSelect = {
      id: true,
      active: true,
      numeroApolice: true,
      produto: true,
      operadoraId: true,
      operadora: { select: { id: true, nome: true } },
      fornecedor: true,
      subestipulante: true,
      plano: true,
      coberturas: true,
      vigenciaInicio: true,
      vigenciaFim: true,
      nexusContratoId: true,
      observacoes: true,
      updatedAt: true,
      estipulante: {
        select: {
          id: true,
          razaoSocial: true,
          grupoEconomicoNome: true,
          grupoEconomicoId: true,
          cnpj: true,
          cnae: true,
          nexusClienteId: true,
          nomeFantasia: true,
          observacoes: true,
          grupo: { select: { id: true, nome: true } },
        },
      },
      _count: { select: { itens: true, planoLinhas: true, subestipulantes: true } },
    } as const

    const estSelectVisao = {
      id: true,
      active: true,
      razaoSocial: true,
      cnpj: true,
      cnae: true,
      grupoEconomicoNome: true,
      grupoEconomicoId: true,
      nexusClienteId: true,
      nomeFantasia: true,
      observacoes: true,
      grupo: { select: { id: true, nome: true } },
    } as const

    try {
      const [gruposEconomicosCount, estipulantesCount, apolicesTotalCount] = await Promise.all([
        prisma.portalGrupoEconomico.count({ where: { active: true } }),
        prisma.portalSeguroEstipulante.count(),
        prisma.portalSeguroApolice.count(),
      ])

      let apolices: Array<Prisma.PortalSeguroApoliceGetPayload<{ select: typeof apoliceVisaoSelect }>>
      let estipulantesRaw: Array<Prisma.PortalSeguroEstipulanteGetPayload<{ select: typeof estSelectVisao }>> | undefined

      if (q.carga === 'hierarquia') {
        const estTake = Math.min(q.limit, 25_000)
        const estPage = await prisma.portalSeguroEstipulante.findMany({
          take: estTake,
          skip: q.offset,
          orderBy: [{ grupoEconomicoNome: 'asc' }, { razaoSocial: 'asc' }],
          select: estSelectVisao,
        })
        const estIds = estPage.map((e) => e.id)
        const HIERARQUIA_CHUNK = 800
        const acc: typeof apolices = []
        for (let i = 0; i < estIds.length; i += HIERARQUIA_CHUNK) {
          const chunk = estIds.slice(i, i + HIERARQUIA_CHUNK)
          const part = await prisma.portalSeguroApolice.findMany({
            where: { estipulanteId: { in: chunk } },
            orderBy: apoliceOrderBy,
            select: apoliceVisaoSelect,
          })
          acc.push(...part)
        }
        apolices = acc
        estipulantesRaw = estPage
      } else {
        apolices = await prisma.portalSeguroApolice.findMany({
          take: q.limit,
          skip: q.offset,
          orderBy: apoliceOrderBy,
          select: apoliceVisaoSelect,
        })

        /**
         * Só na 1.ª página: estipulantes ligados às apólices desta resposta + preenchimento até `VISAO_EST_CAP`
         * (últimas linhas alteradas), para não carregar dezenas de milhares de linhas.
         */
        const VISAO_EST_CAP = 10_000
        estipulantesRaw =
          q.offset === 0
            ? await (async () => {
                const apEstIds = [...new Set(apolices.map((a) => a.estipulante.id))]
                const linked =
                  apEstIds.length > 0
                    ? await prisma.portalSeguroEstipulante.findMany({
                        where: { id: { in: apEstIds } },
                        select: estSelectVisao,
                      })
                    : []
                const takeRest = Math.max(0, VISAO_EST_CAP - linked.length)
                const rest =
                  takeRest > 0
                    ? await prisma.portalSeguroEstipulante.findMany({
                        where: apEstIds.length > 0 ? { id: { notIn: apEstIds } } : undefined,
                        take: takeRest,
                        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                        select: estSelectVisao,
                      })
                    : []
                const byId = new Map<string, (typeof linked)[number]>()
                for (const e of linked) byId.set(e.id, e)
                for (const e of rest) {
                  if (!byId.has(e.id)) byId.set(e.id, e)
                }
                return [...byId.values()]
              })()
            : undefined
      }

      let estipulantes:
        | Array<
            NonNullable<typeof estipulantesRaw>[number] & {
              _count: { apolices: number }
            }
          >
        | undefined
      if (estipulantesRaw != null) {
        const countRows = await prisma.portalSeguroApolice.groupBy({
          by: ['estipulanteId'],
          _count: { _all: true },
        })
        const countMap = new Map(countRows.map((r) => [r.estipulanteId, r._count._all]))
        const linhas: EstLinhaContagem[] = estipulantesRaw.map((e) => ({
          id: e.id,
          razaoSocial: e.razaoSocial,
          cnpj: e.cnpj,
          nexusClienteId: e.nexusClienteId,
          grupoEconomicoNome: e.grupoEconomicoNome,
          grupoEconomicoId: e.grupoEconomicoId,
          grupoPortalId: e.grupo?.id ?? null,
          grupoNomePortal: e.grupo?.nome ?? null,
        }))
        /** Titulares que só aparecem na lista de apólices — precisam entrar no Union-Find para ligar ao mesmo grupo económico. */
        const idsRaw = new Set(linhas.map((l) => l.id))
        const extraIds = [...countMap.keys()].filter((id) => !idsRaw.has(id)).slice(0, 5000)
        let linhasParaUf: EstLinhaContagem[] = linhas
        if (extraIds.length > 0) {
          const extraRows = await prisma.portalSeguroEstipulante.findMany({
            where: { id: { in: extraIds } },
            select: {
              id: true,
              razaoSocial: true,
              cnpj: true,
              nexusClienteId: true,
              grupoEconomicoNome: true,
              grupoEconomicoId: true,
              grupo: { select: { id: true, nome: true } },
            },
          })
          linhasParaUf = [
            ...linhas,
            ...extraRows.map((e) => ({
              id: e.id,
              razaoSocial: e.razaoSocial,
              cnpj: e.cnpj,
              nexusClienteId: e.nexusClienteId,
              grupoEconomicoNome: e.grupoEconomicoNome,
              grupoEconomicoId: e.grupoEconomicoId,
              grupoPortalId: e.grupo?.id ?? null,
              grupoNomePortal: e.grupo?.nome ?? null,
            })),
          ]
        }
        const mergedCounts = mergeApoliceCountsPorEstipulante(linhasParaUf, countMap)
        estipulantes = estipulantesRaw.map((e) => ({
          ...e,
          _count: { apolices: mergedCounts.get(e.id) ?? 0 },
        }))
      } else {
        estipulantes = undefined
      }

      const estDevolvidos = estipulantesRaw?.length ?? 0
      const apolicesTruncated =
        q.carga === 'hierarquia' ? q.offset + estDevolvidos < estipulantesCount : q.offset + apolices.length < apolicesTotalCount

      return reply.send({
        gruposEconomicosCount,
        estipulantesCount,
        apolicesTotalCount,
        apolices,
        ...(estipulantes != null ? { estipulantes } : {}),
        visaoMeta: {
          carga: q.carga,
          limit: q.limit,
          offset: q.offset,
          returned: apolices.length,
          returnedEstipulantes: q.carga === 'hierarquia' ? estDevolvidos : undefined,
          sort: q.sort,
          apolicesTruncated,
        },
      })
    } catch (e) {
      req.log.error(e)
      return reply.code(500).send({ error: 'Erro ao carregar visão geral do cadastro.' })
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

    const includeAp = {
      estipulante: {
        include: {
          grupo: { select: { id: true, nome: true } },
        },
      },
      operadora: { select: { id: true, nome: true } },
      subestipulantes: {
        orderBy: [{ sortOrder: 'asc' }],
        take: 12,
        select: { razaoSocial: true, cnpj: true, codigoSub: true, status: true },
      },
      _count: { select: { itens: true, planoLinhas: true, subestipulantes: true } },
    } satisfies Prisma.PortalSeguroApoliceInclude

    let list = await prisma.portalSeguroApolice.findMany({
      where,
      orderBy: { numeroApolice: 'asc' },
      take: 500,
      include: includeAp,
    })

    if (filter.estipulanteId && list.length === 0) {
      const est = await prisma.portalSeguroEstipulante.findUnique({
        where: { id: filter.estipulanteId },
        select: {
          id: true,
          razaoSocial: true,
          cnpj: true,
          nexusClienteId: true,
          grupoEconomicoNome: true,
          grupoEconomicoId: true,
          grupo: { select: { nome: true } },
        },
      })
      const gName =
        filter.grupoNome?.trim() ||
        est?.grupoEconomicoNome?.trim() ||
        est?.grupo?.nome?.trim() ||
        ''
      if (est && gName) {
        const groupEsts = await prisma.portalSeguroEstipulante.findMany({
          where: whereEstipulantesAgrupadosParaApolices(gName, est.grupoEconomicoId),
          select: { id: true, razaoSocial: true, cnpj: true, nexusClienteId: true },
        })
        const wideIds = wideEstipulanteIdsNoGrupo(est, groupEsts)
        if (wideIds.length) {
          list = await prisma.portalSeguroApolice.findMany({
            where: { estipulanteId: wideIds.length === 1 ? wideIds[0] : { in: wideIds } },
            orderBy: { numeroApolice: 'asc' },
            take: 500,
            include: includeAp,
          })
        }
        if (list.length === 0) {
          list = await prisma.portalSeguroApolice.findMany({
            where: {
              estipulante: whereEstipulantesAgrupadosParaApolices(gName, est.grupoEconomicoId),
            },
            orderBy: { numeroApolice: 'asc' },
            take: 500,
            include: includeAp,
          })
        }
      }
    }

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

    const selectLista = {
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
    } as const

    let list = await prisma.portalSeguroApolice.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }],
      take: 500,
      select: selectLista,
    })

    if (filter.estipulanteId && list.length === 0) {
      const est = await prisma.portalSeguroEstipulante.findUnique({
        where: { id: filter.estipulanteId },
        select: {
          id: true,
          razaoSocial: true,
          cnpj: true,
          nexusClienteId: true,
          grupoEconomicoNome: true,
          grupoEconomicoId: true,
          grupo: { select: { nome: true } },
        },
      })
      const gName =
        filter.grupoNome?.trim() ||
        est?.grupoEconomicoNome?.trim() ||
        est?.grupo?.nome?.trim() ||
        ''
      if (est && gName) {
        const groupEsts = await prisma.portalSeguroEstipulante.findMany({
          where: whereEstipulantesAgrupadosParaApolices(gName, est.grupoEconomicoId),
          select: { id: true, razaoSocial: true, cnpj: true, nexusClienteId: true },
        })
        const wideIds = wideEstipulanteIdsNoGrupo(est, groupEsts)
        if (wideIds.length) {
          list = await prisma.portalSeguroApolice.findMany({
            where: {
              active: true,
              estipulanteId: wideIds.length === 1 ? wideIds[0] : { in: wideIds },
            },
            orderBy: [{ updatedAt: 'desc' }],
            take: 500,
            select: selectLista,
          })
        }
        if (list.length === 0) {
          list = await prisma.portalSeguroApolice.findMany({
            where: {
              active: true,
              estipulante: whereEstipulantesAgrupadosParaApolices(gName, est.grupoEconomicoId),
            },
            orderBy: [{ updatedAt: 'desc' }],
            take: 500,
            select: selectLista,
          })
        }
      }
    }

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

    let fornecedorStr: string
    const operadoraIdCreate = body.operadoraId.trim()
    const op = await prisma.portalSeguroOperadora.findFirst({
      where: { id: operadoraIdCreate, active: true },
    })
    if (!op) return reply.code(400).send({ error: 'Operadora não encontrada ou inativa.' })
    fornecedorStr = op.nome

    const subRows =
      body.subestipulantes && body.subestipulantes.length > 0
        ? body.subestipulantes
        : (body.subestipulante ?? '').trim()
          ? [
              {
                razaoSocial: (body.subestipulante ?? '').trim(),
                cnpj: '',
                codigoSub: '',
                status: PortalSubestipulanteStatus.ATIVO,
              },
            ]
          : []
    const summarySub =
      subRows.length > 0 ? subRows[0].razaoSocial.trim() : null

    try {
      const row = await prisma.portalSeguroApolice.create({
        data: {
          estipulanteId: body.estipulanteId,
          nexusContratoId,
          numeroApolice,
          produto: body.produto,
          operadoraId: operadoraIdCreate,
          fornecedor: fornecedorStr,
          subestipulante: summarySub,
          plano,
          coberturas,
          vigenciaInicio: body.vigenciaInicio ? new Date(body.vigenciaInicio) : null,
          vigenciaFim: body.vigenciaFim ? new Date(body.vigenciaFim) : null,
          observacoes: body.observacoes?.trim() || null,
          ...(subRows.length > 0
            ? {
                subestipulantes: {
                  create: subRows.map((r, i) => ({
                    sortOrder: i,
                    razaoSocial: r.razaoSocial.trim(),
                    cnpj: r.cnpj.trim(),
                    codigoSub: r.codigoSub.trim(),
                    status: r.status,
                  })),
                },
              }
            : {}),
        },
      })
      return reply.code(201).send({ apolice: row })
    } catch {
      return reply.code(400).send({ error: 'Número de apólice já existe para este estipulante.' })
    }
  })

  /** Detalhe completo para edição unificada (dados gerais + linhas de plano). */
  app.get('/seguros/apolices/:id', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    const ap = await prisma.portalSeguroApolice.findUnique({
      where: { id },
      include: {
        estipulante: {
          include: {
            grupo: { select: { id: true, nome: true } },
          },
        },
        operadora: { select: { id: true, nome: true } },
        planoLinhas: { orderBy: [{ sortOrder: 'asc' }, { codigoPlano: 'asc' }] },
        subestipulantes: { orderBy: [{ sortOrder: 'asc' }] },
        faturasMensais: { orderBy: [{ competenciaAno: 'asc' }, { competenciaMes: 'asc' }] },
        comissionamento: true,
        fee: true,
      },
    })
    if (!ap) return reply.code(404).send({ error: 'Apólice não encontrada' })

    const planoLinhas = ap.planoLinhas.map((r) => ({
      id: r.id,
      sortOrder: r.sortOrder,
      codigoPlano: r.codigoPlano,
      tipoCusto: r.tipoCusto,
      custoMedio: r.custoMedio != null ? Number(r.custoMedio) : null,
      valoresPorFaixa: (r.valoresPorFaixa as Record<string, number | null> | null) ?? null,
    }))

    const subestipulantes = ap.subestipulantes.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      razaoSocial: s.razaoSocial,
      cnpj: s.cnpj,
      codigoSub: s.codigoSub,
      status: s.status,
    }))

    const faturasMensais = ap.faturasMensais.map((f) => ({
      id: f.id,
      competenciaAno: f.competenciaAno,
      competenciaMes: f.competenciaMes,
      vidas: f.vidas,
      valorFatura: Number(f.valorFatura),
      observacoes: f.observacoes,
    }))

    const e = ap.estipulante
    return reply.send({
      apolice: {
        id: ap.id,
        estipulanteId: ap.estipulanteId,
        nexusContratoId: ap.nexusContratoId,
        numeroApolice: ap.numeroApolice,
        produto: ap.produto,
        operadoraId: ap.operadoraId,
        operadora: ap.operadora ? { id: ap.operadora.id, nome: ap.operadora.nome } : null,
        fornecedor: ap.fornecedor,
        subestipulante: ap.subestipulante,
        plano: ap.plano,
        coberturas: ap.coberturas,
        vigenciaInicio: ap.vigenciaInicio,
        vigenciaFim: ap.vigenciaFim,
        observacoes: ap.observacoes,
        active: ap.active,
        modeloDadosSeguro: ap.modeloDadosSeguro,
        comissionamento: ap.comissionamento ? mapComissionamentoApi(ap.comissionamento) : null,
        fee: ap.fee ? mapFeeApi(ap.fee) : null,
        trCone: ap.trCone,
        trDiretoria: ap.trDiretoria,
        trSuperintendente: ap.trSuperintendente,
        trGerente: ap.trGerente,
        trExecutivoConsultor: ap.trExecutivoConsultor,
        trAnalista: ap.trAnalista,
        estipulante: {
          id: e.id,
          razaoSocial: e.razaoSocial,
          grupoEconomicoNome: e.grupoEconomicoNome,
          grupo: e.grupo ? { id: e.grupo.id, nome: e.grupo.nome } : null,
        },
        planoLinhas,
        subestipulantes,
        faturasMensais,
      },
    })
  })

  app.put('/seguros/apolices/:id/comissionamento', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    let body: z.infer<typeof putComissionamentoApoliceSchema>
    try {
      body = putComissionamentoApoliceSchema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const exists = await prisma.portalSeguroApolice.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return reply.code(404).send({ error: 'Apólice não encontrada' })

    const payload = comissionamentoToDb(body)
    if (isComissionamentoEmptyDb(payload)) {
      await prisma.portalSeguroApoliceComissionamento.deleteMany({ where: { apoliceId: id } })
      return reply.send({ comissionamento: null })
    }

    const row = await prisma.portalSeguroApoliceComissionamento.upsert({
      where: { apoliceId: id },
      create: { apoliceId: id, ...payload },
      update: payload,
    })
    return reply.send({ comissionamento: mapComissionamentoApi(row) })
  })

  app.put('/seguros/apolices/:id/fee', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    let body: z.infer<typeof putFeeApoliceSchema>
    try {
      body = putFeeApoliceSchema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const exists = await prisma.portalSeguroApolice.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return reply.code(404).send({ error: 'Apólice não encontrada' })

    if (isFeeEmptyDb(body)) {
      await prisma.portalSeguroApoliceFee.deleteMany({ where: { apoliceId: id } })
      return reply.send({ fee: null })
    }

    const row = await prisma.portalSeguroApoliceFee.upsert({
      where: { apoliceId: id },
      create: {
        apoliceId: id,
        valorFeeMensal: body.valorFeeMensal ?? null,
        feeConsultoria: body.feeConsultoria ?? null,
        feeCorretorParceiro: body.feeCorretorParceiro ?? null,
      },
      update: {
        valorFeeMensal: body.valorFeeMensal ?? null,
        feeConsultoria: body.feeConsultoria ?? null,
        feeCorretorParceiro: body.feeCorretorParceiro ?? null,
      },
    })
    return reply.send({ fee: mapFeeApi(row) })
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
      const hasPlanoText = !!(plano ?? '').trim()
      if (!hasPlanoText) {
        const nLinhas = await prisma.portalSeguroApolicePlanoLinha.count({ where: { apoliceId: id } })
        if (nLinhas === 0) {
          return reply
            .code(400)
            .send({ error: 'Informe o plano (texto) ou configure planos estruturados na edição da apólice.' })
        }
      }
    }
    if (produto === PortalApoliceProduto.VIDA_GRUPO) {
      if (!(coberturas ?? '').trim()) {
        return reply.code(400).send({ error: 'Coberturas são obrigatórias para Vida em grupo.' })
      }
    }

    let targetEstipulanteId = current.estipulanteId
    let targetEstGrupoNome = current.estipulante.grupoEconomicoNome
    let targetEstNexusClienteId = current.estipulante.nexusClienteId
    let targetEstCnpj = current.estipulante.cnpj

    if (body.estipulanteId !== undefined && body.estipulanteId !== current.estipulanteId) {
      const ne = await prisma.portalSeguroEstipulante.findUnique({ where: { id: body.estipulanteId } })
      if (!ne) return reply.code(400).send({ error: 'Estipulante não encontrado.' })
      targetEstipulanteId = ne.id
      targetEstGrupoNome = ne.grupoEconomicoNome
      targetEstNexusClienteId = ne.nexusClienteId
      targetEstCnpj = ne.cnpj
    }

    const nextNumero = body.numeroApolice !== undefined ? body.numeroApolice.trim() : current.numeroApolice
    const clash = await prisma.portalSeguroApolice.findFirst({
      where: {
        estipulanteId: targetEstipulanteId,
        numeroApolice: nextNumero,
        NOT: { id },
      },
      select: { id: true },
    })
    if (clash) {
      return reply
        .code(400)
        .send({ error: 'Já existe apólice com este número para o estipulante selecionado.' })
    }

    const data: Prisma.PortalSeguroApoliceUpdateInput = {}
    if (body.estipulanteId !== undefined) {
      data.estipulante = { connect: { id: body.estipulanteId } }
    }

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
        const ok = filterContratosForEstipulante(
          [c],
          {
            grupoEconomicoNome: targetEstGrupoNome,
            nexusClienteId: targetEstNexusClienteId,
            cnpj: targetEstCnpj,
          },
        ).length
        if (!ok) {
          return reply.code(400).send({ error: 'Contrato não pertence ao estipulante / grupo econômico selecionado.' })
        }
        data.nexusContratoId = nid
      }
    }
    if (body.numeroApolice !== undefined) {
      data.numeroApolice = body.numeroApolice.trim()
    }
    if (body.produto !== undefined) data.produto = body.produto

    if (body.operadoraId !== undefined) {
      const oid = body.operadoraId.trim()
      if (!oid) {
        return reply.code(400).send({ error: 'Operadora é obrigatória. Selecione uma opção no catálogo.' })
      }
      const op = await prisma.portalSeguroOperadora.findFirst({
        where: { id: oid, active: true },
      })
      if (!op) return reply.code(400).send({ error: 'Operadora não encontrada ou inativa.' })
      data.operadora = { connect: { id: op.id } }
      data.fornecedor = op.nome
    }

    if (body.trCone !== undefined) data.trCone = body.trCone
    if (body.trDiretoria !== undefined) data.trDiretoria = body.trDiretoria?.trim() || null
    if (body.trSuperintendente !== undefined) data.trSuperintendente = body.trSuperintendente?.trim() || null
    if (body.trGerente !== undefined) data.trGerente = body.trGerente?.trim() || null
    if (body.trExecutivoConsultor !== undefined) {
      data.trExecutivoConsultor = body.trExecutivoConsultor?.trim() || null
    }
    if (body.trAnalista !== undefined) data.trAnalista = body.trAnalista?.trim() || null
    if (body.subestipulante !== undefined && body.subestipulantes === undefined) {
      data.subestipulante = body.subestipulante?.trim() ? body.subestipulante.trim() : null
    }
    data.plano = plano
    data.coberturas = coberturas
    if (body.vigenciaInicio !== undefined) data.vigenciaInicio = body.vigenciaInicio ? new Date(body.vigenciaInicio) : null
    if (body.vigenciaFim !== undefined) data.vigenciaFim = body.vigenciaFim ? new Date(body.vigenciaFim) : null
    if (body.observacoes !== undefined) data.observacoes = body.observacoes?.trim() || null
    if (body.active !== undefined) data.active = body.active

    try {
      const row = await prisma.$transaction(async (tx) => {
        if (body.subestipulantes !== undefined) {
          await tx.portalSeguroApoliceSubestipulante.deleteMany({ where: { apoliceId: id } })
          if (body.subestipulantes.length > 0) {
            await tx.portalSeguroApoliceSubestipulante.createMany({
              data: body.subestipulantes.map((r, i) => ({
                apoliceId: id,
                sortOrder: i,
                razaoSocial: r.razaoSocial.trim(),
                cnpj: r.cnpj.trim(),
                codigoSub: r.codigoSub.trim(),
                status: r.status,
              })),
            })
            data.subestipulante = body.subestipulantes[0].razaoSocial.trim()
          } else {
            data.subestipulante = null
          }
        }

        if (body.faturasMensais !== undefined) {
          await tx.portalSeguroApoliceFaturaMes.deleteMany({ where: { apoliceId: id } })
          if (body.faturasMensais.length > 0) {
            await tx.portalSeguroApoliceFaturaMes.createMany({
              data: body.faturasMensais.map((r) => ({
                apoliceId: id,
                competenciaAno: r.competenciaAno,
                competenciaMes: r.competenciaMes,
                vidas: r.vidas,
                valorFatura: r.valorFatura,
                observacoes: r.observacoes?.trim() || null,
              })),
            })
          }
        }

        return tx.portalSeguroApolice.update({ where: { id }, data })
      })
      return reply.send({ apolice: row })
    } catch {
      return reply.code(400).send({ error: 'Não foi possível atualizar (número duplicado?).' })
    }
  })

  /** Modelo Plano (várias linhas, faixas etárias) vs Cobertura — página dedicada no portal. */
  app.get('/seguros/apolices/:id/dados-seguro', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    const ap = await prisma.portalSeguroApolice.findUnique({
      where: { id },
      select: {
        id: true,
        numeroApolice: true,
        produto: true,
        modeloDadosSeguro: true,
        plano: true,
        coberturas: true,
        planoLinhas: { orderBy: [{ sortOrder: 'asc' }, { codigoPlano: 'asc' }] },
      },
    })
    if (!ap) return reply.code(404).send({ error: 'Apólice não encontrada' })

    const planoLinhas = ap.planoLinhas.map((r) => ({
      id: r.id,
      sortOrder: r.sortOrder,
      codigoPlano: r.codigoPlano,
      tipoCusto: r.tipoCusto,
      custoMedio: r.custoMedio != null ? Number(r.custoMedio) : null,
      valoresPorFaixa: (r.valoresPorFaixa as Record<string, number | null> | null) ?? null,
    }))

    return reply.send({
      apolice: {
        id: ap.id,
        numeroApolice: ap.numeroApolice,
        produto: ap.produto,
        modeloDadosSeguro: ap.modeloDadosSeguro,
        plano: ap.plano,
        coberturas: ap.coberturas,
        planoLinhas,
      },
    })
  })

  app.put('/seguros/apolices/:id/dados-seguro', async (req, reply) => {
    const u = await requirePortalUser(req, reply)
    if (!u) return
    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return

    const id = (req.params as { id?: string }).id
    if (!id || !uuid.safeParse(id).success) return reply.code(400).send({ error: 'ID inválido' })

    let body: z.infer<typeof putApoliceDadosSeguroSchema>
    try {
      body = putApoliceDadosSeguroSchema.parse(req.body)
    } catch (e) {
      if (e instanceof z.ZodError) return reply.code(400).send({ error: e.issues[0]?.message || 'Dados inválidos' })
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const exists = await prisma.portalSeguroApolice.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return reply.code(404).send({ error: 'Apólice não encontrada' })

    const planoResumo =
      body.modeloDadosSeguro === PortalApoliceModeloDadosSeguro.PLANO
        ? body.planoLinhas.map((p) => p.codigoPlano.trim()).filter(Boolean).join(', ') || null
        : null

    try {
      await prisma.$transaction(async (tx) => {
        await tx.portalSeguroApolicePlanoLinha.deleteMany({ where: { apoliceId: id } })
        if (body.modeloDadosSeguro === PortalApoliceModeloDadosSeguro.PLANO && body.planoLinhas.length > 0) {
          await tx.portalSeguroApolicePlanoLinha.createMany({
            data: body.planoLinhas.map((row, i) => {
              const custoMedio =
                row.tipoCusto === PortalApoliceTipoCustoPlano.CUSTO_MEDIO ? row.custoMedio! : null
              return {
                apoliceId: id,
                sortOrder: i,
                codigoPlano: row.codigoPlano.trim(),
                tipoCusto: row.tipoCusto,
                custoMedio,
                valoresPorFaixa:
                  row.tipoCusto === PortalApoliceTipoCustoPlano.FAIXA_ETARIA
                    ? (normalizarValoresPorFaixa(row.valoresPorFaixa ?? {}) as Prisma.InputJsonValue)
                    : Prisma.DbNull,
              }
            }),
          })
        }
        await tx.portalSeguroApolice.update({
          where: { id },
          data: {
            modeloDadosSeguro: body.modeloDadosSeguro,
            ...(body.modeloDadosSeguro === PortalApoliceModeloDadosSeguro.PLANO
              ? { plano: planoResumo }
              : {}),
          },
        })
      })

      const ap = await prisma.portalSeguroApolice.findUnique({
        where: { id },
        select: {
          id: true,
          numeroApolice: true,
          produto: true,
          modeloDadosSeguro: true,
          plano: true,
          coberturas: true,
          planoLinhas: { orderBy: [{ sortOrder: 'asc' }, { codigoPlano: 'asc' }] },
        },
      })
      if (!ap) return reply.code(404).send({ error: 'Apólice não encontrada' })

      const planoLinhasOut = ap.planoLinhas.map((r) => ({
        id: r.id,
        sortOrder: r.sortOrder,
        codigoPlano: r.codigoPlano,
        tipoCusto: r.tipoCusto,
        custoMedio: r.custoMedio != null ? Number(r.custoMedio) : null,
        valoresPorFaixa: (r.valoresPorFaixa as Record<string, number | null> | null) ?? null,
      }))

      return reply.send({
        apolice: {
          id: ap.id,
          numeroApolice: ap.numeroApolice,
          produto: ap.produto,
          modeloDadosSeguro: ap.modeloDadosSeguro,
          plano: ap.plano,
          coberturas: ap.coberturas,
          planoLinhas: planoLinhasOut,
        },
      })
    } catch {
      return reply.code(400).send({ error: 'Não foi possível guardar os dados do seguro.' })
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
