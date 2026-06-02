import * as XLSX from 'xlsx'

/** Normaliza cabeçalho para comparação (sem acentos, minúsculas). */
export function normHeaderKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
}

/** Lê a primeira planilha do arquivo como lista de objetos (cabeçalho = chaves). */
export async function readSpreadsheetRows(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('Planilha vazia.')
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''))
}

/** Busca valor da linha por possíveis rótulos de coluna. */
export function pickCell(row: Record<string, unknown>, labels: string[]): string {
  const wanted = new Set(labels.map(normHeaderKey))
  for (const [key, val] of Object.entries(row)) {
    if (wanted.has(normHeaderKey(key))) {
      return String(val ?? '').trim()
    }
  }
  return ''
}

export function onlyDigits(value: string, maxLen?: number): string {
  const d = value.replace(/\D/g, '')
  return maxLen != null ? d.slice(0, maxLen) : d
}

export type SpreadsheetImportResult = {
  imported: number
  errors: string[]
}

/** Gera e baixa modelo .xlsx com cabeçalhos e linha(s) de exemplo. */
export function downloadXlsxTemplate(
  filename: string,
  headers: readonly string[],
  exampleRows: Record<string, unknown>[] = []
): void {
  const rows =
    exampleRows.length > 0
      ? exampleRows
      : [Object.fromEntries(headers.map((h) => [h, '']))]
  const sheet = XLSX.utils.json_to_sheet(rows, { header: [...headers] })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Dados')
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}
