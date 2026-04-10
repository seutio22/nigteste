/** Dias úteis entre amanhã e a data de vencimento (inclusive), a partir de hoje (só parte civil). */
export function businessDaysFromTomorrowToDueInclusive(today: Date, due: Date): number {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const d0 = new Date(due.getFullYear(), due.getMonth(), due.getDate())
  if (d0.getTime() < t0.getTime()) return -1
  if (d0.getTime() === t0.getTime()) return 0
  let count = 0
  const cur = new Date(t0)
  cur.setDate(cur.getDate() + 1)
  while (cur <= d0) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}
