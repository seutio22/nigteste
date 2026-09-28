import { getPageConfig, type QuantityKey } from './produtividadePageConfig'
import {
  PRODUTIVIDADE_DASHBOARD_PAGES,
  PRODUTIVIDADE_PAGE_LABEL,
  extractAnalyticsDims,
  extractAtendimentoDims,
  extractDemandaDims,
  extractManutencaoDims,
  extractReajusteDims,
  extractValidacaoDims,
  resolveItemAnalistaId,
  type ProdutividadePageKey,
  type TicketProdutividadeDims,
} from './produtividadeMatching'
import {
  isSlaFaixaModo,
  parseFaixasPrazo,
  resolveSlaPrazoSeconds,
  type SlaFaixaModo,
  type SlaFaixaPrazo,
} from './slaFaixas'
import { isSlaImpacto, type SlaImpacto } from './slaImpact'
import {
  addBusinessSeconds,
  buildPauseIntervals,
  businessSecondsBetween,
  isSlaDateOnly,
  isSlaWaitStatus,
  parseSlaInstant,
  pausedBusinessSeconds,
  slaDayKey,
  type SlaStatusEvent,
} from './slaCalendar'
import { formatSecondsToHms, secondsToDiasUteis } from './produtividadeJornada'

export {
  PRODUTIVIDADE_DASHBOARD_PAGES as SLA_DASHBOARD_PAGES,
  PRODUTIVIDADE_PAGE_LABEL as SLA_PAGE_LABEL,
  extractAnalyticsDims,
  extractAtendimentoDims,
  extractDemandaDims,
  extractManutencaoDims,
  extractReajusteDims,
  extractValidacaoDims,
}
export type { ProdutividadePageKey as SlaDashboardPageKey }

export type SlaRegraRow = {
  id: string
  pageKey: string
  tipo1Id?: string | null
  tipo2Id?: string | null
  impacto: string
  ativo?: boolean
  faixasPrazo?: SlaFaixaPrazo[] | unknown | null
  faixaModo?: string | null
  faixaAdicionalSeconds?: number | null
  tempoPrevistoSeconds?: number | null
}

export type TicketSlaDims = TicketProdutividadeDims & {
  impacto: SlaImpacto | null
}

export type SlaCumprimentoStatus =
  | 'dentro'
  | 'fora'
  | 'no_prazo'
  | 'atrasado'
  | 'pausado'
  | 'sem_regra'
  | 'sem_execucao'

export type ChamadoSlaResult = {
  id: string
  ticket: string | null
  pageKey: ProdutividadePageKey
  pageLabel: string
  analistaId: string | null
  impacto: SlaImpacto | null
  dataInicio: string | null
  dataFinal: string | null
  dataConclusao: string
  concluido: boolean
  /** Prazo SLA em segundos (horas úteis). */
  prazoSlaSeconds: number
  prazoSlaDiasUteis: number | null
  /** Data/hora limite (início + prazo + pausas), em ISO. */
  prazoLimite: string | null
  /** Tempo útil decorrido (início → fim ou agora), já sem as pausas. */
  tempoExecutadoSeconds: number | null
  tempoPausadoSeconds: number
  /** Prazo − decorrido; negativo = atraso. */
  saldoSeconds: number | null
  pctConsumido: number | null
  temHistoricoStatus: boolean
  regraId: string | null
  regra: SlaRegraRow | null
  matched: boolean
  matchScore: number
  status: SlaCumprimentoStatus
  faixaModo: SlaFaixaModo | null
}

/** Mapeia prioridade do chamado → impacto da regra SLA. */
export function normalizeTicketImpacto(raw: unknown): SlaImpacto | null {
  if (raw == null || raw === '') return null
  const s = String(raw).trim().toLowerCase()
  if (!s) return null
  if (
    s === 'alta' ||
    s === 'alto' ||
    s === 'high' ||
    s === 'alta prioridade' ||
    s === 'urgente' ||
    s === 'critical'
  ) {
    return 'alta'
  }
  if (
    s === 'baixa' ||
    s === 'baixo' ||
    s === 'low' ||
    s === 'baixa prioridade'
  ) {
    return 'baixa'
  }
  if (
    s === 'media' ||
    s === 'média' ||
    s === 'medio' ||
    s === 'médio' ||
    s === 'medium' ||
    s === 'media prioridade' ||
    s === 'média prioridade' ||
    s === 'normal'
  ) {
    return 'media'
  }
  if (isSlaImpacto(s)) return s
  return null
}

export function extractTicketImpacto(item: any): SlaImpacto | null {
  return (
    normalizeTicketImpacto(item?.impacto) ||
    normalizeTicketImpacto(item?.prioridade) ||
    normalizeTicketImpacto(item?.priority) ||
    null
  )
}

function toTicketSlaDims(dims: TicketProdutividadeDims, item: any): TicketSlaDims {
  return { ...dims, impacto: extractTicketImpacto(item) }
}

function scoreSlaRule(rule: SlaRegraRow, dims: TicketSlaDims): number | null {
  if (rule.pageKey !== dims.pageKey) return null
  if (rule.ativo === false) return null

  let score = 0
  if (rule.tipo1Id) {
    if (!dims.tipo1Id || rule.tipo1Id !== dims.tipo1Id) return null
    score += 10
  } else {
    score += 1
  }
  if (rule.tipo2Id) {
    if (!dims.tipo2Id || rule.tipo2Id !== dims.tipo2Id) return null
    score += 10
  } else {
    score += 1
  }

  const ruleImpacto = isSlaImpacto(rule.impacto) ? rule.impacto : null
  if (ruleImpacto) {
    if (dims.impacto) {
      if (ruleImpacto !== dims.impacto) return null
      score += 8
    } else if (ruleImpacto === 'media') {
      // Sem impacto no chamado: aceita regra média com score menor
      score += 2
    } else {
      return null
    }
  }

  return score
}

export function findBestSlaRule(
  rules: SlaRegraRow[],
  dims: TicketSlaDims
): { rule: SlaRegraRow; score: number } | null {
  let best: { rule: SlaRegraRow; score: number } | null = null
  for (const rule of rules) {
    const score = scoreSlaRule(rule, dims)
    if (score == null) continue
    if (!best || score > best.score) best = { rule, score }
  }
  return best
}

/** Escolhe a métrica de quantidade do chamado para resolver faixas. */
export function pickQuantityForSla(
  dims: TicketSlaDims,
  faixas: SlaFaixaPrazo[]
): { metric: QuantityKey; quantity: number } | null {
  const cfg = getPageConfig(dims.pageKey)
  const preferred = faixas
    .map((f) => f.metric)
    .filter((m): m is QuantityKey => !!m)

  const order = [
    ...preferred,
    ...cfg.quantities.map((q) => q.key),
  ]
  const seen = new Set<string>()
  for (const key of order) {
    if (seen.has(key)) continue
    seen.add(key)
    const qtd = dims.quantidades[key]
    if (qtd != null && Number.isFinite(qtd) && qtd > 0) {
      return { metric: key, quantity: Math.round(qtd) }
    }
  }
  return null
}

export function computePrazoSlaFromRule(
  rule: SlaRegraRow,
  dims: TicketSlaDims
): { seconds: number; modo: SlaFaixaModo | null } {
  const faixas = parseFaixasPrazo(rule.faixasPrazo)
  const modo: SlaFaixaModo = isSlaFaixaModo(rule.faixaModo) ? rule.faixaModo : 'correspondente'
  const adicional = rule.faixaAdicionalSeconds ?? null

  if (faixas.length) {
    const pick = pickQuantityForSla(dims, faixas)
    if (pick) {
      const resolved = resolveSlaPrazoSeconds(faixas, pick.metric, pick.quantity, {
        modo,
        adicionalPorUnidadeSeconds: adicional,
        fallbackSeconds: rule.tempoPrevistoSeconds,
      })
      if (resolved.seconds != null && resolved.seconds > 0) {
        return { seconds: resolved.seconds, modo }
      }
    }
    // Sem qtd no chamado: usa prazo único / primeira faixa / fallback
    const unica = faixas.find((f) => !f.metric) ?? faixas[0]
    if (unica?.prazoSeconds) return { seconds: unica.prazoSeconds, modo }
  }

  const fallback = rule.tempoPrevistoSeconds
  return {
    seconds: fallback != null && fallback > 0 ? fallback : 0,
    modo: faixas.length ? modo : null,
  }
}

function resolveTicketLabel(item: any): string | null {
  const candidates = [
    item?.ticket,
    item?.titulo,
    item?.numero,
    item?.codigo,
    item?.protocolo,
    item?.title,
    item?.name,
  ]
  for (const c of candidates) {
    if (c == null) continue
    const s = String(c).trim()
    if (s) return s
  }
  return null
}

/**
 * Chamado parado em status de espera sem o evento de entrada no histórico:
 * assume a pausa desde a última mudança registrada ou a última gravação do chamado.
 */
function withCurrentWaitStatus(events: SlaStatusEvent[], item: any, agora: Date): SlaStatusEvent[] {
  const times = (e: SlaStatusEvent) => new Date(e.createdAt).getTime()
  const ultimo = events.reduce<SlaStatusEvent | null>(
    (acc, e) => (!acc || times(e) > times(acc) ? e : acc),
    null
  )
  if (ultimo && isSlaWaitStatus(ultimo.toValue)) return events
  const candidatos = [ultimo ? times(ultimo) : NaN, new Date(item?.updatedAt ?? '').getTime()].filter(
    (t) => Number.isFinite(t) && t <= agora.getTime()
  )
  const desde = candidatos.length ? Math.max(...candidatos) : agora.getTime()
  return [...events, { toValue: String(item?.status ?? ''), createdAt: new Date(desde).toISOString() }]
}

export function evaluateTicketSla(input: {
  item: any
  dims: TicketProdutividadeDims
  rules: SlaRegraRow[]
  dataConclusao: string
  dataInicio: string | null
  dataFinal: string | null
  /** Chamado encerrado; se falso, o tempo corre até `agora`. */
  concluido?: boolean
  /** Mudanças de status do chamado (Timeline) para descontar períodos em espera. */
  statusEvents?: SlaStatusEvent[] | null
  agora?: Date
  analistas?: { id: string; nome?: string }[]
}): ChamadoSlaResult {
  const { item, dims, rules, dataConclusao, dataInicio, dataFinal, analistas } = input
  const concluido = input.concluido ?? true
  const agora = input.agora ?? new Date()
  const slaDims = toTicketSlaDims(dims, item)
  const best = findBestSlaRule(rules, slaDims)
  const computed = best ? computePrazoSlaFromRule(best.rule, slaDims) : { seconds: 0, modo: null }
  const prazoSlaSeconds = computed.seconds

  const inicio = parseSlaInstant(dataInicio, 'inicio')
  const fimRaw = concluido ? dataFinal || dataConclusao : null
  const fim = concluido
    ? parseSlaInstant(fimRaw, 'fim')
    : inicio && agora.getTime() < inicio.getTime()
      ? inicio
      : agora
  const fimSoData = concluido && isSlaDateOnly(fimRaw)
  const emEspera = !concluido && isSlaWaitStatus(item?.status)
  const historico = input.statusEvents ?? []
  const events = emEspera ? withCurrentWaitStatus(historico, item, agora) : historico

  let tempoExecutadoSeconds: number | null = null
  let tempoPausadoSeconds = 0
  let prazoLimite: Date | null = null
  if (inicio && fim && fim.getTime() >= inicio.getTime()) {
    const pauses = buildPauseIntervals(events, fim)
    tempoPausadoSeconds = pausedBusinessSeconds(pauses, inicio, fim)
    tempoExecutadoSeconds = Math.max(0, businessSecondsBetween(inicio, fim) - tempoPausadoSeconds)
    if (prazoSlaSeconds > 0) {
      prazoLimite = addBusinessSeconds(inicio, prazoSlaSeconds + tempoPausadoSeconds)
    }
  }

  let status: SlaCumprimentoStatus
  if (!best || prazoSlaSeconds <= 0) status = 'sem_regra'
  else if (tempoExecutadoSeconds == null || !prazoLimite || !fim) status = 'sem_execucao'
  else if (concluido) {
    const dentro = fimSoData
      ? slaDayKey(fim) <= slaDayKey(prazoLimite)
      : fim.getTime() <= prazoLimite.getTime()
    status = dentro ? 'dentro' : 'fora'
  } else if (emEspera) {
    status = 'pausado'
  } else {
    status = agora.getTime() <= prazoLimite.getTime() ? 'no_prazo' : 'atrasado'
  }

  const saldoSeconds =
    tempoExecutadoSeconds != null && prazoSlaSeconds > 0 ? prazoSlaSeconds - tempoExecutadoSeconds : null
  const pctConsumido =
    tempoExecutadoSeconds != null && prazoSlaSeconds > 0
      ? Math.round((tempoExecutadoSeconds / prazoSlaSeconds) * 1000) / 10
      : null

  return {
    id: String(item.id),
    ticket: resolveTicketLabel(item),
    pageKey: dims.pageKey,
    pageLabel: PRODUTIVIDADE_PAGE_LABEL[dims.pageKey] || getPageConfig(dims.pageKey).label,
    analistaId: resolveItemAnalistaId(item, dims.pageKey, analistas),
    impacto: slaDims.impacto,
    dataInicio,
    dataFinal,
    dataConclusao,
    concluido,
    prazoSlaSeconds,
    prazoSlaDiasUteis: secondsToDiasUteis(prazoSlaSeconds),
    prazoLimite: prazoLimite ? prazoLimite.toISOString() : null,
    tempoExecutadoSeconds,
    tempoPausadoSeconds,
    saldoSeconds,
    pctConsumido,
    temHistoricoStatus: historico.length > 0,
    regraId: best?.rule.id ?? null,
    regra: best?.rule ?? null,
    matched: !!best,
    matchScore: best?.score ?? 0,
    status,
    faixaModo: computed.modo,
  }
}

export function formatSlaStatusLabel(status: SlaCumprimentoStatus): string {
  switch (status) {
    case 'dentro':
      return 'Dentro do prazo'
    case 'fora':
      return 'Fora do prazo'
    case 'no_prazo':
      return 'No prazo'
    case 'atrasado':
      return 'Atrasado'
    case 'pausado':
      return 'SLA pausado'
    case 'sem_execucao':
      return 'Sem data de início'
    default:
      return 'Sem regra'
  }
}

export function formatPrazoSlaLabel(seconds: number): string {
  const hms = formatSecondsToHms(seconds) || '00:00:00'
  const dias = secondsToDiasUteis(seconds)
  if (dias == null) return hms
  const diasLabel = new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
  }).format(dias)
  return `${hms} (${diasLabel}d úteis)`
}
