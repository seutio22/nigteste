/** Evita TS2358 em `value instanceof Date` quando o valor vem como `GridCellValue` (inclui primitivos). */
export function gridCellToDate(value: unknown): Date {
  if (typeof value === 'object' && value !== null && value instanceof Date) {
    return value
  }
  return new Date(value as string | number)
}

export function formatGridDatePtBR(value: unknown): string {
  if (value == null || value === '') return '-'
  const date = gridCellToDate(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('pt-BR')
}
