/**
 * Qualidade automática a partir da quantidade de retornos:
 * 0 → 3 (excelente), 1 → 2 (bom), 2 → 1 (mediano), ≥3 → 0 (ruim).
 * Retorna `undefined` se não for possível inferir (campo vazio / inválido).
 */
export function qualidadeFromQtdRetornos(qtd: unknown): string | undefined {
  if (qtd === '' || qtd === undefined || qtd === null) return undefined
  const n = Number(qtd)
  if (!Number.isFinite(n) || n < 0) return undefined
  const r = Math.floor(n)
  if (r === 0) return '3'
  if (r === 1) return '2'
  if (r === 2) return '1'
  return '0'
}
