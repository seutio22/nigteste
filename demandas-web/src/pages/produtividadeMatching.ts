import {
  computeQuantityLineSeconds,
  getPageConfig,
  type ProdutividadePageKey,
  type QuantityKey,
} from './produtividadePageConfig'

export type { ProdutividadePageKey }
import {
  computeSistemasTempoSeconds,
  parseSistemasDetalhe,
  type SistemaTempoLinha,
} from './produtividadeSistemasDetalhe'

/** Páginas operacionais incluídas no Dashboard de Produtividade. */
export const PRODUTIVIDADE_DASHBOARD_PAGES: ProdutividadePageKey[] = [
  'demandas',
  'manutencoes',
  'atendimentos',
  'validacoes',
  'reajustes',
  'analytics',
]

export const PRODUTIVIDADE_PAGE_LABEL: Record<ProdutividadePageKey, string> = {
  demandas: 'Cadastro',
  manutencoes: 'Manutenções',
  atendimentos: 'Atendimentos',
  validacoes: 'Validações',
  reajustes: 'Reajustes',
  analytics: 'Analytics',
  projetos: 'Projetos',
}

export type ProdutividadeRegraRow = {
  id: string
  pageKey: string
  tipo1Id?: string | null
  tipo2Id?: string | null
  ativo?: boolean
  qtdSistemas?: number | null
  tempoSistemasSeconds?: number | null
  tempoSistemasAdicionalSeconds?: number | null
  tempoSistemasAdicionalPorTotalSeconds?: number | null
  sistemasDetalhe?: SistemaTempoLinha[] | unknown | null
  qtdUsuarios?: number | null
  tempoUsuariosSeconds?: number | null
  tempoUsuariosAdicionalSeconds?: number | null
  qtdClientes?: number | null
  tempoClientesSeconds?: number | null
  tempoClientesAdicionalSeconds?: number | null
  qtdRetornos?: number | null
  tempoRetornosSeconds?: number | null
  tempoRetornosAdicionalSeconds?: number | null
  qtdItens?: number | null
  tempoItensSeconds?: number | null
  tempoItensAdicionalSeconds?: number | null
  qtdContratos?: number | null
  tempoContratosSeconds?: number | null
  tempoContratosAdicionalSeconds?: number | null
  qtdSubs?: number | null
  tempoSubsSeconds?: number | null
  tempoSubsAdicionalSeconds?: number | null
  tempoPrevistoSeconds?: number | null
  pesoPontos?: number | null
}

export type TicketQuantidades = Partial<Record<QuantityKey, number | null>>

export type TicketProdutividadeDims = {
  pageKey: ProdutividadePageKey
  tipo1Id: string | null
  tipo2Id: string | null
  quantidades: TicketQuantidades
  /** IDs dos sistemas do chamado (para tempo por sistema) */
  sistemaIds?: string[]
  /** Total por sistema (Manutenção → Operação) */
  sistemasTotais?: Record<string, number>
}

/**
 * Resultado por chamado — preparado para futuro tempo executado no ticket.
 * Hoje: previsto pela regra; executado fica null até existir no chamado.
 */
export type ChamadoProdutividadeResult = {
  id: string
  ticket: string | null
  pageKey: ProdutividadePageKey
  pageLabel: string
  analistaId: string | null
  /** Início operacional (dataInicio) — base futura do timer real */
  dataInicio: string | null
  /** Fim operacional (dataFinal) */
  dataFinal: string | null
  /** Data usada para atribuir o chamado ao dia de produção (conclusão) */
  dataConclusao: string
  tempoPrevistoSeconds: number
  /** Futuro: HH:MM:SS real no chamado */
  tempoExecutadoSeconds: number | null
  regraId: string | null
  matched: boolean
  matchScore: number
}

function asIdList(value: unknown): string[] {
  if (value == null || value === '') return []
  if (Array.isArray(value)) return value.filter(Boolean).map(String)
  if (typeof value === 'string') {
    const t = value.trim()
    if (!t) return []
    if (t.startsWith('[')) {
      try {
        const parsed = JSON.parse(t)
        if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
      } catch {
        /* ignore */
      }
    }
    return [t]
  }
  return []
}

function toInt(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n) : null
}

function sumSistemasMetrics(metrics: unknown, key: 'qtdUsuarios' | 'qtdClientesVinculados'): number | null {
  if (!metrics || typeof metrics !== 'object') return null
  let sum = 0
  let any = false
  for (const row of Object.values(metrics as Record<string, any>)) {
    if (!row || typeof row !== 'object') continue
    const n = toInt(row[key])
    if (n != null) {
      sum += n
      any = true
    }
  }
  return any ? sum : null
}

/** Extrai dimensões de matching de uma Demanda (Cadastro). */
export function extractDemandaDims(item: any): TicketProdutividadeDims {
  const sistemasIds = asIdList(item?.sistemasIds)
  if (!sistemasIds.length && item?.sistemaId) sistemasIds.push(String(item.sistemaId))

  const qtdUsuariosMetrics = sumSistemasMetrics(item?.sistemasMetrics, 'qtdUsuarios')
  const qtdClientesMetrics = sumSistemasMetrics(item?.sistemasMetrics, 'qtdClientesVinculados')

  return {
    pageKey: 'demandas',
    tipo1Id: item?.tipoServicoId ? String(item.tipoServicoId) : null,
    tipo2Id: item?.tipoId ? String(item.tipoId) : null,
    sistemaIds: [...sistemasIds],
    sistemasTotais: undefined,
    quantidades: {
      qtdSistemas: sistemasIds.length || null,
      qtdUsuarios: qtdUsuariosMetrics ?? toInt(item?.qtdUsuarios) ?? toInt(item?.usuariosEmpresa),
      qtdClientes: qtdClientesMetrics ?? toInt(item?.qtdClientesVinculados),
      qtdRetornos: toInt(item?.qtdRetornos),
    },
  }
}

/** Extrai dimensões de matching de uma Manutenção. */
export function extractManutencaoDims(item: any): TicketProdutividadeDims {
  const sistemasIds = asIdList(item?.sistemasIds)
  if (!sistemasIds.length && item?.sistemaId) sistemasIds.push(String(item.sistemaId))

  const contratosIds = asIdList(item?.contratosIds)
  if (!contratosIds.length && item?.contratoId) contratosIds.push(String(item.contratoId))
  if (!contratosIds.length && Array.isArray(item?.contratosVinculos)) {
    for (const v of item.contratosVinculos) {
      if (v?.contratoId) contratosIds.push(String(v.contratoId))
    }
  }

  let qtdSistemas = sistemasIds.length || null
  if (!qtdSistemas && item?.sistemasTotais && typeof item.sistemasTotais === 'object') {
    qtdSistemas = Object.keys(item.sistemasTotais).length || null
  }

  const sistemasTotais: Record<string, number> = {}
  if (item?.sistemasTotais && typeof item.sistemasTotais === 'object' && !Array.isArray(item.sistemasTotais)) {
    for (const [k, v] of Object.entries(item.sistemasTotais as Record<string, unknown>)) {
      const n = toInt(v)
      if (n != null) sistemasTotais[String(k)] = n
    }
  }

  return {
    pageKey: 'manutencoes',
    tipo1Id: item?.tipoServicoId ? String(item.tipoServicoId) : null,
    tipo2Id: item?.tipoId ? String(item.tipoId) : null,
    sistemaIds: [...new Set(sistemasIds)],
    sistemasTotais,
    quantidades: {
      qtdSistemas,
      qtdContratos: contratosIds.length ? [...new Set(contratosIds)].length : null,
      qtdRetornos: toInt(item?.qtdRetornos),
    },
  }
}

function pickAnalistaId(item: any): string | null {
  if (item?.analistaId) return String(item.analistaId)
  if (item?.analista?.id) return String(item.analista.id)
  if (typeof item?.analista === 'string' && item.analista.trim()) return item.analista.trim()
  return null
}

function pickTipoValue(item: any, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = item?.[k]
    if (v == null || v === '') continue
    if (typeof v === 'object' && (v as any).id) return String((v as any).id)
    return String(v)
  }
  return null
}

/** Extrai dimensões de um Atendimento. */
export function extractAtendimentoDims(item: any): TicketProdutividadeDims {
  // UI grava enums (duvida/teams); API pode ter FKs — aceita ambos.
  return {
    pageKey: 'atendimentos',
    tipo1Id: pickTipoValue(item, 'tipoServico', 'tipoServicoId'),
    tipo2Id: pickTipoValue(item, 'tipo', 'tipoId'),
    quantidades: {
      qtdRetornos: toInt(item?.qtdRetornos) ?? toInt(item?.tempoResolucao),
    },
  }
}

/** Extrai dimensões de uma Validação (Contrato / SUB's). */
export function extractValidacaoDims(item: any): TicketProdutividadeDims {
  const tipoRaw = pickTipoValue(item, 'tipo')
  const tipoNorm = tipoRaw ? String(tipoRaw).trim() : null
  // Aceita Total/SUB em qualquer capitalização
  let tipo1Id: string | null = tipoNorm
  if (tipoNorm) {
    const lower = tipoNorm.toLowerCase()
    if (lower === 'total') tipo1Id = 'Total'
    else if (lower === 'sub' || lower === "sub's" || lower === 'subs') tipo1Id = 'SUB'
  }

  let contrato: number | null = null
  let subs: number | null = null
  const detalheRaw = item?.itensConcluidosDetalhe
  if (detalheRaw) {
    try {
      const d =
        typeof detalheRaw === 'string' ? JSON.parse(detalheRaw) : detalheRaw
      if (d && typeof d === 'object') {
        const c = toInt((d as any).contrato)
        const s = toInt((d as any).subs)
        // 0 é quantidade válida (não contar); null = ausente
        contrato = c != null && c > 0 ? c : c === 0 ? 0 : null
        subs = s != null && s > 0 ? s : s === 0 ? 0 : null
        if (contrato === 0) contrato = null
        if (subs === 0) subs = null
      }
    } catch {
      /* ignore */
    }
  }

  const itens = toInt(item?.itensConcluidos)
  if (contrato == null && subs == null && itens != null && itens > 0) {
    if (tipo1Id === 'SUB') subs = itens
    else contrato = itens
  }

  return {
    pageKey: 'validacoes',
    tipo1Id,
    tipo2Id: null,
    quantidades: {
      qtdContratos: contrato,
      qtdSubs: subs,
      qtdRetornos: toInt(item?.qtdRetornos),
    },
  }
}

/** Extrai dimensões de um Reajuste (lançamento). */
export function extractReajusteDims(item: any): TicketProdutividadeDims {
  let qtdContratos: number | null = null
  const vinculos = item?.contratosVinculos
  if (Array.isArray(vinculos) && vinculos.length) {
    const ids = vinculos
      .map((v: any) => v?.contratoId)
      .filter(Boolean)
      .map(String)
    qtdContratos = ids.length ? [...new Set(ids)].length : vinculos.length
  } else if (item?.contrato || item?.contratoId) {
    qtdContratos = 1
  }

  return {
    pageKey: 'reajustes',
    tipo1Id: null,
    tipo2Id: null,
    quantidades: {
      qtdContratos,
      qtdItens: toInt(item?.itensConcluidos) ?? toInt(item?.itensPendentes),
    },
  }
}

/** Extrai dimensões de Analytics (Report). */
export function extractAnalyticsDims(item: any): TicketProdutividadeDims {
  return {
    pageKey: 'analytics',
    tipo1Id: pickTipoValue(item, 'tipoSolicitacao'),
    tipo2Id: pickTipoValue(item, 'solicitacao'),
    quantidades: {
      qtdItens: toInt(item?.total),
    },
  }
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

/** Normaliza nome para matching (acentos, espaços, case). */
function normalizePersonName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/**
 * Resolve valor livre (UUID ou nome) para id de analista.
 * Espelha a lógica usada na lista de Reajustes.
 */
function resolveAnalistaFromValue(
  raw: unknown,
  analistas?: { id: string; nome?: string }[]
): string | null {
  if (raw == null || raw === '') return null
  const v = String(raw).trim()
  if (!v) return null

  if (analistas?.length) {
    const byId = analistas.find((a) => a.id === v)
    if (byId) return byId.id

    const norm = normalizePersonName(v)
    const exact = analistas.find((a) => normalizePersonName(a.nome || '') === norm)
    if (exact) return exact.id

    const partial = analistas.find((a) => {
      const n = normalizePersonName(a.nome || '')
      if (!n || !norm) return false
      return n.includes(norm) || norm.includes(n)
    })
    if (partial) return partial.id
  }

  // UUID gravado no campo texto sem estar na lista carregada — ainda atribui ao id
  if (isUuidLike(v)) return v
  return null
}

export function resolveItemAnalistaId(
  item: any,
  pageKey: ProdutividadePageKey,
  analistas?: { id: string; nome?: string }[]
): string | null {
  const fromDirect = resolveAnalistaFromValue(pickAnalistaId(item), analistas)
  if (fromDirect) return fromDirect

  // ReajusteLancamento: analista vive em responsavelAnalista (nome OU UUID),
  // frequentemente sem analistaId preenchido.
  if (pageKey === 'reajustes') {
    const fromResp = resolveAnalistaFromValue(item?.responsavelAnalista, analistas)
    if (fromResp) return fromResp
  }

  if (pageKey === 'analytics') {
    const fromAnalista = resolveAnalistaFromValue(item?.analista, analistas)
    if (fromAnalista) return fromAnalista
  }

  if (pageKey === 'validacoes') {
    const fromResp = resolveAnalistaFromValue(item?.responsavelAnalista, analistas)
    if (fromResp) return fromResp
  }

  return null
}

function scoreRule(rule: ProdutividadeRegraRow, dims: TicketProdutividadeDims): number | null {
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

  // qtd* na regra é só referência do formulário (preview da 1ª un.).
  // NÃO exige igualdade com o chamado — as taxas (base/adicional) aplicam à qtd real.
  // Se no futuro quisermos filtro por quantidade sem taxa, aí sim exigir match.
  const cfg = getPageConfig(dims.pageKey)
  for (const q of cfg.quantities) {
    const ruleQtd = toInt((rule as any)[q.key])
    if (ruleQtd == null) continue
    const hasRate =
      (toInt((rule as any)[q.tempoBaseKey]) ?? 0) > 0 ||
      (toInt((rule as any)[q.tempoAdicionalKey]) ?? 0) > 0
    if (hasRate) continue
    const ticketQtd = toInt(dims.quantidades[q.key])
    if (ticketQtd == null || ticketQtd !== ruleQtd) return null
    score += 3
  }

  return score
}

/** Calcula tempo previsto a partir das taxas da regra × quantidades do chamado. */
export function computeTempoPrevistoFromRule(
  rule: ProdutividadeRegraRow,
  dims: TicketProdutividadeDims
): number {
  const cfg = getPageConfig(dims.pageKey)
  let sum = 0
  let anyRate = false
  const detalhe = parseSistemasDetalhe(rule.sistemasDetalhe)

  for (const q of cfg.quantities) {
    if (q.key === 'qtdSistemas') {
      const sistemasSec = computeSistemasTempoSeconds({
        sistemaIds: dims.sistemaIds || [],
        sistemasTotais: dims.sistemasTotais,
        detalhe,
        tempoBaseSeconds: toInt(rule.tempoSistemasSeconds),
        tempoAdicionalSeconds: toInt(rule.tempoSistemasAdicionalSeconds),
        tempoAdicionalPorTotalDemaisSeconds: toInt(rule.tempoSistemasAdicionalPorTotalSeconds),
      })
      if (sistemasSec > 0 || detalhe.length > 0 || toInt(rule.tempoSistemasSeconds) || toInt(rule.tempoSistemasAdicionalSeconds)) {
        anyRate = true
        sum += sistemasSec
      }
      continue
    }

    const base = toInt((rule as any)[q.tempoBaseKey])
    const adic = toInt((rule as any)[q.tempoAdicionalKey])
    if ((base == null || base <= 0) && (adic == null || adic <= 0)) continue
    anyRate = true
    const qtd = toInt(dims.quantidades[q.key])
    sum += computeQuantityLineSeconds(qtd, base, adic, { emptyMeansOne: false })
  }

  if (anyRate && sum > 0) return sum
  // Fallback: total fixo cadastrado na regra
  return toInt(rule.tempoPrevistoSeconds) ?? 0
}

export function findBestRule(
  rules: ProdutividadeRegraRow[],
  dims: TicketProdutividadeDims
): { rule: ProdutividadeRegraRow; score: number } | null {
  let best: { rule: ProdutividadeRegraRow; score: number } | null = null
  for (const rule of rules) {
    const score = scoreRule(rule, dims)
    if (score == null) continue
    if (!best || score > best.score) best = { rule, score }
  }
  return best
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
    item?.demanda?.ticket,
  ]
  for (const c of candidates) {
    if (c == null) continue
    const s = String(c).trim()
    if (s) return s
  }
  return null
}

export function evaluateTicketProdutividade(input: {
  item: any
  dims: TicketProdutividadeDims
  rules: ProdutividadeRegraRow[]
  dataConclusao: string
  dataInicio: string | null
  dataFinal: string | null
  analistas?: { id: string; nome?: string }[]
}): ChamadoProdutividadeResult {
  const { item, dims, rules, dataConclusao, dataInicio, dataFinal, analistas } = input
  const best = findBestRule(rules, dims)
  const tempoPrevistoSeconds = best ? computeTempoPrevistoFromRule(best.rule, dims) : 0

  return {
    id: String(item.id),
    ticket: resolveTicketLabel(item),
    pageKey: dims.pageKey,
    pageLabel: PRODUTIVIDADE_PAGE_LABEL[dims.pageKey] || getPageConfig(dims.pageKey).label,
    analistaId: resolveItemAnalistaId(item, dims.pageKey, analistas),
    dataInicio,
    dataFinal,
    dataConclusao,
    tempoPrevistoSeconds,
    tempoExecutadoSeconds: null,
    regraId: best?.rule.id ?? null,
    // Regra encontrada = match (mesmo se qtd do chamado zerar o tempo)
    matched: !!best,
    matchScore: best?.score ?? 0,
  }
}
