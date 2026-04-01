/**
 * Identidade visual dos PDFs institucionais (alinhado a ExportProjectModal / Projetos).
 */
export const PDF_COLORS = {
  primary: [0, 37, 97] as const,
  secondary: [5, 0, 50] as const,
  cyan: [0, 159, 223] as const,
  green: [0, 166, 73] as const,
  warning: [229, 184, 0] as const,
  danger: [218, 56, 50] as const,
  apoio100: [220, 223, 227] as const,
  apoio300: [163, 181, 188] as const,
  textDark: [5, 0, 50] as const,
  textMuted: [107, 122, 128] as const,
  white: [255, 255, 255] as const,
  rowAlt: [245, 246, 247] as const
} as const

export const PDF_FOOTER_LINE =
  'NIG - Núcleo de Inteligência e Governança - Diretoria Técnica Benefícios'

/** Estilos compatíveis com jspdf-autotable (evita conflito com `readonly` tuples) */
export const defaultAutoTableStyles: {
  fontSize: number
  textColor: [number, number, number]
  lineColor: [number, number, number]
  lineWidth: number
  cellPadding: number
} = {
  fontSize: 9,
  textColor: [5, 0, 50],
  lineColor: [220, 223, 227],
  lineWidth: 0.2,
  cellPadding: 3
}

export const defaultHeadStyles: {
  fillColor: [number, number, number]
  textColor: [number, number, number]
  fontStyle: 'bold'
} = {
  fillColor: [0, 37, 97],
  textColor: [255, 255, 255],
  fontStyle: 'bold'
}
