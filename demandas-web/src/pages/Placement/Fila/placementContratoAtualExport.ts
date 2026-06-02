import { SLIDE_FONT } from './placementSlideTheme'

/** Fonte estável no html2canvas (Geometria pode falhar no clone). */
export const CONTRATO_EXPORT_FONT = 'Segoe UI, Roboto, "Helvetica Neue", Arial, sans-serif'

/** Normaliza tipografia e overflow antes do html2canvas capturar o slide. */
export function applyContratoSlideExportFixes(doc: Document) {
  const slide = doc.querySelector<HTMLElement>('[data-slide-inner]')
  if (slide) {
    slide.style.fontFamily = CONTRATO_EXPORT_FONT
  }

  doc.querySelectorAll<HTMLElement>('[data-contrato-cell]').forEach((cell) => {
    cell.style.lineHeight = '1.15'
    if (cell.dataset.clip === '1') {
      cell.style.overflow = 'hidden'
    }
  })

  doc.querySelectorAll<HTMLElement>('[data-contrato-grid-wrap]').forEach((wrap) => {
    wrap.style.overflow = 'visible'
  })

  doc.querySelectorAll<HTMLElement>('[data-contrato-grid]').forEach((grid) => {
    grid.style.overflow = 'visible'
  })

  doc.querySelectorAll<HTMLElement>('p, .MuiTypography-root, span.MuiTypography-root').forEach((el) => {
    el.style.margin = '0'
    el.style.padding = '0'
    el.style.lineHeight = '1.15'
    el.style.fontFamily = CONTRATO_EXPORT_FONT
    el.style.overflow = 'visible'
  })

  void SLIDE_FONT
}
