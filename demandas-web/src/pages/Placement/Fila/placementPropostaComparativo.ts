import type { CotacaoFormState } from './CotacaoFormFields'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  buildContratoAtualPages,
  buildContratoPlanoColuna,
  contratoPageFromColunas,
  coparticipacaoSimNaoLabel,
  formatContribuicaoResumo,
  TAB_COLORS,
  temCoparticipacaoFromValor,
  type ContratoAtualResumo,
  type ContratoPlanoColuna,
} from './placementContratoAtual'
import {
  FAIXAS_ETARIAS,
  emptyCustosFaixa,
  subtotalFaixaCents,
  type FaixaEtariaKey,
  type PlanoCoberturaForm,
} from './placementCotacaoDetalhes'
import { formatCentsToBRL, parseBRLToCents } from './utils'
import {
  ensureAguardandoOperadoraState,
  classificacaoPermitePropostaValores,
  emptyPropostaPlanoLinha,
  parseAguardandoOperadoraFromKickOff,
  type PropostaPlanoLinha,
} from './placementAguardandoOperadora'
import { mercadoFornecedoresFromForm } from './placementComunicarMercado'
import { mercadoNomesComFornecedoresAtuais, fornecedoresAtuaisFromForm, normMercadoKey } from './placementMercadoQuadro'
import {
  applyReajusteToPlano,
  applyReajusteToPlanoCobertura,
  expandPropostaParaComparativo,
  isFornecedorAtualNome,
} from './placementPropostaCenarioAtual'
import {
  labelPlanoReferencia,
  planosReferenciaAbertura,
  type PlanoReferenciaAbertura,
} from './placementPropostaEquivalencia'
import { enrichColunasComVariacao } from './placementComparativoVariacao'
import type { Operadora } from '../../../types/masterData'

/** ID canônico de coluna — deve ser igual em estudo.colunas e contratoPlanoResumo. */
export function comparativoColunaId(cenarioId: string, planoId: string): string {
  return `${cenarioId}-${planoId}`
}

export type PropostaColunaEntrada = {
  fornecedorNome: string
  operadoraId: string
  grupo: 'atual' | 'mercado'
  cenarioId: string
  cenarioTitulo: string
  cenarioOrdem: number
  reajustePercent: string
  planoReferenciaId: string
  plano: PropostaPlanoLinha
}

/** Oferta de mercado no comparativo exige dados da proposta — não basta vidas/acomodação copiadas da abertura. */
export function propostaMercadoTemOfertaParaComparativo(plano: PropostaPlanoLinha): boolean {
  if (plano.nomePlano.trim()) return true
  if (plano.custoPerCapitaBRL.trim()) return true
  if (plano.reembolso.trim() || plano.reembolsoConsulta.trim() || plano.coparticipacao.trim()) return true
  return FAIXAS_ETARIAS.some((fx) => parseBRLToCents(plano.custosFaixa[fx.key] ?? '') != null)
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

function buildOperadoraMap(operadoras: Operadora[], operadorasById?: Record<string, Operadora>): Map<string, string> {
  const map = new Map(operadoras.map((o) => [o.id, o.nome]))
  if (operadorasById) {
    for (const o of Object.values(operadorasById)) {
      if (!map.has(o.id)) map.set(o.id, o.nome)
    }
  }
  return map
}

function findPlanoAbertura(form: CotacaoFormState, refId: string, planoId: string): PlanoCoberturaForm | undefined {
  const id = refId || planoId
  return (form.planos ?? []).find((p) => p.id === id)
}

function resolveTipoCustoEfetivo(
  plano: PropostaPlanoLinha,
  ref?: PlanoReferenciaAbertura
): 'per_capita' | 'faixa_etaria' {
  if (ref?.tipoCusto) return ref.tipoCusto

  const hasFaixa = FAIXAS_ETARIAS.some((fx) => {
    const v = parseVidasInt(plano.vidasFaixa[fx.key] ?? '')
    const c = parseBRLToCents(plano.custosFaixa[fx.key] ?? '')
    return v > 0 || c != null
  })
  const hasPerCapita =
    parseVidasInt(plano.numeroVidas) > 0 || parseBRLToCents(plano.custoPerCapitaBRL) != null

  if (hasPerCapita && !hasFaixa) return 'per_capita'
  if (hasFaixa && !hasPerCapita) return 'faixa_etaria'
  return plano.tipoCusto === 'faixa_etaria' ? 'faixa_etaria' : 'per_capita'
}

function buildFaixasProposta(plano: PropostaPlanoLinha): ContratoPlanoColuna['faixas'] {
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

function mergeFaixaCampoComFallback(
  ref: Record<FaixaEtariaKey, string>,
  proposta: Record<FaixaEtariaKey, string>
): Record<FaixaEtariaKey, string> {
  const out = { ...ref }
  for (const fx of FAIXAS_ETARIAS) {
    const v = String(proposta[fx.key] ?? '').trim()
    if (v) out[fx.key] = proposta[fx.key] ?? v
  }
  return out
}

function propostaToPlanoCobertura(
  plano: PropostaPlanoLinha,
  refPlano: PlanoCoberturaForm | undefined,
  tipoCusto: 'per_capita' | 'faixa_etaria'
): PlanoCoberturaForm | null {
  if (!refPlano) return null

  if (tipoCusto === 'per_capita') {
    return {
      ...refPlano,
      nomePlano: plano.nomePlano.trim() || 'Proposta',
      tipoCusto: 'per_capita',
      numeroVidas: plano.numeroVidas.trim() || refPlano.numeroVidas,
      custoPerCapitaBRL: plano.custoPerCapitaBRL.trim(),
      acomodacao: plano.acomodacao.trim() || refPlano.acomodacao,
    }
  }

  return {
    ...refPlano,
    nomePlano: plano.nomePlano.trim() || 'Proposta',
    tipoCusto: 'faixa_etaria',
    vidasFaixa: mergeFaixaCampoComFallback(refPlano.vidasFaixa, plano.vidasFaixa),
    custosFaixa: mergeFaixaCampoComFallback(emptyCustosFaixa(), plano.custosFaixa),
    acomodacao: plano.acomodacao.trim() || refPlano.acomodacao,
  }
}

function patchColunaLabels(
  col: ContratoPlanoColuna,
  entrada: PropostaColunaEntrada,
  referencias: PlanoReferenciaAbertura[]
): ContratoPlanoColuna {
  const refLabel = labelPlanoReferencia(entrada.planoReferenciaId, referencias)
  const tituloCenario = entrada.cenarioTitulo.trim()
  let planoLabel = col.planoLabel

  if (tituloCenario && entrada.grupo === 'atual') {
    planoLabel = `${refLabel !== '—' ? refLabel : col.planoLabel} · ${tituloCenario}`
  } else if (entrada.grupo === 'mercado') {
    const nomeOferta = entrada.plano.nomePlano.trim() || 'Proposta'
    if (tituloCenario) {
      planoLabel =
        refLabel !== '—'
          ? `${nomeOferta} · ${tituloCenario} (≈ ${refLabel})`
          : `${nomeOferta} · ${tituloCenario}`
    } else {
      planoLabel = refLabel !== '—' ? `${nomeOferta} (≈ ${refLabel})` : nomeOferta
    }
  }

  return {
    ...col,
    id: comparativoColunaId(entrada.cenarioId, entrada.plano.id),
    operadora: entrada.fornecedorNome.toUpperCase(),
    operadoraId: entrada.operadoraId || col.operadoraId,
    produto: tituloCenario || (entrada.grupo === 'atual' ? col.produto : 'Proposta'),
    planoLabel,
    grupo: entrada.grupo,
    planoReferenciaId: entrada.planoReferenciaId,
    cenarioId: entrada.cenarioId,
    cenarioTitulo: entrada.cenarioTitulo,
    cenarioOrdem: entrada.cenarioOrdem,
    contribuicao: entrada.plano.contribuicao.trim() || col.contribuicao,
    coparticipacao: coparticipacaoSimNaoLabel(
      entrada.plano.coparticipacao.trim() || col.coparticipacao
    ),
    temCoparticipacao: temCoparticipacaoFromValor(
      entrada.plano.coparticipacao.trim() || col.coparticipacao
    ),
    acomodacao: entrada.plano.acomodacao.trim() || col.acomodacao,
  }
}

function buildColunaMercadoFromAbertura(
  entrada: PropostaColunaEntrada,
  form: CotacaoFormState,
  beneficiarios: PlacementBeneficiario[],
  operadoraMap: Map<string, string>,
  referencias: PlanoReferenciaAbertura[],
  tabColor: string
): ContratoPlanoColuna | null {
  const ref = referencias.find((r) => r.id === entrada.planoReferenciaId)
  const refPlano = findPlanoAbertura(form, entrada.planoReferenciaId, entrada.plano.id)
  const tipoCusto = resolveTipoCustoEfetivo(entrada.plano, ref)
  const planoAjustado = applyReajusteToPlano({ ...entrada.plano, tipoCusto }, entrada.reajustePercent)

  const hasData = propostaMercadoTemOfertaParaComparativo(planoAjustado)
  if (!hasData) return null

  if (refPlano) {
    const merged = propostaToPlanoCobertura(planoAjustado, refPlano, tipoCusto)
    if (merged) {
      const col = buildContratoPlanoColuna(
        merged,
        form.itens ?? [],
        operadoraMap,
        beneficiarios,
        formatContribuicaoResumo(form.dadosFinanceiros),
        form.coparticipacaoDetalhePorPlanos ?? '',
        tabColor
      )
      return patchColunaLabels(
        {
          ...col,
          operadoraId: entrada.operadoraId,
          operadora: entrada.fornecedorNome.toUpperCase(),
        },
        entrada,
        referencias
      )
    }
  }

  const vidas =
    tipoCusto === 'faixa_etaria'
      ? FAIXAS_ETARIAS.reduce((s, fx) => s + parseVidasInt(planoAjustado.vidasFaixa[fx.key] ?? ''), 0)
      : parseVidasInt(planoAjustado.numeroVidas)

  let faturaCents: number | null = null
  if (tipoCusto === 'faixa_etaria') {
    let total = 0
    let any = false
    for (const fx of FAIXAS_ETARIAS) {
      const sub = subtotalFaixaCents(
        planoAjustado.vidasFaixa[fx.key] ?? '',
        planoAjustado.custosFaixa[fx.key] ?? ''
      )
      if (sub != null) {
        total += sub
        any = true
      }
    }
    faturaCents = any ? total : null
  } else {
    const unit = parseBRLToCents(planoAjustado.custoPerCapitaBRL)
    faturaCents = unit != null && vidas > 0 ? unit * vidas : unit
  }

  return patchColunaLabels(
    {
      id: comparativoColunaId(entrada.cenarioId, entrada.plano.id),
      operadoraId: entrada.operadoraId,
      operadora: entrada.fornecedorNome.toUpperCase(),
      produto: 'Proposta',
      planoLabel: planoAjustado.nomePlano.trim() || 'Plano',
      grupo: entrada.grupo,
      planoReferenciaId: entrada.planoReferenciaId,
      acomodacao: planoAjustado.acomodacao.trim() || '—',
      elegibilidade: '—',
      elegibilidadeLinhas: [],
      contribuicao: planoAjustado.contribuicao.trim() || '—',
      coparticipacao: coparticipacaoSimNaoLabel(planoAjustado.coparticipacao),
      temCoparticipacao: temCoparticipacaoFromValor(planoAjustado.coparticipacao),
      vidas,
      tipoCusto,
      premioPerCapita: tipoCusto === 'per_capita' ? formatBRLInput(planoAjustado.custoPerCapitaBRL) : null,
      faixas: tipoCusto === 'faixa_etaria' ? buildFaixasProposta(planoAjustado) : [],
      faturaEstimada: faturaCents != null ? formatCentsToBRL(faturaCents) : '—',
      tabColor,
    },
    entrada,
    referencias
  )
}

function buildColunaFromEntrada(
  entrada: PropostaColunaEntrada,
  form: CotacaoFormState,
  beneficiarios: PlacementBeneficiario[],
  operadoraMap: Map<string, string>,
  referencias: PlanoReferenciaAbertura[],
  tabColor: string
): ContratoPlanoColuna | null {
  const planoAbertura = findPlanoAbertura(form, entrada.planoReferenciaId, entrada.plano.id)

  if (entrada.grupo === 'atual' && planoAbertura) {
    const ajustado = applyReajusteToPlanoCobertura(planoAbertura, entrada.reajustePercent)
    const col = buildContratoPlanoColuna(
      ajustado,
      form.itens ?? [],
      operadoraMap,
      beneficiarios,
      formatContribuicaoResumo(form.dadosFinanceiros),
      form.coparticipacaoDetalhePorPlanos ?? '',
      tabColor
    )
    return patchColunaLabels({ ...col, operadoraId: entrada.operadoraId || col.operadoraId }, entrada, referencias)
  }

  return buildColunaMercadoFromAbertura(entrada, form, beneficiarios, operadoraMap, referencias, tabColor)
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

/**
 * Cenário estável do contrato vigente (abertura).
 * Usa os mesmos IDs de `planosReferenciaAbertura` — nunca a base importada de beneficiários
 * (`ben-0`, produto «Base importada»), que gera blocos órfãos e desalinha ATUAL × mercado.
 */
export const CENARIO_CONTRATO_VIGENTE_ID = 'contrato-vigente'

function entradasContratoVigenteDaAbertura(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): PropostaColunaEntrada[] {
  const refs = planosReferenciaAbertura(form, operadoras, operadorasById)
  if (!refs.length) return []

  const nomesAtuais = fornecedoresAtuaisFromForm(form, operadoras, operadorasById)
  const saida: PropostaColunaEntrada[] = []

  for (const ref of refs) {
    const nome =
      ref.operadoraNome.trim() && ref.operadoraNome !== '—'
        ? ref.operadoraNome
        : nomesAtuais[0] || 'Contrato vigente'
    saida.push({
      fornecedorNome: nome,
      operadoraId: resolveOperadoraIdByNome(nome, operadoras, operadorasById),
      grupo: 'atual',
      cenarioId: CENARIO_CONTRATO_VIGENTE_ID,
      cenarioTitulo: 'Contrato vigente',
      cenarioOrdem: -1,
      reajustePercent: '0',
      planoReferenciaId: ref.id,
      plano: {
        ...emptyPropostaPlanoLinha(),
        id: ref.id,
        planoReferenciaId: ref.id,
        nomePlano: ref.label,
      },
    })
  }
  return saida
}

export function coletarEntradasComparativo(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  incluirAtual = true
): PropostaColunaEntrada[] {
  const state = ensureAguardandoOperadoraState(
    parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia),
    form,
    operadoras,
    operadorasById
  )
  const mercado = mercadoNomesComFornecedoresAtuais(form, operadoras, operadorasById)
  const entradas: PropostaColunaEntrada[] = []

  for (const nome of mercado) {
    const key = normMercadoKey(nome)
    const proposta = state.propostas[key]
    if (!proposta?.incluirNoComparativo) continue

    const opId = resolveOperadoraIdByNome(nome, operadoras, operadorasById)
    const ag = state.fornecedores[key]
    if (ag && !classificacaoPermitePropostaValores(ag.classificacaoMercado)) continue
    const isAtual =
      ag?.classificacaoMercado === 'fornecedor_atual' ||
      isFornecedorAtualNome(nome, form, operadoras, operadorasById)

    if (isAtual && !incluirAtual) continue

    for (const item of expandPropostaParaComparativo(proposta)) {
      entradas.push({
        fornecedorNome: nome,
        operadoraId: opId,
        grupo: isAtual ? 'atual' : 'mercado',
        cenarioId: item.cenarioId,
        cenarioTitulo: item.cenarioTitulo,
        cenarioOrdem: item.cenarioOrdem,
        reajustePercent: item.reajustePercent,
        planoReferenciaId: item.planoReferenciaId,
        plano: item.plano,
      })
    }
  }

  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)
  remapEntradasParaReferencias(entradas, referencias)

  if (incluirAtual) {
    const cobertos = new Set(
      entradas.filter((e) => e.grupo === 'atual').map((e) => e.planoReferenciaId.trim())
    )
    for (const extra of entradasContratoVigenteDaAbertura(form, operadoras, operadorasById)) {
      if (cobertos.has(extra.planoReferenciaId)) continue
      entradas.push(extra)
      cobertos.add(extra.planoReferenciaId)
    }
  }

  return entradas
}

function normRefLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Liga o vigente aos IDs da abertura. Sem isso o ATUAL cai fora da matriz (S2500 vira o bloco). */
export function resolverPlanoReferenciaId(
  rawId: string,
  planoNome: string,
  refs: PlanoReferenciaAbertura[],
  indexInCenario: number,
  totalNoCenario: number
): string {
  const id = String(rawId ?? '').trim()
  if (id && refs.some((r) => r.id === id)) return id
  const nome = normRefLabel(planoNome)
  if (nome) {
    const hit = refs.find((r) => {
      const lab = normRefLabel(r.label)
      return lab === nome || lab.startsWith(nome) || nome.startsWith(lab)
    })
    if (hit) return hit.id
  }
  if (refs.length && totalNoCenario === refs.length && refs[indexInCenario]) {
    return refs[indexInCenario].id
  }
  return id
}

function remapEntradasParaReferencias(
  entradas: PropostaColunaEntrada[],
  refs: PlanoReferenciaAbertura[]
): void {
  if (!refs.length) return
  const byCenario = new Map<string, PropostaColunaEntrada[]>()
  for (const e of entradas) {
    const key = `${e.grupo}::${e.fornecedorNome}::${e.cenarioId}`
    const list = byCenario.get(key) ?? []
    list.push(e)
    byCenario.set(key, list)
  }
  for (const grupo of byCenario.values()) {
    grupo.forEach((e, idx) => {
      e.planoReferenciaId = resolverPlanoReferenciaId(
        e.planoReferenciaId,
        e.plano.nomePlano,
        refs,
        idx,
        grupo.length
      )
    })
  }
}

export function ordenarEntradasPorEquivalencia(
  entradas: PropostaColunaEntrada[],
  referencias: PlanoReferenciaAbertura[]
): PropostaColunaEntrada[] {
  const refOrder = referencias.map((r) => r.id)
  const refIndex = (id: string) => {
    const i = refOrder.indexOf(id)
    return i >= 0 ? i : refOrder.length + 1
  }

  return [...entradas].sort((a, b) => {
    const ra = refIndex(a.planoReferenciaId)
    const rb = refIndex(b.planoReferenciaId)
    if (ra !== rb) return ra - rb
    if (a.grupo !== b.grupo) return a.grupo === 'atual' ? -1 : 1
    if (a.cenarioOrdem !== b.cenarioOrdem) return a.cenarioOrdem - b.cenarioOrdem
    return a.fornecedorNome.localeCompare(b.fornecedorNome, 'pt-BR')
  })
}

/** Uma página por plano equivalente, com todos os fornecedores na horizontal. */
export function buildComparativoPlanosPages(
  colunas: ContratoPlanoColuna[],
  referencias: PlanoReferenciaAbertura[]
): ContratoAtualResumo['pages'] {
  if (!colunas.length) return []

  const byRef = new Map<string, ContratoPlanoColuna[]>()
  for (const c of colunas) {
    const key = c.planoReferenciaId?.trim() || c.id
    const list = byRef.get(key) ?? []
    list.push(c)
    byRef.set(key, list)
  }

  const groups: { label: string; cols: ContratoPlanoColuna[] }[] = []
  const seen = new Set<string>()

  for (const ref of referencias) {
    const cols = byRef.get(ref.id)
    if (!cols?.length) continue
    groups.push({ label: ref.label, cols })
    seen.add(ref.id)
  }

  // Sem catálogo da abertura, mantém agrupamento por id solto.
  // Com catálogo, NÃO cria bloco extra (S2500, base importada, etc.): isso vira
  // 9 blocos com ATUAL numa linha e mercado em outra — o formato quebrado.
  if (!referencias.length) {
    for (const [key, cols] of byRef) {
      if (seen.has(key)) continue
      groups.push({
        label: cols[0]?.planoLabel || 'Outros planos',
        cols,
      })
    }
  }

  if (!groups.length) {
    return buildContratoAtualPages(colunas, Math.max(colunas.length, 1))
  }

  if (groups.length === 1 && groups[0].cols.length === colunas.length) {
    return [contratoPageFromColunas(groups[0].cols, 0, 1, groups[0].label || undefined)]
  }

  return groups.map((g, pageIndex) =>
    contratoPageFromColunas(g.cols, pageIndex, groups.length, g.label || undefined)
  )
}

export function computeComparativoPlanosResumo(
  form: CotacaoFormState,
  operadoras: Operadora[],
  beneficiarios: PlacementBeneficiario[] = [],
  operadorasById?: Record<string, Operadora>,
  _colunasPorSlide = 3,
  incluirAtual = true
): ContratoAtualResumo {
  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)
  const operadoraMap = buildOperadoraMap(operadoras, operadorasById)
  const entradas = ordenarEntradasPorEquivalencia(
    coletarEntradasComparativo(form, operadoras, operadorasById, incluirAtual),
    referencias
  )

  const colunas: ContratoPlanoColuna[] = []
  let colorIdx = 0

  for (const entrada of entradas) {
    const col = buildColunaFromEntrada(
      entrada,
      form,
      beneficiarios,
      operadoraMap,
      referencias,
      TAB_COLORS[colorIdx % TAB_COLORS.length]
    )
    if (col) {
      colunas.push(col)
      colorIdx += 1
    }
  }

  const totalVidas = colunas.reduce((s, c) => s + c.vidas, 0)
  let totalFaturaCents = 0
  let anyFatura = false
  for (const c of colunas) {
    const f = parseBRLToCents(c.faturaEstimada)
    if (f != null) {
      totalFaturaCents += f
      anyFatura = true
    }
  }

  const colunasComVariacao = enrichColunasComVariacao(colunas)

  return {
    allColunas: colunasComVariacao,
    pages: buildComparativoPlanosPages(colunasComVariacao, referencias),
    totalVidas,
    totalFatura: anyFatura ? formatCentsToBRL(totalFaturaCents) : '—',
  }
}

export function computePropostaComparativoResumo(
  form: CotacaoFormState,
  operadoras: Operadora[],
  beneficiarios: PlacementBeneficiario[] = [],
  operadorasById?: Record<string, Operadora>
): ContratoAtualResumo {
  return computeComparativoPlanosResumo(form, operadoras, beneficiarios, operadorasById)
}
