/**
 * Calendário útil do SLA: seg–sex, expediente 09:00–17:00 (8h = 1 dia útil), sem feriados.
 * Datas gravadas só com o dia (YYYY-MM-DD ou meia-noite UTC) são ancoradas no expediente local.
 */
export const SLA_EXPEDIENTE_INICIO_HORA = 9
export const SLA_EXPEDIENTE_FIM_HORA = 17

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MIDNIGHT_UTC_RE = /^(\d{4})-(\d{2})-(\d{2})T00:00:00(?:\.0+)?Z$/

function dateOnlyParts(raw: string): [number, number, number] | null {
  const m = DATE_ONLY_RE.exec(raw) || MIDNIGHT_UTC_RE.exec(raw)
  if (!m) return null
  return [Number(m[1]), Number(m[2]), Number(m[3])]
}

export function isSlaDateOnly(raw: unknown): boolean {
  if (raw == null || raw instanceof Date) return false
  return dateOnlyParts(String(raw).trim()) != null
}

/** Converte data do chamado em instante; só-data vira abertura (início) ou fechamento (fim) do expediente. */
export function parseSlaInstant(raw: unknown, edge: 'inicio' | 'fim'): Date | null {
  if (raw == null || raw === '') return null
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw
  const s = String(raw).trim()
  const parts = dateOnlyParts(s)
  if (parts) {
    const [y, m, d] = parts
    const hour = edge === 'inicio' ? SLA_EXPEDIENTE_INICIO_HORA : SLA_EXPEDIENTE_FIM_HORA
    return new Date(y, m - 1, d, hour, 0, 0, 0)
  }
  const dt = new Date(s)
  return Number.isNaN(dt.getTime()) ? null : dt
}

function isBusinessDay(d: Date): boolean {
  const w = d.getDay()
  return w !== 0 && w !== 6
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function workWindow(day: Date): [number, number] {
  const ws = new Date(day)
  ws.setHours(SLA_EXPEDIENTE_INICIO_HORA, 0, 0, 0)
  const we = new Date(day)
  we.setHours(SLA_EXPEDIENTE_FIM_HORA, 0, 0, 0)
  return [ws.getTime(), we.getTime()]
}

export function slaDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Segundos úteis entre dois instantes (apenas dentro do expediente). */
export function businessSecondsBetween(a: Date, b: Date): number {
  if (!(b.getTime() > a.getTime())) return 0
  let total = 0
  const day = startOfDay(a)
  const endDay = startOfDay(b)
  while (day.getTime() <= endDay.getTime()) {
    if (isBusinessDay(day)) {
      const [ws, we] = workWindow(day)
      const s = Math.max(ws, a.getTime())
      const e = Math.min(we, b.getTime())
      if (e > s) total += (e - s) / 1000
    }
    day.setDate(day.getDate() + 1)
  }
  return Math.round(total)
}

/** Instante em que se completam `seconds` úteis a partir de `start`. */
export function addBusinessSeconds(start: Date, seconds: number): Date {
  let remaining = Math.max(0, seconds)
  let cursor = new Date(start)
  for (let guard = 0; guard < 20000; guard++) {
    const day = startOfDay(cursor)
    if (isBusinessDay(day)) {
      const [ws, we] = workWindow(day)
      const s = Math.max(cursor.getTime(), ws)
      if (s < we) {
        const avail = (we - s) / 1000
        if (remaining <= avail) return new Date(s + remaining * 1000)
        remaining -= avail
      }
    }
    cursor = new Date(day)
    cursor.setDate(cursor.getDate() + 1)
  }
  return cursor
}

export type SlaStatusEvent = {
  toValue?: string | null
  createdAt: string | Date
}

export type SlaPauseInterval = { inicio: Date; fim: Date }

function normalizeStatus(raw: unknown): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

/** Status que dependem de terceiros e pausam o SLA. */
export const SLA_STATUS_PAUSA_LABEL = 'Aguardando…, Pendente e Com erros'

export function isSlaWaitStatus(status: unknown): boolean {
  const s = normalizeStatus(status)
  if (!s) return false
  return s.includes('aguardando') || s.includes('pendente') || s.includes('com erro')
}

/** Períodos em status de espera a partir do histórico de mudanças de status. */
export function buildPauseIntervals(events: SlaStatusEvent[], until: Date): SlaPauseInterval[] {
  const sorted = events
    .map((e) => ({ wait: isSlaWaitStatus(e.toValue), at: new Date(e.createdAt) }))
    .filter((e) => !Number.isNaN(e.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime())

  const out: SlaPauseInterval[] = []
  let open: Date | null = null
  for (const ev of sorted) {
    if (ev.wait && !open) open = ev.at
    else if (!ev.wait && open) {
      if (ev.at.getTime() > open.getTime()) out.push({ inicio: open, fim: ev.at })
      open = null
    }
  }
  if (open && until.getTime() > open.getTime()) out.push({ inicio: open, fim: until })
  return out
}

/** Segundos úteis pausados dentro da janela [from, to]. */
export function pausedBusinessSeconds(pauses: SlaPauseInterval[], from: Date, to: Date): number {
  let total = 0
  for (const p of pauses) {
    const s = new Date(Math.max(p.inicio.getTime(), from.getTime()))
    const e = new Date(Math.min(p.fim.getTime(), to.getTime()))
    total += businessSecondsBetween(s, e)
  }
  return total
}
