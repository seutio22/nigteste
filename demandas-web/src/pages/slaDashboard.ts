import { formatSecondsToHms, secondsToDiasUteis } from './produtividadeJornada'
import {
  SLA_DASHBOARD_PAGES,
  SLA_PAGE_LABEL,
  type ChamadoSlaResult,
  type SlaDashboardPageKey,
} from './slaMatching'

export type AnalistaSlaRow = {
  analistaId: string
  analistaNome: string
  totalChamados: number
  countsByPage: Partial<Record<SlaDashboardPageKey, number>>
  matchedCount: number
  unmatchedCount: number
  dentroCount: number
  foraCount: number
  semExecucaoCount: number
  pctDentro: number | null
  prazoSlaSeconds: number
  prazoSlaLabel: string
  prazoSlaDiasUteis: number | null
  tempoExecutadoSeconds: number
  tempoExecutadoLabel: string
  chamados: ChamadoSlaResult[]
}

export type SlaCumprimentoHighlight = {
  analistaId: string
  analistaNome: string
  pctDentro: number
  dentroCount: number
  totalChamados: number
}

export type SlaDashboardSummary = {
  totalChamados: number
  matchedCount: number
  unmatchedCount: number
  dentroCount: number
  foraCount: number
  semExecucaoCount: number
  pctDentro: number | null
  pctFora: number | null
  prazoSlaSeconds: number
  prazoSlaLabel: string
  prazoSlaDiasUteis: number | null
  tempoExecutadoSeconds: number
  tempoExecutadoLabel: string
  maiorCumprimento: SlaCumprimentoHighlight | null
  menorCumprimento: SlaCumprimentoHighlight | null
  countsByPage: Partial<Record<SlaDashboardPageKey, number>>
  byAnalista: AnalistaSlaRow[]
}

function parseDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isInRange(iso: string, fromDate: string, toDate: string): boolean {
  const day = parseDay(iso)
  return day >= fromDate && day <= toDate
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function tallyByPage(list: ChamadoSlaResult[]): Partial<Record<SlaDashboardPageKey, number>> {
  const counts: Partial<Record<SlaDashboardPageKey, number>> = {}
  for (const c of list) {
    counts[c.pageKey] = (counts[c.pageKey] || 0) + 1
  }
  return counts
}

export function formatSlaCountsByPageLabel(
  counts: Partial<Record<SlaDashboardPageKey, number>>
): string {
  const parts = SLA_DASHBOARD_PAGES.map((k) => {
    const n = counts[k] || 0
    if (!n) return null
    return `${SLA_PAGE_LABEL[k]}: ${n}`
  }).filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

function pctOf(part: number, total: number): number | null {
  if (total <= 0) return null
  return round1((part / total) * 100)
}

function toHighlight(row: AnalistaSlaRow): SlaCumprimentoHighlight | null {
  if (row.pctDentro == null) return null
  return {
    analistaId: row.analistaId,
    analistaNome: row.analistaNome,
    pctDentro: row.pctDentro,
    dentroCount: row.dentroCount,
    totalChamados: row.totalChamados,
  }
}

export function buildSlaDashboard(input: {
  chamados: ChamadoSlaResult[]
  fromDate: string
  toDate: string
  analistaNomeById: Record<string, string>
  analistaIdFilter?: string | null
}): SlaDashboardSummary {
  const filtered = input.chamados.filter((c) => {
    if (!isInRange(c.dataConclusao, input.fromDate, input.toDate)) return false
    if (input.analistaIdFilter && c.analistaId !== input.analistaIdFilter) return false
    return true
  })

  const byId = new Map<string, ChamadoSlaResult[]>()
  for (const c of filtered) {
    const key = c.analistaId || '__sem_analista__'
    const list = byId.get(key) || []
    list.push(c)
    byId.set(key, list)
  }

  const byAnalista: AnalistaSlaRow[] = []
  for (const [analistaId, list] of byId) {
    const matchedCount = list.filter((c) => c.matched).length
    const dentroCount = list.filter((c) => c.status === 'dentro').length
    const foraCount = list.filter((c) => c.status === 'fora').length
    const semExecucaoCount = list.filter((c) => c.status === 'sem_execucao').length
    const avaliaveis = dentroCount + foraCount
    const prazoSlaSeconds = list.reduce((s, c) => s + (c.prazoSlaSeconds || 0), 0)
    const tempoExecutadoSeconds = list.reduce(
      (s, c) => s + (c.tempoExecutadoSeconds || 0),
      0
    )
    byAnalista.push({
      analistaId,
      analistaNome:
        analistaId === '__sem_analista__'
          ? 'Sem analista'
          : input.analistaNomeById[analistaId] || analistaId,
      totalChamados: list.length,
      countsByPage: tallyByPage(list),
      matchedCount,
      unmatchedCount: list.length - matchedCount,
      dentroCount,
      foraCount,
      semExecucaoCount,
      pctDentro: pctOf(dentroCount, avaliaveis),
      prazoSlaSeconds,
      prazoSlaLabel: formatSecondsToHms(prazoSlaSeconds) || '00:00:00',
      prazoSlaDiasUteis: secondsToDiasUteis(prazoSlaSeconds),
      tempoExecutadoSeconds,
      tempoExecutadoLabel: formatSecondsToHms(tempoExecutadoSeconds) || '00:00:00',
      chamados: list.sort((a, b) => String(b.dataConclusao).localeCompare(String(a.dataConclusao))),
    })
  }

  byAnalista.sort((a, b) => (b.pctDentro ?? -1) - (a.pctDentro ?? -1))

  const matchedCount = byAnalista.reduce((s, r) => s + r.matchedCount, 0)
  const unmatchedCount = byAnalista.reduce((s, r) => s + r.unmatchedCount, 0)
  const dentroCount = byAnalista.reduce((s, r) => s + r.dentroCount, 0)
  const foraCount = byAnalista.reduce((s, r) => s + r.foraCount, 0)
  const semExecucaoCount = byAnalista.reduce((s, r) => s + r.semExecucaoCount, 0)
  const prazoSlaSeconds = byAnalista.reduce((s, r) => s + r.prazoSlaSeconds, 0)
  const tempoExecutadoSeconds = byAnalista.reduce((s, r) => s + r.tempoExecutadoSeconds, 0)
  const avaliaveis = dentroCount + foraCount

  const rankable = byAnalista.filter(
    (r) => r.analistaId !== '__sem_analista__' && r.pctDentro != null && r.dentroCount + r.foraCount > 0
  )
  let maiorCumprimento: SlaCumprimentoHighlight | null = null
  let menorCumprimento: SlaCumprimentoHighlight | null = null
  if (rankable.length) {
    const byPct = [...rankable].sort((a, b) => (b.pctDentro || 0) - (a.pctDentro || 0))
    maiorCumprimento = toHighlight(byPct[0])
    menorCumprimento = toHighlight(byPct[byPct.length - 1])
  }

  return {
    totalChamados: filtered.length,
    matchedCount,
    unmatchedCount,
    dentroCount,
    foraCount,
    semExecucaoCount,
    pctDentro: pctOf(dentroCount, avaliaveis),
    pctFora: pctOf(foraCount, avaliaveis),
    prazoSlaSeconds,
    prazoSlaLabel: formatSecondsToHms(prazoSlaSeconds) || '00:00:00',
    prazoSlaDiasUteis: secondsToDiasUteis(prazoSlaSeconds),
    tempoExecutadoSeconds,
    tempoExecutadoLabel: formatSecondsToHms(tempoExecutadoSeconds) || '00:00:00',
    maiorCumprimento,
    menorCumprimento,
    countsByPage: tallyByPage(filtered),
    byAnalista,
  }
}
