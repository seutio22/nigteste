/** Densidade do comparativo Contrato Atual (planos por slide). */
export type ContratoAtualPlanosPorSlide = 2 | 3 | 4 | 5 | 6

export type ContratoAtualLayoutSpec = {
  colSlots: number
  legendW: number
  tabH: number
  logoWellH: number
  faixaRowH: number
  faixaCustoFont: number
  faixaVidasFont: number
  faixaVidasLabelFont: number
  compact: boolean
  /** Altura máxima útil do corpo do comparativo dentro do slide (px). */
  bodyMaxHeight: number
}

export function getContratoAtualLayoutSpec(planosPorSlide: ContratoAtualPlanosPorSlide): ContratoAtualLayoutSpec {
  switch (planosPorSlide) {
    case 2:
      return {
        colSlots: 2,
        legendW: 140,
        tabH: 56,
        logoWellH: 40,
        faixaRowH: 26,
        faixaCustoFont: 9,
        faixaVidasFont: 7.5,
        faixaVidasLabelFont: 6,
        compact: false,
        bodyMaxHeight: 520,
      }
    case 4:
      return {
        colSlots: 4,
        legendW: 118,
        tabH: 50,
        logoWellH: 34,
        faixaRowH: 24,
        faixaCustoFont: 7.5,
        faixaVidasFont: 6,
        faixaVidasLabelFont: 5.5,
        compact: true,
        bodyMaxHeight: 500,
      }
    case 5:
      return {
        colSlots: 5,
        legendW: 108,
        tabH: 46,
        logoWellH: 30,
        faixaRowH: 22,
        faixaCustoFont: 7,
        faixaVidasFont: 6,
        faixaVidasLabelFont: 5,
        compact: true,
        bodyMaxHeight: 500,
      }
    case 6:
      return {
        colSlots: 6,
        legendW: 96,
        tabH: 42,
        logoWellH: 26,
        faixaRowH: 20,
        faixaCustoFont: 6.5,
        faixaVidasFont: 5.5,
        faixaVidasLabelFont: 5,
        compact: true,
        bodyMaxHeight: 500,
      }
    case 3:
    default:
      return {
        colSlots: 3,
        legendW: 132,
        tabH: 54,
        logoWellH: 38,
        faixaRowH: 26,
        faixaCustoFont: 8.5,
        faixaVidasFont: 7,
        faixaVidasLabelFont: 6,
        compact: false,
        bodyMaxHeight: 500,
      }
  }
}

export type ContratoGridHeightSpec = {
  useFaixa: boolean
  faixaRowCount: number
  showContrib: boolean
  showCopart: boolean
  hasPerCapita: boolean
  elegH: number
}

/** Dimensões fixas do slide (16:9). */
export const CONTRATO_SLIDE_W = 1280
export const CONTRATO_SLIDE_H = 720

/** Altura máxima da grade dentro do slide, descontando cabeçalho, totais e margens. */
export function computeContratoGridMaxHeight(opts: {
  hasMetaLine: boolean
  showPageIndicator: boolean
}): number {
  const header = 60
  const slideBodyPad = 12
  const paperPad = 20
  const meta = opts.hasMetaLine ? 38 : 0
  const totalBar = 78
  const pageInd = opts.showPageIndicator ? 28 : 0
  const buffer = 8
  return CONTRATO_SLIDE_H - header - slideBodyPad - paperPad - meta - totalBar - pageInd - buffer
}

export function sumContratoGridHeight(
  spec: ContratoGridHeightSpec,
  tabRowH: number,
  faixaRowH: number,
  elegH: number
): number {
  let total = tabRowH + elegH + 46
  if (spec.showContrib) total += 38
  if (spec.showCopart) total += 42
  if (spec.hasPerCapita) total += faixaRowH
  if (spec.useFaixa) {
    total += 26 + spec.faixaRowCount * faixaRowH + 72
  } else {
    total += 40 + 72
  }
  return total
}

/** Altura mínima legível por linha de faixa (px) — valor + vidas em 2 linhas. */
export const CONTRATO_FAIXA_ROW_MIN = 24

/** Reduz altura das faixas; se ainda não couber, use gridScale em computeContratoGridLayout. */
export function scaleFaixaRowHeight(
  layout: ContratoAtualLayoutSpec,
  spec: ContratoGridHeightSpec,
  tabRowH: number,
  gridMaxHeight: number,
  elegH: number
): number {
  if (!spec.useFaixa || spec.faixaRowCount <= 0) {
    return layout.faixaRowH
  }

  const fixed =
    tabRowH +
    elegH +
    46 +
    (spec.showContrib ? 38 : 0) +
    (spec.showCopart ? 42 : 0) +
    (spec.hasPerCapita ? layout.faixaRowH : 0) +
    26 +
    72

  const available = gridMaxHeight - fixed
  const ideal = layout.faixaRowH * spec.faixaRowCount
  if (ideal <= available) return layout.faixaRowH
  return Math.max(CONTRATO_FAIXA_ROW_MIN, Math.floor(available / spec.faixaRowCount))
}

export function computeContratoGridLayout(
  layout: ContratoAtualLayoutSpec,
  spec: ContratoGridHeightSpec,
  tabRowH: number,
  gridMaxHeight: number,
  elegH: number
): { faixaRowH: number; gridHeight: number; gridScale: number } {
  const faixaRowH = scaleFaixaRowHeight(layout, spec, tabRowH, gridMaxHeight, elegH)
  const gridHeight = sumContratoGridHeight(spec, tabRowH, faixaRowH, elegH)
  const gridScale = gridHeight > gridMaxHeight ? gridMaxHeight / gridHeight : 1
  return { faixaRowH, gridHeight, gridScale }
}

export const CONTRATO_ATUAL_PLANOS_POR_SLIDE_OPCOES: { value: ContratoAtualPlanosPorSlide; label: string }[] = [
  { value: 2, label: '2 planos' },
  { value: 3, label: '3 planos' },
  { value: 4, label: '4 planos' },
  { value: 5, label: '5 planos' },
  { value: 6, label: '6 planos' },
]

/** Máximo de planos por slide (disposição mais densa). */
export const CONTRATO_ATUAL_MAX_PLANOS_POR_SLIDE = 6
