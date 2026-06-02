import type { CotacaoFormState } from './CotacaoFormFields'
import {
  itensToApiPayload,
  planosBundleToApiPayload,
  reconcilePlanosParaItens,
  sumVidasDosPlanos,
  sumCustoEstimadoPlanosCents,
  mapeamentoEstipulanteCompleto,
  mapeamentoItemCompleto,
} from './placementCotacaoDetalhes'
import {
  shouldShowPlanoModuleForCotacao,
  rowIdsNeedingPlanoForCotacao,
  validateContratoApoliceExtras,
} from './placementFormularioContrato'
import { participacaoExcedeLimite } from './placementCotacaoFinanceiro'

/** Valida mapeamento de itens e planos/coberturas antes de enviar à API. */
export function validatePlacementCotacaoDetalhes(form: CotacaoFormState): string | null {
  if (mapeamentoEstipulanteCompleto(form) && !form.filialId?.trim()) {
    return 'Selecione a filial (Dados → Placement → Filial).'
  }
  const tipo = form.formularioTipo
  const apiItens = itensToApiPayload(form.itens, tipo)
  if (!apiItens.length) {
    return tipo === 'saude'
      ? 'Informe ao menos uma linha com categoria e fornecedor atual (mapeamento de itens).'
      : 'Informe ao menos uma linha com produto e fornecedor atual (mapeamento de itens).'
  }
  const incomplete = form.itens.some(
    (i) =>
      (tipo === 'saude'
        ? i.categoria?.trim() || i.fornecedorId
        : i.produtoId || i.fornecedorId) &&
      !mapeamentoItemCompleto(i, tipo)
  )
  if (incomplete) {
    return tipo === 'saude'
      ? 'Cada categoria selecionada precisa de um fornecedor atual.'
      : 'Cada produto selecionado precisa de um fornecedor atual.'
  }

  const temCorretor = !!form.corretorParceiroId?.trim()
  const fin = form.dadosFinanceiros
  if (form.clienteTipo === 'casa' && !fin.atual.comissaoVitalicioContrato.trim()) {
    return 'Informe a comissão atual (vitalício) do contrato — obrigatória para cliente da casa.'
  }
  if (
    participacaoExcedeLimite(
      fin.atual.participacao.mds,
      temCorretor ? fin.atual.participacao.corretorParceiro : '0'
    )
  ) {
    return 'A soma das participações (MDS + Corretor) do contrato atual não pode superar 100%.'
  }
  if (
    participacaoExcedeLimite(
      fin.estudo.participacao.mds,
      temCorretor ? fin.estudo.participacao.corretorParceiro : '0'
    )
  ) {
    return 'A soma das participações (MDS + Corretor) do cenário de estudo não pode superar 100%.'
  }

  const contratoErr = validateContratoApoliceExtras(form)
  if (contratoErr) return contratoErr

  if (shouldShowPlanoModuleForCotacao(form)) {
    const ids = rowIdsNeedingPlanoForCotacao(form)
    const merged = reconcilePlanosParaItens(form.planos, ids)
    for (const p of merged) {
      if (!p.nomePlano.trim()) {
        return 'Preencha o nome de cada plano em Plano / Coberturas.'
      }
      if (!p.acomodacao) {
        return 'Selecione acomodação (Apartamento ou Enfermaria) em cada plano.'
      }
    }
    const ud = form.upgradeDowngradePorPlano
    if (ud.permiteUpgrade === '') {
      return 'Informe se existe condição de upgrade (Sim ou Não).'
    }
    if (ud.permiteDowngrade === '') {
      return 'Informe se existe condição de downgrade (Sim ou Não).'
    }
    if (ud.permiteUpgrade === 'sim' && !ud.planosIdsUpgrade.length) {
      return 'Selecione ao menos um plano com condição de upgrade.'
    }
    if (ud.permiteUpgrade === 'sim' && !ud.regraUpgrade?.trim()) {
      return 'Informe a regra de upgrade para os planos selecionados.'
    }
    if (ud.permiteDowngrade === 'sim' && !ud.planosIdsDowngrade.length) {
      return 'Selecione ao menos um plano com condição de downgrade.'
    }
    if (ud.permiteDowngrade === 'sim' && !ud.regraDowngrade?.trim()) {
      return 'Informe a regra de downgrade para os planos selecionados.'
    }
    const reemb = form.reembolsoPorPlano
    if (reemb.necessitaEquiparar === '') {
      return 'Informe se será necessário equiparar o reembolso (Sim ou Não).'
    }
    if (reemb.necessitaEquiparar === 'sim' && !reemb.detalheEquiparacao?.trim()) {
      return 'Detalhe quais planos e procedimentos necessitam de equiparação de reembolso.'
    }
  }
  return null
}

/** Mínimo para abrir na fila (etapa Base atual pode ser completada depois). */
export function validateIniciarProcessoNaFila(form: CotacaoFormState): string | null {
  if (form.clienteTipo === 'casa' && !form.condicaoId) {
    return 'Cliente da casa: vincule uma condição em Mapeamento → Estipulante (Dados → Placement → Condições).'
  }
  if (form.clienteTipo === 'prospect' && !form.prospectId) {
    return 'Selecione o prospect no Mapeamento (ou cadastre um novo).'
  }
  if (mapeamentoEstipulanteCompleto(form) && !form.filialId?.trim()) {
    return 'Selecione a filial em Mapeamento (Dados → Placement → Filiais).'
  }
  if (!form.dataInicio?.trim()) {
    return 'Informe a data de início (Prazos da cotação).'
  }
  if (form.dataLimite?.trim() && form.dataInicio?.trim() && form.dataLimite < form.dataInicio) {
    return 'A data limite deve ser igual ou posterior à data de início.'
  }
  return null
}

/** Validações completas (legado / salvar com todos os módulos). */
export function validatePlacementCotacaoForFila(form: CotacaoFormState): string | null {
  const abertura = validateIniciarProcessoNaFila(form)
  if (abertura) return abertura
  return validatePlacementCotacaoDetalhes(form)
}

/** Monta trechos extras da cotação (mapeamento + planos + vidas agregada) para POST/PUT. */
export function buildPlacementDetalhesApiFields(form: CotacaoFormState) {
  const apiItens = itensToApiPayload(form.itens, form.formularioTipo)
  let planosPayload: ReturnType<typeof planosBundleToApiPayload> = null
  let vidas: number | null = null
  const idsPlano = shouldShowPlanoModuleForCotacao(form) ? rowIdsNeedingPlanoForCotacao(form) : []
  const merged = reconcilePlanosParaItens(form.planos, idsPlano)
  planosPayload = planosBundleToApiPayload(
    merged,
    form.coparticipacaoDetalhePorPlanos ?? '',
    form.upgradeDowngradePorPlano,
    form.reembolsoPorPlano,
    form.coberturasEspeciais,
    form.dadosFinanceiros
  )
  let valorEstimadoCents: number | null = null
  if (shouldShowPlanoModuleForCotacao(form)) {
    vidas = sumVidasDosPlanos(merged)
    valorEstimadoCents = sumCustoEstimadoPlanosCents(merged)
  }
  return {
    itensMapeamento: apiItens.length ? apiItens : null,
    planosCobertura: planosPayload,
    vidas,
    valorEstimadoCents,
  }
}
