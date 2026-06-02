import {
  FAIXAS_ETARIAS,
  type FaixaEtariaKey,
  emptyCustosFaixa,
  emptyVidasFaixa,
} from './placementCotacaoDetalhes'

export const FAIXA_ETARIA_UPLOAD_HEADERS = ['Faixa', 'Vidas', 'Custo (R$/vida)'] as const

export type FaixaEtariaUploadResult = {
  vidasFaixa: Record<FaixaEtariaKey, string>
  custosFaixa: Record<FaixaEtariaKey, string>
  importedCount: number
}

function normHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function resolveFaixaEtariaKey(raw: unknown): FaixaEtariaKey | null {
  const t = String(raw ?? '').trim()
  if (!t) return null
  const lower = t.toLowerCase()
  for (const fx of FAIXAS_ETARIAS) {
    if (lower === fx.key) return fx.key
    if (lower === fx.label.toLowerCase()) return fx.key
    const compact = lower.replace(/\s+/g, '')
    const labelCompact = fx.label.replace(/\s+/g, '').toLowerCase()
    if (compact === labelCompact) return fx.key
  }
  if (/59/.test(lower) && (lower.includes('mais') || lower.includes('+'))) {
    return '59-mais'
  }
  return null
}

function parseVidasCell(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  const n = Number(String(raw).replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return ''
  return String(Math.floor(n))
}

function parseCustoCell(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return ''
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }
  return String(raw).trim()
}

export function parseFaixaEtariaSheetRows(
  rows: Record<string, unknown>[]
): FaixaEtariaUploadResult {
  if (!rows.length) {
    throw new Error('Planilha vazia.')
  }

  const headers = Object.keys(rows[0])
  let colFaixa = ''
  let colVidas = ''
  let colCusto = ''

  for (const h of headers) {
    const n = normHeader(h)
    if (!colFaixa && (n === 'FAIXA' || n.startsWith('FAIXA '))) colFaixa = h
    if (!colVidas && (n === 'VIDAS' || n === 'QTD' || n === 'QUANTIDADE')) colVidas = h
    if (!colCusto && n.startsWith('CUSTO')) colCusto = h
  }

  if (!colFaixa || !colVidas || !colCusto) {
    throw new Error('Use o modelo com as colunas Faixa, Vidas e Custo (R$/vida).')
  }

  const vidasFaixa = emptyVidasFaixa()
  const custosFaixa = emptyCustosFaixa()
  let importedCount = 0

  for (const row of rows) {
    const key = resolveFaixaEtariaKey(row[colFaixa])
    if (!key) continue

    const vidas = parseVidasCell(row[colVidas])
    const custo = parseCustoCell(row[colCusto])
    if (!vidas && !custo) continue

    if (vidas) vidasFaixa[key] = vidas
    if (custo) custosFaixa[key] = custo
    importedCount++
  }

  if (importedCount === 0) {
    throw new Error('Nenhuma faixa etária reconhecida. Confira os rótulos na coluna Faixa.')
  }

  return { vidasFaixa, custosFaixa, importedCount }
}

export async function readFaixaEtariaUploadFile(file: File): Promise<FaixaEtariaUploadResult> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: false })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('Planilha vazia.')
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return parseFaixaEtariaSheetRows(json)
}

export async function downloadFaixaEtariaTemplateXlsx(): Promise<void> {
  const XLSX = await import('xlsx')
  const rows: (string | number)[][] = [
    [...FAIXA_ETARIA_UPLOAD_HEADERS],
    ...FAIXAS_ETARIAS.map((fx) => [fx.label, '', '']),
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 16 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Faixas')
  XLSX.writeFile(wb, 'placement-faixa-etaria-template.xlsx')
}
