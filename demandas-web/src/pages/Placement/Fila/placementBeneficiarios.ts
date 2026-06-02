/** Colunas da base de beneficiários (etapa 1 — Em cotação). */
export const BENEFICIARIO_COLUMN_LABELS = [
  'ORDEM',
  'EMPRESA',
  'SUB',
  'CNPJ',
  'MATRICULA',
  'SEXO',
  'NOME',
  'DATA DE NASCIMENTO',
  'GRAU DE PARENTESCO',
  'STATUS',
  'CID 10',
  'MOTIVO DO AFASTAMENTO',
  'DATA DE INÍCIO DO BENEFÍCIO',
  'DATA FINAL DO BENEFÍCIO',
  'CARGO',
  'CIDADE',
  'UF',
  'OPERADORA',
  'PLANO ATUAL',
  'ACOMODAÇÃO',
  'CUSTO PER CAPITA',
] as const

export const GRAU_PARENTESCO_OPCOES = [
  'Titular',
  'Filho (a)',
  'Agregados',
  'Filho (a) maior de 24 anos',
  'Filho (a) Tutelados',
] as const

export const STATUS_BENEFICIARIO_OPCOES = [
  'Ativo',
  'Afastado',
  'Crônico',
  'Home Care',
  'Gestante',
  'Remido',
  'Estagiário',
  'Demitido/Inativo',
  'Parentesco do Agregado',
  'Aposentado por Invalidez',
  'Tempo de Serviço',
  'Prestador de Serviço PJ',
] as const

export const CID10_OPCOES = [
  'Afastado',
  'Gestante',
  'Caso Crônico',
  'Home Care',
  'Aposentado por Invalidez',
  'Transexual',
] as const

export type PlacementBeneficiario = {
  id: string
  cotacaoId: string
  ordem?: number | null
  empresa?: string | null
  sub?: string | null
  cnpj?: string | null
  matricula?: string | null
  sexo?: string | null
  nome?: string | null
  dataNascimento?: string | null
  grauParentesco?: string | null
  statusBeneficiario?: string | null
  cid10?: string | null
  motivoAfastamento?: string | null
  dataInicioBeneficio?: string | null
  dataFinalBeneficio?: string | null
  cargo?: string | null
  cidade?: string | null
  uf?: string | null
  operadora?: string | null
  planoAtual?: string | null
  acomodacao?: string | null
  custoPerCapita?: string | null
}

export type BeneficiarioUploadRow = Omit<PlacementBeneficiario, 'id' | 'cotacaoId'>

function normHeader(h: string): string {
  return String(h ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

const HEADER_TO_FIELD: Record<string, keyof BeneficiarioUploadRow> = {
  ORDEM: 'ordem',
  EMPRESA: 'empresa',
  SUB: 'sub',
  CNPJ: 'cnpj',
  MATRICULA: 'matricula',
  SEXO: 'sexo',
  NOME: 'nome',
  'DATA DE NASCIMENTO': 'dataNascimento',
  'GRAU DE PARENTESCO': 'grauParentesco',
  STATUS: 'statusBeneficiario',
  'CID 10': 'cid10',
  'CID10': 'cid10',
  'MOTIVO DO AFASTAMENTO': 'motivoAfastamento',
  'DATA DE INICIO DO BENEFICIO': 'dataInicioBeneficio',
  'DATA DE INÍCIO DO BENEFÍCIO': 'dataInicioBeneficio',
  'DATA FINAL DO BENEFICIO': 'dataFinalBeneficio',
  'DATA FINAL DO BENEFÍCIO': 'dataFinalBeneficio',
  CARGO: 'cargo',
  CIDADE: 'cidade',
  UF: 'uf',
  OPERADORA: 'operadora',
  'PLANO ATUAL': 'planoAtual',
  ACOMODACAO: 'acomodacao',
  'ACOMODAÇÃO': 'acomodacao',
  'CUSTO PER CAPITA': 'custoPerCapita',
}

function excelSerialToIso(n: number): string | null {
  if (!Number.isFinite(n) || n < 1) return null
  const utc = (n - 25569) * 86400 * 1000
  const d = new Date(utc)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function parseDateCell(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return excelSerialToIso(value)
  const s = String(value).trim()
  if (!s) return null
  const br = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (br) {
    const dd = br[1].padStart(2, '0')
    const mm = br[2].padStart(2, '0')
    let yyyy = br[3]
    if (yyyy.length === 2) yyyy = `20${yyyy}`
    return `${yyyy}-${mm}-${dd}`
  }
  const iso = s.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function cellToFieldValue(field: keyof BeneficiarioUploadRow, raw: unknown): unknown {
  if (field === 'ordem') {
    const n = Number(String(raw ?? '').replace(/\D/g, ''))
    return Number.isFinite(n) ? n : null
  }
  if (
    field === 'dataNascimento' ||
    field === 'dataInicioBeneficio' ||
    field === 'dataFinalBeneficio'
  ) {
    return parseDateCell(raw)
  }
  const s = String(raw ?? '').trim()
  return s || null
}

/** Converte linhas da planilha (objeto header→valor) para payload da API. */
export function mapSpreadsheetRowsToBeneficiarios(
  sheetRows: Record<string, unknown>[]
): BeneficiarioUploadRow[] {
  if (!sheetRows.length) return []

  const first = sheetRows[0]
  const headerMap: Record<string, keyof BeneficiarioUploadRow> = {}
  for (const key of Object.keys(first)) {
    const field = HEADER_TO_FIELD[normHeader(key)]
    if (field) headerMap[key] = field
  }

  const out: BeneficiarioUploadRow[] = []
  for (const row of sheetRows) {
    const rec: BeneficiarioUploadRow = {}
    let hasData = false
    for (const [header, field] of Object.entries(headerMap)) {
      const val = cellToFieldValue(field, row[header])
      if (val != null && val !== '') hasData = true
      ;(rec as Record<string, unknown>)[field] = val
    }
    if (hasData) out.push(rec)
  }
  return out
}

export async function downloadBeneficiariosTemplateXlsx(): Promise<void> {
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.aoa_to_sheet([BENEFICIARIO_COLUMN_LABELS as unknown as string[]])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Beneficiarios')
  XLSX.writeFile(wb, 'placement-beneficiarios-template.xlsx')
}
