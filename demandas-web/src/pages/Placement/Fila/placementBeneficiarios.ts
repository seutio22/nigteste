/** Colunas da base de beneficiários (etapa 1 — Em cotação). */
import {
  normalizeSpreadsheetCustoCell,
  parseBeneficiarioDataToIso,
} from './placementBeneficiariosParse'

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

/** Colunas essenciais para validação da base (devem existir no cabeçalho da planilha). */
export const BENEFICIARIO_TEMPLATE_REQUIRED_HEADERS = [
  'NOME',
  'DATA DE NASCIMENTO',
  'GRAU DE PARENTESCO',
  'CNPJ',
  'OPERADORA',
  'SEXO',
] as const

export type BeneficiariosSpreadsheetAudit = {
  /** Cabeçalhos reconhecidos e mapeados para campos do sistema. */
  mappedHeaders: string[]
  /** Colunas do modelo que não foram encontradas na planilha. */
  missingTemplateHeaders: string[]
  /** Colunas essenciais ausentes — validação ficará incompleta. */
  missingRequiredHeaders: string[]
  /** Cabeçalhos presentes na planilha mas ignorados (não constam no modelo). */
  unrecognizedHeaders: string[]
  /** Relação coluna do modelo ↔ cabeçalho encontrado na planilha enviada. */
  columnMappings: BeneficiarioTemplateColumnMapping[]
}

export type BeneficiarioTemplateColumnMapping = {
  templateLabel: string
  field: keyof BeneficiarioUploadRow
  required: boolean
  /** Cabeçalho literal da planilha enviada (quando reconhecido). */
  uploadedHeader: string | null
  status: 'ok' | 'missing' | 'required_missing'
  /** Coluna escolhida manualmente pelo usuário (não veio do reconhecimento automático). */
  manual?: boolean
}

/** Mapeamento manual: campo do modelo → cabeçalho literal da planilha enviada. */
export type BeneficiariosFieldHeaderMap = Partial<Record<keyof BeneficiarioUploadRow, string | null>>

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
  PARENTESCO: 'grauParentesco',
  'GRAU PARENTESCO': 'grauParentesco',
  'TIPO PARENTESCO': 'grauParentesco',
  'TIPO DE PARENTESCO': 'grauParentesco',
  STATUS: 'statusBeneficiario',
  'CID 10': 'cid10',
  CID10: 'cid10',
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

function resolveHeaderField(header: string): keyof BeneficiarioUploadRow | undefined {
  return HEADER_TO_FIELD[normHeader(header)]
}

export function getSpreadsheetRawHeaders(sheetRows: Record<string, unknown>[]): string[] {
  if (!sheetRows.length) return []
  return Object.keys(sheetRows[0]).filter((h) => String(h ?? '').trim())
}

function autoDetectFieldHeaderMap(
  sheetRows: Record<string, unknown>[]
): Map<keyof BeneficiarioUploadRow, string> {
  const fieldToUploadedHeader = new Map<keyof BeneficiarioUploadRow, string>()
  for (const raw of getSpreadsheetRawHeaders(sheetRows)) {
    const field = resolveHeaderField(raw)
    if (field && !fieldToUploadedHeader.has(field)) fieldToUploadedHeader.set(field, raw)
  }
  return fieldToUploadedHeader
}

function resolveFieldHeaderMap(
  sheetRows: Record<string, unknown>[],
  overrides?: BeneficiariosFieldHeaderMap
): {
  fieldToUploadedHeader: Map<keyof BeneficiarioUploadRow, string>
  manualFields: Set<keyof BeneficiarioUploadRow>
} {
  const rawHeaders = new Set(getSpreadsheetRawHeaders(sheetRows))
  const fieldToUploadedHeader = autoDetectFieldHeaderMap(sheetRows)
  const manualFields = new Set<keyof BeneficiarioUploadRow>()

  if (overrides) {
    const auto = autoDetectFieldHeaderMap(sheetRows)
    for (const [fieldKey, header] of Object.entries(overrides) as [
      keyof BeneficiarioUploadRow,
      string | null | undefined,
    ][]) {
      const autoHeader = auto.get(fieldKey) ?? null
      const normalized = header == null || header === '' ? null : header
      if (normalized !== autoHeader) manualFields.add(fieldKey)
      if (normalized == null) {
        fieldToUploadedHeader.delete(fieldKey)
        continue
      }
      if (rawHeaders.has(normalized)) {
        fieldToUploadedHeader.set(fieldKey, normalized)
      }
    }
  }

  return { fieldToUploadedHeader, manualFields }
}

export function fieldHeaderMapFromAudit(audit: BeneficiariosSpreadsheetAudit): BeneficiariosFieldHeaderMap {
  const map: BeneficiariosFieldHeaderMap = {}
  for (const row of audit.columnMappings) {
    if (row.uploadedHeader) map[row.field] = row.uploadedHeader
  }
  return map
}

/** Compara cabeçalhos da planilha com o modelo oficial. */
export function auditBeneficiariosSpreadsheetHeaders(
  sheetRows: Record<string, unknown>[],
  overrides?: BeneficiariosFieldHeaderMap
): BeneficiariosSpreadsheetAudit {
  const rawHeaders = getSpreadsheetRawHeaders(sheetRows)
  const { fieldToUploadedHeader, manualFields } = resolveFieldHeaderMap(sheetRows, overrides)
  const usedHeaders = new Set(fieldToUploadedHeader.values())
  const mappedHeaders = [...usedHeaders]
  const unrecognizedHeaders = rawHeaders.filter((h) => !usedHeaders.has(h))

  const columnMappings: BeneficiarioTemplateColumnMapping[] = BENEFICIARIO_COLUMN_LABELS.map(
    (templateLabel) => {
      const field = resolveHeaderField(templateLabel)!
      const required = (BENEFICIARIO_TEMPLATE_REQUIRED_HEADERS as readonly string[]).includes(
        templateLabel
      )
      const uploadedHeader = fieldToUploadedHeader.get(field) ?? null
      let status: BeneficiarioTemplateColumnMapping['status'] = 'ok'
      if (!uploadedHeader) {
        status = required ? 'required_missing' : 'missing'
      }
      const manual = manualFields.has(field)
      return { templateLabel, field, required, uploadedHeader, status, manual }
    }
  )

  const missingTemplateHeaders = columnMappings
    .filter((m) => !m.uploadedHeader)
    .map((m) => m.templateLabel)

  const missingRequiredHeaders = columnMappings
    .filter((m) => m.status === 'required_missing')
    .map((m) => m.templateLabel)

  return {
    mappedHeaders,
    missingTemplateHeaders,
    missingRequiredHeaders,
    unrecognizedHeaders,
    columnMappings,
  }
}

export function formatBeneficiariosSpreadsheetAuditMessage(audit: BeneficiariosSpreadsheetAudit): string {
  const parts: string[] = []
  if (audit.missingRequiredHeaders.length) {
    parts.push(
      `Colunas essenciais ausentes: ${audit.missingRequiredHeaders.join(', ')}. Os dados podem ter sido importados, mas a validação não conseguirá conferir esses campos.`
    )
  }
  if (audit.missingTemplateHeaders.length > audit.missingRequiredHeaders.length) {
    const optional = audit.missingTemplateHeaders.filter(
      (h) => !(BENEFICIARIO_TEMPLATE_REQUIRED_HEADERS as readonly string[]).includes(h)
    )
    if (optional.length) {
      parts.push(`Outras colunas do modelo não encontradas: ${optional.join(', ')}.`)
    }
  }
  if (audit.unrecognizedHeaders.length) {
    parts.push(
      `Colunas ignoradas (não constam no modelo): ${audit.unrecognizedHeaders.slice(0, 8).join(', ')}${
        audit.unrecognizedHeaders.length > 8 ? '…' : ''
      }.`
    )
  }
  return parts.join(' ')
}

export function spreadsheetAuditHasIssues(audit: BeneficiariosSpreadsheetAudit): boolean {
  return audit.missingRequiredHeaders.length > 0 || audit.unrecognizedHeaders.length > 0
}

function parseDateCell(value: unknown): string | null {
  return parseBeneficiarioDataToIso(value)
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
  if (field === 'custoPerCapita') {
    return normalizeSpreadsheetCustoCell(raw)
  }
  const s = String(raw ?? '').trim()
  return s || null
}

/** Linha da planilha precisa de identificação mínima (nome, matrícula ou CNPJ). */
export function beneficiarioRowHasMeaningfulData(rec: BeneficiarioUploadRow): boolean {
  return (
    String(rec.nome ?? '').trim().length > 0 ||
    String(rec.matricula ?? '').trim().length > 0 ||
    String(rec.cnpj ?? '').trim().length > 0
  )
}

/** Converte linhas da planilha (objeto header→valor) para payload da API. */
export function mapSpreadsheetRowsToBeneficiarios(
  sheetRows: Record<string, unknown>[],
  overrides?: BeneficiariosFieldHeaderMap
): BeneficiarioUploadRow[] {
  if (!sheetRows.length) return []

  const { fieldToUploadedHeader } = resolveFieldHeaderMap(sheetRows, overrides)
  if (fieldToUploadedHeader.size === 0) return []

  const out: BeneficiarioUploadRow[] = []
  for (const row of sheetRows) {
    const rec: BeneficiarioUploadRow = {}
    for (const [field, header] of fieldToUploadedHeader.entries()) {
      const val = cellToFieldValue(field, row[header])
      ;(rec as Record<string, unknown>)[field] = val
    }
    if (beneficiarioRowHasMeaningfulData(rec)) out.push(rec)
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
