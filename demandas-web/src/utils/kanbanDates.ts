/**
 * Datas do Kanban vêm como `YYYY-MM-DD` (formulário) ou ISO da API (`...T00:00:00.000` sem Z).
 * Extrai sempre a parte civil YYYY-MM-DD para comparações estáveis.
 */
export function toDateOnlyString(value: string | null | undefined): string {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (s.includes('T')) return s.split('T')[0].slice(0, 10)
  return s.slice(0, 10)
}

/** Data local à meia-noite do dia civil; null se inválida. */
export function parseLocalDateFromYmd(ymd: string): Date | null {
  const d = toDateOnlyString(ymd)
  if (!d || d.length < 10) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2]) - 1
  const day = Number(m[3])
  const dt = new Date(y, mo, day)
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== day) return null
  return dt
}

/** Diferença em dias entre dois instantes (só parte data civil). */
export function diffCalendarDays(a: Date, b: Date): number {
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((db.getTime() - da.getTime()) / (86400000))
}
