import type { CotacaoFormState } from './CotacaoFormFields'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  FAIXAS_ETARIAS,
  subtotalFaixaCents,
  type FaixaEtariaKey,
} from './placementCotacaoDetalhes'
import {
  computeContratoAtualResumo,
  contratoPageFromColunas,
  coparticipacaoSimNaoLabel,
  faixaLabelDisplay,
  type ContratoAtualPagina,
  type ContratoPlanoColuna,
  type FaixaEtariaLinha,
  TAB_COLORS,
} from './placementContratoAtual'
import { formatCentsToBRL, parseBRLToCents } from './utils'
import {
  coletarEntradasComparativo,
  comparativoColunaId,
  computeComparativoPlanosResumo,
  ordenarEntradasPorEquivalencia,
  propostaMercadoTemOfertaParaComparativo,
  type PropostaColunaEntrada,
} from './placementPropostaComparativo'
import {
  ensureAguardandoOperadoraState,
  type ComparativoEstudoConfig,
  type ComparativoFaixaAgrupamento,
  type ComparativoFaixaCelula,
  type PropostaPlanoLinha,
} from './placementAguardandoOperadora'
import { labelPlanoReferencia, planosReferenciaAbertura, type PlanoReferenciaAbertura } from './placementPropostaEquivalencia'
import { normMercadoKey } from './placementMercadoQuadro'
import { resolveReembolsoConsultaComparativo } from './placementReembolsoConsulta'
import type { Operadora } from '../../../types/masterData'

export type ComparativoColunaEstudo = {
  id: string
  grupo: 'atual' | 'mercado'
  operadora: string
  planoLabel: string
  subtitulo: string
  reembolsoConsulta: string
  /** Sim/Não no comparativo detalhado. */
  reembolso: string
  temReembolsoConsulta: boolean
  acomodacao: string
  eventosReembolsaveis: string
  abrangencia: string
  coparticipacao: string
  tipoCusto: 'per_capita' | 'faixa_etaria'
  vidas: number
  totalMensalCents: number | null
  totalAnualCents: number | null
  faixas: FaixaEtariaLinha[]
  tabColor: string
  planoReferenciaId: string
  planoReferenciaLabel: string
  /** Cenário da proposta — totais do rodapé somam planos dentro do cenário, não entre cenários. */
  cenarioId?: string
  cenarioTitulo?: string
  cenarioOrdem?: number
}

export type ComparativoImpacto = {
  variacaoPct: string
  impactoMensal: string
  impactoAnual: string
  economia: boolean
}

export type ComparativoFaixaPagina = {
  pageIndex: number
  totalPages: number
  grupoIndex: number
  totalGrupos: number
  grupoLabel: string
  faixaCelula: ComparativoFaixaCelula
  colunas: ComparativoColunaEstudo[]
  vidasGrupo: Record<FaixaEtariaKey, number>
  impactos: ComparativoImpacto[]
}

export type ComparativoConsolidadoLinha = {
  id: string
  label: string
  tipo: 'section' | 'data' | 'resultado'
  valores: string[]
  destaque?: boolean
}

export type ComparativoConsolidadoPagina = {
  pageIndex: number
  totalPages: number
  colunas: ComparativoColunaEstudo[]
  linhas: ComparativoConsolidadoLinha[]
}

export type ComparativoDetalhePagina = {
  pageIndex: number
  totalPages: number
  colunas: ComparativoColunaEstudo[]
  impactos: ComparativoImpacto[]
}

function parseVidasInt(input: string): number {
  const n = Number(String(input ?? '').trim())
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

function formatBRLInput(input: string): string {
  const cents = parseBRLToCents(input)
  if (cents != null) return formatCentsToBRL(cents)
  const t = String(input ?? '').trim()
  return t || '—'
}

function reembolsoFromPlano(plano?: Pick<PropostaPlanoLinha, 'reembolso' | 'reembolsoConsulta'>) {
  const resolved = resolveReembolsoConsultaComparativo(plano?.reembolso, plano?.reembolsoConsulta)
  return {
    reembolso: resolved.flag,
    temReembolsoConsulta: resolved.temReembolso,
    reembolsoConsulta: resolved.valorDisplay,
  }
}

function colunaFromContrato(c: ContratoPlanoColuna): ComparativoColunaEstudo {
  const mensal = parseBRLToCents(c.faturaEstimada)
  return {
    id: c.id,
    grupo: 'atual',
    operadora: c.operadora,
    planoLabel: c.planoLabel,
    subtitulo: c.produto,
    reembolso: '—',
    temReembolsoConsulta: false,
    reembolsoConsulta: '—',
    acomodacao: c.acomodacao || '—',
    eventosReembolsaveis: '—',
    abrangencia: '—',
    coparticipacao: c.coparticipacao,
    tipoCusto: c.tipoCusto,
    vidas: c.vidas,
    totalMensalCents: mensal,
    totalAnualCents: mensal != null ? mensal * 12 : null,
    faixas: c.faixas,
    tabColor: c.tabColor,
    planoReferenciaId: c.planoReferenciaId ?? c.id,
    planoReferenciaLabel: c.planoLabel,
  }
}

function buildFaixasFromProposta(plano: PropostaPlanoLinha): FaixaEtariaLinha[] {
  return FAIXAS_ETARIAS.map((fx) => {
    const vidas = parseVidasInt(plano.vidasFaixa[fx.key] ?? '')
    const custo = formatBRLInput(plano.custosFaixa[fx.key] ?? '')
    const subCents = subtotalFaixaCents(plano.vidasFaixa[fx.key] ?? '', plano.custosFaixa[fx.key] ?? '')
    return {
      key: fx.key,
      label: fx.label,
      vidas,
      custo,
      subtotal: subCents != null ? formatCentsToBRL(subCents) : '—',
    }
  }).filter((f) => f.vidas > 0 || f.custo !== '—')
}

function totalMensalProposta(plano: PropostaPlanoLinha): number | null {
  if (plano.tipoCusto === 'faixa_etaria') {
    let total = 0
    let any = false
    for (const fx of FAIXAS_ETARIAS) {
      const sub = subtotalFaixaCents(plano.vidasFaixa[fx.key] ?? '', plano.custosFaixa[fx.key] ?? '')
      if (sub != null) {
        total += sub
        any = true
      }
    }
    return any ? total : null
  }
  const vidas = parseVidasInt(plano.numeroVidas)
  const custo = parseBRLToCents(plano.custoPerCapitaBRL)
  if (custo != null && vidas > 0) return custo * vidas
  return custo
}

function vidasProposta(plano: PropostaPlanoLinha): number {
  if (plano.tipoCusto === 'faixa_etaria') {
    return FAIXAS_ETARIAS.reduce((s, fx) => s + parseVidasInt(plano.vidasFaixa[fx.key] ?? ''), 0)
  }
  return parseVidasInt(plano.numeroVidas)
}

function colunaFromProposta(
  fornecedorNome: string,
  operadoraId: string,
  plano: PropostaPlanoLinha,
  tabColor: string,
  grupo: 'atual' | 'mercado' = 'mercado',
  cenarioId: string,
  cenarioTitulo?: string,
  planoReferenciaId?: string,
  referencias?: ReturnType<typeof planosReferenciaAbertura>
): ComparativoColunaEstudo | null {
  if (!propostaMercadoTemOfertaParaComparativo(plano)) return null
  const mensal = totalMensalProposta(plano)
  const ref = referencias?.find((r) => r.id === planoReferenciaId)
  const hasFaixa = FAIXAS_ETARIAS.some((fx) => {
    const v = parseVidasInt(plano.vidasFaixa[fx.key] ?? '')
    const c = parseBRLToCents(plano.custosFaixa[fx.key] ?? '')
    return v > 0 || c != null
  })
  const hasPerCapita =
    parseVidasInt(plano.numeroVidas) > 0 || parseBRLToCents(plano.custoPerCapitaBRL) != null
  let tipoCusto: 'per_capita' | 'faixa_etaria' = plano.tipoCusto
  if (ref?.tipoCusto) tipoCusto = ref.tipoCusto
  else if (hasPerCapita && !hasFaixa) tipoCusto = 'per_capita'
  else if (hasFaixa && !hasPerCapita) tipoCusto = 'faixa_etaria'
  const faixas = tipoCusto === 'faixa_etaria' ? buildFaixasFromProposta(plano) : []

  const tituloCenario = cenarioTitulo?.trim()
  const refLabel =
    referencias && planoReferenciaId
      ? labelPlanoReferencia(planoReferenciaId, referencias)
      : '—'
  let planoLabel = tituloCenario || plano.nomePlano.trim() || refLabel || 'Plano'
  if (tituloCenario && grupo === 'atual') {
    planoLabel = `${refLabel !== '—' ? refLabel : plano.nomePlano.trim() || 'Plano'} · ${tituloCenario}`
  } else if (grupo === 'mercado') {
    const nomeOferta = plano.nomePlano.trim() || 'Proposta'
    if (tituloCenario) {
      planoLabel =
        refLabel !== '—'
          ? `${nomeOferta} · ${tituloCenario} (≈ ${refLabel})`
          : `${nomeOferta} · ${tituloCenario}`
    } else if (refLabel !== '—') {
      planoLabel = `${nomeOferta} (≈ ${refLabel})`
    } else {
      planoLabel = nomeOferta
    }
  }

  return {
    id: comparativoColunaId(cenarioId, plano.id),
    grupo,
    operadora: fornecedorNome.toUpperCase(),
    planoLabel,
    subtitulo: tituloCenario ? plano.nomePlano.trim() || 'Plano' : grupo === 'atual' ? 'Contrato vigente' : 'Proposta',
    ...reembolsoFromPlano(plano),
    acomodacao: plano.acomodacao.trim() || '—',
    eventosReembolsaveis: plano.eventosReembolsaveis.trim() || '—',
    abrangencia: plano.abrangencia.trim() || '—',
    coparticipacao: coparticipacaoSimNaoLabel(plano.coparticipacao),
    tipoCusto,
    vidas: vidasProposta({ ...plano, tipoCusto }),
    totalMensalCents: mensal,
    totalAnualCents: mensal != null ? mensal * 12 : null,
    faixas,
    tabColor,
    planoReferenciaId: planoReferenciaId || plano.id,
    planoReferenciaLabel: refLabel !== '—' ? refLabel : planoLabel,
    cenarioId,
    cenarioTitulo: tituloCenario || undefined,
  }
}

function resolveOperadoraIdByNome(
  nome: string,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): string {
  const key = normMercadoKey(nome)
  const hit = operadoras.find((o) => normMercadoKey(o.nome) === key)
  if (hit) return hit.id
  if (operadorasById) {
    for (const o of Object.values(operadorasById)) {
      if (normMercadoKey(o.nome) === key) return o.id
    }
  }
  return ''
}

function colunaEstudoFromContratoPlano(
  contrato: ContratoPlanoColuna,
  plano?: PropostaPlanoLinha,
  referencias?: PlanoReferenciaAbertura[]
): ComparativoColunaEstudo {
  const mensal = parseBRLToCents(contrato.faturaEstimada)
  const grupo = contrato.grupo ?? 'atual'
  const refLabel =
    contrato.planoReferenciaId && referencias
      ? labelPlanoReferencia(contrato.planoReferenciaId, referencias)
      : contrato.planoLabel

  return {
    id: contrato.id,
    grupo,
    operadora: contrato.operadora,
    planoLabel: contrato.planoLabel,
    subtitulo: contrato.produto,
    ...reembolsoFromPlano(plano),
    acomodacao: plano?.acomodacao.trim() || contrato.acomodacao || '—',
    eventosReembolsaveis: plano?.eventosReembolsaveis.trim() || '—',
    abrangencia: plano?.abrangencia.trim() || '—',
    coparticipacao: coparticipacaoSimNaoLabel(plano?.coparticipacao.trim() || contrato.coparticipacao),
    tipoCusto: contrato.tipoCusto,
    vidas: contrato.vidas,
    totalMensalCents: mensal,
    totalAnualCents: mensal != null ? mensal * 12 : null,
    faixas: contrato.faixas,
    tabColor: contrato.tabColor,
    planoReferenciaId: contrato.planoReferenciaId ?? contrato.id,
    planoReferenciaLabel: refLabel !== '—' ? refLabel : contrato.planoLabel,
    cenarioId: contrato.cenarioId,
    cenarioTitulo: contrato.cenarioTitulo,
    cenarioOrdem: contrato.cenarioOrdem,
  }
}

export function buildComparativoColunasFromResumo(
  contratoColunas: ContratoPlanoColuna[],
  entradas: PropostaColunaEntrada[],
  referencias: PlanoReferenciaAbertura[]
): ComparativoColunaEstudo[] {
  const entradaByColId = new Map<string, PropostaColunaEntrada>()
  for (const entrada of entradas) {
    entradaByColId.set(comparativoColunaId(entrada.cenarioId, entrada.plano.id), entrada)
  }
  return contratoColunas.map((contrato) =>
    colunaEstudoFromContratoPlano(contrato, entradaByColId.get(contrato.id)?.plano, referencias)
  )
}

export function buildComparativoColunas(
  form: CotacaoFormState,
  operadoras: Operadora[],
  beneficiarios: PlacementBeneficiario[],
  operadorasById?: Record<string, Operadora>,
  incluirAtual = true
): ComparativoColunaEstudo[] {
  const colunas: ComparativoColunaEstudo[] = []
  const opMap = new Map(operadoras.map((o) => [o.id, o.nome]))
  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)

  let entradas = ordenarEntradasPorEquivalencia(
    coletarEntradasComparativo(form, operadoras, operadorasById, incluirAtual),
    referencias
  )

  if (!entradas.length && incluirAtual) {
    const cotacaoPayload = {
      itensMapeamento: form.itens,
      planosCobertura: form.planos,
      coparticipacaoDetalhePorPlanos: form.coparticipacaoDetalhePorPlanos,
      dadosFinanceiros: form.dadosFinanceiros,
    }
    const contrato = computeContratoAtualResumo(cotacaoPayload, beneficiarios, opMap)
    for (const c of contrato.allColunas) {
      colunas.push(colunaFromContrato(c))
    }
    return colunas
  }

  const resumo = computeComparativoPlanosResumo(
    form,
    operadoras,
    beneficiarios,
    operadorasById,
    3,
    incluirAtual
  )
  return buildComparativoColunasFromResumo(resumo.allColunas, entradas, referencias)
}

/** Alinha totais e faixas do consolidado/detalhe com o cálculo do comparativo por plano (abertura + reajuste + merge). */
export function alignColunasFinanceirasComContrato(
  colunas: ComparativoColunaEstudo[],
  contratoColunas: ContratoPlanoColuna[]
): ComparativoColunaEstudo[] {
  const byId = new Map(contratoColunas.map((c) => [c.id, c]))
  return colunas.map((col) => {
    const contrato = byId.get(col.id)
    if (!contrato) return col
    const mensal = parseBRLToCents(contrato.faturaEstimada)
    if (mensal == null) return col
    return {
      ...col,
      tipoCusto: contrato.tipoCusto,
      vidas: contrato.vidas,
      faixas: contrato.faixas.length ? contrato.faixas : col.faixas,
      totalMensalCents: mensal,
      totalAnualCents: mensal * 12,
    }
  })
}

function paginateColunas<T extends { colunas: ComparativoColunaEstudo[] }>(
  allColunas: ComparativoColunaEstudo[],
  colunasPorSlide: number,
  buildPage: (cols: ComparativoColunaEstudo[], pageIndex: number, totalPages: number) => T
): T[] {
  if (!allColunas.length) return []
  const chunk = Math.max(1, colunasPorSlide)
  const pages: T[] = []
  const totalPages = Math.ceil(allColunas.length / chunk)
  for (let i = 0; i < totalPages; i++) {
    const slice = allColunas.slice(i * chunk, i * chunk + chunk)
    pages.push(buildPage(slice, i, totalPages))
  }
  return pages
}

function vidasGrupoFromColunas(colunas: ComparativoColunaEstudo[]): Record<FaixaEtariaKey, number> {
  const base = Object.fromEntries(FAIXAS_ETARIAS.map((f) => [f.key, 0])) as Record<FaixaEtariaKey, number>
  for (const col of colunas) {
    if (col.tipoCusto !== 'faixa_etaria') continue
    for (const fx of col.faixas) {
      if (fx.vidas > 0) base[fx.key] = Math.max(base[fx.key], fx.vidas)
    }
  }
  return base
}

export function computeImpacto(
  referencia: ComparativoColunaEstudo | undefined,
  coluna: ComparativoColunaEstudo
): ComparativoImpacto {
  const refMensal = referencia?.totalMensalCents ?? null
  const colMensal = coluna.totalMensalCents ?? null
  if (refMensal == null || colMensal == null) {
    return { variacaoPct: '—', impactoMensal: '—', impactoAnual: '—', economia: false }
  }
  const diff = colMensal - refMensal
  const pct = refMensal !== 0 ? (diff / refMensal) * 100 : 0
  const economia = diff < 0
  const sinal = diff >= 0 ? '' : '-'
  return {
    variacaoPct: `${pct >= 0 ? '' : '-'}${Math.abs(pct).toFixed(2).replace('.', ',')}%`,
    impactoMensal: `${sinal}${formatCentsToBRL(Math.abs(diff))}`,
    impactoAnual: `${sinal}${formatCentsToBRL(Math.abs(diff * 12))}`,
    economia,
  }
}

function colunasFaixaEtaria(colunas: ComparativoColunaEstudo[]): ComparativoColunaEstudo[] {
  return colunas.filter(
    (c) => c.tipoCusto === 'faixa_etaria' && c.faixas.some((f) => f.vidas > 0 || f.custo !== '—')
  )
}

export function gruposColunasFaixa(
  colunas: ComparativoColunaEstudo[],
  agrupamento: ComparativoFaixaAgrupamento,
  referencias: PlanoReferenciaAbertura[] = []
): { label: string; colunas: ComparativoColunaEstudo[] }[] {
  const faixaColunas = colunasFaixaEtaria(colunas)
  if (!faixaColunas.length) return []

  const uniqueRefs = new Set(faixaColunas.map((c) => c.planoReferenciaId?.trim() || c.id))

  /** Um plano: todos os fornecedores na mesma página. */
  if (uniqueRefs.size <= 1) {
    const label = referencias.find((r) => uniqueRefs.has(r.id))?.label ?? ''
    return [{ label, colunas: faixaColunas }]
  }

  /** Vários planos: uma página por plano equivalente. */
  return groupFaixaPorReferencia(faixaColunas, referencias)
}

function groupFaixaPorReferencia(
  faixaColunas: ComparativoColunaEstudo[],
  referencias: PlanoReferenciaAbertura[]
): { label: string; colunas: ComparativoColunaEstudo[] }[] {
  const byRef = new Map<string, ComparativoColunaEstudo[]>()
  for (const c of faixaColunas) {
    const key = c.planoReferenciaId?.trim() || c.id
    const list = byRef.get(key) ?? []
    list.push(c)
    byRef.set(key, list)
  }

  const groups: { label: string; colunas: ComparativoColunaEstudo[] }[] = []
  const seen = new Set<string>()

  for (const ref of referencias) {
    const cols = byRef.get(ref.id)
    if (!cols?.length) continue
    groups.push({ label: ref.label, colunas: cols })
    seen.add(ref.id)
  }

  for (const [key, cols] of byRef) {
    if (seen.has(key)) continue
    groups.push({
      label: cols[0]?.planoReferenciaLabel || cols[0]?.planoLabel || 'Outros planos',
      colunas: cols,
    })
  }

  return groups.length ? groups : [{ label: '', colunas: faixaColunas }]
}

export function buildComparativoFaixaPages(
  colunas: ComparativoColunaEstudo[],
  colunasPorSlide: number,
  options?: {
    agrupamento?: ComparativoFaixaAgrupamento
    faixaCelula?: ComparativoFaixaCelula
    referencias?: PlanoReferenciaAbertura[]
  }
): ComparativoFaixaPagina[] {
  const agrupamento = options?.agrupamento ?? 'horizontal'
  const faixaCelula = options?.faixaCelula ?? 'unitario'
  const referencias = options?.referencias ?? []
  const grupos = gruposColunasFaixa(colunas, agrupamento, referencias)
  if (!grupos.length) return []

  const pages: ComparativoFaixaPagina[] = []
  const totalGrupos = grupos.length

  grupos.forEach((grupo, grupoIndex) => {
    const referencia =
      grupo.colunas.find((c) => c.grupo === 'atual') ?? grupo.colunas[0]
    const vidasGrupo = vidasGrupoFromColunas(grupo.colunas)
    const impactos = grupo.colunas
      .filter((c) => c.grupo === 'mercado')
      .map((c) => computeImpacto(referencia, c))
    pages.push({
      pageIndex: grupoIndex,
      totalPages: totalGrupos,
      grupoIndex,
      totalGrupos,
      grupoLabel: grupo.label,
      faixaCelula,
      colunas: grupo.colunas,
      vidasGrupo,
      impactos,
    })
  })

  return pages
}

export function buildComparativoDetalhePages(
  colunas: ComparativoColunaEstudo[],
  colunasPorSlide: number
): ComparativoDetalhePagina[] {
  const referencia = colunas.find((c) => c.grupo === 'atual')
  return paginateColunas(colunas, colunasPorSlide, (slice, pageIndex, totalPages) => ({
    pageIndex,
    totalPages,
    colunas: slice,
    impactos: slice.filter((c) => c.grupo === 'mercado').map((c) => computeImpacto(referencia, c)),
  }))
}

/** Página unificada: mesmas colunas no quadro por plano, consolidado e detalhe. */
export type ComparativoUnificadoPagina = {
  pageIndex: number
  totalPages: number
  contrato: ContratoAtualPagina
  consolidado: ComparativoConsolidadoPagina
  detalhe: ComparativoDetalhePagina
}

export function buildComparativoUnificadoPages(
  allColunasPlano: ContratoPlanoColuna[],
  consolidadoPages: ComparativoConsolidadoPagina[],
  detalhePages: ComparativoDetalhePagina[]
): ComparativoUnificadoPagina[] {
  const totalPages = Math.max(consolidadoPages.length, detalhePages.length)
  if (!totalPages) return []

  const byId = new Map(allColunasPlano.map((c) => [c.id, c]))
  const pages: ComparativoUnificadoPagina[] = []

  for (let i = 0; i < totalPages; i++) {
    const consolidado = consolidadoPages[i]
    const detalhe = detalhePages[i]
    const colunasEstudo = consolidado?.colunas ?? detalhe?.colunas ?? []
    const colunasPlano = colunasEstudo
      .map((c) => byId.get(c.id))
      .filter((c): c is ContratoPlanoColuna => c != null)

    pages.push({
      pageIndex: i,
      totalPages,
      contrato: contratoPageFromColunas(colunasPlano, i, totalPages),
      consolidado: consolidado ?? {
        pageIndex: i,
        totalPages,
        colunas: [],
        linhas: [],
      },
      detalhe: detalhe ?? {
        pageIndex: i,
        totalPages,
        colunas: [],
        impactos: [],
      },
    })
  }

  return pages
}

export function buildConsolidadoLinhas(
  slice: ComparativoColunaEstudo[],
  referencia?: ComparativoColunaEstudo
): ComparativoConsolidadoLinha[] {
  const fmt = (cents: number | null | undefined) => (cents != null ? formatCentsToBRL(cents) : '—')

  return [
    {
      id: 'sec-geral',
      label: 'CUSTOS',
      tipo: 'section',
      valores: slice.map(() => ''),
    },
    {
      id: 'vidas',
      label: 'TOTAL DE VIDAS',
      tipo: 'data',
      valores: slice.map((c) => String(c.vidas || '—')),
    },
    {
      id: 'mensal',
      label: 'CUSTO MENSAL',
      tipo: 'data',
      valores: slice.map((c) => fmt(c.totalMensalCents)),
    },
    {
      id: 'anual',
      label: 'CUSTO ANUAL - R$',
      tipo: 'data',
      valores: slice.map((c) => fmt(c.totalAnualCents)),
    },
    {
      id: 'sec-res',
      label: 'RESULTADO FINANCEIRO',
      tipo: 'section',
      valores: slice.map(() => ''),
    },
    {
      id: 'res-mes',
      label: 'RESULTADO MÊS',
      tipo: 'resultado',
      valores: slice.map((c) => {
        if (c.grupo === 'atual' || !referencia) return '—'
        return computeImpacto(referencia, c).impactoMensal
      }),
    },
    {
      id: 'res-ano',
      label: 'RESULTADO ANO',
      tipo: 'resultado',
      valores: slice.map((c) => {
        if (c.grupo === 'atual' || !referencia) return '—'
        return computeImpacto(referencia, c).impactoAnual
      }),
    },
    {
      id: 'res-pct',
      label: 'RESULTADO ANO - %',
      tipo: 'resultado',
      valores: slice.map((c) => {
        if (c.grupo === 'atual' || !referencia) return '—'
        return computeImpacto(referencia, c).variacaoPct
      }),
    },
  ]
}

/** Consolidado alinhado às colunas exibidas no comparativo por plano (mesma ordem/IDs). */
export function buildConsolidadoForContratoPage(
  allColunas: ComparativoColunaEstudo[],
  colunaIds: string[]
): ComparativoConsolidadoPagina | null {
  if (!allColunas.length || !colunaIds.length) return null
  const slice = colunaIds
    .map((id) => allColunas.find((c) => c.id === id))
    .filter((c): c is ComparativoColunaEstudo => c != null)
  if (!slice.length) return null
  const referencia = allColunas.find((c) => c.grupo === 'atual')
  return {
    pageIndex: 0,
    totalPages: 1,
    colunas: slice,
    linhas: buildConsolidadoLinhas(slice, referencia),
  }
}

export function custoMedioEstudoColuna(col: ComparativoColunaEstudo): string {
  if (col.vidas > 0 && col.totalMensalCents != null && col.totalMensalCents > 0) {
    return formatCentsToBRL(Math.round(col.totalMensalCents / col.vidas))
  }
  return '—'
}

function operadoraAggKey(grupo: 'atual' | 'mercado', operadora: string): string {
  return `${grupo}::${operadora.trim().toUpperCase()}`
}

/** Slot horizontal: operadora + cenário (ex.: AMIL · Com COPay e AMIL · Sem COPAY). */
export function colunaSlotKey(col: {
  grupo?: 'atual' | 'mercado'
  operadora: string
  cenarioId?: string
}): string {
  const grupo = col.grupo ?? 'mercado'
  const cenario = String(col.cenarioId ?? 'default').trim() || 'default'
  return `${operadoraAggKey(grupo, col.operadora)}::${cenario}`
}

function sortPorOperadora<T extends { grupo: 'atual' | 'mercado'; operadora: string; cenarioOrdem?: number; cenarioTitulo?: string; key?: string }>(
  items: T[]
): T[] {
  return [...items].sort((a, b) => {
    if (a.grupo !== b.grupo) return a.grupo === 'atual' ? -1 : 1
    const op = a.operadora.localeCompare(b.operadora, 'pt-BR')
    if (op !== 0) return op
    const oa = a.cenarioOrdem ?? 0
    const ob = b.cenarioOrdem ?? 0
    if (oa !== ob) return oa - ob
    const ta = a.cenarioTitulo ?? ''
    const tb = b.cenarioTitulo ?? ''
    if (ta !== tb) return ta.localeCompare(tb, 'pt-BR')
    return String(a.key ?? '').localeCompare(String(b.key ?? ''), 'pt-BR')
  })
}

export type OperadoraSlot = {
  key: string
  grupo: 'atual' | 'mercado'
  operadora: string
  operadoraId: string
  cenarioId?: string
  cenarioTitulo?: string
  cenarioOrdem?: number
}

/** Colunas canônicas (operadora × cenário) para alinhar todos os planos na horizontal. */
export function buildOperadoraSlotsFromColunas(colunas: ContratoPlanoColuna[]): OperadoraSlot[] {
  const map = new Map<string, OperadoraSlot>()
  for (const col of colunas) {
    const grupo = col.grupo ?? 'mercado'
    const key = colunaSlotKey(col)
    if (!map.has(key)) {
      map.set(key, {
        key,
        grupo,
        operadora: col.operadora,
        operadoraId: col.operadoraId,
        cenarioId: col.cenarioId,
        cenarioTitulo: col.cenarioTitulo,
        cenarioOrdem: col.cenarioOrdem,
      })
    }
  }
  return sortPorOperadora([...map.values()])
}

function placeholderContratoColuna(slot: OperadoraSlot): ContratoPlanoColuna {
  const titulo = slot.cenarioTitulo?.trim()
  return {
    id: `empty-${slot.key}`,
    operadoraId: slot.operadoraId,
    operadora: slot.operadora,
    produto: titulo || '—',
    planoLabel: titulo || '—',
    acomodacao: '',
    elegibilidade: '',
    elegibilidadeLinhas: [],
    contribuicao: '—',
    coparticipacao: '—',
    temCoparticipacao: false,
    vidas: 0,
    tipoCusto: 'per_capita',
    premioPerCapita: '—',
    faixas: [],
    faturaEstimada: '—',
    tabColor: '#9e9e9e',
    grupo: slot.grupo,
    cenarioId: slot.cenarioId,
    cenarioTitulo: slot.cenarioTitulo,
    cenarioOrdem: slot.cenarioOrdem,
  }
}

/** Alinha as colunas de uma página ao conjunto canônico de operadora × cenário. */
export function alignPageToOperadoraSlots(
  page: ContratoAtualPagina,
  slots: OperadoraSlot[]
): ContratoAtualPagina {
  const byKey = new Map<string, ContratoPlanoColuna>()
  for (const col of page.colunas) {
    byKey.set(colunaSlotKey(col), col)
  }
  return {
    ...page,
    colunas: slots.map((slot) => byKey.get(slot.key) ?? placeholderContratoColuna(slot)),
  }
}

/**
 * Soma vidas/custos dos planos equivalentes dentro de cada cenário.
 * Cenários da mesma operadora (ex.: AMIL Sem/Com COPAY) permanecem separados.
 */
export function aggregateColunasPorCenario(
  colunas: ComparativoColunaEstudo[]
): ComparativoColunaEstudo[] {
  const order: string[] = []
  const map = new Map<string, ComparativoColunaEstudo>()

  for (const col of colunas) {
    const key = colunaSlotKey(col)
    const existing = map.get(key)
    if (!existing) {
      order.push(key)
      const titulo = col.cenarioTitulo?.trim()
      map.set(key, {
        ...col,
        id: `agg-${key}`,
        planoLabel: titulo
          ? `${titulo} (todos os planos)`
          : col.grupo === 'atual'
            ? 'Contrato vigente (todos os planos)'
            : 'Total do cenário',
        subtitulo: 'Soma dos planos equivalentes deste cenário',
      })
      continue
    }
    existing.vidas += col.vidas
    if (col.totalMensalCents != null) {
      existing.totalMensalCents = (existing.totalMensalCents ?? 0) + col.totalMensalCents
    }
    if (col.totalAnualCents != null) {
      existing.totalAnualCents = (existing.totalAnualCents ?? 0) + col.totalAnualCents
    }
  }

  return sortPorOperadora(order.map((key) => map.get(key)!))
}

/** @deprecated Preferir aggregateColunasPorCenario — mantido para testes/legado. */
export function aggregateColunasPorOperadora(
  colunas: ComparativoColunaEstudo[]
): ComparativoColunaEstudo[] {
  return aggregateColunasPorCenario(colunas)
}

/** Consolidado financeiro horizontal com fatura/custos somados por cenário. */
export function buildComparativoOperadoraConsolidadoPage(
  colunas: ComparativoColunaEstudo[]
): ComparativoConsolidadoPagina | null {
  const agg = aggregateColunasPorCenario(colunas)
  if (!agg.length) return null
  const referencia = agg.find((c) => c.grupo === 'atual')
  return {
    pageIndex: 0,
    totalPages: 1,
    colunas: agg,
    linhas: buildConsolidadoLinhas(agg, referencia),
  }
}

/**
 * Soma fatura e vidas por cenário (operadora × cenarioId).
 * Não mistura Cenário 1 e Cenário 2 da mesma operadora.
 */
export function aggregateContratoColunasPorCenario(
  colunas: ContratoPlanoColuna[]
): ContratoPlanoColuna[] {
  const order: string[] = []
  const map = new Map<string, ContratoPlanoColuna>()

  for (const col of colunas) {
    const grupo = col.grupo ?? 'mercado'
    const key = colunaSlotKey(col)
    const faturaCents = parseBRLToCents(col.faturaEstimada)
    const existing = map.get(key)
    if (!existing) {
      order.push(key)
      const titulo = col.cenarioTitulo?.trim()
      map.set(key, {
        ...col,
        id: `agg-${key}`,
        planoLabel: titulo
          ? `${titulo} (todos os planos)`
          : grupo === 'atual'
            ? 'Contrato vigente (todos os planos)'
            : 'Total do cenário',
        produto: titulo || 'Soma dos planos do cenário',
        vidas: col.vidas,
        faturaEstimada: faturaCents != null ? formatCentsToBRL(faturaCents) : '—',
        variacao: undefined,
      })
      continue
    }
    existing.vidas += col.vidas
    if (faturaCents != null) {
      const prev = parseBRLToCents(existing.faturaEstimada) ?? 0
      existing.faturaEstimada = formatCentsToBRL(prev + faturaCents)
    }
  }

  return sortPorOperadora(order.map((key) => map.get(key)!))
}

/** @deprecated Preferir aggregateContratoColunasPorCenario. */
export function aggregateContratoColunasPorOperadora(
  colunas: ContratoPlanoColuna[]
): ContratoPlanoColuna[] {
  return aggregateContratoColunasPorCenario(colunas)
}

export function buildComparativoConsolidadoPages(
  colunas: ComparativoColunaEstudo[],
  colunasPorSlide: number
): ComparativoConsolidadoPagina[] {
  const referencia = colunas.find((c) => c.grupo === 'atual')
  return paginateColunas(colunas, colunasPorSlide, (slice, pageIndex, totalPages) => ({
    pageIndex,
    totalPages,
    colunas: slice,
    linhas: buildConsolidadoLinhas(slice, referencia),
  }))
}

export function computeComparativoEstudo(
  form: CotacaoFormState,
  operadoras: Operadora[],
  beneficiarios: PlacementBeneficiario[],
  operadorasById?: Record<string, Operadora>,
  config?: ComparativoEstudoConfig
) {
  const cfg = config ?? ensureAguardandoOperadoraState(null, form, operadoras, operadorasById).comparativoConfig
  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)

  const contratoPlanoResumo = computeComparativoPlanosResumo(
    form,
    operadoras,
    beneficiarios,
    operadorasById,
    cfg.colunasPorSlide,
    cfg.incluirColunaAtual
  )

  const colunas = buildComparativoColunas(
    form,
    operadoras,
    beneficiarios,
    operadorasById,
    cfg.incluirColunaAtual
  )

  return {
    colunas,
    config: cfg,
    contratoPlanoResumo,
    faixaPages: buildComparativoFaixaPages(colunas, cfg.colunasPorSlide, {
      agrupamento: cfg.faixaAgrupamento,
      faixaCelula: cfg.faixaCelula,
      referencias,
    }),
    detalhePages: buildComparativoDetalhePages(colunas, cfg.colunasPorSlide),
    consolidadoPages: buildComparativoConsolidadoPages(colunas, cfg.colunasPorSlide),
  }
}

export { faixaLabelDisplay, FAIXAS_ETARIAS }
