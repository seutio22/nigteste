/**
 * Copia dados do snapshot Nexus (`contratos` + `clientes`) para as tabelas do portal
 * (`PortalSeguroEstipulante`, `PortalSeguroApolice`) quando ainda não existem.
 *
 * Política: **só inserção** — registos já no portal (ou já ligados por `nexusContratoId`)
 * não são sobrescritos, para preservar complementações e correções manuais.
 *
 * Hierarquia: **grupo → estipulante (empresa) → apólices**. O nome do estipulante
 * não usa número/id de contrato; sem `clienteId` no contrato usa-se CNPJ/razão por grupo
 * ou a empresa única do grupo no snapshot `clientes`.
 */
import { PortalApoliceProduto } from '@prisma/client'
import { prisma } from './prisma.js'
import { buildNexusGruposEconomicosEmpresas, type NexusEmpresaGrupoView } from './nexus-grupos-economicos-view.js'
import { parseContratosSnapshot, type NexusContratoOpcao } from './nexus-seguros-contratos.js'

const DRY_EST = '__dry_run_estipulante__'

function normGrupoKey(s: string): string {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '')
}

function onlyDigits(s: string): string {
  return (s || '').replace(/\D/g, '')
}

function cnpjParaEstipulante(empresa: NexusEmpresaGrupoView | undefined, nexusClienteId: string, grupoNome: string): string {
  const d = onlyDigits(empresa?.cnpj ?? '')
  if (d.length >= 8) return d.length > 14 ? d.slice(0, 14) : d
  const cid = nexusClienteId.trim()
  if (cid) {
    const fallback = onlyDigits(cid).slice(0, 12) || '0'.repeat(12)
    return (`8${fallback}01`).slice(0, 14)
  }
  const g = normGrupoKey(grupoNome).replace(/\W/g, '').slice(0, 12) || 'semgrupo'
  let acc = 2166136261
  for (let i = 0; i < g.length; i++) {
    acc ^= g.charCodeAt(i)
    acc = Math.imul(acc, 16777619)
  }
  const tail = String(Math.abs(acc) % 10_000_000_000).padStart(10, '0')
  return (`9${tail}01`).slice(0, 14)
}

function montarMapaClientesPorId(rows: unknown[]): Map<string, NexusEmpresaGrupoView> {
  const m = new Map<string, NexusEmpresaGrupoView>()
  for (const e of buildNexusGruposEconomicosEmpresas(rows)) {
    const id = e.nexusClienteId?.trim()
    if (id) m.set(id.toLowerCase(), e)
  }
  return m
}

function montarEmpresasPorGrupoNorm(rows: unknown[]): Map<string, NexusEmpresaGrupoView[]> {
  const m = new Map<string, NexusEmpresaGrupoView[]>()
  for (const e of buildNexusGruposEconomicosEmpresas(rows)) {
    const k = normGrupoKey(e.grupoEconomicoNome)
    if (!k) continue
    const arr = m.get(k) ?? []
    arr.push(e)
    m.set(k, arr)
  }
  return m
}

function resolverEmpresaParaContrato(
  c: NexusContratoOpcao,
  clientesPorId: Map<string, NexusEmpresaGrupoView>,
  empresasPorGrupo: Map<string, NexusEmpresaGrupoView[]>,
): NexusEmpresaGrupoView | undefined {
  const cidKey = (c.clienteId || '').trim().toLowerCase()
  if (cidKey) {
    const hit = clientesPorId.get(cidKey)
    if (hit) return hit
  }
  const gk = normGrupoKey(c.grupoEconomico || '')
  if (!gk) return undefined
  const list = empresasPorGrupo.get(gk)
  if (list?.length === 1) return list[0]
  return undefined
}

function razaoSocialEstipulante(empresa: NexusEmpresaGrupoView | undefined, grupoNome: string, nexusClienteId: string): string {
  const r = (empresa?.razaoSocial || '').trim()
  if (r) return r
  const cid = nexusClienteId.trim()
  if (cid) return `Cliente Nexus (${cid})`
  return `Estipulante — ${grupoNome} (sem vínculo cliente no snapshot; completar no portal)`
}

export type NexusSegurosImportResult = {
  dryRun: boolean
  contratosNoSnapshot: number
  apolicesJaExistentes: number
  apolicesCriadas: number
  estipulantesCriados: number
  ignoradosSemGrupo: number
  errors: string[]
}

export async function importNexusSegurosParaPortal(options?: {
  dryRun?: boolean
}): Promise<NexusSegurosImportResult> {
  const dryRun = options?.dryRun === true
  const result: NexusSegurosImportResult = {
    dryRun,
    contratosNoSnapshot: 0,
    apolicesJaExistentes: 0,
    apolicesCriadas: 0,
    estipulantesCriados: 0,
    ignoradosSemGrupo: 0,
    errors: [],
  }

  const [snapC, snapCl] = await Promise.all([
    prisma.portalNexusEntitySnapshot.findUnique({ where: { entityKey: 'contratos' } }),
    prisma.portalNexusEntitySnapshot.findUnique({ where: { entityKey: 'clientes' } }),
  ])

  if (!snapC || !Array.isArray(snapC.rows) || snapC.rowCount === 0) {
    result.errors.push('Snapshot Nexus «contratos» vazio ou inexistente. Execute a sincronização em Banco de dados.')
    return result
  }

  const clientesRows = snapCl && Array.isArray(snapCl.rows) ? snapCl.rows : []
  const clientesPorId = montarMapaClientesPorId(clientesRows)
  const empresasPorGrupo = montarEmpresasPorGrupoNorm(clientesRows)

  const contratos = parseContratosSnapshot(snapC.rows)
  result.contratosNoSnapshot = contratos.length

  const existentes = await prisma.portalSeguroApolice.findMany({
    where: { nexusContratoId: { not: null } },
    select: { nexusContratoId: true },
  })
  const jaTemContrato = new Set(existentes.map((x) => x.nexusContratoId!.trim()).filter(Boolean))

  const now = new Date()
  const cacheEstPorChave = new Map<string, string>()

  async function resolverEstipulanteId(c: NexusContratoOpcao, empresa: NexusEmpresaGrupoView | undefined): Promise<string | null> {
    const grupoNome = (c.grupoEconomico || empresa?.grupoEconomicoNome || '').trim()
    if (!normGrupoKey(grupoNome)) return null

    const cid = (c.clienteId || empresa?.nexusClienteId || '').trim()
    const cnpj = cnpjParaEstipulante(empresa, cid, grupoNome)
    const razao = razaoSocialEstipulante(empresa, grupoNome, cid)

    const cacheKey = `${cid.toLowerCase()}|${normGrupoKey(grupoNome)}|${cnpj}`
    const cached = cacheEstPorChave.get(cacheKey)
    if (cached) return cached

    const orLine: Array<{ nexusClienteId: string } | { cnpj: string }> = [{ cnpj }]
    if (cid) orLine.push({ nexusClienteId: cid })

    const existing = await prisma.portalSeguroEstipulante.findFirst({
      where: {
        AND: [{ grupoEconomicoNome: { equals: grupoNome, mode: 'insensitive' } }, { OR: orLine }],
      },
    })

    if (existing) {
      cacheEstPorChave.set(cacheKey, existing.id)
      return existing.id
    }

    if (dryRun) {
      result.estipulantesCriados++
      cacheEstPorChave.set(cacheKey, DRY_EST)
      return DRY_EST
    }

    try {
      const created = await prisma.portalSeguroEstipulante.create({
        data: {
          grupoEconomicoNome: grupoNome,
          grupoEconomicoId: null,
          nexusClienteId: cid || null,
          razaoSocial: razao,
          cnpj,
          cnae: null,
          nomeFantasia: null,
          observacoes: 'Criado pela importação Nexus. Complemente o cadastro no portal.',
          importadoNexusEm: now,
        },
      })
      result.estipulantesCriados++
      cacheEstPorChave.set(cacheKey, created.id)
      return created.id
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      result.errors.push(`Estipulante ${grupoNome} / ${cid || '—'}: ${msg}`)
      return null
    }
  }

  for (const c of contratos) {
    const nid = c.nexusContratoId?.trim()
    if (!nid) continue
    if (jaTemContrato.has(nid)) {
      result.apolicesJaExistentes++
      continue
    }

    const empresa = resolverEmpresaParaContrato(c, clientesPorId, empresasPorGrupo)

    if (!normGrupoKey(c.grupoEconomico) && !normGrupoKey(empresa?.grupoEconomicoNome ?? '')) {
      result.ignoradosSemGrupo++
      continue
    }

    const estId = await resolverEstipulanteId(c, empresa)
    if (!estId) continue
    if (!dryRun && estId === DRY_EST) continue

    const obs = [
      `Importado do Nexus em ${now.toISOString()}.`,
      `Estado no snapshot: ${c.status}.`,
      'Complemente produto, fornecedor, vigências e demais campos no portal.',
    ].join(' ')

    if (dryRun) {
      result.apolicesCriadas++
      jaTemContrato.add(nid)
      continue
    }

    try {
      await prisma.portalSeguroApolice.create({
        data: {
          estipulanteId: estId,
          nexusContratoId: nid,
          numeroApolice: c.numero.trim(),
          produto: PortalApoliceProduto.OUTROS,
          fornecedor: '—',
          subestipulante: '—',
          plano: null,
          coberturas: null,
          vigenciaInicio: null,
          vigenciaFim: null,
          observacoes: obs,
          importadoNexusEm: now,
        },
      })
      result.apolicesCriadas++
      jaTemContrato.add(nid)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (/unique constraint/i.test(msg) || /Unique constraint/i.test(msg)) {
        result.apolicesJaExistentes++
        jaTemContrato.add(nid)
      } else {
        result.errors.push(`Apólice ${c.numero} (${nid}): ${msg}`)
      }
    }
  }

  return result
}
