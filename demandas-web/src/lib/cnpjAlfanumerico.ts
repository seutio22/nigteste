/**
 * CNPJ numérico e alfanumérico (IN RFB 2.229/2024 / NT COCAD).
 * 14 posições: 12 alfanuméricas (A–Z, 0–9) + 2 dígitos verificadores numéricos.
 * Máscara: AA.AAA.AAA/AAAA-DV. DV = módulo 11 com valor ASCII − 48.
 */

const CNPJ_BODY_RE = /^[A-Z0-9]{12}[0-9]{2}$/

export function normalizeCnpj(value: string | null | undefined): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 14)
}

/** @deprecated nome legado — normaliza CNPJ alfanumérico (não remove letras). */
export function onlyDigitsCnpj(value: string): string {
  return normalizeCnpj(value)
}

export function formatCnpjMask(value: string | null | undefined): string {
  const d = normalizeCnpj(value)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

export function formatCnpj14(value: string | null | undefined): string {
  const d = normalizeCnpj(value)
  if (d.length !== 14) return ''
  return formatCnpjMask(d)
}

function charValorAscii48(ch: string): number {
  return ch.charCodeAt(0) - 48
}

function modulo11(chars: string, pesos: number[]): number {
  let soma = 0
  for (let i = 0; i < chars.length; i++) {
    soma += charValorAscii48(chars[i]!) * pesos[i]!
  }
  const resto = soma % 11
  return resto === 0 || resto === 1 ? 0 : 11 - resto
}

const PESOS_DV1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_DV2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

export function isCnpjShape(value: string | null | undefined): boolean {
  return CNPJ_BODY_RE.test(normalizeCnpj(value))
}

export function isValidCnpj(value: string | null | undefined): boolean {
  const n = normalizeCnpj(value)
  if (!CNPJ_BODY_RE.test(n)) return false
  if (/^([A-Z0-9])\1{13}$/.test(n)) return false
  const dv1 = modulo11(n.slice(0, 12), PESOS_DV1)
  if (dv1 !== Number(n[12])) return false
  const dv2 = modulo11(n.slice(0, 13), PESOS_DV2)
  return dv2 === Number(n[13])
}

export function cnpjProntoParaConsulta(value: string | null | undefined): boolean {
  return normalizeCnpj(value).length === 14 && isCnpjShape(value)
}
