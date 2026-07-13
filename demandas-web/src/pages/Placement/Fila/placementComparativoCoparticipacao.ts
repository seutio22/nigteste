import type { CotacaoFormState } from './CotacaoFormFields'
import {
  cloneCoparticipacao,
  COPART_PROCEDIMENTOS,
  emptyCoparticipacao,
  formatCopartInternacaoCelula,
  formatCopartProcedimentoCelula,
  labelFormaCobrancaCopart,
  type CoparticipacaoForm,
  type CopartProcedimentoKey,
} from './placementCoparticipacao'
import {
  coletarEntradasComparativo,
  comparativoColunaId,
  ordenarEntradasPorEquivalencia,
  type PropostaColunaEntrada,
} from './placementPropostaComparativo'
import {
  labelPlanoReferencia,
  planosReferenciaAbertura,
  type PlanoReferenciaAbertura,
} from './placementPropostaEquivalencia'
import type { Operadora } from '../../../types/masterData'
import { TAB_COLORS } from './placementContratoAtual'

export type ComparativoCopartColuna = {
  id: string
  grupo: 'atual' | 'mercado'
  operadora: string
  operadoraId: string
  produto: string
  planoLabel: string
  acomodacao: string
  tabColor: string
  copart: CoparticipacaoForm
}

export type ComparativoCopartLinha = {
  id: string
  label: string
  tipo: 'selo' | 'forma' | 'procedimento' | 'internacao'
  procedimentoKey?: CopartProcedimentoKey
}

export type ComparativoCoparticipacaoPagina = {
  pageIndex: number
  totalPages: number
  colunas: ComparativoCopartColuna[]
  linhas: ComparativoCopartLinha[]
}

export const COMPARATIVO_COPART_LINHAS: ComparativoCopartLinha[] = [
  { id: 'possui', label: 'Possui coparticipação', tipo: 'selo' },
  { id: 'forma', label: 'Forma de cobrança', tipo: 'forma' },
  ...COPART_PROCEDIMENTOS.map((p) => ({
    id: `proc-${p.key}`,
    label: p.label,
    tipo: 'procedimento' as const,
    procedimentoKey: p.key,
  })),
  { id: 'internacao', label: 'Internação', tipo: 'internacao' },
]

function findPlanoAbertura(form: CotacaoFormState, refId: string, planoId: string) {
  const id = refId || planoId
  return (form.planos ?? []).find((p) => p.id === id)
}

function resolveCopartForm(entrada: PropostaColunaEntrada, form: CotacaoFormState): CoparticipacaoForm {
  const det = entrada.plano.coparticipacaoDetalhe
  const temDetalhePreenchido =
    det.possui ||
    COPART_PROCEDIMENTOS.some(
      (p) => det.linhas[p.key].valor.trim() || det.linhas[p.key].limitador.trim()
    ) ||
    det.internacao.valor.trim() ||
    det.internacao.limitador.trim()

  if (temDetalhePreenchido || (entrada.plano.coparticipacao === 'Sim' && det.possui)) {
    return cloneCoparticipacao(det.possui ? det : { ...det, possui: true })
  }

  if (entrada.grupo === 'atual') {
    const abertura = findPlanoAbertura(form, entrada.planoReferenciaId, entrada.plano.id)
    if (abertura) return cloneCoparticipacao(abertura.coparticipacao)
  }

  if (entrada.plano.coparticipacao === 'Sim') {
    return { ...emptyCoparticipacao(), possui: true }
  }

  return emptyCoparticipacao()
}

function colunaFromEntrada(
  entrada: PropostaColunaEntrada,
  form: CotacaoFormState,
  referencias: PlanoReferenciaAbertura[],
  tabColor: string
): ComparativoCopartColuna {
  const refLabel = labelPlanoReferencia(entrada.planoReferenciaId, referencias)
  const tituloCenario = entrada.cenarioTitulo.trim()
  let planoLabel = entrada.plano.nomePlano.trim() || refLabel || 'Plano'

  if (tituloCenario && entrada.grupo === 'atual') {
    planoLabel = `${refLabel !== '—' ? refLabel : planoLabel} · ${tituloCenario}`
  } else if (entrada.grupo === 'mercado' && refLabel !== '—') {
    planoLabel = `${entrada.plano.nomePlano.trim() || 'Proposta'} (≈ ${refLabel})`
  }

  return {
    id: comparativoColunaId(entrada.cenarioId, entrada.plano.id),
    grupo: entrada.grupo,
    operadora: entrada.fornecedorNome.toUpperCase(),
    operadoraId: entrada.operadoraId,
    produto: tituloCenario || (entrada.grupo === 'atual' ? 'Cenário atual' : 'Proposta'),
    planoLabel,
    acomodacao: entrada.plano.acomodacao.trim(),
    tabColor,
    copart: resolveCopartForm(entrada, form),
  }
}

export function buildComparativoCoparticipacaoColunas(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>,
  incluirAtual = true
): ComparativoCopartColuna[] {
  const referencias = planosReferenciaAbertura(form, operadoras, operadorasById)
  const entradas = ordenarEntradasPorEquivalencia(
    coletarEntradasComparativo(form, operadoras, operadorasById, incluirAtual),
    referencias
  )
  return entradas.map((e, i) =>
    colunaFromEntrada(e, form, referencias, TAB_COLORS[i % TAB_COLORS.length])
  )
}

export function valorCopartLinha(col: ComparativoCopartColuna, linha: ComparativoCopartLinha): string {
  const { copart } = col
  if (linha.tipo === 'selo') {
    return copart.possui ? 'Sim' : 'Não'
  }
  if (linha.tipo === 'forma') {
    return copart.possui ? labelFormaCobrancaCopart(copart.formaCobranca) : '—'
  }
  if (linha.tipo === 'procedimento' && linha.procedimentoKey) {
    return formatCopartProcedimentoCelula(copart, linha.procedimentoKey)
  }
  if (linha.tipo === 'internacao') {
    return formatCopartInternacaoCelula(copart)
  }
  return '—'
}

export function buildComparativoCoparticipacaoPages(
  colunas: ComparativoCopartColuna[],
  colunasPorSlide: number
): ComparativoCoparticipacaoPagina[] {
  if (!colunas.length) return []
  const chunk = Math.max(1, colunasPorSlide)
  const totalPages = Math.ceil(colunas.length / chunk)
  const pages: ComparativoCoparticipacaoPagina[] = []
  for (let i = 0; i < totalPages; i++) {
    pages.push({
      pageIndex: i,
      totalPages,
      colunas: colunas.slice(i * chunk, i * chunk + chunk),
      linhas: COMPARATIVO_COPART_LINHAS,
    })
  }
  return pages
}
