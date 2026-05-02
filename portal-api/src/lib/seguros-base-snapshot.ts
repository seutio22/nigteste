/**
 * Backup / restauração da base cadastral de seguros (grupos, estipulantes, apólices, itens).
 * JSON versionado + validação com erros bloqueantes e avisos de inconsistência.
 */
import { PortalApoliceProduto, PortalSeguroItemTipo, PortalSubestipulanteStatus, type Prisma } from '@prisma/client'
import { z } from 'zod'
import { prisma } from './prisma.js'

export const SEGUROS_BASE_SNAPSHOT_VERSION = 1 as const

const uuid = z.string().uuid()

function normCnpjDigits(s: string) {
  return (s || '').replace(/\D/g, '')
}

function normGrupoNome(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, ' ')
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

const apoliceRowSchema = z.object({
  id: uuid,
  estipulanteId: uuid,
  nexusContratoId: z.string().max(120).nullable().optional(),
  numeroApolice: z.string().max(120),
  produto: produtoSchema,
  fornecedor: z.string().max(500),
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
  apolices: z.array(apoliceRowSchema),
  apoliceSubestipulantes: z.array(apoliceSubestipulanteRowSchema).optional().default([]),
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
  apolices: { create: number; update: number }
  apoliceSubestipulantes: { create: number; update: number }
  itens: { create: number; update: number }
}

export async function buildSegurosBaseSnapshot(): Promise<SegurosBaseSnapshotParsed> {
  const [grupos, estipulantes, apolices, apoliceSubestipulantes, itens] = await Promise.all([
    prisma.portalGrupoEconomico.findMany({ orderBy: { nome: 'asc' } }),
    prisma.portalSeguroEstipulante.findMany({ orderBy: [{ grupoEconomicoNome: 'asc' }, { razaoSocial: 'asc' }] }),
    prisma.portalSeguroApolice.findMany({ orderBy: [{ estipulanteId: 'asc' }, { numeroApolice: 'asc' }] }),
    prisma.portalSeguroApoliceSubestipulante.findMany({
      orderBy: [{ apoliceId: 'asc' }, { sortOrder: 'asc' }],
    }),
    prisma.portalSeguroApoliceItem.findMany({ orderBy: [{ apoliceId: 'asc' }, { sortOrder: 'asc' }] }),
  ])

  return {
    schemaVersion: SEGUROS_BASE_SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    grupos: grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      cnpj: g.cnpj,
      observacoes: g.observacoes,
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
    apolices: apolices.map((a) => ({
      id: a.id,
      estipulanteId: a.estipulanteId,
      nexusContratoId: a.nexusContratoId,
      numeroApolice: a.numeroApolice,
      produto: a.produto,
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

  const statsIfApplied: SegurosBaseImportStats = {
    grupos: { create: 0, update: 0 },
    estipulantes: { create: 0, update: 0 },
    apolices: { create: 0, update: 0 },
    apoliceSubestipulantes: { create: 0, update: 0 },
    itens: { create: 0, update: 0 },
  }

  for (const g of data.grupos) {
    if (existingGrupoSet.has(g.id)) statsIfApplied.grupos.update++
    else statsIfApplied.grupos.create++
  }

  const existingEstSet = new Set(existingEst.map((e) => e.id))
  for (const e of data.estipulantes) {
    if (existingEstSet.has(e.id)) statsIfApplied.estipulantes.update++
    else statsIfApplied.estipulantes.create++
  }

  const existingApSet = new Set(existingAp.map((a) => a.id))
  for (const a of data.apolices) {
    if (existingApSet.has(a.id)) statsIfApplied.apolices.update++
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

  return { issues, statsIfApplied }
}

function emptyStats(): SegurosBaseImportStats {
  return {
    grupos: { create: 0, update: 0 },
    estipulantes: { create: 0, update: 0 },
    apolices: { create: 0, update: 0 },
    apoliceSubestipulantes: { create: 0, update: 0 },
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
          active: g.active,
        }
        if (ex) {
          await tx.portalGrupoEconomico.update({
            where: { id: g.id },
            data: {
              nome: base.nome,
              cnpj: base.cnpj,
              observacoes: base.observacoes,
              active: base.active,
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
              grupoEconomicoId: dataRow.grupoEconomicoId,
              grupoEconomicoNome: dataRow.grupoEconomicoNome,
              nexusClienteId: dataRow.nexusClienteId,
              razaoSocial: dataRow.razaoSocial,
              cnpj: dataRow.cnpj,
              cnae: dataRow.cnae,
              nomeFantasia: dataRow.nomeFantasia,
              observacoes: dataRow.observacoes,
              active: dataRow.active,
              importadoNexusEm: dataRow.importadoNexusEm,
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
        const dataRow: Prisma.PortalSeguroApoliceUncheckedCreateInput = {
          id: a.id,
          estipulanteId: a.estipulanteId,
          nexusContratoId: a.nexusContratoId?.trim() || null,
          numeroApolice: (a.numeroApolice ?? '').trim() || (a.nexusContratoId?.trim() ? `nx:${a.nexusContratoId!.trim()}` : '—'),
          produto: a.produto,
          fornecedor: (a.fornecedor ?? '').trim() || '—',
          subestipulante: sub,
          plano: a.plano?.trim() || null,
          coberturas: a.coberturas?.trim() || null,
          vigenciaInicio: a.vigenciaInicio,
          vigenciaFim: a.vigenciaFim,
          observacoes: a.observacoes?.trim() || null,
          active: a.active,
          importadoNexusEm: a.importadoNexusEm,
        }
        if (ex) {
          await tx.portalSeguroApolice.update({
            where: { id: a.id },
            data: {
              estipulanteId: dataRow.estipulanteId,
              nexusContratoId: dataRow.nexusContratoId,
              numeroApolice: dataRow.numeroApolice,
              produto: dataRow.produto,
              fornecedor: dataRow.fornecedor,
              subestipulante: dataRow.subestipulante,
              plano: dataRow.plano,
              coberturas: dataRow.coberturas,
              vigenciaInicio: dataRow.vigenciaInicio,
              vigenciaFim: dataRow.vigenciaFim,
              observacoes: dataRow.observacoes,
              active: dataRow.active,
              importadoNexusEm: dataRow.importadoNexusEm,
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
              descricao: dataRow.descricao,
              detalhes: dataRow.detalhes,
              sortOrder: dataRow.sortOrder,
              active: dataRow.active,
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
