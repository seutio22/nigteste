/** Jornada útil de referência para produtividade: 8 horas. */
export const JORNADA_UTIL_SEGUNDOS = 8 * 60 * 60 // 28800

/** Atalhos comuns de minutos para autocomplete do tempo previsto. */
export const TEMPO_PREVISTO_PRESETS_MIN = [5, 10, 15, 20, 30, 45, 60, 90, 120, 150, 180, 240, 300, 360, 480] as const

/**
 * Interpreta entrada flexível de tempo previsto → segundos.
 * Aceita:
 * - HH:MM:SS ou HH:MM
 * - só minutos: "90" → 1h30
 * - com sufixo: "90m", "90 min", "1.5h", "1h30", "1h30m"
 */
export function parseHmsToSeconds(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!s) return null

  // HH:MM:SS ou HH:MM
  const hms = /^(\d{1,3}):([0-5]?\d)(?::([0-5]?\d))?$/.exec(s)
  if (hms) {
    const h = Number(hms[1])
    const min = Number(hms[2])
    const sec = hms[3] != null ? Number(hms[3]) : 0
    if (![h, min, sec].every((n) => Number.isFinite(n))) return null
    return h * 3600 + min * 60 + sec
  }

  // 1h30 / 1h30m / 1h 30min
  const hm = /^(\d+)\s*h(?:oras?)?(?:\s*(\d+)\s*m(?:in(?:utos?)?)?)?$/.exec(s)
  if (hm) {
    const h = Number(hm[1])
    const min = hm[2] != null ? Number(hm[2]) : 0
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null
    return h * 3600 + min * 60
  }

  // 1,5h / 1.5h
  const decH = /^(\d+(?:[.,]\d+)?)\s*h(?:oras?)?$/.exec(s)
  if (decH) {
    const h = Number(decH[1].replace(',', '.'))
    if (!Number.isFinite(h) || h < 0) return null
    return Math.round(h * 3600)
  }

  // 90m / 90 min / 90 minutos
  const onlyMin = /^(\d+(?:[.,]\d+)?)\s*m(?:in(?:utos?)?)?$/.exec(s)
  if (onlyMin) {
    const min = Number(onlyMin[1].replace(',', '.'))
    if (!Number.isFinite(min) || min < 0) return null
    return Math.round(min * 60)
  }

  // Só número → minutos (atalho principal)
  if (/^\d+(?:[.,]\d+)?$/.test(s)) {
    const min = Number(s.replace(',', '.'))
    if (!Number.isFinite(min) || min < 0) return null
    return Math.round(min * 60)
  }

  return null
}

/** Formata segundos como HH:MM:SS (horas podem passar de 24). */
export function formatSecondsToHms(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return ''
  const s = Math.round(totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

/** Rótulo amigável para preset (ex.: "90 min → 01:30:00"). */
export function formatPresetLabel(minutes: number): string {
  const hms = formatSecondsToHms(minutes * 60)
  if (minutes < 60) return `${minutes} min → ${hms}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const human = m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`
  return `${human} (${minutes} min) → ${hms}`
}

/** Percentual do tempo em relação à jornada de 8h (ex.: 7200s → 25). */
export function percentOfJornada(seconds: number | null | undefined): number | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null
  return Math.round((seconds / JORNADA_UTIL_SEGUNDOS) * 1000) / 10
}

