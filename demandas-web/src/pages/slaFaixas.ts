import type { QuantityKey } from './produtividadePageConfig'
import {
  diasUteisToSeconds,
  formatSecondsToHms,
  horasUteisToSeconds,
  secondsToDiasUteis,
  secondsToHorasUteis,
} from './produtividadeJornada'

export const SLA_PRAZO_DIAS_PRESETS = [1, 2, 3, 5, 6, 8, 10, 15, 20, 30] as const

/** Como aplicar as faixas ao calcular o prazo final. */
export type SlaFaixaModo = 'correspondente' | 'somar'

export const SLA_FAIXA_MODO_OPTIONS: {
  value: SlaFaixaModo
  label: string
  help: string
}[] = [
  {
    value: 'correspondente',
    label: 'Usar faixa correspondente',
    help: 'A quantidade cai em uma única faixa e vale só aquele prazo (ex.: 15 SUB’s → faixa 11–20).',
  },
  {
    value: 'somar',
    label: 'Somar faixas',
    help: 'Soma o prazo de todas as faixas que a quantidade atravessa (ex.: 15 SUB’s → faixa 1–10 + 11–20).',
  },
]

export function isSlaFaixaModo(value: string | null | undefined): value is SlaFaixaModo {
  return value === 'correspondente' || value === 'somar'
}

/** Faixa de prazo SLA por intervalo de quantidade (ex.: SUB's 1–10 → 2 dias úteis). */
export type SlaFaixaPrazo = {
  metric: QuantityKey | null
  min: number | null
  max: number | null
  prazoSeconds: number
}

export type SlaFaixaDraft = {
  key: string
  metric: QuantityKey | ''
  min: string
  max: string
  dias: string
  horas: string
}

let faixaSeq = 0
export function newSlaFaixaDraft(partial?: Partial<SlaFaixaDraft>): SlaFaixaDraft {
  faixaSeq += 1
  return {
    key: `faixa-${faixaSeq}`,
    metric: '',
    min: '',
    max: '',
    dias: '',
    horas: '',
    ...partial,
  }
}

export function formatSlaNumberPtBr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

export function parsePtBrNumber(raw: string | undefined): number | null {
  if (raw == null) return null
  const s = raw.trim().replace(/\s/g, '')
  if (!s) return null
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\./g, '')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

export function applyFaixaFromDias(faixa: SlaFaixaDraft, raw: string): SlaFaixaDraft {
  const dias = parsePtBrNumber(raw)
  if (dias == null) return { ...faixa, dias: raw, horas: raw.trim() ? faixa.horas : '' }
  const sec = diasUteisToSeconds(dias)
  return {
    ...faixa,
    dias: raw,
    horas: formatSlaNumberPtBr(secondsToHorasUteis(sec)),
  }
}

export function applyFaixaFromHoras(faixa: SlaFaixaDraft, raw: string): SlaFaixaDraft {
  const horas = parsePtBrNumber(raw)
  if (horas == null) return { ...faixa, horas: raw, dias: raw.trim() ? faixa.dias : '' }
  const sec = horasUteisToSeconds(horas)
  return {
    ...faixa,
    horas: raw,
    dias: formatSlaNumberPtBr(secondsToDiasUteis(sec)),
  }
}

export function faixaPrazoSeconds(faixa: SlaFaixaDraft): number | null {
  const fromHoras = horasUteisToSeconds(parsePtBrNumber(faixa.horas))
  if (fromHoras != null && fromHoras > 0) return fromHoras
  const fromDias = diasUteisToSeconds(parsePtBrNumber(faixa.dias))
  if (fromDias != null && fromDias > 0) return fromDias
  return null
}

export function parseFaixasPrazo(raw: unknown): SlaFaixaPrazo[] {
  if (!Array.isArray(raw)) return []
  const out: SlaFaixaPrazo[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const prazo = Number(row.prazoSeconds)
    if (!Number.isFinite(prazo) || prazo <= 0) continue
    const metric =
      typeof row.metric === 'string' && row.metric.trim() ? (row.metric.trim() as QuantityKey) : null
    const min = row.min == null || row.min === '' ? null : Number(row.min)
    const max = row.max == null || row.max === '' ? null : Number(row.max)
    out.push({
      metric,
      min: min != null && Number.isFinite(min) ? Math.round(min) : null,
      max: max != null && Number.isFinite(max) ? Math.round(max) : null,
      prazoSeconds: Math.round(prazo),
    })
  }
  return out
}

export function faixasToDrafts(faixas: SlaFaixaPrazo[]): SlaFaixaDraft[] {
  if (!faixas.length) return [newSlaFaixaDraft()]
  return faixas.map((f) =>
    newSlaFaixaDraft({
      metric: (f.metric ?? '') as QuantityKey | '',
      min: f.min != null ? String(f.min) : '',
      max: f.max != null ? String(f.max) : '',
      dias: formatSlaNumberPtBr(secondsToDiasUteis(f.prazoSeconds)),
      horas: formatSlaNumberPtBr(secondsToHorasUteis(f.prazoSeconds)),
    })
  )
}

export function draftsToFaixas(drafts: SlaFaixaDraft[]): SlaFaixaPrazo[] {
  const out: SlaFaixaPrazo[] = []
  for (const d of drafts) {
    const prazo = faixaPrazoSeconds(d)
    if (prazo == null || prazo <= 0) continue
    const min = parsePtBrNumber(d.min)
    const max = parsePtBrNumber(d.max)
    out.push({
      metric: d.metric || null,
      min: min == null ? null : Math.round(min),
      max: max == null ? null : Math.round(max),
      prazoSeconds: prazo,
    })
  }
  return out
}

export function formatFaixaRangeLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return 'qualquer qtd'
  if (min != null && max != null) return `${min}–${max}`
  if (min != null) return `≥ ${min}`
  return `≤ ${max}`
}

export function formatFaixasSummary(
  faixas: SlaFaixaPrazo[],
  metricLabel: (metric: QuantityKey | null) => string,
  modo?: SlaFaixaModo | null,
  adicionalSeconds?: number | null
): string {
  if (!faixas.length) return '—'
  const parts = faixas.map((f) => {
    const dias = secondsToDiasUteis(f.prazoSeconds)
    const diasLabel =
      dias == null ? formatSecondsToHms(f.prazoSeconds) : `${formatSlaNumberPtBr(dias)}d`
    return `${metricLabel(f.metric)} ${formatFaixaRangeLabel(f.min, f.max)} → ${diasLabel}`
  })
  const modoLabel = modo === 'somar' ? 'somar' : 'correspondente'
  parts.push(`modo: ${modoLabel}`)
  if (adicionalSeconds != null && adicionalSeconds > 0) {
    const d = secondsToDiasUteis(adicionalSeconds)
    parts.push(
      `+${d != null ? `${formatSlaNumberPtBr(d)}d` : formatSecondsToHms(adicionalSeconds)}/un. acima do máx.`
    )
  }
  return parts.join(' · ')
}

function faixasDaMetrica(faixas: SlaFaixaPrazo[], metric: QuantityKey): SlaFaixaPrazo[] {
  const especificas = faixas.filter((f) => f.metric === metric)
  if (especificas.length) return especificas
  return faixas.filter((f) => !f.metric)
}

function faixaContémQtd(f: SlaFaixaPrazo, quantity: number): boolean {
  if (f.min != null && quantity < f.min) return false
  if (f.max != null && quantity > f.max) return false
  return true
}

/** Faixa intersecta o intervalo [1..quantity] (para modo somar). */
function faixaAtravessada(f: SlaFaixaPrazo, quantity: number): boolean {
  const lo = f.min ?? 1
  const hi = f.max ?? Number.POSITIVE_INFINITY
  return lo <= quantity && hi >= 1 && lo <= hi
}

function scoreEspecificidade(f: SlaFaixaPrazo): number {
  return (f.metric ? 10 : 0) + (f.min != null ? 1 : 0) + (f.max != null ? 1 : 0)
}

export function maxQtdFaixas(faixas: SlaFaixaPrazo[]): number | null {
  const maxes = faixas.map((f) => f.max).filter((m): m is number => m != null)
  if (!maxes.length) return null
  return Math.max(...maxes)
}

export function faixaComMaiorMax(faixas: SlaFaixaPrazo[]): SlaFaixaPrazo | null {
  let best: SlaFaixaPrazo | null = null
  for (const f of faixas) {
    if (f.max == null) continue
    if (!best || (best.max != null && f.max > best.max)) best = f
  }
  return best
}

export type ResolveSlaPrazoResult = {
  seconds: number | null
  breakdown: string[]
}

/**
 * Resolve prazo (segundos) pela quantidade real do chamado.
 * - correspondente: uma faixa que contém a qtd
 * - somar: soma todas as faixas atravessadas até a qtd
 * - adicional: se qtd > maior máx., soma (qtd − máx.) × adicionalPorUnidadeSeconds
 */
export function resolveSlaPrazoSeconds(
  faixas: SlaFaixaPrazo[],
  metric: QuantityKey,
  quantity: number,
  options?: {
    modo?: SlaFaixaModo | null
    adicionalPorUnidadeSeconds?: number | null
    fallbackSeconds?: number | null
  }
): ResolveSlaPrazoResult {
  const modo: SlaFaixaModo = options?.modo === 'somar' ? 'somar' : 'correspondente'
  const adicional = options?.adicionalPorUnidadeSeconds ?? null
  const fallback = options?.fallbackSeconds ?? null
  const pool = faixasDaMetrica(faixas, metric)
  const breakdown: string[] = []

  if (!pool.length) {
    if (fallback != null && fallback > 0) {
      return { seconds: fallback, breakdown: ['fallback'] }
    }
    return { seconds: null, breakdown: [] }
  }

  let base = 0

  if (modo === 'somar') {
    const atravessadas = pool.filter((f) => faixaAtravessada(f, quantity))
    if (!atravessadas.length) {
      if (fallback != null && fallback > 0) {
        return { seconds: fallback, breakdown: ['fallback'] }
      }
      return { seconds: null, breakdown: [] }
    }
    for (const f of atravessadas) {
      base += f.prazoSeconds
      breakdown.push(
        `${formatFaixaRangeLabel(f.min, f.max)} → ${formatSecondsToHms(f.prazoSeconds)}`
      )
    }
  } else {
    const matched = pool.filter((f) => faixaContémQtd(f, quantity))
    if (matched.length) {
      matched.sort((a, b) => scoreEspecificidade(b) - scoreEspecificidade(a))
      base = matched[0].prazoSeconds
      breakdown.push(
        `${formatFaixaRangeLabel(matched[0].min, matched[0].max)} → ${formatSecondsToHms(base)}`
      )
    } else {
      // Acima do máximo: usa prazo da última faixa (maior max) como base do adicional
      const last = faixaComMaiorMax(pool)
      const top = maxQtdFaixas(pool)
      if (last && top != null && quantity > top) {
        base = last.prazoSeconds
        breakdown.push(
          `base (faixa até ${top}) → ${formatSecondsToHms(base)}`
        )
      } else if (fallback != null && fallback > 0) {
        return { seconds: fallback, breakdown: ['fallback'] }
      } else {
        return { seconds: null, breakdown: [] }
      }
    }
  }

  const top = maxQtdFaixas(pool)
  if (
    adicional != null &&
    adicional > 0 &&
    top != null &&
    quantity > top
  ) {
    const extraUnits = quantity - top
    const extra = extraUnits * adicional
    base += extra
    breakdown.push(
      `+${extraUnits} un. × ${formatSecondsToHms(adicional)} = ${formatSecondsToHms(extra)}`
    )
  }

  return { seconds: base > 0 ? base : null, breakdown }
}

/** Preview amigável no formulário (ex.: qtd 15). */
export function previewSlaPrazoForQuantity(
  faixas: SlaFaixaPrazo[],
  metric: QuantityKey | null,
  quantity: number,
  modo: SlaFaixaModo,
  adicionalPorUnidadeSeconds: number | null
): ResolveSlaPrazoResult {
  if (!metric) {
    const unica = faixas.find((f) => !f.metric) ?? faixas[0]
    return {
      seconds: unica?.prazoSeconds ?? null,
      breakdown: unica ? ['prazo único'] : [],
    }
  }
  return resolveSlaPrazoSeconds(faixas, metric, quantity, {
    modo,
    adicionalPorUnidadeSeconds,
  })
}
