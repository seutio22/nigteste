import type { CotacaoFormState } from './CotacaoFormFields'
import { buildContratoApoliceApiFields } from './placementFormularioContrato'
import { buildPlacementDetalhesApiFields } from './placementCotacaoSubmit'
import type { CotacaoFormScope } from './placementCotacaoFormScope'
import { PLACEMENT_STATUS_RASCUNHO } from './placementCotacaoStatus'

type SaveScopeOptions = {
  scope: CotacaoFormScope
  isDraft: boolean
  editingAbertura?: boolean
}

/** Payload completo (POST/PUT legado e rascunho). */
export function buildFullCotacaoSavePayload(form: CotacaoFormState, isDraft: boolean) {
  const detalhesApi = buildPlacementDetalhesApiFields(form)
  return {
    ticket: form.ticket?.trim() || undefined,
    status: isDraft ? PLACEMENT_STATUS_RASCUNHO : form.status,
    analistaId: form.analistaId || null,
    clienteId: form.clienteTipo === 'casa' ? form.clienteId || null : null,
    prospectId: form.clienteTipo === 'prospect' ? form.prospectId || null : null,
    condicaoId: form.clienteTipo === 'casa' ? form.condicaoId || null : null,
    filialId: form.filialId || null,
    corretorParceiroId: form.corretorParceiroId?.trim() || null,
    projetoId: form.projetoId?.trim() || null,
    pedidoId: form.pedidoId?.trim() || null,
    solicitante: form.solicitante?.trim() || null,
    temperaturaId: form.temperaturaId?.trim() || null,
    ...detalhesApi,
    dataInicio: form.dataInicio || null,
    dataLimite: form.dataLimite || null,
    descricao: form.descricao?.trim() || null,
    observacoes: form.observacoes?.trim() || null,
    vigenciaApolice: form.vigenciaApolice?.trim() || null,
    tipoContratacaoId: form.tipoContratacaoId?.trim() || null,
    modalidadeContratoId: form.modalidadeContratoId?.trim() || null,
    prazoVigenciaContratoId: form.prazoVigenciaContratoId?.trim() || null,
    breakEven: form.breakEven?.trim() || null,
    ...buildContratoApoliceApiFields(form),
    operadorasSugestaoIds: form.operadorasSugestaoIds?.length > 0 ? form.operadorasSugestaoIds : null,
    analistaResponsavelId: form.analistaResponsavelId?.trim() || null,
    ...(form.kickOffEstrategia ? { kickOffEstrategia: form.kickOffEstrategia } : {}),
  }
}

/** Payload enxuto conforme a etapa — evita reenviar mapeamento/planos inteiros à toa. */
export function buildScopedSavePayload(form: CotacaoFormState, options: SaveScopeOptions) {
  if (options.isDraft || options.scope === 'all' || options.editingAbertura || options.scope === 'dados_abertura') {
    return buildFullCotacaoSavePayload(form, options.isDraft)
  }

  if (options.scope === 'base_atual') {
    return buildFullCotacaoSavePayload(form, false)
  }

  const observacoes = form.observacoes?.trim() || null
  const kickOff = form.kickOffEstrategia ? { kickOffEstrategia: form.kickOffEstrategia } : {}

  if (options.scope === 'kick_off') {
    return {
      analistaResponsavelId: form.analistaResponsavelId?.trim() || null,
      temperaturaId: form.temperaturaId?.trim() || null,
      observacoes,
    }
  }

  if (options.scope === 'estrategia') {
    return {
      observacoes,
      ...kickOff,
    }
  }

  if (options.scope === 'em_cotacao') {
    return {
      observacoes,
      ...kickOff,
      ...buildContratoApoliceApiFields(form),
    }
  }

  if (options.scope === 'observacoes_only') {
    return {
      observacoes,
      ...kickOff,
    }
  }

  return buildFullCotacaoSavePayload(form, false)
}
