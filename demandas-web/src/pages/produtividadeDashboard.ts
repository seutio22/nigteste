import { formatSecondsToHms, JORNADA_UTIL_SEGUNDOS, percentOfJornada } from './produtividadeJornada'
import {
  PRODUTIVIDADE_DASHBOARD_PAGES,
  PRODUTIVIDADE_PAGE_LABEL,
  type ChamadoProdutividadeResult,
  type ProdutividadePageKey,
} from './produtividadeMatching'

export type AnalistaProdutividadeRow = {
  analistaId: string
  analistaNome: string
  totalChamados: number
  countsByPage: Partial<Record<ProdutividadePageKey, number>>
  matchedCount: number
  unmatchedCount: number
  tempoPrevistoSeconds: number
  tempoPrevistoLabel: string
  /** Previsto ÷ 08:00:00 */
  jornadasEquivalentes: number
  /** Média diária = previsto ÷ dias úteis (segundos) */
  mediaDiaSeconds: number
  mediaDiaLabel: string
  /** Média diária como % de 1 jornada de 8h */
  pctMediaDia: number | null
  /**
   * Previsto ÷ capacidade individual do período.
   * Com presença: usa dias presentes × 8h; senão dias úteis × 8h.
   */
  pctMesCapacidade: number | null
  /** Dias úteis com login/atividade no período (quando há dados de presença). */
  diasPresentes: number | null
  capacidadeRealSeconds: number | null
  capacidadeRealLabel: string | null
  chamados: ChamadoProdutividadeResult[]
}

export type IndiceProducaoHighlight = {
  analistaId: string
  analistaNome: string
  pctMesCapacidade: number
  mediaDiaLabel: string
  tempoPrevistoLabel: string
}

/** Presença viva (login/sessão) usada para capacidade real — escopo departamento NIG. */
export type ProdutividadePresencaInput = {
  /** Analistas/usuários ativos do departamento NIG (ex.: 6). */
  equipePrevista: number
  /** Quantidade de pessoas NIG com ≥1 dia de presença no período. */
  pessoasPresentes: number
  /** Pessoa-dias úteis com presença (soma). */
  pessoaDiasPresentes: number
  /** Por analistaId → dias úteis presentes. */
  diasPresentesByAnalistaId: Record<string, number>
}

export type ProdutividadeDashboardSummary = {
  totalChamados: number
  matchedCount: number
  unmatchedCount: number
  tempoPrevistoSeconds: number
  tempoPrevistoLabel: string
  jornadasEquivalentes: number
  businessDaysInRange: number
  /** Equipe prevista (cadastro com login) ou fallback produção. */
  pessoasCapacidade: number
  /** Capacidade prevista: dias úteis × 08:00:00 × equipe */
  capacidadePeriodoSeconds: number
  capacidadePeriodoLabel: string
  /** Capacidade real: pessoa-dias presentes × 08:00:00 (ausências descontadas). */
  capacidadeRealSeconds: number | null
  capacidadeRealLabel: string | null
  pessoaDiasPresentes: number | null
  pessoasPresentes: number | null
  /** Real ÷ Previsto × 100 */
  pctPresencaCapacidade: number | null
  /** Média de produção por pessoa por dia útil (usa capacidade real quando houver) */
  mediaDiaSeconds: number
  mediaDiaLabel: string
  pctMediaDia: number | null
  /** Previsto total ÷ capacidade prevista */
  pctMesCapacidade: number | null
  /** Previsto total ÷ capacidade real (produtividade efetiva) */
  pctMesCapacidadeReal: number | null
  maiorIndice: IndiceProducaoHighlight | null
  menorIndice: IndiceProducaoHighlight | null
  countsByPage: Partial<Record<ProdutividadePageKey, number>>
  byAnalista: AnalistaProdutividadeRow[]
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

export function countBusinessDaysInclusive(fromDate: string, toDate: string): number {
  const start = new Date(`${fromDate}T00:00:00`)
  const end = new Date(`${toDate}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const wd = cur.getDay()
    if (wd !== 0 && wd !== 6) count += 1
    cur.setDate(cur.getDate() + 1)
  }
  return Math.max(count, 1)
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function pctCapacidade(tempoSeconds: number, capacidadeSeconds: number): number | null {
  if (capacidadeSeconds <= 0) return null
  return round1((tempoSeconds / capacidadeSeconds) * 100)
}

function tallyByPage(list: ChamadoProdutividadeResult[]): Partial<Record<ProdutividadePageKey, number>> {
  const counts: Partial<Record<ProdutividadePageKey, number>> = {}
  for (const c of list) {
    counts[c.pageKey] = (counts[c.pageKey] || 0) + 1
  }
  return counts
}

export function formatCountsByPageLabel(
  counts: Partial<Record<ProdutividadePageKey, number>>
): string {
  const parts = PRODUTIVIDADE_DASHBOARD_PAGES.map((k) => {
    const n = counts[k] || 0
    if (!n) return null
    return `${PRODUTIVIDADE_PAGE_LABEL[k]}: ${n}`
  }).filter(Boolean)
  return parts.length ? parts.join(' · ') : '—'
}

function toHighlight(row: AnalistaProdutividadeRow): IndiceProducaoHighlight | null {
  if (row.pctMesCapacidade == null) return null
  return {
    analistaId: row.analistaId,
    analistaNome: row.analistaNome,
    pctMesCapacidade: row.pctMesCapacidade,
    mediaDiaLabel: row.mediaDiaLabel,
    tempoPrevistoLabel: row.tempoPrevistoLabel,
  }
}

export function buildProdutividadeDashboard(input: {
  chamados: ChamadoProdutividadeResult[]
  fromDate: string
  toDate: string
  analistaNomeById: Record<string, string>
  analistaIdFilter?: string | null
  /** Presença viva (monitoring). Sem isso, capacidade real fica null. */
  presenca?: ProdutividadePresencaInput | null
}): ProdutividadeDashboardSummary {
  const filtered = input.chamados.filter((c) => {
    if (!isInRange(c.dataConclusao, input.fromDate, input.toDate)) return false
    if (input.analistaIdFilter && c.analistaId !== input.analistaIdFilter) return false
    return true
  })

  const businessDays = countBusinessDaysInclusive(input.fromDate, input.toDate)
  /** Capacidade individual teórica (1 pessoa × todos os dias úteis). */
  const capacidadeUmPrevista = businessDays * JORNADA_UTIL_SEGUNDOS
  const diasByAnalista = input.presenca?.diasPresentesByAnalistaId || {}
  const presencaLoaded = input.presenca != null

  const byId = new Map<string, ChamadoProdutividadeResult[]>()
  for (const c of filtered) {
    const key = c.analistaId || '__sem_analista__'
    const list = byId.get(key) || []
    list.push(c)
    byId.set(key, list)
  }

  const byAnalista: AnalistaProdutividadeRow[] = []
  for (const [analistaId, list] of byId) {
    const tempoPrevistoSeconds = list.reduce((s, c) => s + (c.tempoPrevistoSeconds || 0), 0)
    const matchedCount = list.filter((c) => c.matched).length
    const diasPresentes =
      analistaId !== '__sem_analista__' && presencaLoaded && diasByAnalista[analistaId] != null
        ? diasByAnalista[analistaId]
        : null
    const capacidadeRealPessoa =
      diasPresentes != null ? diasPresentes * JORNADA_UTIL_SEGUNDOS : null
    // Índice individual: prioriza capacidade real (dias presentes); senão teórica
    const capacidadeIndice =
      capacidadeRealPessoa != null && capacidadeRealPessoa > 0
        ? capacidadeRealPessoa
        : capacidadeUmPrevista
    const diasParaMedia =
      diasPresentes != null && diasPresentes > 0 ? diasPresentes : businessDays
    const mediaDiaSeconds = tempoPrevistoSeconds / diasParaMedia
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
      tempoPrevistoSeconds,
      tempoPrevistoLabel: formatSecondsToHms(tempoPrevistoSeconds) || '00:00:00',
      jornadasEquivalentes: Math.round((tempoPrevistoSeconds / JORNADA_UTIL_SEGUNDOS) * 100) / 100,
      mediaDiaSeconds,
      mediaDiaLabel: formatSecondsToHms(Math.round(mediaDiaSeconds)) || '00:00:00',
      pctMediaDia: percentOfJornada(mediaDiaSeconds),
      pctMesCapacidade: pctCapacidade(tempoPrevistoSeconds, capacidadeIndice),
      diasPresentes,
      capacidadeRealSeconds: capacidadeRealPessoa,
      capacidadeRealLabel:
        capacidadeRealPessoa != null
          ? formatSecondsToHms(capacidadeRealPessoa) || '00:00:00'
          : null,
      chamados: list.sort((a, b) => String(b.dataConclusao).localeCompare(String(a.dataConclusao))),
    })
  }

  byAnalista.sort((a, b) => b.tempoPrevistoSeconds - a.tempoPrevistoSeconds)

  const tempoPrevistoSeconds = byAnalista.reduce((s, r) => s + r.tempoPrevistoSeconds, 0)
  const matchedCount = byAnalista.reduce((s, r) => s + r.matchedCount, 0)
  const unmatchedCount = byAnalista.reduce((s, r) => s + r.unmatchedCount, 0)

  const analistasNomeados = byAnalista.filter((r) => r.analistaId !== '__sem_analista__')

  // Capacidade prevista: roster NIG (API). Sem presença, fallback a quem produziu.
  const pessoasCapacidadeFinal = input.analistaIdFilter
    ? 1
    : input.presenca?.equipePrevista && input.presenca.equipePrevista > 0
      ? input.presenca.equipePrevista
      : Math.max(analistasNomeados.length, 1)
  const capacidadePeriodo = capacidadeUmPrevista * pessoasCapacidadeFinal

  let capacidadeRealSeconds: number | null = null
  let pessoaDiasPresentes: number | null = null
  let pessoasPresentes: number | null = null
  if (presencaLoaded && input.presenca) {
    if (input.analistaIdFilter) {
      const d = diasByAnalista[input.analistaIdFilter] ?? 0
      pessoaDiasPresentes = d
      pessoasPresentes = d > 0 ? 1 : 0
      capacidadeRealSeconds = d * JORNADA_UTIL_SEGUNDOS
    } else {
      pessoaDiasPresentes = input.presenca.pessoaDiasPresentes
      pessoasPresentes = input.presenca.pessoasPresentes
      capacidadeRealSeconds = pessoaDiasPresentes * JORNADA_UTIL_SEGUNDOS
    }
  }

  const denomMedia =
    capacidadeRealSeconds != null && capacidadeRealSeconds > 0
      ? capacidadeRealSeconds / JORNADA_UTIL_SEGUNDOS // pessoa-dias reais
      : businessDays * pessoasCapacidadeFinal
  const mediaDiaSeconds = tempoPrevistoSeconds / Math.max(denomMedia, 1)

  const pctPresencaCapacidade =
    capacidadeRealSeconds != null
      ? pctCapacidade(capacidadeRealSeconds, capacidadePeriodo)
      : null

  // Ranking: índice já usa capacidade real por pessoa quando disponível
  const rankable = byAnalista.filter(
    (r) => r.analistaId !== '__sem_analista__' && r.tempoPrevistoSeconds > 0 && r.pctMesCapacidade != null
  )
  let maiorIndice: IndiceProducaoHighlight | null = null
  let menorIndice: IndiceProducaoHighlight | null = null
  if (rankable.length) {
    const byPct = [...rankable].sort(
      (a, b) => (b.pctMesCapacidade || 0) - (a.pctMesCapacidade || 0)
    )
    maiorIndice = toHighlight(byPct[0])
    menorIndice = toHighlight(byPct[byPct.length - 1])
  }

  return {
    totalChamados: filtered.length,
    matchedCount,
    unmatchedCount,
    tempoPrevistoSeconds,
    tempoPrevistoLabel: formatSecondsToHms(tempoPrevistoSeconds) || '00:00:00',
    jornadasEquivalentes: Math.round((tempoPrevistoSeconds / JORNADA_UTIL_SEGUNDOS) * 100) / 100,
    businessDaysInRange: businessDays,
    pessoasCapacidade: pessoasCapacidadeFinal,
    capacidadePeriodoSeconds: capacidadePeriodo,
    capacidadePeriodoLabel: formatSecondsToHms(capacidadePeriodo) || '00:00:00',
    capacidadeRealSeconds,
    capacidadeRealLabel:
      capacidadeRealSeconds != null
        ? formatSecondsToHms(capacidadeRealSeconds) || '00:00:00'
        : null,
    pessoaDiasPresentes,
    pessoasPresentes,
    pctPresencaCapacidade,
    mediaDiaSeconds,
    mediaDiaLabel: formatSecondsToHms(Math.round(mediaDiaSeconds)) || '00:00:00',
    pctMediaDia: percentOfJornada(mediaDiaSeconds),
    pctMesCapacidade: pctCapacidade(tempoPrevistoSeconds, capacidadePeriodo),
    pctMesCapacidadeReal:
      capacidadeRealSeconds != null && capacidadeRealSeconds > 0
        ? pctCapacidade(tempoPrevistoSeconds, capacidadeRealSeconds)
        : null,
    maiorIndice,
    menorIndice,
    countsByPage: tallyByPage(filtered),
    byAnalista,
  }
}
