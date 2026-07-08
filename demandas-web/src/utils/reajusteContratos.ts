import {
  parseContratosVinculos,
  rowsToVinculos,
  vinculosToRows,
  emptyContratoVinculoRow,
  type ContratoVinculoRow,
  type ManutencaoContratoVinculo,
} from './manutencaoContratos'

type NamedEntity = { id: string; nome: string }
type ContratoEntity = { id: string; codigo?: string | null; numero?: string | null }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normalizeString(str: unknown): string {
  return String(str ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function findIdByName(name: string | undefined, arr: NamedEntity[]): string | undefined {
  if (!name) return undefined
  const normalizedName = normalizeString(name)
  return arr.find((a) => normalizeString(a.nome) === normalizedName)?.id
}

function findContratoIdByCodigo(codigo: string | undefined, arr: ContratoEntity[]): string | undefined {
  if (!codigo) return undefined
  const normalizedCodigo = normalizeString(codigo)
  return arr.find(
    (c) =>
      normalizeString(c.codigo) === normalizedCodigo || normalizeString(c.numero) === normalizedCodigo
  )?.id
}

function resolveIdOrName(
  value: string | undefined,
  byName: NamedEntity[],
  byCodigo?: ContratoEntity[]
): string {
  if (!value) return ''
  if (UUID_RE.test(value)) return value
  if (byCodigo) {
    return findContratoIdByCodigo(value, byCodigo) || ''
  }
  return findIdByName(value, byName) || ''
}

export function resolveReajusteContratoVinculos(
  reajuste: {
    contratosVinculos?: unknown
    contrato?: string | null
    operadora?: string | null
    produto?: string | null
  },
  md: {
    operadoras: NamedEntity[]
    contratos: ContratoEntity[]
    produtos: NamedEntity[]
  }
): ManutencaoContratoVinculo[] {
  const fromJson = parseContratosVinculos(reajuste.contratosVinculos, {})
  if (fromJson.length) return fromJson

  const contratoId = resolveIdOrName(reajuste.contrato ?? undefined, [], md.contratos)
  if (!contratoId) return []

  return [
    {
      contratoId,
      operadoraId: resolveIdOrName(reajuste.operadora ?? undefined, md.operadoras) || null,
      produtoId: resolveIdOrName(reajuste.produto ?? undefined, md.produtos) || null,
    },
  ]
}

export function reajusteToContratoVinculoRows(
  reajuste: Parameters<typeof resolveReajusteContratoVinculos>[0],
  md: Parameters<typeof resolveReajusteContratoVinculos>[1]
): ContratoVinculoRow[] {
  const vinculos = resolveReajusteContratoVinculos(reajuste, md)
  return vinculos.length ? vinculosToRows(vinculos) : [emptyContratoVinculoRow()]
}

export function buildReajusteLegacyFieldsFromVinculos(
  rows: ContratoVinculoRow[],
  clienteId: string | undefined,
  md: {
    clientes: NamedEntity[]
    contratos: ContratoEntity[]
    operadoras: NamedEntity[]
    produtos: NamedEntity[]
  }
): {
  operadora: string
  cliente?: string
  contrato?: string
  produto?: string
  contratosVinculos: ManutencaoContratoVinculo[] | null
} {
  const vinculos = rowsToVinculos(rows)
  const first = vinculos[0]

  const operadora =
    (first?.operadoraId
      ? md.operadoras.find((o) => o.id === first.operadoraId)?.nome
      : undefined) || ''

  const cliente = clienteId ? md.clientes.find((c) => c.id === clienteId)?.nome : undefined

  const contratoEntity = first?.contratoId
    ? md.contratos.find((c) => c.id === first.contratoId)
    : undefined
  const contrato = contratoEntity?.codigo || contratoEntity?.numero || undefined

  const produto = first?.produtoId
    ? md.produtos.find((p) => p.id === first.produtoId)?.nome
    : undefined

  return {
    operadora,
    cliente,
    contrato,
    produto,
    contratosVinculos: vinculos.length ? vinculos : null,
  }
}

export function serializeReajusteVinculos(vinculos: ManutencaoContratoVinculo[] | null | undefined): string {
  if (!vinculos?.length) return ''
  return JSON.stringify(
    vinculos.map((v) => ({
      contratoId: v.contratoId,
      operadoraId: v.operadoraId ?? null,
      produtoId: v.produtoId ?? null,
    }))
  )
}

export function reajusteVinculosChanged(
  stored: { contratosVinculos?: unknown; contrato?: string | null; operadora?: string | null; produto?: string | null },
  rows: ContratoVinculoRow[],
  md: Parameters<typeof resolveReajusteContratoVinculos>[1]
): boolean {
  const prev = serializeReajusteVinculos(resolveReajusteContratoVinculos(stored, md))
  const next = serializeReajusteVinculos(rowsToVinculos(rows))
  return prev !== next
}
