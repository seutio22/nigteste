export type EstruturaOption = {
  code: string
  label: string
  /** Valores já persistidos no banco (ex.: `1-CODIGO_CONTRATO`). */
  legacyValues?: string[]
}

export const ESTRUTURA_SEM_ERROS_CODE = '0'

const EDGE_ITEMS: Omit<EstruturaOption, 'legacyValues'>[] = [
  { code: ESTRUTURA_SEM_ERROS_CODE, label: 'Sem erros' },
  { code: 'CODIGO_CONTRATO', label: 'CODIGO CONTRATO' },
  { code: 'CNPJ', label: 'CNPJ' },
  { code: 'CODIGO_SUB', label: 'CODIGO SUB' },
  { code: 'VIGENCIA', label: 'VIGENCIA' },
  { code: 'ASSOCIACAO_MOVE', label: 'ASSOCIAÇÃO NO MOVE' },
  { code: 'RAZAO_SOCIAL', label: 'RAZÃO SOCIAL' },
  { code: 'PLANO_COBERTURAS', label: 'Plano; Cadastrado/Coberturas' },
  { code: 'FINANCEIRO', label: 'Financeiro' },
  { code: 'LIMITE_TECNICO', label: 'Limite Técnico' },
  { code: 'COPARTICIPACAO', label: 'Coparticipação' },
  { code: 'CONTRIBUICAO', label: 'Contribuição' },
  { code: 'DADOS_GERAIS', label: 'Dados Gerais' },
  { code: 'ACESSOS', label: 'ACESSOS' },
  { code: 'ERRO_EQUIPE_ATENDIMENTO_MDS', label: 'EQUIPE ATENDIMENTO MDS' },
]

const MOVE_CODES = new Set([
  ESTRUTURA_SEM_ERROS_CODE,
  'CODIGO_CONTRATO',
  'CNPJ',
  'CODIGO_SUB',
  'VIGENCIA',
  'ASSOCIACAO_MOVE',
  'RAZAO_SOCIAL',
])

/** Opções exclusivas da estrutura MOVE (não aparecem no EDGE). */
const MOVE_ONLY_ITEMS: Omit<EstruturaOption, 'legacyValues'>[] = [
  { code: 'PLANOS', label: 'PLANOS' },
]

function withLegacyValues(item: Omit<EstruturaOption, 'legacyValues'>): EstruturaOption {
  if (item.code === ESTRUTURA_SEM_ERROS_CODE) {
    return { ...item, legacyValues: ['0'] }
  }
  const legacyValues = [`1-${item.code}`]
  if (item.code === 'ERRO_EQUIPE_ATENDIMENTO_MDS') {
    legacyValues.push('1-ERRO_EQUIPE_ATENDIMENTO_MDS')
  }
  return { ...item, legacyValues }
}

export const ESTRUTURA_EDGE_OPTIONS: EstruturaOption[] = EDGE_ITEMS.map(withLegacyValues)

export const ESTRUTURA_MOVE_OPTIONS: EstruturaOption[] = [
  ...ESTRUTURA_EDGE_OPTIONS.filter((o) => MOVE_CODES.has(o.code)),
  ...MOVE_ONLY_ITEMS.map(withLegacyValues),
]

export function getEstruturaOptionLabel(option: EstruturaOption): string {
  if (option.code === ESTRUTURA_SEM_ERROS_CODE) return '0 - Sem erros'
  return `1 - ${option.label}`
}

export function parseEstruturaStoredValue(raw: string): { code: string; qty: number } {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return { code: '', qty: 0 }
  if (trimmed === ESTRUTURA_SEM_ERROS_CODE) return { code: ESTRUTURA_SEM_ERROS_CODE, qty: 0 }

  const dash = trimmed.indexOf('-')
  if (dash <= 0) return { code: trimmed, qty: 1 }

  const qty = parseInt(trimmed.slice(0, dash), 10)
  const code = trimmed.slice(dash + 1)
  return { code, qty: Number.isFinite(qty) && qty > 0 ? qty : 1 }
}

export function getEstruturaCode(raw: string): string {
  return parseEstruturaStoredValue(raw).code
}

export function buildEstruturaStoredValue(code: string, qty: number): string {
  if (code === ESTRUTURA_SEM_ERROS_CODE) return ESTRUTURA_SEM_ERROS_CODE
  const safeQty = Math.max(1, Math.floor(Number(qty) || 1))
  return `${safeQty}-${code}`
}

function findOptionByStoredValue(value: string, options: EstruturaOption[]): EstruturaOption | undefined {
  if (value === ESTRUTURA_SEM_ERROS_CODE) {
    return options.find((o) => o.code === ESTRUTURA_SEM_ERROS_CODE)
  }

  const parsed = parseEstruturaStoredValue(value)
  return options.find(
    (o) =>
      o.code === parsed.code ||
      o.legacyValues?.includes(value) ||
      o.legacyValues?.some((legacy) => getEstruturaCode(legacy) === parsed.code)
  )
}

export function normalizeEstruturaArray(values: string[] | undefined, options: EstruturaOption[]): string[] {
  if (!values?.length) return []

  const normalized: string[] = []
  for (const raw of values) {
    const option = findOptionByStoredValue(raw, options)
    if (!option) {
      if (!normalized.includes(raw)) normalized.push(raw)
      continue
    }
    const { qty } = parseEstruturaStoredValue(raw)
    const built = buildEstruturaStoredValue(option.code, qty)
    if (!normalized.some((entry) => getEstruturaCode(entry) === option.code)) {
      normalized.push(built)
    }
  }
  return normalized
}

export function calcTotalFromEstrutura(values: string[] | undefined): number {
  if (!values?.length) return 0
  return values.reduce((sum, raw) => sum + parseEstruturaStoredValue(raw).qty, 0)
}

export function toggleEstruturaSelection(
  values: string[],
  code: string,
  selected: boolean,
  options: EstruturaOption[]
): string[] {
  const current = normalizeEstruturaArray(values, options)
  const withoutCode = current.filter((entry) => getEstruturaCode(entry) !== code)

  if (!selected) return withoutCode

  if (code === ESTRUTURA_SEM_ERROS_CODE) return [ESTRUTURA_SEM_ERROS_CODE]

  const withoutSemErros = withoutCode.filter((entry) => getEstruturaCode(entry) !== ESTRUTURA_SEM_ERROS_CODE)
  return [...withoutSemErros, buildEstruturaStoredValue(code, 1)]
}

export function updateEstruturaQuantity(
  values: string[],
  code: string,
  qty: number,
  options: EstruturaOption[]
): string[] {
  const current = normalizeEstruturaArray(values, options)
  return current.map((entry) =>
    getEstruturaCode(entry) === code ? buildEstruturaStoredValue(code, qty) : entry
  )
}

export function isEstruturaSelected(values: string[] | undefined, code: string, options: EstruturaOption[]): boolean {
  const normalized = normalizeEstruturaArray(values ?? [], options)
  return normalized.some((entry) => getEstruturaCode(entry) === code)
}

export function getEstruturaQuantity(values: string[] | undefined, code: string, options: EstruturaOption[]): number {
  const normalized = normalizeEstruturaArray(values ?? [], options)
  const entry = normalized.find((item) => getEstruturaCode(item) === code)
  return entry ? parseEstruturaStoredValue(entry).qty : 1
}

export function formatEstruturaEntriesForDisplay(
  values: string[] | undefined,
  options: EstruturaOption[]
): string {
  const normalized = normalizeEstruturaArray(values ?? [], options)
  if (!normalized.length) return '-'
  if (normalized.length === 1 && normalized[0] === ESTRUTURA_SEM_ERROS_CODE) {
    return getEstruturaOptionLabel(options.find((o) => o.code === ESTRUTURA_SEM_ERROS_CODE)!)
  }

  return normalized
    .filter((entry) => getEstruturaCode(entry) !== ESTRUTURA_SEM_ERROS_CODE)
    .map((entry) => {
      const { qty, code } = parseEstruturaStoredValue(entry)
      const option = options.find((o) => o.code === code)
      const label = option ? option.label : code
      return `${qty} × ${label}`
    })
    .join('; ')
}

export function countEstruturaSelections(values: string[] | undefined, options: EstruturaOption[]): number {
  const normalized = normalizeEstruturaArray(values ?? [], options)
  return normalized.filter((entry) => getEstruturaCode(entry) !== ESTRUTURA_SEM_ERROS_CODE).length
}
