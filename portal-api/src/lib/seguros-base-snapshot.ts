/**
 * Backup / restauração da base cadastral de seguros (grupos, estipulantes, apólices, itens).
 * JSON versionado + validação com erros bloqueantes e avisos de inconsistência.
 */
import {
  PortalApoliceProduto,
  PortalApoliceTipoCustoPlano,
  PortalGrupoEconomicoClassificacao,
  PortalSeguroConeRegiao,
  PortalSeguroItemTipo,
  PortalSubestipulanteStatus,
  Prisma,
} from '@prisma/client'
import { z } from 'zod'
import { normalizarValoresPorFaixa } from './apolice-planos-faixas.js'
import { operadoraNomePorId, parseOperadorasFromSnapshotRows } from './nexus-operadoras.js'
import { prisma } from './prisma.js'

export const SEGUROS_BASE_SNAPSHOT_VERSION = 2 as const

const uuid = z.string().uuid()

function normCnpjDigits(s: string) {
  return (s || '').replace(/\D/g, '')
}

function normGrupoNome(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Célula vazia ou «—» na planilha = não sobrescrever o valor já gravado na base (atualizações). */
export function importCellEmpty(s: string | null | undefined): boolean {
  if (s == null) return true
  const t = String(s).trim()
  return t === '' || t === '—'
}

function mergeImportOptionalString(inc: string | null | undefined, db: string | null | undefined): string | null {
  if (!importCellEmpty(inc)) return (inc ?? '').trim() || null
  return db ?? null
}

function mergeImportFornecedor(inc: string | null | undefined, db: string | null | undefined): string {
  if (!importCellEmpty(inc)) {
    const x = (inc ?? '').trim()
    if (x && x !== '—') return x
  }
  const d = (db ?? '').trim()
  return d || '—'
}

function mergeImportDate(inc: Date | null | undefined, db: Date | null | undefined): Date | null {
  if (inc != null && !Number.isNaN(new Date(inc).getTime())) return inc
  return db ?? null
}

function parcelasToDbJson(arr: number[] | null | undefined): string | null {
  if (arr == null) return null
  return JSON.stringify(arr)
}

function parseParcelas12Snapshot(s: string | null | undefined): number[] | null {
  if (s == null || String(s).trim() === '') return null
  try {
    const j = JSON.parse(String(s)) as unknown
    if (!Array.isArray(j) || j.length !== 12) return null
    return j.map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0))
  } catch {
    return null
  }
}

const produtoSchema = z.nativeEnum(PortalApoliceProduto)
const itemTipoSchema = z.nativeEnum(PortalSeguroItemTipo)

const dateish = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null || v === '') return null
    const d = new Date(v as string)
    return Number.isNaN(d.getTime()) ? null : d
  })

const grupoRowSchema = z.object({
  id: uuid,
  nome: z.string().min(1).max(500),
  cnpj: z.string().max(30).nullable().optional(),
  observacoes: z.string().max(8000).nullable().optional(),
  classificacao: z
    .nativeEnum(PortalGrupoEconomicoClassificacao)
    .optional()
    .default(PortalGrupoEconomicoClassificacao.CLIENTE),
  active: z.boolean().optional().default(true),
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

const estipulanteRowSchema = z.object({
  id: uuid,
  grupoEconomicoId: uuid.nullable().optional(),
  grupoEconomicoNome: z.string().max(500),
  nexusClienteId: z.string().max(120).nullable().optional(),
  razaoSocial: z.string().min(1).max(500),
  cnpj: z.string().min(1).max(30),
  cnae: z.string().max(50).nullable().optional(),
  nomeFantasia: z.string().max(500).nullable().optional(),
  observacoes: z.string().max(8000).nullable().optional(),
  active: z.boolean().optional().default(true),
  importadoNexusEm: dateish.optional(),
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

const subStatusSchema = z.nativeEnum(PortalSubestipulanteStatus)
const coneSnap = z.nativeEnum(PortalSeguroConeRegiao)
const parcelas12Snap = z.array(z.number()).length(12).nullable().optional()

const operadoraRowSchema = z.object({
  id: z.string().min(1).max(200),
  nome: z.string().min(1).max(500),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(99999).optional().default(0),
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

const tipoCustoPlanoSchema = z.nativeEnum(PortalApoliceTipoCustoPlano)

const apolicePlanoLinhaRowSchema = z.object({
  id: uuid,
  apoliceId: uuid,
  sortOrder: z.number().int().min(0).max(99999).optional().default(0),
  codigoPlano: z.string().min(1).max(200),
  tipoCusto: tipoCustoPlanoSchema,
  custoMedio: z.number().nonnegative().nullable().optional(),
  valoresPorFaixa: z.record(z.string(), z.number().nullable()).nullable().optional(),
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

const apoliceRowSchema = z.object({
  id: uuid,
  estipulanteId: uuid,
  nexusContratoId: z.string().max(120).nullable().optional(),
  numeroApolice: z.string().max(120),
  produto: produtoSchema,
  operadoraId: z.string().min(1).max(200).nullable().optional(),
  /** Mantido para compatibilidade de export; em novas linhas use operadoraId (catálogo). */
  fornecedor: z.string().max(500).optional().default(''),
  subestipulante: z.string().max(500).nullable().optional(),
  plano: z.string().max(2000).nullable().optional(),
  coberturas: z.string().max(8000).nullable().optional(),
  vigenciaInicio: dateish,
  vigenciaFim: dateish,
  observacoes: z.string().max(8000).nullable().optional(),
  active: z.boolean().optional().default(true),
  importadoNexusEm: dateish.optional(),
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
  trCone: coneSnap.nullable().optional(),
  trDiretoria: z.string().max(500).nullable().optional(),
  trSuperintendente: z.string().max(500).nullable().optional(),
  trGerente: z.string().max(500).nullable().optional(),
  trExecutivoConsultor: z.string().max(500).nullable().optional(),
  trAnalista: z.string().max(500).nullable().optional(),
})

const apoliceComissionamentoRowSchema = z.object({
  id: uuid,
  apoliceId: uuid,
  temCorretorParceiro: z.boolean().nullable().optional(),
  valorAgenciamentoContrato: z.number().nullable().optional(),
  valorVitalicioContrato: z.number().nullable().optional(),
  agenciamentoConsultoria: parcelas12Snap,
  vitalicioConsultoria: parcelas12Snap,
  agenciamentoCorretor: parcelas12Snap,
  vitalicioCorretor: parcelas12Snap,
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

const apoliceFeeRowSchema = z.object({
  id: uuid,
  apoliceId: uuid,
  valorFeeMensal: z.number().nullable().optional(),
  feeConsultoria: z.number().nullable().optional(),
  feeCorretorParceiro: z.number().nullable().optional(),
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

const apoliceFaturaRowSchema = z.object({
  id: uuid,
  apoliceId: uuid,
  competenciaAno: z.number().int().min(1990).max(2100),
  competenciaMes: z.number().int().min(1).max(12),
  vidas: z.number().int().min(0).max(50_000_000).optional().default(0),
  valorFatura: z.number().nonnegative(),
  observacoes: z.string().max(500).nullable().optional(),
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

const apoliceSubestipulanteRowSchema = z.object({
  id: uuid,
  apoliceId: uuid,
  sortOrder: z.number().int().min(0).max(99999).optional().default(0),
  razaoSocial: z.string().min(1).max(500),
  cnpj: z.string().max(20),
  codigoSub: z.string().max(120),
  status: subStatusSchema,
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

const itemRowSchema = z.object({
  id: uuid,
  apoliceId: uuid,
  tipo: itemTipoSchema,
  descricao: z.string().min(1).max(500),
  detalhes: z.string().max(4000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(99999).optional().default(0),
  active: z.boolean().optional().default(true),
  createdAt: dateish.optional(),
  updatedAt: dateish.optional(),
})

export const segurosBaseSnapshotBodySchema = z.object({
  schemaVersion: z.literal(SEGUROS_BASE_SNAPSHOT_VERSION),
  exportedAt: z.string().optional(),
  grupos: z.array(grupoRowSchema),
  estipulantes: z.array(estipulanteRowSchema),
  operadoras: z.array(operadoraRowSchema).optional().default([]),
  apolices: z.array(apoliceRowSchema),
  apoliceSubestipulantes: z.array(apoliceSubestipulanteRowSchema).optional().default([]),
  apoliceFaturasMensais: z.array(apoliceFaturaRowSchema).optional().default([]),
  apoliceComissionamentos: z.array(apoliceComissionamentoRowSchema).optional().default([]),
  apoliceFees: z.array(apoliceFeeRowSchema).optional().default([]),
  /** Vários planos estruturados por apólice (código + custo médio ou faixas etárias). */
  apolicePlanoLinhas: z.array(apolicePlanoLinhaRowSchema).optional().default([]),
  itens: z.array(itemRowSchema),
})

export type SegurosBaseSnapshotParsed = z.infer<typeof segurosBaseSnapshotBodySchema>

export type SegurosBaseIssue = {
  severity: 'error' | 'warning'
  code: string
  message: string
  /** Caminho legível (ex.: apolices[2].estipulanteId) */
  path?: string
  /** Identificadores úteis para correção */
  ids?: string[]
}

export type SegurosBaseImportStats = {
  grupos: { create: number; update: number }
  estipulantes: { create: number; update: number }
  operadoras: { create: number; update: number }
  apolices: { create: number; update: number }
  apoliceSubestipulantes: { create: number; update: number }
  apoliceFaturasMensais: { create: number; update: number }
  apoliceComissionamentos: { create: number; update: number }
  apoliceFees: { create: number; update: number }
  /** Linhas de plano gravadas após substituição por apólice (só apólices presentes em apolicePlanoLinhas). */
  apolicePlanoLinhas: { rows: number }
  itens: { create: number; update: number }
}

export async function buildSegurosBaseSnapshot(): Promise<SegurosBaseSnapshotParsed> {
  const [
    grupos,
    estipulantes,
    snapshotOperadoras,
    apolices,
    apoliceSubestipulantes,
    apoliceFaturasMensais,
    apoliceComissionamentos,
    apoliceFees,
    itens,
    apolicePlanoLinhasDb,
  ] = await Promise.all([
    prisma.portalGrupoEconomico.findMany({ orderBy: { nome: 'asc' } }),
    prisma.portalSeguroEstipulante.findMany({ orderBy: [{ grupoEconomicoNome: 'asc' }, { razaoSocial: 'asc' }] }),
    prisma.portalNexusEntitySnapshot.findUnique({ where: { entityKey: 'operadoras' } }),
    prisma.portalSeguroApolice.findMany({ orderBy: [{ estipulanteId: 'asc' }, { numeroApolice: 'asc' }] }),
    prisma.portalSeguroApoliceSubestipulante.findMany({
      orderBy: [{ apoliceId: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.portalSeguroApoliceFaturaMes.findMany({
      orderBy: [{ apoliceId: 'asc' }, { competenciaAno: 'asc' }, { competenciaMes: 'asc' }],
    }),
    prisma.portalSeguroApoliceComissionamento.findMany({ orderBy: { apoliceId: 'asc' } }),
    prisma.portalSeguroApoliceFee.findMany({ orderBy: { apoliceId: 'asc' } }),
    prisma.portalSeguroApoliceItem.findMany({ orderBy: [{ apoliceId: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.portalSeguroApolicePlanoLinha.findMany({
      orderBy: [{ apoliceId: 'asc' }, { sortOrder: 'asc' }, { codigoPlano: 'asc' }],
    }),
  ])

  return {
    schemaVersion: SEGUROS_BASE_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    grupos: grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      cnpj: g.cnpj,
      observacoes: g.observacoes,
      classificacao: g.classificacao,
      active: g.active,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    })),
    estipulantes: estipulantes.map((e) => ({
      id: e.id,
      grupoEconomicoId: e.grupoEconomicoId,
      grupoEconomicoNome: e.grupoEconomicoNome,
      nexusClienteId: e.nexusClienteId,
      razaoSocial: e.razaoSocial,
      cnpj: e.cnpj,
      cnae: e.cnae,
      nomeFantasia: e.nomeFantasia,
      observacoes: e.observacoes,
      active: e.active,
      importadoNexusEm: e.importadoNexusEm,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    })),
    operadoras: (() => {
      const rows = snapshotOperadoras?.rows
      const parsed = rows ? parseOperadorasFromSnapshotRows(rows) : []
      return parsed.map((o, i) => ({
        id: o.id,
        nome: o.nome,
        active: true,
        sortOrder: i,
      }))
    })(),
    apolices: apolices.map((a) => ({
      id: a.id,
      estipulanteId: a.estipulanteId,
      nexusContratoId: a.nexusContratoId,
      numeroApolice: a.numeroApolice,
      produto: a.produto,
      operadoraId: a.operadoraId,
      fornecedor: a.fornecedor,
      subestipulante: a.subestipulante,
      plano: a.plano,
      coberturas: a.coberturas,
      vigenciaInicio: a.vigenciaInicio,
      vigenciaFim: a.vigenciaFim,
      observacoes: a.observacoes,
      active: a.active,
      importadoNexusEm: a.importadoNexusEm,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      trCone: a.trCone,
      trDiretoria: a.trDiretoria,
      trSuperintendente: a.trSuperintendente,
      trGerente: a.trGerente,
      trExecutivoConsultor: a.trExecutivoConsultor,
      trAnalista: a.trAnalista,
    })),
    apoliceSubestipulantes: apoliceSubestipulantes.map((s) => ({
      id: s.id,
      apoliceId: s.apoliceId,
      sortOrder: s.sortOrder,
      razaoSocial: s.razaoSocial,
      cnpj: s.cnpj,
      codigoSub: s.codigoSub,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    apoliceFaturasMensais: apoliceFaturasMensais.map((f) => ({
      id: f.id,
      apoliceId: f.apoliceId,
      competenciaAno: f.competenciaAno,
      competenciaMes: f.competenciaMes,
      vidas: f.vidas,
      valorFatura: Number(f.valorFatura),
      observacoes: f.observacoes,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    })),
    apoliceComissionamentos: apoliceComissionamentos.map((c) => ({
      id: c.id,
      apoliceId: c.apoliceId,
      temCorretorParceiro: c.temCorretorParceiro,
      valorAgenciamentoContrato: c.valorAgenciamentoContrato != null ? Number(c.valorAgenciamentoContrato) : null,
      valorVitalicioContrato: c.valorVitalicioContrato != null ? Number(c.valorVitalicioContrato) : null,
      agenciamentoConsultoria: parseParcelas12Snapshot(c.agenciamentoConsultoria),
      vitalicioConsultoria: parseParcelas12Snapshot(c.vitalicioConsultoria),
      agenciamentoCorretor: parseParcelas12Snapshot(c.agenciamentoCorretor),
      vitalicioCorretor: parseParcelas12Snapshot(c.vitalicioCorretor),
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
    apoliceFees: apoliceFees.map((fee) => ({
      id: fee.id,
      apoliceId: fee.apoliceId,
      valorFeeMensal: fee.valorFeeMensal != null ? Number(fee.valorFeeMensal) : null,
      feeConsultoria: fee.feeConsultoria != null ? Number(fee.feeConsultoria) : null,
      feeCorretorParceiro: fee.feeCorretorParceiro != null ? Number(fee.feeCorretorParceiro) : null,
      createdAt: fee.createdAt,
      updatedAt: fee.updatedAt,
    })),
    apolicePlanoLinhas: apolicePlanoLinhasDb.map((r) => ({
      id: r.id,
      apoliceId: r.apoliceId,
      sortOrder: r.sortOrder,
      codigoPlano: r.codigoPlano,
      tipoCusto: r.tipoCusto,
      custoMedio: r.custoMedio != null ? Number(r.custoMedio) : null,
      valoresPorFaixa: (r.valoresPorFaixa as Record<string, number | null> | null) ?? null,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    itens: itens.map((i) => ({
      id: i.id,
      apoliceId: i.apoliceId,
      tipo: i.tipo,
      descricao: i.descricao,
      detalhes: i.detalhes,
      sortOrder: i.sortOrder,
      active: i.active,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
    })),
  }
}

function push(
  issues: SegurosBaseIssue[],
  severity: SegurosBaseIssue['severity'],
  code: string,
  message: string,
  path?: string,
  ids?: string[],
) {
  issues.push({ severity, code, message, path, ids })
}

function warnImportStrDiff(
  issues: SegurosBaseIssue[],
  codeComplement: string,
  codeConflict: string,
  entidade: string,
  campo: string,
  path: string,
  inc: string | null | undefined,
  db: string | null | undefined,
  ids: string[],
) {
  const incE = importCellEmpty(inc)
  const dbE = importCellEmpty(db)
  const iS = (inc ?? '').trim()
  const dS = (db ?? '').trim()
  if (dbE && !incE) {
    push(issues, 'warning', codeComplement, `${entidade} — campo «${campo}» vazio na base; a planilha preenche.`, path, ids)
  } else if (!dbE && !incE && iS !== dS) {
    push(
      issues,
      'warning',
      codeConflict,
      `${entidade} — «${campo}» na base difere da planilha. Ao gravar: célula vazia/«—» mantém a base; valor preenchido substitui.`,
      path,
      ids,
    )
  }
}

export async function analyzeSegurosBaseSnapshot(data: SegurosBaseSnapshotParsed): Promise<{
  issues: SegurosBaseIssue[]
  statsIfApplied: SegurosBaseImportStats
}> {
  const issues: SegurosBaseIssue[] = []

  const grupoIds = new Set(data.grupos.map((g) => g.id))
  const estIds = new Set(data.estipulantes.map((e) => e.id))
  const apIds = new Set(data.apolices.map((a) => a.id))
  const itemIds = new Set(data.itens.map((i) => i.id))

  const seenEst = new Map<string, string>()
  for (const e of data.estipulantes) {
    if (seenEst.has(e.id)) push(issues, 'error', 'duplicate_id', `ID de estipulante repetido no ficheiro: ${e.id}`, 'estipulantes')
    seenEst.set(e.id, e.id)
  }
  const seenAp = new Map<string, string>()
  for (const a of data.apolices) {
    if (seenAp.has(a.id)) push(issues, 'error', 'duplicate_id', `ID de apólice repetido no ficheiro: ${a.id}`, 'apolices')
    seenAp.set(a.id, a.id)
  }
  const seenIt = new Map<string, string>()
  for (const it of data.itens) {
    if (seenIt.has(it.id)) push(issues, 'error', 'duplicate_id', `ID de item repetido no ficheiro: ${it.id}`, 'itens')
    seenIt.set(it.id, it.id)
  }

  const opIds = new Set(data.operadoras.map((o) => o.id))
  const nexusOpSnap = await prisma.portalNexusEntitySnapshot.findUnique({
    where: { entityKey: 'operadoras' },
    select: { rows: true },
  })
  const nexusOperadoraIds = new Set(
    nexusOpSnap?.rows ? parseOperadorasFromSnapshotRows(nexusOpSnap.rows).map((x) => x.id) : [],
  )
  const seenOp = new Map<string, string>()
  for (const o of data.operadoras) {
    if (seenOp.has(o.id)) {
      push(issues, 'error', 'duplicate_id', `ID de operadora repetido no ficheiro: ${o.id}`, 'operadoras')
    }
    seenOp.set(o.id, o.id)
  }

  const estUniqKey = new Map<string, string>()
  for (let i = 0; i < data.estipulantes.length; i++) {
    const e = data.estipulantes[i]
    const kn = normGrupoNome(e.grupoEconomicoNome)
    const kc = normCnpjDigits(e.cnpj)
    if (!kn) {
      push(
        issues,
        'warning',
        'estipulante_grupo_vazio',
        `Estipulante «${e.razaoSocial}» tem grupo económico (nome Nexus) vazio — pode dificultar filtros e relatórios.`,
        `estipulantes[${i}].grupoEconomicoNome`,
        [e.id],
      )
    }
    if (kc.length < 8) {
      push(
        issues,
        'warning',
        'cnpj_curto',
        `CNPJ com poucos dígitos para «${e.razaoSocial}» (${e.cnpj}).`,
        `estipulantes[${i}].cnpj`,
        [e.id],
      )
    }
    const uq = `${kn}|${kc}`
    const prev = estUniqKey.get(uq)
    if (prev && prev !== e.id) {
      push(
        issues,
        'error',
        'duplicate_estipulante_natural_key',
        `Dois estipulantes no ficheiro partilham o par (grupo económico normalizado, CNPJ): conflito com índice único da base.`,
        `estipulantes[${i}]`,
        [prev, e.id],
      )
    } else estUniqKey.set(uq, e.id)

    if (e.grupoEconomicoId && !grupoIds.has(e.grupoEconomicoId)) {
      const gDb = await prisma.portalGrupoEconomico.findUnique({
        where: { id: e.grupoEconomicoId },
        select: { id: true, nome: true },
      })
      if (!gDb) {
        push(
          issues,
          'error',
          'fk_grupo_inexistente',
          `Estipulante «${e.razaoSocial}» referencia grupoEconomicoId=${e.grupoEconomicoId} que não está no snapshot nem na base.`,
          `estipulantes[${i}].grupoEconomicoId`,
          [e.id],
        )
      } else if (normGrupoNome(e.grupoEconomicoNome) && normGrupoNome(gDb.nome) !== normGrupoNome(e.grupoEconomicoNome)) {
        push(
          issues,
          'warning',
          'grupo_nome_desalinhado',
          `Estipulante «${e.razaoSocial}»: grupo local «${gDb.nome}» diferente do campo grupoEconomicoNome «${e.grupoEconomicoNome}».`,
          `estipulantes[${i}]`,
          [e.id, gDb.id],
        )
      }
    }
  }

  const apUniq = new Map<string, string>()
  for (let i = 0; i < data.apolices.length; i++) {
    const a = data.apolices[i]
    if (!estIds.has(a.estipulanteId)) {
      push(
        issues,
        'error',
        'fk_estipulante_inexistente',
        `Apólice ${a.numeroApolice || a.id} referencia estipulanteId que não existe no snapshot.`,
        `apolices[${i}].estipulanteId`,
        [a.id, a.estipulanteId],
      )
    }
    const num = (a.numeroApolice ?? '').trim()
    const nex = (a.nexusContratoId ?? '').trim()
    if (!num && !nex) {
      push(
        issues,
        'error',
        'apolice_sem_identificador',
        'Apólice sem número nem nexusContratoId — a base exige pelo menos um dos dois.',
        `apolices[${i}]`,
        [a.id],
      )
    }
    if (a.produto === PortalApoliceProduto.SAUDE || a.produto === PortalApoliceProduto.ODONTO) {
      if (!(a.plano ?? '').toString().trim()) {
        push(issues, 'warning', 'plano_obrigatorio_produto', 'Saúde/Odonto costuma exigir plano preenchido.', `apolices[${i}].plano`, [a.id])
      }
    }
    if (a.produto === PortalApoliceProduto.VIDA_GRUPO) {
      if (!(a.coberturas ?? '').toString().trim()) {
        push(issues, 'warning', 'coberturas_obrigatorio_produto', 'Vida em grupo costuma exigir coberturas preenchidas.', `apolices[${i}].coberturas`, [
          a.id,
        ])
      }
    }
    const vi = a.vigenciaInicio
    const vf = a.vigenciaFim
    if (vi && vf && vi.getTime() > vf.getTime()) {
      push(
        issues,
        'warning',
        'vigencia_invertida',
        `Vigência: fim anterior ao início (apólice ${num || a.id}).`,
        `apolices[${i}].vigenciaFim`,
        [a.id],
      )
    }

    const opIdNorm = (a.operadoraId ?? '').toString().trim()
    if (!opIdNorm) {
      push(
        issues,
        'error',
        'apolice_sem_operadora',
        `Apólice «${num || a.id}» sem operadoraId — use o id da operadora no Nexus (snapshot sincronizado em Banco de dados) ou inclua a linha na folha «operadoras».`,
        `apolices[${i}].operadoraId`,
        [a.id],
      )
    }

    if (opIdNorm && !opIds.has(opIdNorm) && !nexusOperadoraIds.has(opIdNorm)) {
      push(
        issues,
        'error',
        'fk_operadora_snapshot',
        `Apólice «${num || a.id}» referencia operadoraId que não existe no snapshot Nexus «operadoras» nem na folha «operadoras» do ficheiro — sincronize o Nexus ou corrija o id.`,
        `apolices[${i}].operadoraId`,
        [a.id, opIdNorm],
      )
    }

    if (num && estIds.has(a.estipulanteId)) {
      const uk = `${a.estipulanteId}|${num}`
      const prevA = apUniq.get(uk)
      if (prevA && prevA !== a.id) {
        push(
          issues,
          'error',
          'duplicate_apolice_natural_key',
          `Duas apólices no ficheiro com o mesmo estipulante e número «${num}».`,
          `apolices[${i}]`,
          [prevA, a.id],
        )
      } else apUniq.set(uk, a.id)
    }
  }

  const seenSub = new Map<string, string>()
  for (let i = 0; i < data.apoliceSubestipulantes.length; i++) {
    const s = data.apoliceSubestipulantes[i]
    if (seenSub.has(s.id)) {
      push(
        issues,
        'error',
        'duplicate_id',
        `ID de subestipulante repetido no ficheiro: ${s.id}`,
        `apoliceSubestipulantes[${i}]`,
      )
    }
    seenSub.set(s.id, s.id)
    if (!apIds.has(s.apoliceId)) {
      push(
        issues,
        'error',
        'fk_apolice_sub',
        'Subestipulante referencia apoliceId inexistente no snapshot.',
        `apoliceSubestipulantes[${i}].apoliceId`,
        [s.id, s.apoliceId],
      )
    }
  }

  const seenFat = new Map<string, string>()
  const fatNat = new Map<string, string>()
  for (let i = 0; i < data.apoliceFaturasMensais.length; i++) {
    const f = data.apoliceFaturasMensais[i]
    if (seenFat.has(f.id)) {
      push(
        issues,
        'error',
        'duplicate_id',
        `ID de fatura (mês) repetido no ficheiro: ${f.id}`,
        `apoliceFaturasMensais[${i}]`,
      )
    }
    seenFat.set(f.id, f.id)
    if (!apIds.has(f.apoliceId)) {
      push(
        issues,
        'error',
        'fk_apolice_fatura',
        'Linha de fatura mensal referencia apoliceId inexistente no snapshot.',
        `apoliceFaturasMensais[${i}].apoliceId`,
        [f.id, f.apoliceId],
      )
    }
    const kn = `${f.apoliceId}|${f.competenciaAno}|${f.competenciaMes}`
    const prevF = fatNat.get(kn)
    if (prevF && prevF !== f.id) {
      push(
        issues,
        'error',
        'duplicate_fatura_competencia',
        `Duas linhas no ficheiro para a mesma apólice e competência ${f.competenciaMes}/${f.competenciaAno}.`,
        `apoliceFaturasMensais[${i}]`,
        [prevF, f.id],
      )
    } else fatNat.set(kn, f.id)
  }

  const seenComId = new Map<string, string>()
  const comPorApolice = new Map<string, string>()
  for (let i = 0; i < data.apoliceComissionamentos.length; i++) {
    const c = data.apoliceComissionamentos[i]
    const prevId = seenComId.get(c.id)
    if (prevId) {
      push(
        issues,
        'error',
        'duplicate_id',
        `ID de comissionamento de apólice repetido no ficheiro: ${c.id}`,
        `apoliceComissionamentos[${i}]`,
      )
    }
    seenComId.set(c.id, c.id)
    if (!apIds.has(c.apoliceId)) {
      push(
        issues,
        'error',
        'fk_apolice_comissionamento',
        'Comissionamento referencia apoliceId inexistente no snapshot.',
        `apoliceComissionamentos[${i}].apoliceId`,
        [c.id, c.apoliceId],
      )
    }
    const prevAp = comPorApolice.get(c.apoliceId)
    if (prevAp && prevAp !== c.id) {
      push(
        issues,
        'error',
        'duplicate_comissionamento_apolice',
        `Mais de um comissionamento no ficheiro para a mesma apólice (${c.apoliceId}).`,
        `apoliceComissionamentos[${i}]`,
        [prevAp, c.id],
      )
    } else comPorApolice.set(c.apoliceId, c.id)
  }

  const seenFeeId = new Map<string, string>()
  const feePorApolice = new Map<string, string>()
  for (let i = 0; i < data.apoliceFees.length; i++) {
    const f = data.apoliceFees[i]
    if (seenFeeId.has(f.id)) {
      push(
        issues,
        'error',
        'duplicate_id',
        `ID de fee de apólice repetido no ficheiro: ${f.id}`,
        `apoliceFees[${i}]`,
      )
    }
    seenFeeId.set(f.id, f.id)
    if (!apIds.has(f.apoliceId)) {
      push(
        issues,
        'error',
        'fk_apolice_fee',
        'Fee referencia apoliceId inexistente no snapshot.',
        `apoliceFees[${i}].apoliceId`,
        [f.id, f.apoliceId],
      )
    }
    const prevAp = feePorApolice.get(f.apoliceId)
    if (prevAp && prevAp !== f.id) {
      push(
        issues,
        'error',
        'duplicate_fee_apolice',
        `Mais de um fee no ficheiro para a mesma apólice (${f.apoliceId}).`,
        `apoliceFees[${i}]`,
        [prevAp, f.id],
      )
    } else feePorApolice.set(f.apoliceId, f.id)
  }

  const seenPlano = new Map<string, string>()
  for (let i = 0; i < data.apolicePlanoLinhas.length; i++) {
    const p = data.apolicePlanoLinhas[i]
    if (seenPlano.has(p.id)) {
      push(
        issues,
        'error',
        'duplicate_id',
        `ID de linha de plano repetido no ficheiro: ${p.id}`,
        `apolicePlanoLinhas[${i}]`,
      )
    }
    seenPlano.set(p.id, p.id)
    if (!apIds.has(p.apoliceId)) {
      push(
        issues,
        'error',
        'fk_apolice_plano',
        'Linha de plano referencia apoliceId inexistente no snapshot.',
        `apolicePlanoLinhas[${i}].apoliceId`,
        [p.id, p.apoliceId],
      )
    }
    if (p.tipoCusto === PortalApoliceTipoCustoPlano.CUSTO_MEDIO) {
      const v = p.custoMedio
      if (v == null || !Number.isFinite(v)) {
        push(
          issues,
          'error',
          'plano_custo_medio_invalido',
          `Plano «${p.codigoPlano}»: indique custoMedio numérico quando tipoCusto=CUSTO_MEDIO.`,
          `apolicePlanoLinhas[${i}].custoMedio`,
          [p.id, p.apoliceId],
        )
      }
    } else {
      const norm = normalizarValoresPorFaixa(p.valoresPorFaixa ?? {})
      if (!norm) {
        push(
          issues,
          'error',
          'plano_faixas_invalidas',
          `Plano «${p.codigoPlano}» (FAIXA_ETARIA): coluna valoresPorFaixa deve ser JSON com as chaves de faixa etária esperadas.`,
          `apolicePlanoLinhas[${i}].valoresPorFaixa`,
          [p.id, p.apoliceId],
        )
      } else if (!Object.values(norm).some((x) => x != null)) {
        push(
          issues,
          'error',
          'plano_faixas_vazias',
          `Plano «${p.codigoPlano}» (FAIXA_ETARIA): preencha pelo menos uma faixa com valor.`,
          `apolicePlanoLinhas[${i}].valoresPorFaixa`,
          [p.id, p.apoliceId],
        )
      }
    }
  }

  for (let i = 0; i < data.itens.length; i++) {
    const it = data.itens[i]
    if (!apIds.has(it.apoliceId)) {
      push(
        issues,
        'error',
        'fk_apolice_inexistente',
        'Item de apólice referencia apoliceId que não existe no snapshot.',
        `itens[${i}].apoliceId`,
        [it.id, it.apoliceId],
      )
    }
  }

  const existingGrupos = await prisma.portalGrupoEconomico.findMany({ select: { id: true } })
  const existingGrupoSet = new Set(existingGrupos.map((g) => g.id))

  const existingEst = await prisma.portalSeguroEstipulante.findMany({
    select: { id: true, grupoEconomicoNome: true, cnpj: true },
  })
  const naturalEstDb = new Map<string, string>()
  for (const r of existingEst) {
    naturalEstDb.set(`${normGrupoNome(r.grupoEconomicoNome)}|${normCnpjDigits(r.cnpj)}`, r.id)
  }

  for (let i = 0; i < data.estipulantes.length; i++) {
    const e = data.estipulantes[i]
    const nk = `${normGrupoNome(e.grupoEconomicoNome)}|${normCnpjDigits(e.cnpj)}`
    const dbId = naturalEstDb.get(nk)
    if (dbId && dbId !== e.id) {
      push(
        issues,
        'error',
        'uniq_estipulante_colide_bd',
        `Estipulante no ficheiro (id ${e.id}) colide com outro registo na base (id ${dbId}) pelo par grupo+CNPJ. Corrija IDs ou funda manualmente.`,
        `estipulantes[${i}]`,
        [e.id, dbId],
      )
    }
  }

  const existingAp = await prisma.portalSeguroApolice.findMany({
    select: { id: true, estipulanteId: true, numeroApolice: true },
  })
  const naturalApDb = new Map<string, string>()
  for (const r of existingAp) {
    naturalApDb.set(`${r.estipulanteId}|${r.numeroApolice.trim()}`, r.id)
  }

  for (let i = 0; i < data.apolices.length; i++) {
    const a = data.apolices[i]
    const num = (a.numeroApolice ?? '').trim()
    if (!num) continue
    const uk = `${a.estipulanteId}|${num}`
    const dbId = naturalApDb.get(uk)
    if (dbId && dbId !== a.id) {
      push(
        issues,
        'error',
        'uniq_apolice_colide_bd',
        `Apólice «${num}» no ficheiro (id ${a.id}) colide com outra na base (id ${dbId}) para o mesmo estipulante.`,
        `apolices[${i}]`,
        [a.id, dbId],
      )
    }
  }

  const existingEstIdSet = new Set(existingEst.map((e) => e.id))

  const mergeGrupoIds = data.grupos.filter((g) => existingGrupoSet.has(g.id)).map((g) => g.id)
  if (mergeGrupoIds.length > 0) {
    const rows = await prisma.portalGrupoEconomico.findMany({ where: { id: { in: mergeGrupoIds } } })
    const byId = new Map(rows.map((r) => [r.id, r]))
    for (let i = 0; i < data.grupos.length; i++) {
      const g = data.grupos[i]
      const ex = byId.get(g.id)
      if (!ex) continue
      const ent = `Grupo «${g.nome}» (${g.id})`
      warnImportStrDiff(issues, 'import_merge_grupo', 'import_conflict_grupo', ent, 'CNPJ', `grupos[${i}].cnpj`, g.cnpj, ex.cnpj, [g.id])
      warnImportStrDiff(
        issues,
        'import_merge_grupo',
        'import_conflict_grupo',
        ent,
        'observações',
        `grupos[${i}].observacoes`,
        g.observacoes,
        ex.observacoes,
        [g.id],
      )
    }
  }

  const estMergeIds = data.estipulantes.filter((e) => existingEstIdSet.has(e.id)).map((e) => e.id)
  if (estMergeIds.length > 0) {
    const rows = await prisma.portalSeguroEstipulante.findMany({ where: { id: { in: estMergeIds } } })
    const byId = new Map(rows.map((r) => [r.id, r]))
    for (let i = 0; i < data.estipulantes.length; i++) {
      const e = data.estipulantes[i]
      const ex = byId.get(e.id)
      if (!ex) continue
      const ent = `Estipulante «${e.razaoSocial}» (${e.id})`
      warnImportStrDiff(issues, 'import_merge_est', 'import_conflict_est', ent, 'CNAE', `estipulantes[${i}].cnae`, e.cnae, ex.cnae, [e.id])
      warnImportStrDiff(
        issues,
        'import_merge_est',
        'import_conflict_est',
        ent,
        'nome fantasia',
        `estipulantes[${i}].nomeFantasia`,
        e.nomeFantasia,
        ex.nomeFantasia,
        [e.id],
      )
      warnImportStrDiff(
        issues,
        'import_merge_est',
        'import_conflict_est',
        ent,
        'observações',
        `estipulantes[${i}].observacoes`,
        e.observacoes,
        ex.observacoes,
        [e.id],
      )
      warnImportStrDiff(
        issues,
        'import_merge_est',
        'import_conflict_est',
        ent,
        'grupo económico (nome Nexus)',
        `estipulantes[${i}].grupoEconomicoNome`,
        e.grupoEconomicoNome,
        ex.grupoEconomicoNome,
        [e.id],
      )
    }
  }

  const existingApIdSet = new Set(existingAp.map((a) => a.id))
  const apMergeIds = data.apolices.filter((a) => existingApIdSet.has(a.id)).map((a) => a.id)
  if (apMergeIds.length > 0) {
    const rows = await prisma.portalSeguroApolice.findMany({ where: { id: { in: apMergeIds } } })
    const byId = new Map(rows.map((r) => [r.id, r]))
    for (let i = 0; i < data.apolices.length; i++) {
      const a = data.apolices[i]
      const ex = byId.get(a.id)
      if (!ex) continue
      const ent = `Apólice «${(a.numeroApolice ?? '').trim() || a.id}» (${a.id})`
      warnImportStrDiff(
        issues,
        'import_merge_apolice',
        'import_conflict_apolice',
        ent,
        'subestipulante (resumo)',
        `apolices[${i}].subestipulante`,
        a.subestipulante,
        ex.subestipulante,
        [a.id],
      )
      warnImportStrDiff(issues, 'import_merge_apolice', 'import_conflict_apolice', ent, 'plano', `apolices[${i}].plano`, a.plano, ex.plano, [a.id])
      warnImportStrDiff(
        issues,
        'import_merge_apolice',
        'import_conflict_apolice',
        ent,
        'coberturas',
        `apolices[${i}].coberturas`,
        a.coberturas,
        ex.coberturas,
        [a.id],
      )
      warnImportStrDiff(
        issues,
        'import_merge_apolice',
        'import_conflict_apolice',
        ent,
        'observações',
        `apolices[${i}].observacoes`,
        a.observacoes,
        ex.observacoes,
        [a.id],
      )
      warnImportStrDiff(
        issues,
        'import_merge_apolice',
        'import_conflict_apolice',
        ent,
        'ID contrato Nexus',
        `apolices[${i}].nexusContratoId`,
        a.nexusContratoId,
        ex.nexusContratoId,
        [a.id],
      )
    }
  }

  const statsIfApplied: SegurosBaseImportStats = {
    grupos: { create: 0, update: 0 },
    estipulantes: { create: 0, update: 0 },
    operadoras: { create: 0, update: 0 },
    apolices: { create: 0, update: 0 },
    apoliceSubestipulantes: { create: 0, update: 0 },
    apoliceFaturasMensais: { create: 0, update: 0 },
    apoliceComissionamentos: { create: 0, update: 0 },
    apoliceFees: { create: 0, update: 0 },
    apolicePlanoLinhas: { rows: data.apolicePlanoLinhas.length },
    itens: { create: 0, update: 0 },
  }

  for (const g of data.grupos) {
    if (existingGrupoSet.has(g.id)) statsIfApplied.grupos.update++
    else statsIfApplied.grupos.create++
  }

  for (const e of data.estipulantes) {
    if (existingEstIdSet.has(e.id)) statsIfApplied.estipulantes.update++
    else statsIfApplied.estipulantes.create++
  }

  for (const a of data.apolices) {
    if (existingApIdSet.has(a.id)) statsIfApplied.apolices.update++
    else statsIfApplied.apolices.create++
  }

  const existingSub = await prisma.portalSeguroApoliceSubestipulante.findMany({ select: { id: true } })
  const existingSubSet = new Set(existingSub.map((x) => x.id))
  for (const s of data.apoliceSubestipulantes) {
    if (existingSubSet.has(s.id)) statsIfApplied.apoliceSubestipulantes.update++
    else statsIfApplied.apoliceSubestipulantes.create++
  }

  const existingIt = await prisma.portalSeguroApoliceItem.findMany({ select: { id: true } })
  const existingItSet = new Set(existingIt.map((x) => x.id))
  for (const it of data.itens) {
    if (existingItSet.has(it.id)) statsIfApplied.itens.update++
    else statsIfApplied.itens.create++
  }

  const existingFat = await prisma.portalSeguroApoliceFaturaMes.findMany({ select: { id: true } })
  const existingFatSet = new Set(existingFat.map((x) => x.id))
  for (const f of data.apoliceFaturasMensais) {
    if (existingFatSet.has(f.id)) statsIfApplied.apoliceFaturasMensais.update++
    else statsIfApplied.apoliceFaturasMensais.create++
  }

  const existingCom = await prisma.portalSeguroApoliceComissionamento.findMany({ select: { id: true } })
  const existingComSet = new Set(existingCom.map((x) => x.id))
  for (const c of data.apoliceComissionamentos) {
    if (existingComSet.has(c.id)) statsIfApplied.apoliceComissionamentos.update++
    else statsIfApplied.apoliceComissionamentos.create++
  }

  const existingFeeRows = await prisma.portalSeguroApoliceFee.findMany({ select: { id: true } })
  const existingFeeSet = new Set(existingFeeRows.map((x) => x.id))
  for (const f of data.apoliceFees) {
    if (existingFeeSet.has(f.id)) statsIfApplied.apoliceFees.update++
    else statsIfApplied.apoliceFees.create++
  }

  return { issues, statsIfApplied }
}

async function fornecedorNomeParaApolice(
  tx: Prisma.TransactionClient,
  operadoraId: string | null | undefined,
  snapFornecedor: string,
  exFornecedor: string | null | undefined,
): Promise<string> {
  const id = operadoraId?.trim()
  if (id) {
    const snap = await tx.portalNexusEntitySnapshot.findUnique({
      where: { entityKey: 'operadoras' },
      select: { rows: true },
    })
    const list = snap?.rows ? parseOperadorasFromSnapshotRows(snap.rows) : []
    const nome = operadoraNomePorId(list, id)
    if ((nome ?? '').trim()) return nome!.trim()
  }
  return mergeImportFornecedor(snapFornecedor, exFornecedor)
}

function emptyStats(): SegurosBaseImportStats {
  return {
    grupos: { create: 0, update: 0 },
    estipulantes: { create: 0, update: 0 },
    operadoras: { create: 0, update: 0 },
    apolices: { create: 0, update: 0 },
    apoliceSubestipulantes: { create: 0, update: 0 },
    apoliceFaturasMensais: { create: 0, update: 0 },
    apoliceComissionamentos: { create: 0, update: 0 },
    apoliceFees: { create: 0, update: 0 },
    apolicePlanoLinhas: { rows: 0 },
    itens: { create: 0, update: 0 },
  }
}

export async function applySegurosBaseSnapshot(data: SegurosBaseSnapshotParsed): Promise<SegurosBaseImportStats> {
  const { issues } = await analyzeSegurosBaseSnapshot(data)
  if (issues.some((x) => x.severity === 'error')) {
    throw new Error('Snapshot com erros bloqueantes — execute primeiro a análise (dry-run).')
  }

  const stats = emptyStats()

  await prisma.$transaction(
    async (tx) => {
      for (const g of data.grupos) {
        const ex = await tx.portalGrupoEconomico.findUnique({ where: { id: g.id } })
        const base: Prisma.PortalGrupoEconomicoUncheckedCreateInput = {
          id: g.id,
          nome: g.nome.trim(),
          cnpj: g.cnpj?.trim() || null,
          observacoes: g.observacoes?.trim() || null,
          classificacao: g.classificacao,
          active: g.active,
        }
        if (ex) {
          await tx.portalGrupoEconomico.update({
            where: { id: g.id },
            data: {
              nome: base.nome,
              cnpj: mergeImportOptionalString(g.cnpj, ex.cnpj),
              observacoes: mergeImportOptionalString(g.observacoes, ex.observacoes),
              classificacao: base.classificacao,
              active: g.active,
            },
          })
          stats.grupos.update++
        } else {
          await tx.portalGrupoEconomico.create({
            data: {
              ...base,
              createdAt: g.createdAt ?? undefined,
              updatedAt: g.updatedAt ?? undefined,
            },
          })
          stats.grupos.create++
        }
      }

      for (const e of data.estipulantes) {
        const ex = await tx.portalSeguroEstipulante.findUnique({ where: { id: e.id } })
        const dataRow: Prisma.PortalSeguroEstipulanteUncheckedCreateInput = {
          id: e.id,
          grupoEconomicoId: e.grupoEconomicoId ?? null,
          grupoEconomicoNome: (e.grupoEconomicoNome || '').trim() || '—',
          nexusClienteId: e.nexusClienteId?.trim() || null,
          razaoSocial: e.razaoSocial.trim(),
          cnpj: e.cnpj.trim(),
          cnae: e.cnae?.trim() || null,
          nomeFantasia: e.nomeFantasia?.trim() || null,
          observacoes: e.observacoes?.trim() || null,
          active: e.active,
          importadoNexusEm: e.importadoNexusEm,
        }
        if (ex) {
          await tx.portalSeguroEstipulante.update({
            where: { id: e.id },
            data: {
              grupoEconomicoId: e.grupoEconomicoId ?? ex.grupoEconomicoId,
              grupoEconomicoNome: importCellEmpty(e.grupoEconomicoNome)
                ? ex.grupoEconomicoNome
                : (e.grupoEconomicoNome || '').trim() || '—',
              nexusClienteId: mergeImportOptionalString(e.nexusClienteId, ex.nexusClienteId),
              razaoSocial: dataRow.razaoSocial,
              cnpj: dataRow.cnpj,
              cnae: mergeImportOptionalString(e.cnae, ex.cnae),
              nomeFantasia: mergeImportOptionalString(e.nomeFantasia, ex.nomeFantasia),
              observacoes: mergeImportOptionalString(e.observacoes, ex.observacoes),
              active: e.active,
              importadoNexusEm: e.importadoNexusEm ?? ex.importadoNexusEm,
            },
          })
          stats.estipulantes.update++
        } else {
          await tx.portalSeguroEstipulante.create({
            data: {
              ...dataRow,
              createdAt: e.createdAt ?? undefined,
              updatedAt: e.updatedAt ?? undefined,
            },
          })
          stats.estipulantes.create++
        }
      }

      for (const a of data.apolices) {
        const ex = await tx.portalSeguroApolice.findUnique({ where: { id: a.id } })
        const subRaw = (a.subestipulante ?? '').trim()
        const sub = subRaw && subRaw !== '—' ? subRaw : null
        const mergedOperadoraId =
          a.operadoraId != null && String(a.operadoraId).trim() !== ''
            ? String(a.operadoraId).trim()
            : ex?.operadoraId ?? null
        const fornecedorStr = await fornecedorNomeParaApolice(tx, mergedOperadoraId, a.fornecedor ?? '', ex?.fornecedor)
        const dataRow: Prisma.PortalSeguroApoliceUncheckedCreateInput = {
          id: a.id,
          estipulanteId: a.estipulanteId,
          nexusContratoId: a.nexusContratoId?.trim() || null,
          numeroApolice: (a.numeroApolice ?? '').trim() || (a.nexusContratoId?.trim() ? `nx:${a.nexusContratoId!.trim()}` : '—'),
          produto: a.produto,
          operadoraId: mergedOperadoraId,
          fornecedor: fornecedorStr,
          subestipulante: sub,
          plano: a.plano?.trim() || null,
          coberturas: a.coberturas?.trim() || null,
          vigenciaInicio: a.vigenciaInicio,
          vigenciaFim: a.vigenciaFim,
          trCone: a.trCone ?? null,
          trDiretoria: a.trDiretoria?.trim() || null,
          trSuperintendente: a.trSuperintendente?.trim() || null,
          trGerente: a.trGerente?.trim() || null,
          trExecutivoConsultor: a.trExecutivoConsultor?.trim() || null,
          trAnalista: a.trAnalista?.trim() || null,
          observacoes: a.observacoes?.trim() || null,
          active: a.active,
          importadoNexusEm: a.importadoNexusEm,
        }
        if (ex) {
          const mergedSub = importCellEmpty(a.subestipulante)
            ? ex.subestipulante
            : sub && sub !== '—'
              ? sub
              : ex.subestipulante
          await tx.portalSeguroApolice.update({
            where: { id: a.id },
            data: {
              estipulanteId: dataRow.estipulanteId,
              nexusContratoId: mergeImportOptionalString(a.nexusContratoId, ex.nexusContratoId),
              numeroApolice:
                (a.numeroApolice ?? '').trim() ||
                (a.nexusContratoId?.trim() ? `nx:${a.nexusContratoId!.trim()}` : '') ||
                ex.numeroApolice,
              produto: a.produto,
              operadoraId: mergedOperadoraId,
              fornecedor: fornecedorStr,
              subestipulante: mergedSub,
              plano: mergeImportOptionalString(a.plano, ex.plano),
              coberturas: mergeImportOptionalString(a.coberturas, ex.coberturas),
              vigenciaInicio: mergeImportDate(a.vigenciaInicio, ex.vigenciaInicio),
              vigenciaFim: mergeImportDate(a.vigenciaFim, ex.vigenciaFim),
              observacoes: mergeImportOptionalString(a.observacoes, ex.observacoes),
              active: a.active,
              importadoNexusEm: a.importadoNexusEm ?? ex.importadoNexusEm,
              trCone: a.trCone ?? ex.trCone,
              trDiretoria: mergeImportOptionalString(a.trDiretoria, ex.trDiretoria),
              trSuperintendente: mergeImportOptionalString(a.trSuperintendente, ex.trSuperintendente),
              trGerente: mergeImportOptionalString(a.trGerente, ex.trGerente),
              trExecutivoConsultor: mergeImportOptionalString(a.trExecutivoConsultor, ex.trExecutivoConsultor),
              trAnalista: mergeImportOptionalString(a.trAnalista, ex.trAnalista),
            },
          })
          stats.apolices.update++
        } else {
          await tx.portalSeguroApolice.create({
            data: {
              ...dataRow,
              createdAt: a.createdAt ?? undefined,
              updatedAt: a.updatedAt ?? undefined,
            },
          })
          stats.apolices.create++
        }
      }

      for (const s of data.apoliceSubestipulantes) {
        const ex = await tx.portalSeguroApoliceSubestipulante.findUnique({ where: { id: s.id } })
        const row: Prisma.PortalSeguroApoliceSubestipulanteUncheckedCreateInput = {
          id: s.id,
          apoliceId: s.apoliceId,
          sortOrder: s.sortOrder ?? 0,
          razaoSocial: s.razaoSocial.trim(),
          cnpj: s.cnpj.trim(),
          codigoSub: s.codigoSub.trim(),
          status: s.status,
        }
        if (ex) {
          await tx.portalSeguroApoliceSubestipulante.update({
            where: { id: s.id },
            data: {
              apoliceId: row.apoliceId,
              sortOrder: row.sortOrder,
              razaoSocial: row.razaoSocial,
              cnpj: row.cnpj,
              codigoSub: row.codigoSub,
              status: row.status,
            },
          })
          stats.apoliceSubestipulantes.update++
        } else {
          await tx.portalSeguroApoliceSubestipulante.create({
            data: {
              ...row,
              createdAt: s.createdAt ?? undefined,
              updatedAt: s.updatedAt ?? undefined,
            },
          })
          stats.apoliceSubestipulantes.create++
        }
      }

      for (const f of data.apoliceFaturasMensais) {
        const ex = await tx.portalSeguroApoliceFaturaMes.findUnique({ where: { id: f.id } })
        const row = {
          id: f.id,
          apoliceId: f.apoliceId,
          competenciaAno: f.competenciaAno,
          competenciaMes: f.competenciaMes,
          vidas: f.vidas ?? 0,
          valorFatura: f.valorFatura,
          observacoes: f.observacoes?.trim() || null,
        }
        if (ex) {
          await tx.portalSeguroApoliceFaturaMes.update({
            where: { id: f.id },
            data: {
              apoliceId: row.apoliceId,
              competenciaAno: row.competenciaAno,
              competenciaMes: row.competenciaMes,
              vidas: row.vidas,
              valorFatura: row.valorFatura,
              observacoes: row.observacoes,
            },
          })
          stats.apoliceFaturasMensais.update++
        } else {
          await tx.portalSeguroApoliceFaturaMes.create({
            data: {
              ...row,
              createdAt: f.createdAt ?? undefined,
              updatedAt: f.updatedAt ?? undefined,
            },
          })
          stats.apoliceFaturasMensais.create++
        }
      }

      for (const c of data.apoliceComissionamentos) {
        const ex = await tx.portalSeguroApoliceComissionamento.findUnique({ where: { id: c.id } })
        const row = {
          id: c.id,
          apoliceId: c.apoliceId,
          temCorretorParceiro: c.temCorretorParceiro ?? false,
          valorAgenciamentoContrato: c.valorAgenciamentoContrato ?? null,
          valorVitalicioContrato: c.valorVitalicioContrato ?? null,
          agenciamentoConsultoria: parcelasToDbJson(c.agenciamentoConsultoria ?? null),
          vitalicioConsultoria: parcelasToDbJson(c.vitalicioConsultoria ?? null),
          agenciamentoCorretor: parcelasToDbJson(c.agenciamentoCorretor ?? null),
          vitalicioCorretor: parcelasToDbJson(c.vitalicioCorretor ?? null),
        }
        if (ex) {
          await tx.portalSeguroApoliceComissionamento.update({
            where: { id: c.id },
            data: {
              apoliceId: row.apoliceId,
              temCorretorParceiro: row.temCorretorParceiro,
              valorAgenciamentoContrato: row.valorAgenciamentoContrato,
              valorVitalicioContrato: row.valorVitalicioContrato,
              agenciamentoConsultoria: row.agenciamentoConsultoria,
              vitalicioConsultoria: row.vitalicioConsultoria,
              agenciamentoCorretor: row.agenciamentoCorretor,
              vitalicioCorretor: row.vitalicioCorretor,
            },
          })
          stats.apoliceComissionamentos.update++
        } else {
          await tx.portalSeguroApoliceComissionamento.create({
            data: {
              ...row,
              createdAt: c.createdAt ?? undefined,
              updatedAt: c.updatedAt ?? undefined,
            },
          })
          stats.apoliceComissionamentos.create++
        }
      }

      for (const fee of data.apoliceFees) {
        const ex = await tx.portalSeguroApoliceFee.findUnique({ where: { id: fee.id } })
        const row = {
          id: fee.id,
          apoliceId: fee.apoliceId,
          valorFeeMensal: fee.valorFeeMensal ?? null,
          feeConsultoria: fee.feeConsultoria ?? null,
          feeCorretorParceiro: fee.feeCorretorParceiro ?? null,
        }
        if (ex) {
          await tx.portalSeguroApoliceFee.update({
            where: { id: fee.id },
            data: {
              apoliceId: row.apoliceId,
              valorFeeMensal: row.valorFeeMensal,
              feeConsultoria: row.feeConsultoria,
              feeCorretorParceiro: row.feeCorretorParceiro,
            },
          })
          stats.apoliceFees.update++
        } else {
          await tx.portalSeguroApoliceFee.create({
            data: {
              ...row,
              createdAt: fee.createdAt ?? undefined,
              updatedAt: fee.updatedAt ?? undefined,
            },
          })
          stats.apoliceFees.create++
        }
      }

      const planoPorAp = new Map<string, typeof data.apolicePlanoLinhas>()
      for (const row of data.apolicePlanoLinhas) {
        const list = planoPorAp.get(row.apoliceId)
        if (list) list.push(row)
        else planoPorAp.set(row.apoliceId, [row])
      }
      for (const [apId, rows] of planoPorAp) {
        const sorted = [...rows].sort((x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0))
        await tx.portalSeguroApolicePlanoLinha.deleteMany({ where: { apoliceId: apId } })
        if (sorted.length === 0) continue
        await tx.portalSeguroApolicePlanoLinha.createMany({
          data: sorted.map((r, i) => {
            const custoMedio =
              r.tipoCusto === PortalApoliceTipoCustoPlano.CUSTO_MEDIO ? (r.custoMedio ?? null) : null
            return {
              id: r.id,
              apoliceId: r.apoliceId,
              sortOrder: r.sortOrder ?? i,
              codigoPlano: r.codigoPlano.trim(),
              tipoCusto: r.tipoCusto,
              custoMedio,
              valoresPorFaixa:
                r.tipoCusto === PortalApoliceTipoCustoPlano.FAIXA_ETARIA
                  ? ((normalizarValoresPorFaixa(r.valoresPorFaixa ?? {}) ?? {}) as Prisma.InputJsonValue)
                  : Prisma.DbNull,
              createdAt: r.createdAt ?? undefined,
              updatedAt: r.updatedAt ?? undefined,
            }
          }),
        })
        stats.apolicePlanoLinhas.rows += sorted.length
      }

      for (const it of data.itens) {
        const ex = await tx.portalSeguroApoliceItem.findUnique({ where: { id: it.id } })
        const dataRow: Prisma.PortalSeguroApoliceItemUncheckedCreateInput = {
          id: it.id,
          apoliceId: it.apoliceId,
          tipo: it.tipo,
          descricao: it.descricao.trim(),
          detalhes: it.detalhes?.trim() || null,
          sortOrder: it.sortOrder ?? 0,
          active: it.active,
        }
        if (ex) {
          await tx.portalSeguroApoliceItem.update({
            where: { id: it.id },
            data: {
              apoliceId: dataRow.apoliceId,
              tipo: dataRow.tipo,
              descricao: importCellEmpty(it.descricao) ? ex.descricao : it.descricao.trim(),
              detalhes: mergeImportOptionalString(it.detalhes, ex.detalhes),
              sortOrder: dataRow.sortOrder,
              active: it.active,
            },
          })
          stats.itens.update++
        } else {
          await tx.portalSeguroApoliceItem.create({
            data: {
              ...dataRow,
              createdAt: it.createdAt ?? undefined,
              updatedAt: it.updatedAt ?? undefined,
            },
          })
          stats.itens.create++
        }
      }
    },
    { timeout: 120_000, maxWait: 60_000 },
  )

  return stats
}
