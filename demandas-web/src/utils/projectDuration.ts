import { formatSecondsToHms, parseHmsToSeconds } from '../pages/produtividadeJornada'

export const PROJECT_DURATION_FORMAT = 'HH:MM:SS'

/** Converte horas decimais (API) → texto HH:MM:SS para exibição/edição. */
export function hoursToDurationDisplay(hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours < 0) return ''
  if (hours === 0) return '00:00:00'
  return formatSecondsToHms(Math.round(hours * 3600))
}

/** Interpreta entrada flexível → horas decimais (persistência). */
export function parseDurationInputToHours(raw: string | number | null | undefined): number | null {
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw >= 0 ? raw : null
  }

  const s = String(raw).trim()
  if (!s) return null

  const normalized = s.replace(/\s/g, '').replace(',', '.')
  const hasExplicitDuration =
    s.includes(':') || /\d+\s*h(?:oras?)?/i.test(s) || /\d+\s*m(?:in(?:utos?)?)?/i.test(s) || /^\d+s(?:ec)?$/i.test(s)

  if (hasExplicitDuration) {
    const seconds = parseHmsToSeconds(s)
    return seconds != null ? Math.round((seconds / 3600) * 10000) / 10000 : null
  }

  if (/^\d+\.\d+$/.test(normalized)) {
    const n = Number(normalized)
    return Number.isFinite(n) && n >= 0 ? n : null
  }

  const seconds = parseHmsToSeconds(s)
  if (seconds != null) {
    return Math.round((seconds / 3600) * 10000) / 10000
  }

  return null
}

/** Rótulo compacto na tabela (real / estimado). */
export function formatDurationHoursPair(
  actualHours: number | null | undefined,
  estimatedHours: number | null | undefined
): string {
  const actual = hoursToDurationDisplay(actualHours ?? 0) || '00:00:00'
  const estimated = hoursToDurationDisplay(estimatedHours ?? 0) || '00:00:00'
  if (!actualHours && !estimatedHours) return '—'
  return `${actual} / ${estimated}`
}
