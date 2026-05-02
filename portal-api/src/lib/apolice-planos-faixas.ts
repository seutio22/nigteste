/** Faixas etárias fixas para custo por idade nos planos da apólice. */
export const FAIXAS_ETARIAS_PLANO = [
  '0-18',
  '19-23',
  '24-28',
  '29-33',
  '34-38',
  '39-43',
  '44-48',
  '49-53',
  '54-58',
  '59+',
] as const

export type FaixaEtariaPlanoKey = (typeof FAIXAS_ETARIAS_PLANO)[number]

export function esvaziarFaixas(): Record<FaixaEtariaPlanoKey, number | null> {
  const o = {} as Record<FaixaEtariaPlanoKey, number | null>
  for (const k of FAIXAS_ETARIAS_PLANO) o[k] = null
  return o
}

export function normalizarValoresPorFaixa(input: unknown): Record<string, number | null> | null {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) return null
  const out: Record<string, number | null> = {}
  for (const k of FAIXAS_ETARIAS_PLANO) {
    const v = (input as Record<string, unknown>)[k]
    if (v === null || v === undefined || v === '') {
      out[k] = null
      continue
    }
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
    if (!Number.isFinite(n) || n < 0) return null
    out[k] = n
  }
  return out
}
