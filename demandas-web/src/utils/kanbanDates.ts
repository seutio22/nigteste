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

function isWeekendDay(d: Date): boolean {
  const day = d.getDay()
  return day === 0 || day === 6
}

/**
 * Dias úteis entre amanhã e a data de vencimento (inclusive), a partir de hoje.
 * - Se vencimento &lt; hoje: -1 (vencido)
 * - Se vencimento === hoje: 0 (não dispara avisos de “N dias antes”)
 * - Caso contrário: quantidade de dias Mon–Fri no intervalo [amanhã, vencimento]
 */
export function businessDaysFromTomorrowToDueInclusive(today: Date, due: Date): number {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const d0 = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  if (d0.getTime() < t0.getTime()) return -1
  if (d0.getTime() === t0.getTime()) return 0
  let count = 0
  const cur = new Date(t0)
  cur.setDate(cur.getDate() + 1)
  while (cur <= d0) {
    if (!isWeekendDay(cur)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}
