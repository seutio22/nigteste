/** Tipografia e cores dos slides Placement (design system NIG) */
export const SLIDE_FONT =
  'Geometria, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'

export const SLIDE_COLORS = {
  primary: '#002561',
  info: '#004F75',
  infoLight: '#009FDF',
  mint: '#e6f2f8',
  border: '#DCDFE3',
  muted: '#6b7a80',
  empty: '#eef1f4',
  white: '#ffffff',
} as const

export function vidasToColor(ratio: number): string {
  const t = Math.max(0, Math.min(1, ratio))
  const from = { r: 230, g: 242, b: 248 }
  const to = { r: 0, g: 37, b: 97 }
  const r = Math.round(from.r + (to.r - from.r) * t)
  const g = Math.round(from.g + (to.g - from.g) * t)
  const b = Math.round(from.b + (to.b - from.b) * t)
  return `rgb(${r},${g},${b})`
}
