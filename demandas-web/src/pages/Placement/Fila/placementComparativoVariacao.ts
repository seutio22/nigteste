import type { ContratoPlanoColuna } from './placementContratoAtual'
import { formatCentsToBRL, parseBRLToCents } from './utils'

export type ColunaVariacaoComparativo = {
  isReferencia: boolean
  /** Rótulo da coluna usada como base (operadora · plano). */
  referenciaTitulo: string | null
  referenciaFatura: string | null
  /** Texto curto do que está sendo comparado (colunas não-referência). */
  comparacaoResumo: string | null
  variacaoPct: string | null
  variacaoPctValue: number | null
  impactoMensal: string | null
  impactoAnual: string | null
  economia: boolean
  neutro: boolean
}

function faturaCents(col: ContratoPlanoColuna): number | null {
  return parseBRLToCents(col.faturaEstimada)
}

function computeVariacao(refCents: number, colCents: number): Omit<ColunaVariacaoComparativo, 'isReferencia'> {
  const diff = colCents - refCents
  if (diff === 0) {
    return {
      variacaoPct: '0,00%',
      variacaoPctValue: 0,
      impactoMensal: formatCentsToBRL(0),
      impactoAnual: formatCentsToBRL(0),
      economia: false,
      neutro: true,
    }
  }
  const pct = refCents !== 0 ? (diff / refCents) * 100 : 0
  const economia = diff < 0
  const sinal = diff >= 0 ? '+' : '-'
  return {
    variacaoPct: `${sinal}${Math.abs(pct).toFixed(2).replace('.', ',')}%`,
    variacaoPctValue: pct,
    impactoMensal: `${sinal}${formatCentsToBRL(Math.abs(diff))}`,
    impactoAnual: `${sinal}${formatCentsToBRL(Math.abs(diff * 12))}`,
    economia,
    neutro: false,
  }
}

function refKey(col: ContratoPlanoColuna): string {
  return col.planoReferenciaId?.trim() || col.id
}

function tituloColuna(col: ContratoPlanoColuna): string {
  return `${col.operadora} · ${col.planoLabel}`
}

/** Referência = 1ª coluna ATUAL do mesmo plano; senão 1ª coluna do grupo. */
export function enrichColunasComVariacao(colunas: ContratoPlanoColuna[]): ContratoPlanoColuna[] {
  const groups = new Map<string, ContratoPlanoColuna[]>()
  for (const col of colunas) {
    const key = refKey(col)
    const list = groups.get(key) ?? []
    list.push(col)
    groups.set(key, list)
  }

  const refByGroup = new Map<string, ContratoPlanoColuna>()
  for (const [key, list] of groups) {
    const ref = list.find((c) => c.grupo === 'atual') ?? list[0]
    refByGroup.set(key, ref)
  }

  return colunas.map((col) => {
    const key = refKey(col)
    const refCol = refByGroup.get(key)
    if (!refCol || refCol.id === col.id) {
      return {
        ...col,
        variacao: {
          isReferencia: true,
          referenciaTitulo: tituloColuna(col),
          referenciaFatura: col.faturaEstimada,
          comparacaoResumo: null,
          variacaoPct: null,
          variacaoPctValue: null,
          impactoMensal: null,
          impactoAnual: null,
          economia: false,
          neutro: true,
        } satisfies ColunaVariacaoComparativo,
      }
    }

    const refTitulo = tituloColuna(refCol)
    const refCents = faturaCents(refCol)
    const colCents = faturaCents(col)
    if (refCents == null || colCents == null) {
      return {
        ...col,
        variacao: {
          isReferencia: false,
          referenciaTitulo: refTitulo,
          referenciaFatura: refCol.faturaEstimada,
          comparacaoResumo: `vs ${refTitulo}`,
          variacaoPct: null,
          variacaoPctValue: null,
          impactoMensal: null,
          impactoAnual: null,
          economia: false,
          neutro: true,
        },
      }
    }

    return {
      ...col,
      variacao: {
        isReferencia: false,
        referenciaTitulo: refTitulo,
        referenciaFatura: refCol.faturaEstimada,
        comparacaoResumo: `Fatura mensal vs ${refTitulo} (${refCol.faturaEstimada})`,
        ...computeVariacao(refCents, colCents),
      },
    }
  })
}

export function paginaTemFaixaEtariaReal(colunas: ContratoPlanoColuna[]): boolean {
  return colunas.some((c) => c.tipoCusto === 'faixa_etaria' && c.faixas.some((f) => f.vidas > 0 || f.custo !== '—'))
}

export function estudoTemFaixaEtariaReal(colunas: ContratoPlanoColuna[]): boolean {
  return paginaTemFaixaEtariaReal(colunas)
}
