/** Tipo de titularidade conforme tabela GRAU DE PARENTESCO → TIPO. */
export type BeneficiarioTipoParentesco = 'T' | 'D' | 'A'

export const TIPO_PARENTESCO_LABEL: Record<BeneficiarioTipoParentesco, string> = {
  T: 'Titular',
  D: 'Dependente',
  A: 'Agregado',
}

export function normGrauParentesco(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

function normGrau(value: string | null | undefined): string {
  return normGrauParentesco(value)
}

/** Sufixos entre parênteses: (T), (C), (F), (A), (E), (TUT). */
const SUFIXO_TIPO: Record<string, BeneficiarioTipoParentesco> = {
  t: 'T',
  c: 'D',
  f: 'D',
  a: 'A',
  e: 'D',
  tut: 'D',
}

/** Graus sem sufixo — tabela de referência. */
const GRAU_EXATO: Record<string, BeneficiarioTipoParentesco> = {
  titular: 'T',
  conjuge: 'D',
  enteado: 'D',
  filho: 'D',
  'filho (a)': 'D',
  'filho (a) tutelados': 'D',
  'filho (a) maior de 24 anos': 'D',
  agregado: 'A',
  agregados: 'A',
  'parentesco do agregado': 'A',
  tutela: 'D',
  afastado: 'T',
  estagiario: 'T',
  'menor aprendiz': 'T',
  'licenca maternidade/paternidade': 'T',
  recluso: 'T',
}

function tipoFromSufixo(n: string): BeneficiarioTipoParentesco | null {
  const m = n.match(/^(.+?)\s*\(([a-z]+)\)\s*$/)
  if (!m) return null
  const base = m[1].trim()
  const suf = m[2]
  // "(a)" em filho/conjuge/enteado indica feminino, não tipo Agregado (A).
  if (suf === 'a' && /^(filho|conjuge|enteado|filha)\b/.test(base)) {
    return 'D'
  }
  return SUFIXO_TIPO[suf] ?? null
}

/**
 * Resolve T / D / A a partir do grau de parentesco da planilha.
 * Retorna null se vazio ou não reconhecido na tabela.
 */
export function resolveTipoParentesco(
  grauParentesco: string | null | undefined
): BeneficiarioTipoParentesco | null {
  const raw = String(grauParentesco ?? '').trim()
  if (!raw) return null

  const n = normGrau(raw)
  if (n === 't') return 'T'
  if (n === 'd') return 'D'
  if (n === 'a') return 'A'
  if (GRAU_EXATO[n]) return GRAU_EXATO[n]

  const fromSuffix = tipoFromSufixo(n)
  if (fromSuffix) return fromSuffix

  if (n.includes('agregad')) return 'A'
  if (n.includes('titular')) return 'T'
  if (
    n.includes('conjuge') ||
    n.includes('entead') ||
    n.includes('filho') ||
    n.includes('tutel')
  ) {
    return 'D'
  }

  return null
}

export function isGrauParentescoConhecido(grauParentesco: string | null | undefined): boolean {
  return resolveTipoParentesco(grauParentesco) !== null
}

export function isGrauTitular(grauParentesco: string | null | undefined): boolean {
  return resolveTipoParentesco(grauParentesco) === 'T'
}

export function isGrauConjuge(grauParentesco: string | null | undefined): boolean {
  return normGrauParentesco(grauParentesco).includes('conjuge')
}

export function isGrauFilho(grauParentesco: string | null | undefined): boolean {
  const n = normGrauParentesco(grauParentesco)
  return n.includes('filho') || n.includes('filha')
}
