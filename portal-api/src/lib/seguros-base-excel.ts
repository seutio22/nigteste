/**
 * Export / import do snapshot de seguros em Excel (.xlsx).
 * Folhas: _portal (metadados), Leia-me, grupos, estipulantes, apolices, apolice_comissionamentos,
 * apolice_fees, itens.
 */
import ExcelJS from 'exceljs'
import { PortalGrupoEconomicoClassificacao } from '@prisma/client'
import {
  SEGUROS_BASE_SNAPSHOT_VERSION,
  segurosBaseSnapshotBodySchema,
  type SegurosBaseSnapshotParsed,
} from './seguros-base-snapshot.js'

const SHEET_GRUPOS = 'grupos'
const SHEET_EST = 'estipulantes'
const SHEET_AP = 'apolices'
const SHEET_AP_COM = 'apolice_comissionamentos'
const SHEET_AP_FEE = 'apolice_fees'
const SHEET_IT = 'itens'
const SHEET_META = '_portal'
const SHEET_HELP = 'Leia-me'

export const GRUPO_HEADERS = [
  'id',
  'nome',
  'cnpj',
  'observacoes',
  'classificacao',
  'active',
  'createdAt',
  'updatedAt',
] as const
export const EST_HEADERS = [
  'id',
  'grupoEconomicoId',
  'grupoEconomicoNome',
  'nexusClienteId',
  'razaoSocial',
  'cnpj',
  'cnae',
  'nomeFantasia',
  'observacoes',
  'active',
  'importadoNexusEm',
  'createdAt',
  'updatedAt',
] as const
export const AP_HEADERS = [
  'id',
  'estipulanteId',
  'nexusContratoId',
  'numeroApolice',
  'produto',
  'operadoraId',
  'fornecedor',
  'subestipulante',
  'plano',
  'coberturas',
  'vigenciaInicio',
  'vigenciaFim',
  'observacoes',
  'active',
  'importadoNexusEm',
  'createdAt',
  'updatedAt',
] as const

/** Percentuais das 12 parcelas em JSON (ex.: [0,0,8.33,...]). */
export const AP_COM_HEADERS = [
  'id',
  'apoliceId',
  'temCorretorParceiro',
  'valorAgenciamentoContrato',
  'valorVitalicioContrato',
  'agenciamentoConsultoria',
  'vitalicioConsultoria',
  'agenciamentoCorretor',
  'vitalicioCorretor',
  'createdAt',
  'updatedAt',
] as const

export const AP_FEE_HEADERS = [
  'id',
  'apoliceId',
  'valorFeeMensal',
  'feeConsultoria',
  'feeCorretorParceiro',
  'createdAt',
  'updatedAt',
] as const

export const IT_HEADERS = [
  'id',
  'apoliceId',
  'tipo',
  'descricao',
  'detalhes',
  'sortOrder',
  'active',
  'createdAt',
  'updatedAt',
] as const

function normalizeCellValue(val: ExcelJS.CellValue): string | number | boolean | null {
  if (val == null || val === '') return null
  if (typeof val === 'string') {
    const t = val.trim()
    return t === '' ? null : t
  }
  if (typeof val === 'number' && Number.isFinite(val)) return val
  if (typeof val === 'boolean') return val
  if (val instanceof Date) return val.toISOString()
  if (typeof val === 'object') {
    if ('formula' in val && 'result' in val) {
      const r = (val as { result?: ExcelJS.CellValue }).result
      return r === undefined || r === null ? null : normalizeCellValue(r)
    }
    if ('richText' in val && Array.isArray((val as { richText?: { text: string }[] }).richText)) {
      const t = (val as { richText: { text: string }[] }).richText.map((x) => x.text).join('')
      return t.trim() === '' ? null : t.trim()
    }
    if ('text' in val && typeof (val as { text?: string }).text === 'string') {
      const t = (val as { text: string }).text.trim()
      return t === '' ? null : t
    }
    if ('hyperlink' in val && typeof (val as { text?: string }).text === 'string') {
      const t = String((val as { text: string }).text).trim()
      return t === '' ? null : t
    }
  }
  return String(val).trim() === '' ? null : String(val).trim()
}

function findSheet(wb: ExcelJS.Workbook, name: string): ExcelJS.Worksheet | undefined {
  const n = name.toLowerCase()
  return wb.worksheets.find((w) => w.name.toLowerCase() === n)
}

function sheetToRows(
  ws: ExcelJS.Worksheet,
  expectedHeaders: readonly string[],
  opts?: { optionalHeaders?: ReadonlySet<string> },
): { rows: Record<string, unknown>[]; errors: string[] } {
  const errors: string[] = []
  const optional = opts?.optionalHeaders ?? new Set<string>()
  const headerRow = ws.getRow(1)
  const colMap = new Map<string, number>()
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const h = String(normalizeCellValue(cell.value) ?? '').trim()
    if (h) colMap.set(h, colNumber)
  })
  const missing = expectedHeaders.filter((k) => !colMap.has(k) && !optional.has(k))
  if (missing.length) {
    errors.push(`Folha «${ws.name}»: colunas em falta (use o modelo exportado): ${missing.join(', ')}`)
    return { rows: [], errors }
  }
  const rows: Record<string, unknown>[] = []
  const last = ws.rowCount ?? 0
  for (let r = 2; r <= last; r++) {
    const row = ws.getRow(r)
    const obj: Record<string, unknown> = {}
    let hasAny = false
    for (const key of expectedHeaders) {
      const col = colMap.get(key)
      if (col === undefined) {
        obj[key] = null
        continue
      }
      const raw = row.getCell(col).value
      const v = normalizeCellValue(raw)
      if (v !== null && v !== '') hasAny = true
      obj[key] = v
    }
    if (!hasAny) continue
    const idVal = obj.id
    if (idVal === null || idVal === undefined || String(idVal).trim() === '') continue
    rows.push(obj)
  }
  return { rows, errors }
}

function str(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).trim()
}

function strNull(v: unknown): string | null {
  const s = str(v)
  return s === '' ? null : s
}

function parseBool(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const u = String(v).trim().toUpperCase()
  if (['TRUE', 'VERDADEIRO', 'SIM', 'S', '1', 'YES'].includes(u)) return true
  if (['FALSE', 'FALSO', 'NÃO', 'NAO', 'N', '0', 'NO'].includes(u)) return false
  return true
}

function parseIntOrder(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.round(v))
  const n = parseInt(String(v).trim(), 10)
  return Number.isFinite(n) ? Math.max(0, n) : 0
}

function optionalIso(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return v.toISOString()
  const s = str(v)
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toISOString()
}

function optionalNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const t = String(v).trim().replace(/\s/g, '').replace(',', '.')
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

function parseBoolNullable(v: unknown): boolean | null {
  if (v == null || v === '') return null
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  const u = String(v).trim().toUpperCase()
  if (['TRUE', 'VERDADEIRO', 'SIM', 'S', '1', 'YES'].includes(u)) return true
  if (['FALSE', 'FALSO', 'NÃO', 'NAO', 'N', '0', 'NO'].includes(u)) return false
  return null
}

function parseParcelas12JsonCell(v: unknown): number[] | null {
  const s = strNull(v)
  if (s == null) return null
  try {
    const j = JSON.parse(s) as unknown
    if (!Array.isArray(j) || j.length !== 12) return null
    return j.map((x) => (typeof x === 'number' && Number.isFinite(x) ? x : 0))
  } catch {
    return null
  }
}

function parseGrupoClassificacaoCell(v: unknown): PortalGrupoEconomicoClassificacao {
  const u = str(v).toUpperCase()
  if (u === 'PROSPECT') return PortalGrupoEconomicoClassificacao.PROSPECT
  return PortalGrupoEconomicoClassificacao.CLIENTE
}

function mapGrupoRow(o: Record<string, unknown>) {
  return {
    id: str(o.id),
    nome: str(o.nome),
    cnpj: strNull(o.cnpj),
    observacoes: strNull(o.observacoes),
    classificacao: parseGrupoClassificacaoCell(o.classificacao),
    active: parseBool(o.active),
    createdAt: optionalIso(o.createdAt),
    updatedAt: optionalIso(o.updatedAt),
  }
}

function mapEstRow(o: Record<string, unknown>) {
  const gid = strNull(o.grupoEconomicoId)
  return {
    id: str(o.id),
    grupoEconomicoId: gid,
    grupoEconomicoNome: str(o.grupoEconomicoNome),
    nexusClienteId: strNull(o.nexusClienteId),
    razaoSocial: str(o.razaoSocial),
    cnpj: str(o.cnpj),
    cnae: strNull(o.cnae),
    nomeFantasia: strNull(o.nomeFantasia),
    observacoes: strNull(o.observacoes),
    active: parseBool(o.active),
    importadoNexusEm: optionalIso(o.importadoNexusEm),
    createdAt: optionalIso(o.createdAt),
    updatedAt: optionalIso(o.updatedAt),
  }
}

function mapApRow(o: Record<string, unknown>) {
  return {
    id: str(o.id),
    estipulanteId: str(o.estipulanteId),
    nexusContratoId: strNull(o.nexusContratoId),
    numeroApolice: str(o.numeroApolice),
    produto: str(o.produto),
    operadoraId: strNull(o.operadoraId),
    fornecedor: str(o.fornecedor),
    subestipulante: str(o.subestipulante),
    plano: strNull(o.plano),
    coberturas: strNull(o.coberturas),
    vigenciaInicio: optionalIso(o.vigenciaInicio),
    vigenciaFim: optionalIso(o.vigenciaFim),
    observacoes: strNull(o.observacoes),
    active: parseBool(o.active),
    importadoNexusEm: optionalIso(o.importadoNexusEm),
    createdAt: optionalIso(o.createdAt),
    updatedAt: optionalIso(o.updatedAt),
  }
}

function mapComRow(o: Record<string, unknown>) {
  return {
    id: str(o.id),
    apoliceId: str(o.apoliceId),
    temCorretorParceiro: parseBoolNullable(o.temCorretorParceiro),
    valorAgenciamentoContrato: optionalNumber(o.valorAgenciamentoContrato),
    valorVitalicioContrato: optionalNumber(o.valorVitalicioContrato),
    agenciamentoConsultoria: parseParcelas12JsonCell(o.agenciamentoConsultoria),
    vitalicioConsultoria: parseParcelas12JsonCell(o.vitalicioConsultoria),
    agenciamentoCorretor: parseParcelas12JsonCell(o.agenciamentoCorretor),
    vitalicioCorretor: parseParcelas12JsonCell(o.vitalicioCorretor),
    createdAt: optionalIso(o.createdAt),
    updatedAt: optionalIso(o.updatedAt),
  }
}

function mapFeeRow(o: Record<string, unknown>) {
  return {
    id: str(o.id),
    apoliceId: str(o.apoliceId),
    valorFeeMensal: optionalNumber(o.valorFeeMensal),
    feeConsultoria: optionalNumber(o.feeConsultoria),
    feeCorretorParceiro: optionalNumber(o.feeCorretorParceiro),
    createdAt: optionalIso(o.createdAt),
    updatedAt: optionalIso(o.updatedAt),
  }
}

function mapItRow(o: Record<string, unknown>) {
  return {
    id: str(o.id),
    apoliceId: str(o.apoliceId),
    tipo: str(o.tipo),
    descricao: str(o.descricao),
    detalhes: strNull(o.detalhes),
    sortOrder: parseIntOrder(o.sortOrder),
    active: parseBool(o.active),
    createdAt: optionalIso(o.createdAt),
    updatedAt: optionalIso(o.updatedAt),
  }
}

export async function segurosSnapshotToExcelBuffer(snapshot: SegurosBaseSnapshotParsed): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'portal-colaborador-api'

  const help = wb.addWorksheet(SHEET_HELP)
  const lines = [
    ['Portal — cadastro de seguros (Excel)'],
    [''],
    ['• Não altere os nomes das colunas nas folhas de dados. Pode acrescentar linhas.'],
    ['• Campo active: TRUE/FALSE ou 1/0.'],
    ['• CNAE: código da atividade (opcional); na folha estipulantes use a coluna «cnae».'],
    ['• Datas: use formato de data do Excel ou texto ISO (2026-05-02T12:00:00.000Z).'],
    ['• produto: SAUDE | ODONTO | VIDA_GRUPO | OUTROS'],
    ['• tipo (itens): COBERTURA | SERVICO | CLAUSULA | OUTRO'],
    [
      '• Folhas opcionais na importação: apolice_comissionamentos, apolice_fees (se ausentes, tratadas como vazias).',
    ],
    [
      '• Colunas agenciamento*/vitalicio* (consultoria/corretor): texto JSON com exatamente 12 percentuais, ex. [0,0,8.33,8.33,…].',
    ],
    ['• Coluna operadoraId em apolices: UUID no catálogo (opcional; ficheiros antigos sem esta coluna continuam válidos).'],
    ['• Após editar: importe de novo na Visão geral; a análise indica inconsistências antes de gravar.'],
    [''],
    [`schemaVersion exportado: ${snapshot.schemaVersion}`],
  ]
  lines.forEach((L) => help.addRow(L))
  help.getColumn(1).width = 92

  const meta = wb.addWorksheet(SHEET_META)
  meta.addRow(['schemaVersion', snapshot.schemaVersion])
  meta.addRow(['exportedAt', snapshot.exportedAt ?? new Date().toISOString()])
  meta.getColumn(1).width = 18
  meta.getColumn(2).width = 36

  function addTable<T extends Record<string, unknown>>(
    name: string,
    headers: readonly string[],
    data: T[],
    pick: (r: T) => unknown[],
  ) {
    const ws = wb.addWorksheet(name)
    ws.views = [{ state: 'frozen', ySplit: 1 }]
    ws.addRow([...headers])
    const hr = ws.getRow(1)
    hr.font = { bold: true }
    hr.alignment = { vertical: 'middle', wrapText: true }
    for (const row of data) {
      const vals = pick(row)
      ws.addRow(vals)
    }
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i]
      const col = ws.getColumn(i + 1)
      if (
        [
          'id',
          'cnpj',
          'cnae',
          'nexusClienteId',
          'nexusContratoId',
          'numeroApolice',
          'estipulanteId',
          'apoliceId',
          'grupoEconomicoId',
          'operadoraId',
        ].includes(h)
      ) {
        col.numFmt = '@'
      }
      if (
        ['agenciamentoConsultoria', 'vitalicioConsultoria', 'agenciamentoCorretor', 'vitalicioCorretor'].includes(h)
      ) {
        col.width = 56
      } else {
        col.width = Math.min(46, Math.max(10, h.length + 4))
      }
    }
  }

  addTable(SHEET_GRUPOS, GRUPO_HEADERS, snapshot.grupos, (g) =>
    GRUPO_HEADERS.map((k) => {
      const v = (g as Record<string, unknown>)[k]
      if (v instanceof Date) return v.toISOString()
      return v ?? ''
    }),
  )

  addTable(SHEET_EST, EST_HEADERS, snapshot.estipulantes, (e) =>
    EST_HEADERS.map((k) => {
      const v = (e as Record<string, unknown>)[k]
      if (v instanceof Date) return v.toISOString()
      return v ?? ''
    }),
  )

  addTable(SHEET_AP, AP_HEADERS, snapshot.apolices, (a) =>
    AP_HEADERS.map((k) => {
      const v = (a as Record<string, unknown>)[k]
      if (v instanceof Date) return v.toISOString()
      return v ?? ''
    }),
  )

  const parcelasJsonKeys = new Set([
    'agenciamentoConsultoria',
    'vitalicioConsultoria',
    'agenciamentoCorretor',
    'vitalicioCorretor',
  ])

  addTable(SHEET_AP_COM, AP_COM_HEADERS, snapshot.apoliceComissionamentos, (c) =>
    AP_COM_HEADERS.map((k) => {
      const v = (c as Record<string, unknown>)[k]
      if (parcelasJsonKeys.has(k)) {
        if (v == null) return ''
        if (Array.isArray(v)) return JSON.stringify(v)
        return String(v)
      }
      if (v instanceof Date) return v.toISOString()
      if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
      return v ?? ''
    }),
  )

  addTable(SHEET_AP_FEE, AP_FEE_HEADERS, snapshot.apoliceFees, (f) =>
    AP_FEE_HEADERS.map((k) => {
      const v = (f as Record<string, unknown>)[k]
      if (v instanceof Date) return v.toISOString()
      return v ?? ''
    }),
  )

  addTable(SHEET_IT, IT_HEADERS, snapshot.itens, (it) =>
    IT_HEADERS.map((k) => {
      const v = (it as Record<string, unknown>)[k]
      if (v instanceof Date) return v.toISOString()
      return v ?? ''
    }),
  )

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf)
}

export type ExcelParseFailure = {
  ok: false
  error: string
}

export type ExcelParseOk = { ok: true; snapshot: SegurosBaseSnapshotParsed }

export async function parseSegurosBaseExcelBuffer(buffer: Uint8Array): Promise<ExcelParseOk | ExcelParseFailure> {
  let wb: ExcelJS.Workbook
  try {
    wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer)
  } catch {
    return { ok: false, error: 'Não foi possível ler o Excel (.xlsx). Confirme que guardou como formato Excel.' }
  }

  const metaWs = findSheet(wb, SHEET_META)
  let fileSchemaVersion: number = SEGUROS_BASE_SNAPSHOT_VERSION
  let exportedAt: string | undefined
  if (metaWs) {
    const v = metaWs.getRow(1).getCell(2).value
    const ev = metaWs.getRow(2).getCell(2).value
    const vs = normalizeCellValue(v as ExcelJS.CellValue)
    if (typeof vs === 'number' && Number.isFinite(vs)) fileSchemaVersion = Math.round(vs)
    else if (typeof vs === 'string' && /^\d+$/.test(vs)) fileSchemaVersion = parseInt(vs, 10)
    const es = normalizeCellValue(ev as ExcelJS.CellValue)
    if (es !== null && typeof es === 'string') exportedAt = es
    else if (es !== null) exportedAt = String(es)
  }

  if (fileSchemaVersion !== SEGUROS_BASE_SNAPSHOT_VERSION) {
    return {
      ok: false,
      error: `Versão do ficheiro (_portal.schemaVersion=${fileSchemaVersion}) não suportada. Use a exportação atual (v${SEGUROS_BASE_SNAPSHOT_VERSION}).`,
    }
  }

  const wsG = findSheet(wb, SHEET_GRUPOS)
  const wsE = findSheet(wb, SHEET_EST)
  const wsA = findSheet(wb, SHEET_AP)
  const wsI = findSheet(wb, SHEET_IT)
  if (!wsG || !wsE || !wsA || !wsI) {
    return {
      ok: false,
      error:
        'Folhas em falta. Obrigatórias: grupos, estipulantes, apolices, itens. Opcionais: apolice_comissionamentos, apolice_fees. Exporte um modelo a partir do portal.',
    }
  }

  const rg = sheetToRows(wsG, GRUPO_HEADERS, { optionalHeaders: new Set(['classificacao']) })
  const re = sheetToRows(wsE, EST_HEADERS, { optionalHeaders: new Set(['cnae']) })
  const ra = sheetToRows(wsA, AP_HEADERS, { optionalHeaders: new Set(['operadoraId']) })
  const ri = sheetToRows(wsI, IT_HEADERS)

  const wsCom = findSheet(wb, SHEET_AP_COM)
  const rc = wsCom ? sheetToRows(wsCom, AP_COM_HEADERS) : { rows: [] as Record<string, unknown>[], errors: [] as string[] }
  const wsFee = findSheet(wb, SHEET_AP_FEE)
  const rf = wsFee ? sheetToRows(wsFee, AP_FEE_HEADERS) : { rows: [] as Record<string, unknown>[], errors: [] as string[] }

  const structural = [...rg.errors, ...re.errors, ...ra.errors, ...ri.errors, ...rc.errors, ...rf.errors]
  if (structural.length) {
    return { ok: false, error: structural.join(' ') }
  }

  const snapshotRaw = {
    schemaVersion: SEGUROS_BASE_SNAPSHOT_VERSION,
    exportedAt: exportedAt ?? new Date().toISOString(),
    grupos: rg.rows.map(mapGrupoRow),
    estipulantes: re.rows.map(mapEstRow),
    apolices: ra.rows.map(mapApRow),
    apoliceComissionamentos: rc.rows.map(mapComRow),
    apoliceFees: rf.rows.map(mapFeeRow),
    itens: ri.rows.map(mapItRow),
  }

  const parsed = segurosBaseSnapshotBodySchema.safeParse(snapshotRaw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    const msg = first?.message ?? 'Dados inválidos no Excel'
    return {
      ok: false,
      error: `${msg}${first?.path?.length ? ` (${String(first.path.join('.'))})` : ''}`,
    }
  }

  return { ok: true, snapshot: parsed.data }
}
