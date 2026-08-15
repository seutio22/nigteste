/**
 * CNPJ numérico e alfanumérico (IN RFB 2.229/2024).
 * 14 posições: [A-Z0-9]{12} + DV numérico {2}. Valor do caractere = ASCII − 48.
 */

const CNPJ_BODY_RE = /^[A-Z0-9]{12}[0-9]{2}$/

export function normalizeCnpj(value: string | null | undefined): string {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 14)
}

export function isCnpjShape(value: string | null | undefined): boolean {
  return CNPJ_BODY_RE.test(normalizeCnpj(value))
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

export function isValidCnpj(value: string | null | undefined): boolean {
  const n = normalizeCnpj(value)
  if (!CNPJ_BODY_RE.test(n)) return false
  if (/^([A-Z0-9])\1{13}$/.test(n)) return false
  const dv1 = modulo11(n.slice(0, 12), PESOS_DV1)
  if (dv1 !== Number(n[12])) return false
  const dv2 = modulo11(n.slice(0, 13), PESOS_DV2)
  return dv2 === Number(n[13])
}
