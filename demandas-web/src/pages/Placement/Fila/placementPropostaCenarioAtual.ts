import type { CotacaoFormState } from './CotacaoFormFields'
import {
  FAIXAS_ETARIAS,
  emptyCustosFaixa,
  emptyVidasFaixa,
  type PlanoCoberturaForm,
} from './placementCotacaoDetalhes'
import { cloneCoparticipacao } from './placementCoparticipacao'
import {
  formatContribuicaoResumo,
  coparticipacaoFromCopartForm,
  labelPlano,
} from './placementContratoAtual'
import { parsePercentValue } from './placementCotacaoFinanceiro'
import {
  cloneReembolsoPlanoDetalhe,
  emptyReembolsoPlanoDetalhe,
  reembolsoDetalheFromAbertura,
  temReembolsoDetalhePreenchido,
  type ReembolsoPorPlano,
} from './placementReembolso'
import { resolveOperadoraNome } from './placementKickOffFormatters'
import { normMercadoKey } from './placementMercadoQuadro'
import type { Operadora } from '../../../types/masterData'
import {
  emptyPropostaPlanoLinha,
  type PropostaCenarioResumoLinha,
  type PropostaCenarioVariante,
  type PropostaFornecedorState,
  type PropostaPlanoLinha,
} from './placementAguardandoOperadora'
import { formatCentsToBRL, parseBRLToCents } from './utils'

function normKey(s: string): string {
  return s.trim().toLowerCase()
}

function planoToPropostaLinha(
  p: PlanoCoberturaForm,
  copartGlobal: string,
  contribuicao: string,
  reembolsoPorPlano?: ReembolsoPorPlano
): PropostaPlanoLinha {
  const base = emptyPropostaPlanoLinha()
  const reembDet = reembolsoPorPlano
    ? reembolsoDetalheFromAbertura(p.id, reembolsoPorPlano)
    : emptyReembolsoPlanoDetalhe()
  const consultaValor = reembDet.valores.consultas?.trim() ?? ''
  const temReemb = temReembolsoDetalhePreenchido(reembDet)
  return {
    ...base,
    id: p.id,
    planoReferenciaId: p.id,
    nomePlano: labelPlano(p),
    tipoCusto: p.tipoCusto,
    numeroVidas: p.numeroVidas,
    custoPerCapitaBRL: p.custoPerCapitaBRL,
    vidasFaixa: { ...base.vidasFaixa, ...p.vidasFaixa },
    custosFaixa: { ...base.custosFaixa, ...p.custosFaixa },
    acomodacao: p.acomodacao || '',
    abrangencia: p.abrangencia || '',
    contribuicao: contribuicao || '',
    coparticipacao: coparticipacaoFromCopartForm(p.coparticipacao, copartGlobal),
    coparticipacaoDetalhe: cloneCoparticipacao(p.coparticipacao),
    reembolso: temReemb ? 'Sim' : '',
    reembolsoConsulta: consultaValor,
    reembolsoDetalhe: cloneReembolsoPlanoDetalhe(reembDet),
    eventosReembolsaveis: '',
  }
}

/** Planos da abertura vinculados ao fornecedor informado. */
export function planosAberturaForFornecedor(
  form: CotacaoFormState,
  fornecedorNome: string,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): PropostaPlanoLinha[] {
  const itens = form.itens ?? []
  const fornKey = normMercadoKey(fornecedorNome)
  const rowIds = new Set<string>()

  for (const item of itens) {
    const opId = String(item.fornecedorId ?? '').trim()
    if (!opId) continue
    const nome = resolveOperadoraNome(opId, operadoras, operadorasById).trim()
    if (normMercadoKey(nome) === fornKey) rowIds.add(item.id)
  }

  if (!rowIds.size) return []

  const contribuicao = formatContribuicaoResumo(form.dadosFinanceiros)
  const copartGlobal = form.coparticipacaoDetalhePorPlanos ?? ''
  const reembolsoPorPlano = form.reembolsoPorPlano

  return (form.planos ?? [])
    .filter((p) => rowIds.has(p.itemRowId))
    .filter((p) => p.nomePlano.trim() || p.numeroVidas.trim() || p.custoPerCapitaBRL.trim())
    .map((p) => planoToPropostaLinha(p, copartGlobal, contribuicao, reembolsoPorPlano))
}

export function defaultResumoCenarioAtual(form: CotacaoFormState): PropostaCenarioResumoLinha[] {
  const fin = form.dadosFinanceiros?.atual
  const mk = (rotulo: string, valor: string): PropostaCenarioResumoLinha => ({
    id: `rs-${Math.random().toString(36).slice(2, 9)}`,
    rotulo,
    valor,
  })
  return [
    mk('Comissão vitalício (contrato)', fin?.comissaoVitalicioContrato?.trim() ?? ''),
    mk('Participação MDS (%)', fin?.participacao?.mds?.trim() ?? ''),
    mk('Participação corretor (%)', fin?.participacao?.corretorParceiro?.trim() ?? ''),
    mk('Início de vigência', form.vigenciaApolice?.trim() ?? ''),
    mk('Observações', ''),
  ]
}

export function emptyCenarioResumoLinha(): PropostaCenarioResumoLinha {
  return {
    id: `rs-${Math.random().toString(36).slice(2, 9)}`,
    rotulo: '',
    valor: '',
  }
}

export function emptyCenarioVariante(titulo = 'Cenário atual'): PropostaCenarioVariante {
  return {
    id: `cv-${Math.random().toString(36).slice(2, 9)}`,
    titulo,
    reajustePercent: '0',
    vigenciaMeses: '',
    resumoLinhas: [],
    planos: [],
  }
}

export function buildCenarioFromAbertura(
  form: CotacaoFormState,
  fornecedorNome: string,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  titulo = 'Cenário atual'
): PropostaCenarioVariante {
  return {
    ...emptyCenarioVariante(titulo),
    resumoLinhas: defaultResumoCenarioAtual(form),
    planos: planosAberturaForFornecedor(form, fornecedorNome, operadoras, operadorasById),
  }
}

export function buildPropostaFornecedorAtualInicial(
  form: CotacaoFormState,
  fornecedorNome: string,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): PropostaFornecedorState {
  const cenario = buildCenarioFromAbertura(form, fornecedorNome, operadoras, operadorasById)
  return {
    incluirNoComparativo: true,
    cenarios: [cenario],
    planos: cenario.planos.length ? [...cenario.planos] : [emptyPropostaPlanoLinha()],
  }
}

function adjustBRLString(input: string, factor: number): string {
  const cents = parseBRLToCents(input)
  if (cents == null) return input
  return formatCentsToBRL(Math.round(cents * factor))
}

/** Aplica reajuste/desconto percentual sobre custos do plano (negativo = desconto). */
/** Aplica reajuste/desconto sobre plano da abertura (mesma base do slide Contrato Atual). */
export function applyReajusteToPlanoCobertura(
  plano: PlanoCoberturaForm,
  reajustePercent: string
): PlanoCoberturaForm {
  const pct = parsePercentValue(reajustePercent) ?? 0
  if (pct === 0) return plano
  const factor = 1 + pct / 100

  if (plano.tipoCusto === 'per_capita') {
    return {
      ...plano,
      custoPerCapitaBRL: adjustBRLString(plano.custoPerCapitaBRL, factor),
    }
  }

  const custosFaixa = { ...plano.custosFaixa }
  for (const fx of FAIXAS_ETARIAS) {
    if (custosFaixa[fx.key]?.trim()) {
      custosFaixa[fx.key] = adjustBRLString(custosFaixa[fx.key], factor)
    }
  }
  return { ...plano, custosFaixa }
}

export function applyReajusteToPlano(plano: PropostaPlanoLinha, reajustePercent: string): PropostaPlanoLinha {
  const pct = parsePercentValue(reajustePercent) ?? 0
  if (pct === 0) return plano
  const factor = 1 + pct / 100

  if (plano.tipoCusto === 'per_capita') {
    return {
      ...plano,
      custoPerCapitaBRL: adjustBRLString(plano.custoPerCapitaBRL, factor),
      custosFaixa: { ...plano.custosFaixa },
    }
  }

  const custosFaixa = { ...plano.custosFaixa }
  for (const fx of FAIXAS_ETARIAS) {
    if (custosFaixa[fx.key]?.trim()) {
      custosFaixa[fx.key] = adjustBRLString(custosFaixa[fx.key], factor)
    }
  }
  return { ...plano, custosFaixa }
}

export function applyReajusteToPlanos(
  planos: PropostaPlanoLinha[],
  reajustePercent: string
): PropostaPlanoLinha[] {
  return planos.map((p) => applyReajusteToPlano(p, reajustePercent))
}

export function cenarioPlanosAjustados(cenario: PropostaCenarioVariante): PropostaPlanoLinha[] {
  return applyReajusteToPlanos(cenario.planos, cenario.reajustePercent)
}

export function isFornecedorAtualNome(
  fornecedorNome: string,
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): boolean {
  const key = normMercadoKey(fornecedorNome)
  for (const item of form.itens ?? []) {
    const id = String(item.fornecedorId ?? '').trim()
    if (!id) continue
    const nome = resolveOperadoraNome(id, operadoras, operadorasById)
    if (normMercadoKey(nome) === key) return true
  }
  return false
}

/** Sincroniza planos do cenário com a abertura, preservando título, reajuste e resumo. */
export function refreshCenarioPlanosFromAbertura(
  cenario: PropostaCenarioVariante,
  form: CotacaoFormState,
  fornecedorNome: string,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): PropostaCenarioVariante {
  return {
    ...cenario,
    planos: planosAberturaForFornecedor(form, fornecedorNome, operadoras, operadorasById),
  }
}

export function ensurePropostaFornecedorAtual(
  proposta: PropostaFornecedorState,
  form: CotacaoFormState,
  fornecedorNome: string,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  classificacao?: string
): PropostaFornecedorState {
  const isAtual =
    classificacao === 'fornecedor_atual' ||
    isFornecedorAtualNome(fornecedorNome, form, operadoras, operadorasById)

  if (!isAtual) return proposta

  if (proposta.cenarios?.length) {
    return {
      ...proposta,
      cenarios: proposta.cenarios.map((c) => ({
        ...c,
        resumoLinhas: c.resumoLinhas?.length ? c.resumoLinhas : defaultResumoCenarioAtual(form),
        planos: c.planos?.length
          ? c.planos
          : planosAberturaForFornecedor(form, fornecedorNome, operadoras, operadorasById),
      })),
    }
  }

  return buildPropostaFornecedorAtualInicial(form, fornecedorNome, operadoras, operadorasById)
}

/** Expande proposta: uma coluna de comparativo por plano (cenário × plano). */
export function expandPropostaParaComparativo(proposta: PropostaFornecedorState): {
  cenarioId: string
  cenarioTitulo: string
  cenarioOrdem: number
  reajustePercent: string
  planoReferenciaId: string
  plano: PropostaPlanoLinha
}[] {
  const out: ReturnType<typeof expandPropostaParaComparativo> = []

  if (proposta.cenarios?.length) {
    proposta.cenarios.forEach((c, cIdx) => {
      for (const plano of c.planos ?? []) {
        out.push({
          cenarioId: c.id,
          cenarioTitulo: c.titulo,
          cenarioOrdem: cIdx,
          reajustePercent: c.reajustePercent ?? '0',
          planoReferenciaId: plano.planoReferenciaId || plano.id,
          plano,
        })
      }
    })
    return out
  }

  for (const plano of proposta.planos ?? []) {
    out.push({
      cenarioId: 'default',
      cenarioTitulo: '',
      cenarioOrdem: 0,
      reajustePercent: '0',
      planoReferenciaId: plano.planoReferenciaId || plano.id,
      plano,
    })
  }
  return out
}
