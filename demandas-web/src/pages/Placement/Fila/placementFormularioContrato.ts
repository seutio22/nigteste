import type { CotacaoFormState } from './CotacaoFormFields'
import type { SimNaoChoice } from './UpgradeDowngradeFields'
import { shouldShowPlanoModule, rowIdsNeedingPlano, type MapeamentoItemForm, mapeamentoItemCompleto } from './placementCotacaoDetalhes'

export type PlacementFormularioTipo =
  | ''
  | 'saude'
  | 'odontologico'
  | 'vida_em_grupo'
  | 'nao_seguraveis'

export const PLACEMENT_FORMULARIO_TIPOS: { value: Exclude<PlacementFormularioTipo, ''>; label: string }[] =
  [
    { value: 'saude', label: 'Saúde' },
    { value: 'odontologico', label: 'Odontológico' },
    { value: 'vida_em_grupo', label: 'Vida em grupo' },
    { value: 'nao_seguraveis', label: 'Não seguráveis' },
  ]

/** Formulários já implementados na fila de cotação. */
export const FORMULARIO_TIPOS_DISPONIVEIS = ['saude'] as const satisfies readonly Exclude<
  PlacementFormularioTipo,
  ''
>[]

export function isFormularioTipoDisponivel(
  tipo: PlacementFormularioTipo | string | null | undefined
): tipo is (typeof FORMULARIO_TIPOS_DISPONIVEIS)[number] {
  return FORMULARIO_TIPOS_DISPONIVEIS.includes(tipo as (typeof FORMULARIO_TIPOS_DISPONIVEIS)[number])
}

export function labelFormularioTipo(value: string | null | undefined): string {
  const v = String(value ?? '').trim()
  return PLACEMENT_FORMULARIO_TIPOS.find((t) => t.value === v)?.label ?? v
}

export function labelSimNaoChoice(value: SimNaoChoice | boolean | null | undefined): string {
  if (value === true || value === 'sim') return 'Sim'
  if (value === false || value === 'nao') return 'Não'
  return ''
}

export function simNaoFromApi(value: boolean | null | undefined): SimNaoChoice {
  if (value === true) return 'sim'
  if (value === false) return 'nao'
  return ''
}

export function simNaoToApi(value: SimNaoChoice): boolean | null {
  if (value === 'sim') return true
  if (value === 'nao') return false
  return null
}

export function shouldShowPlanoModuleForCotacao(
  form: Pick<CotacaoFormState, 'formularioTipo' | 'itens'>
): boolean {
  const tipo = form.formularioTipo
  if (tipo === 'vida_em_grupo' || tipo === 'nao_seguraveis') return false
  if (tipo === 'saude' || tipo === 'odontologico') {
    return form.itens.some((i) => mapeamentoItemCompleto(i, tipo))
  }
  return shouldShowPlanoModule(form.itens)
}

export function rowIdsNeedingPlanoForCotacao(
  form: Pick<CotacaoFormState, 'formularioTipo' | 'itens'>
): string[] {
  if (!shouldShowPlanoModuleForCotacao(form)) return []
  if (form.formularioTipo === 'saude' || form.formularioTipo === 'odontologico') {
    return form.itens.filter((i) => mapeamentoItemCompleto(i, form.formularioTipo)).map((i) => i.id)
  }
  return rowIdsNeedingPlano(form.itens)
}

export function formatMultaRescisaoResumo(form: {
  multaRescisaoContratual: SimNaoChoice
  multaRescisaoValor: string
  multaRescisaoRegra: string
  multaRescisaoAvisoPrevio: string
}): string {
  if (form.multaRescisaoContratual === 'nao') return 'Não'
  if (form.multaRescisaoContratual !== 'sim') return ''
  const partes = [
    'Sim',
    form.multaRescisaoValor.trim() ? `Valor: ${form.multaRescisaoValor.trim()}` : '',
    form.multaRescisaoRegra.trim() ? `Regra: ${form.multaRescisaoRegra.trim()}` : '',
    form.multaRescisaoAvisoPrevio.trim()
      ? `Aviso prévio: ${form.multaRescisaoAvisoPrevio.trim()}`
      : '',
  ].filter(Boolean)
  return partes.join(' · ')
}

export function formatConvencaoColetivaResumo(form: {
  possuiConvencaoColetiva: SimNaoChoice
  convencaoColetivaDetalhe: string
}): string {
  if (form.possuiConvencaoColetiva === 'nao') return 'Não'
  if (form.possuiConvencaoColetiva !== 'sim') return ''
  const det = form.convencaoColetivaDetalhe.trim()
  return det ? `Sim · ${det}` : 'Sim'
}

export function validateContratoApoliceExtras(
  form: Pick<
    CotacaoFormState,
    | 'formularioTipo'
    | 'multaRescisaoContratual'
    | 'multaRescisaoValor'
    | 'multaRescisaoRegra'
    | 'multaRescisaoAvisoPrevio'
    | 'possuiConvencaoColetiva'
  >
): string | null {
  if (!form.formularioTipo) {
    return 'Tipo de formulário não definido — inicie a cotação escolhendo o formulário (Nova cotação).'
  }
  if (form.multaRescisaoContratual === '') {
    return 'Informe se o contrato prevê multa para rescisão contratual (Sim ou Não).'
  }
  if (form.multaRescisaoContratual === 'sim') {
    if (!form.multaRescisaoValor.trim()) {
      return 'Informe o valor da multa para rescisão contratual.'
    }
    if (!form.multaRescisaoRegra.trim()) {
      return 'Informe a regra para a multa de rescisão contratual.'
    }
    if (!form.multaRescisaoAvisoPrevio.trim()) {
      return 'Informe o aviso prévio para rescisão contratual.'
    }
  }
  if (form.possuiConvencaoColetiva === '') {
    return 'Informe se está em acordo coletivo (Sim ou Não).'
  }
  return null
}

export function buildContratoApoliceApiFields(form: CotacaoFormState) {
  const multa = simNaoToApi(form.multaRescisaoContratual)
  const conv = simNaoToApi(form.possuiConvencaoColetiva)
  return {
    formularioTipo: form.formularioTipo?.trim() || null,
    multaRescisaoContratual: multa,
    multaRescisaoValor: multa === true ? form.multaRescisaoValor.trim() || null : null,
    multaRescisaoRegra: multa === true ? form.multaRescisaoRegra.trim() || null : null,
    multaRescisaoAvisoPrevio:
      multa === true ? form.multaRescisaoAvisoPrevio.trim() || null : null,
    possuiConvencaoColetiva: conv,
    convencaoColetivaDetalhe: conv === true ? form.convencaoColetivaDetalhe.trim() || null : null,
  }
}

export function parseFormularioTipoFromApi(value: unknown): PlacementFormularioTipo {
  const v = String(value ?? '').trim()
  if (
    v === 'saude' ||
    v === 'odontologico' ||
    v === 'vida_em_grupo' ||
    v === 'nao_seguraveis'
  ) {
    return v
  }
  return ''
}
