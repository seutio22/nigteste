/**
 * Formatação numérica pt-BR: milhar com ponto (ex.: 4.759).
 * Decimal com vírgula quando usar formatDecimalPtBR.
 */

const intFmt = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
  minimumFractionDigits: 0
})

export function formatIntegerPtBR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '0'
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(/\s/g, ''))
  if (Number.isNaN(n)) return typeof value === 'string' ? value : '0'
  return intFmt.format(Math.round(n))
}

export function formatDecimalPtBR(value: number | string | null | undefined, maxFractionDigits = 2): string {
  if (value === null || value === undefined || value === '') return '0'
  const n = typeof value === 'number' ? value : Number(String(value).trim().replace(/\s/g, '').replace(',', '.'))
  if (Number.isNaN(n)) return typeof value === 'string' ? value : '0'
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits
  }).format(n)
}

/** Inteiro se próximo de inteiro; senão decimal. */
export function formatNumberPtBR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0'
  if (Math.abs(value - Math.round(value)) < 1e-9) return formatIntegerPtBR(Math.round(value))
  return formatDecimalPtBR(value)
}
