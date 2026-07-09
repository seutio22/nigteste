import type { CotacaoFormState } from './CotacaoFormFields'
import { labelPlano } from './placementContratoAtual'
import { resolveOperadoraNome } from './placementKickOffFormatters'
import type { Operadora } from '../../../types/masterData'
import {
  emptyPropostaPlanoLinha,
  type PropostaFornecedorState,
  type PropostaPlanoLinha,
} from './placementAguardandoOperadora'
import { emptyCustosFaixa, emptyVidasFaixa, FAIXAS_ETARIAS } from './placementCotacaoDetalhes'

export type PlanoReferenciaAbertura = {
  id: string
  label: string
  operadoraNome: string
  tipoCusto: PropostaPlanoLinha['tipoCusto']
  numeroVidas: string
}

/** Catálogo de planos do contrato (abertura) para equivalência no comparativo. */
export function planosReferenciaAbertura(
  form: CotacaoFormState,
  operadoras: Operadora[],
  operadorasById?: Record<string, Operadora>
): PlanoReferenciaAbertura[] {
  const itemOp = new Map<string, string>()
  for (const item of form.itens ?? []) {
    const opId = String(item.fornecedorId ?? '').trim()
    if (!opId) continue
    itemOp.set(item.id, resolveOperadoraNome(opId, operadoras, operadorasById))
  }

  return (form.planos ?? [])
    .filter((p) => p.nomePlano.trim() || p.numeroVidas.trim() || p.custoPerCapitaBRL.trim())
    .map((p) => ({
      id: p.id,
      label: labelPlano(p),
      operadoraNome: itemOp.get(p.itemRowId) ?? '—',
      tipoCusto: p.tipoCusto,
      numeroVidas: p.numeroVidas,
    }))
}

export function labelPlanoReferencia(
  refId: string,
  referencias: PlanoReferenciaAbertura[]
): string {
  if (!refId) return '—'
  return referencias.find((r) => r.id === refId)?.label ?? '—'
}

export function propostaPatchFromReferencia(
  ref: PlanoReferenciaAbertura,
  planosAbertura: CotacaoFormState['planos']
): Partial<PropostaPlanoLinha> {
  const src = (planosAbertura ?? []).find((p) => p.id === ref.id)
  const tipoCusto = src?.tipoCusto ?? ref.tipoCusto
  const base = emptyPropostaPlanoLinha()

  if (tipoCusto === 'faixa_etaria') {
    return {
      planoReferenciaId: ref.id,
      tipoCusto,
      numeroVidas: '',
      custoPerCapitaBRL: '',
      vidasFaixa: src
        ? { ...base.vidasFaixa, ...src.vidasFaixa }
        : emptyVidasFaixa(),
      custosFaixa: emptyCustosFaixa(),
    }
  }

  return {
    planoReferenciaId: ref.id,
    tipoCusto: 'per_capita',
    numeroVidas: src?.numeroVidas ?? ref.numeroVidas,
    custoPerCapitaBRL: '',
    vidasFaixa: emptyVidasFaixa(),
    custosFaixa: emptyCustosFaixa(),
  }
}

/** Cria/atualiza linhas de proposta alinhadas 1:1 aos planos do contrato. */
export function alinharPropostaPorEquivalencia(
  proposta: PropostaFornecedorState,
  referencias: PlanoReferenciaAbertura[]
): PropostaFornecedorState {
  if (!referencias.length) return proposta

  const byRef = new Map<string, PropostaPlanoLinha>()
  for (const p of proposta.planos ?? []) {
    const key = p.planoReferenciaId || p.id
    if (key) byRef.set(key, p)
  }

  const planos = referencias.map((ref) => {
    const prev = byRef.get(ref.id)
    if (prev) {
      const tipoCusto = ref.tipoCusto || prev.tipoCusto
      return {
        ...prev,
        planoReferenciaId: ref.id,
        tipoCusto,
        numeroVidas: prev.numeroVidas.trim() ? prev.numeroVidas : ref.numeroVidas,
        vidasFaixa: tipoCusto === 'per_capita' ? emptyVidasFaixa() : prev.vidasFaixa,
        custosFaixa: tipoCusto === 'per_capita' ? emptyCustosFaixa() : prev.custosFaixa,
      }
    }
    return {
      ...emptyPropostaPlanoLinha(),
      planoReferenciaId: ref.id,
      tipoCusto: ref.tipoCusto,
      numeroVidas: ref.numeroVidas,
      vidasFaixa: ref.tipoCusto === 'faixa_etaria' ? emptyVidasFaixa() : emptyVidasFaixa(),
      custosFaixa: ref.tipoCusto === 'faixa_etaria' ? emptyCustosFaixa() : emptyCustosFaixa(),
      nomePlano: '',
    }
  })

  return { ...proposta, planos }
}

export function propostaPlanoLinhaIsPristine(p: PropostaPlanoLinha): boolean {
  if (p.planoReferenciaId?.trim()) return false
  if (p.nomePlano) return false
  if (p.numeroVidas.trim()) return false
  if (p.custoPerCapitaBRL.trim()) return false
  if (p.reembolsoConsulta.trim()) return false
  if (p.acomodacao.trim()) return false
  if (p.coparticipacao.trim()) return false
  for (const fx of FAIXAS_ETARIAS) {
    if (p.vidasFaixa?.[fx.key]?.trim()) return false
    if (p.custosFaixa?.[fx.key]?.trim()) return false
  }
  return true
}

export function ensurePropostaMercadoEquivalencia(
  proposta: PropostaFornecedorState,
  referencias: PlanoReferenciaAbertura[]
): PropostaFornecedorState {
  if (proposta.cenarios?.length || !referencias.length) return proposta

  const hasRefLink = proposta.planos?.some((p) => p.planoReferenciaId?.trim())
  const onlyEmpty = proposta.planos?.length === 1 && propostaPlanoLinhaIsPristine(proposta.planos[0])

  if (!hasRefLink && (onlyEmpty || proposta.planos.length < referencias.length)) {
    return alinharPropostaPorEquivalencia(proposta, referencias)
  }

  return {
    ...proposta,
    planos: (proposta.planos ?? []).map((p) => ({
      ...p,
      planoReferenciaId: p.planoReferenciaId || p.id,
    })),
  }
}
