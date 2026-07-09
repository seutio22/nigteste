/** Densidade do comparativo Contrato Atual (planos por slide). */
export type ContratoAtualPlanosPorSlide = 2 | 3 | 4 | 5 | 6 | 7

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
  /** Largura mínima por coluna de plano no modo workspace (px). */
  minColWidth?: number
}

export function getContratoAtualLayoutSpec(planosPorSlide: ContratoAtualPlanosPorSlide): ContratoAtualLayoutSpec {
  switch (planosPorSlide) {
    case 2:
      return {
        colSlots: 2,
        legendW: 140,
        tabH: 56,
        logoWellH: 40,
        faixaRowH: 28,
        faixaCustoFont: 10.5,
        faixaVidasFont: 8.5,
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
        faixaRowH: 26,
        faixaCustoFont: 9,
        faixaVidasFont: 7.5,
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
        faixaRowH: 24,
        faixaCustoFont: 8.5,
        faixaVidasFont: 7,
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
        faixaRowH: 22,
        faixaCustoFont: 8,
        faixaVidasFont: 6.5,
        faixaVidasLabelFont: 5,
        compact: true,
        bodyMaxHeight: 500,
      }
    case 7:
      return {
        colSlots: 7,
        legendW: 88,
        tabH: 40,
        logoWellH: 24,
        faixaRowH: 20,
        faixaCustoFont: 7.5,
        faixaVidasFont: 6,
        faixaVidasLabelFont: 4.5,
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
        faixaRowH: 28,
        faixaCustoFont: 10,
        faixaVidasFont: 8,
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
  { value: 7, label: '7 planos' },
]

/** Layout legível em painel amplo (sem escala para caber no slide 16:9). */
export function getContratoAtualWorkspaceLayoutSpec(count: number): ContratoAtualLayoutSpec {
  const slots = Math.max(2, Math.min(count, CONTRATO_ATUAL_MAX_PLANOS_POR_SLIDE))
  if (slots <= 3) {
    return {
      colSlots: slots,
      legendW: 180,
      tabH: 84,
      logoWellH: 52,
      faixaRowH: 40,
      faixaCustoFont: 13.5,
      faixaVidasFont: 11,
      faixaVidasLabelFont: 8.5,
      compact: false,
      bodyMaxHeight: 12000,
      minColWidth: 240,
    }
  }
  if (slots <= 5) {
    return {
      colSlots: slots,
      legendW: 160,
      tabH: 76,
      logoWellH: 46,
      faixaRowH: 36,
      faixaCustoFont: 12,
      faixaVidasFont: 10.5,
      faixaVidasLabelFont: 8,
      compact: false,
      bodyMaxHeight: 12000,
      minColWidth: 220,
    }
  }
  return {
    colSlots: slots,
    legendW: 140,
    tabH: 68,
    logoWellH: 40,
    faixaRowH: 32,
    faixaCustoFont: 11,
    faixaVidasFont: 9.5,
    faixaVidasLabelFont: 7.5,
    compact: false,
    bodyMaxHeight: 12000,
    minColWidth: 200,
  }
}

/** Escolhe layout conforme quantidade de colunas na página. */
export function planosPorSlideFromCount(count: number): ContratoAtualPlanosPorSlide {
  const n = Math.max(2, Math.min(count, CONTRATO_ATUAL_MAX_PLANOS_POR_SLIDE))
  if (n === 2 || n === 3 || n === 4 || n === 5 || n === 6 || n === 7) return n
  return 3
}

/** Máximo de planos por slide (disposição mais densa). */
export const CONTRATO_ATUAL_MAX_PLANOS_POR_SLIDE = 7

export type ContratoGridTypography = {
  legend: number
  faixaLabel: number
  body: number
  micro: number
  chip: number
  copart: number
  tabOperadora: number
  tabProduto: number
  tabGrupo: number
  tabPlano: number
  tabAcomodacao: number
  totalBarTitle: number
  totalBarMeta: number
  totalBarLabel: number
  totalBarValue: number
  faturaLabel: number
  faturaValue: number
  faturaMicro: number
  faturaVarPct: number
  faturaVarDetail: number
  vidasNum: number
  vidasSuffix: number
  metaLine: number
  contrib: number
  perCapita: number
  faixaSection: number
  premio: number
  dash: number
}

const SLIDE_TYPO_NORMAL: ContratoGridTypography = {
  legend: 9.5,
  faixaLabel: 8,
  body: 9,
  micro: 7.5,
  chip: 7.5,
  copart: 7.5,
  tabOperadora: 10,
  tabProduto: 9,
  tabGrupo: 8.5,
  tabPlano: 13,
  tabAcomodacao: 9,
  totalBarTitle: 9,
  totalBarMeta: 10,
  totalBarLabel: 8,
  totalBarValue: 20,
  faturaLabel: 7.5,
  faturaValue: 18,
  faturaMicro: 7,
  faturaVarPct: 13,
  faturaVarDetail: 6.5,
  vidasNum: 18,
  vidasSuffix: 8,
  metaLine: 9,
  contrib: 8.5,
  perCapita: 9,
  faixaSection: 7,
  premio: 12,
  dash: 8,
}

const SLIDE_TYPO_COMPACT: ContratoGridTypography = {
  ...SLIDE_TYPO_NORMAL,
  legend: 9,
  faixaLabel: 7.5,
  body: 8,
  micro: 7,
  chip: 7,
  copart: 7,
  tabOperadora: 9,
  tabProduto: 8,
  tabGrupo: 7.5,
  tabPlano: 11.5,
  tabAcomodacao: 8,
  contrib: 8,
  perCapita: 8,
  vidasNum: 16,
  vidasSuffix: 7.5,
  premio: 11,
}

const WORKSPACE_TYPO_SPARSE: ContratoGridTypography = {
  legend: 11.5,
  faixaLabel: 10,
  body: 11,
  micro: 9,
  chip: 9.5,
  copart: 9.5,
  tabOperadora: 12,
  tabProduto: 11,
  tabGrupo: 10,
  tabPlano: 15,
  tabAcomodacao: 10.5,
  totalBarTitle: 10.5,
  totalBarMeta: 11.5,
  totalBarLabel: 9.5,
  totalBarValue: 22,
  faturaLabel: 9.5,
  faturaValue: 21,
  faturaMicro: 8.5,
  faturaVarPct: 15,
  faturaVarDetail: 8,
  vidasNum: 22,
  vidasSuffix: 10,
  metaLine: 10.5,
  contrib: 10.5,
  perCapita: 10.5,
  faixaSection: 8.5,
  premio: 14,
  dash: 9.5,
}

const WORKSPACE_TYPO_MID: ContratoGridTypography = {
  ...WORKSPACE_TYPO_SPARSE,
  legend: 11,
  faixaLabel: 9.5,
  body: 10.5,
  tabOperadora: 11.5,
  tabProduto: 10.5,
  tabGrupo: 9.5,
  tabPlano: 14,
  tabAcomodacao: 10,
  vidasNum: 21,
  premio: 13.5,
}

const WORKSPACE_TYPO_DENSE: ContratoGridTypography = {
  ...WORKSPACE_TYPO_MID,
  legend: 10.5,
  faixaLabel: 9,
  body: 10,
  tabOperadora: 11,
  tabProduto: 10,
  tabGrupo: 9,
  tabPlano: 13,
  tabAcomodacao: 9.5,
  vidasNum: 20,
  premio: 13,
}

/** Tipografia dos quadros do comparativo — maior no modo workspace (tela cheia / painel amplo). */
export function getContratoTypography(layout: ContratoAtualLayoutSpec): ContratoGridTypography {
  if (layout.minColWidth == null) {
    return layout.compact ? SLIDE_TYPO_COMPACT : SLIDE_TYPO_NORMAL
  }
  if (layout.colSlots >= 6) return WORKSPACE_TYPO_DENSE
  if (layout.colSlots >= 4) return WORKSPACE_TYPO_MID
  return WORKSPACE_TYPO_SPARSE
}
