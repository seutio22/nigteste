import type { CotacaoFormState } from './CotacaoFormFields'
import {
  itensToApiPayload,
  mapeamentoItemCompleto,
  mapeamentoEstipulanteCompleto,
  reconcilePlanosParaItens,
} from './placementCotacaoDetalhes'
import {
  shouldShowPlanoModuleForCotacao,
  rowIdsNeedingPlanoForCotacao,
  validateContratoApoliceExtras,
} from './placementFormularioContrato'
import { participacaoExcedeLimite } from './placementCotacaoFinanceiro'
import type { PlacementCotacaoWorkflowStatus } from './placementCotacaoStatus'
import { workflowStageIndex } from './placementCotacaoWorkflow'
import { kickOffEstrategiaIsComplete, buildKickOffEstrategiaPendencias } from './placementKickOffEstrategia'
import { comunicarMercadoIsComplete } from './placementComunicarMercado'
import { aguardandoOperadoraIsComplete } from './placementAguardandoOperadora'

export type WorkflowChecklistItem = {
  id: string
  label: string
  done: boolean
}

/** Etapa 1 — documentar o que o cliente tem hoje (base para a proposta). */
export function validateEtapaBaseAtual(form: CotacaoFormState): string | null {
  if (form.clienteTipo === 'casa' && !form.condicaoId) {
    return 'Vincule o estipulante (condição Placement) em Mapeamento.'
  }
  if (form.clienteTipo === 'prospect' && !form.prospectId) {
    return 'Selecione o prospect em Mapeamento.'
  }
  if (mapeamentoEstipulanteCompleto(form) && !form.filialId?.trim()) {
    return 'Selecione a filial em Mapeamento.'
  }
  if (!form.dataInicio?.trim()) {
    return 'Informe a data de início (Prazos).'
  }

  const tipo = form.formularioTipo
  const apiItens = itensToApiPayload(form.itens, tipo)
  if (!apiItens.length) {
    return tipo === 'saude'
      ? 'Informe ao menos uma categoria com fornecedor atual (situação de hoje).'
      : 'Informe ao menos um produto com fornecedor atual (situação de hoje).'
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
      ? 'Cada categoria precisa do fornecedor atual do cliente.'
      : 'Cada produto precisa do fornecedor atual do cliente.'
  }

  const fin = form.dadosFinanceiros
  const temCorretor = !!form.corretorParceiroId?.trim()
  if (form.clienteTipo === 'casa' && !fin.atual.comissaoVitalicioContrato.trim()) {
    return 'Informe a comissão vitalícia do contrato atual (cliente da casa).'
  }
  if (
    participacaoExcedeLimite(
      fin.atual.participacao.mds,
      temCorretor ? fin.atual.participacao.corretorParceiro : '0'
    )
  ) {
    return 'Participações do contrato atual não podem superar 100%.'
  }

  const contratoErr = validateContratoApoliceExtras(form)
  if (contratoErr) return contratoErr

  if (shouldShowPlanoModuleForCotacao(form)) {
    const ids = rowIdsNeedingPlanoForCotacao(form)
    const merged = reconcilePlanosParaItens(form.planos, ids)
    for (const p of merged) {
      if (!p.nomePlano.trim()) {
        return 'Informe o nome de cada plano atual do cliente.'
      }
      if (!p.acomodacao) {
        return 'Informe a acomodação de cada plano atual.'
      }
    }
    const ud = form.upgradeDowngradePorPlano
    if (ud.permiteUpgrade === '') {
      return 'Informe se existe condição de upgrade (Sim ou Não).'
    }
    if (ud.permiteDowngrade === '') {
      return 'Informe se existe condição de downgrade (Sim ou Não).'
    }
    const reemb = form.reembolsoPorPlano
    if (reemb.necessitaEquiparar === '') {
      return 'Informe se será necessário equiparar o reembolso (Sim ou Não).'
    }
  }

  return null
}

/** Etapa 2 — montar cenário de estudo / cotação com operadoras. */
export function validateEtapaEmCotacao(form: CotacaoFormState): string | null {
  const baseErr = validateEtapaBaseAtual(form)
  if (baseErr) return baseErr

  const fin = form.dadosFinanceiros
  const temCorretor = !!form.corretorParceiroId?.trim()
  if (!fin.estudo.comissaoAgenciamento.trim() && !fin.estudo.comissaoVitalicio.trim()) {
    return 'Informe ao menos agenciamento ou vitalício no cenário de estudo.'
  }
  if (
    participacaoExcedeLimite(
      fin.estudo.participacao.mds,
      temCorretor ? fin.estudo.participacao.corretorParceiro : '0'
    )
  ) {
    return 'Participações do cenário de estudo não podem superar 100%.'
  }

  return null
}

/** Validação para avançar de Base atual → Kick off (exige analista responsável). */
export function validateAvancarParaKickOff(form: CotacaoFormState): string | null {
  const baseErr = validateEtapaBaseAtual(form)
  if (baseErr) return baseErr
  if (!form.analistaResponsavelId?.trim()) {
    return 'Designe o analista responsável (catálogo Placement) antes de avançar para Kick off.'
  }
  return null
}

/** @deprecated Use validateAvancarParaKickOff */
export function validateAvancarParaEmCotacao(form: CotacaoFormState): string | null {
  return validateAvancarParaKickOff(form)
}

export function validateEtapaKickOff(form: CotacaoFormState): string | null {
  if (!kickOffEstrategiaIsComplete(form.kickOffEstrategia)) {
    return 'Preencha a estratégia do Kick off (fatores e mercado analisado) antes de avançar.'
  }
  return null
}

export function validateForWorkflowAdvance(
  status: string,
  form: CotacaoFormState
): string | null {
  const idx = workflowStageIndex(status)
  if (idx === 0) return validateAvancarParaKickOff(form)
  if (idx === 1) return validateEtapaKickOff(form)
  if (idx === 2) return validateEtapaEmCotacao(form)
  return null
}

export function buildChecklistBaseAtual(form: CotacaoFormState): WorkflowChecklistItem[] {
  const temCorretor = !!form.corretorParceiroId?.trim()
  const fin = form.dadosFinanceiros
  const apiItens = itensToApiPayload(form.itens, form.formularioTipo)
  const estipulanteOk =
    (form.clienteTipo === 'casa' && !!form.condicaoId) ||
    (form.clienteTipo === 'prospect' && !!form.prospectId)
  const filialOk = !mapeamentoEstipulanteCompleto(form) || !!form.filialId?.trim()
  const planosOk = (() => {
    if (!shouldShowPlanoModuleForCotacao(form)) return true
    const ids = rowIdsNeedingPlanoForCotacao(form)
    const merged = reconcilePlanosParaItens(form.planos, ids)
    return merged.every((p) => p.nomePlano.trim() && p.acomodacao)
  })()
  const condicoesPlanosOk = (() => {
    if (!shouldShowPlanoModuleForCotacao(form)) return true
    const ud = form.upgradeDowngradePorPlano
    return (
      ud.permiteUpgrade !== '' &&
      ud.permiteDowngrade !== '' &&
      form.reembolsoPorPlano.necessitaEquiparar !== ''
    )
  })()

  const contratoExtrasOk = validateContratoApoliceExtras(form) === null

  return [
    { id: 'estipulante', label: 'Estipulante e filial definidos', done: estipulanteOk && filialOk },
    { id: 'prazos', label: 'Data de início informada', done: !!form.dataInicio?.trim() },
    {
      id: 'formulario_contrato',
      label: 'Cláusulas contratuais (multa e convenção)',
      done: contratoExtrasOk,
    },
    {
      id: 'mapeamento',
      label: 'Produtos e fornecedores atuais mapeados',
      done:
        apiItens.length > 0 &&
        !form.itens.some(
          (i) =>
            (form.formularioTipo === 'saude'
              ? i.categoria?.trim() || i.fornecedorId
              : i.produtoId || i.fornecedorId) &&
            !mapeamentoItemCompleto(i, form.formularioTipo)
        ),
    },
    {
      id: 'financeiro_atual',
      label: 'Comissão e participação do contrato vigente',
      done:
        (form.clienteTipo !== 'casa' || !!fin.atual.comissaoVitalicioContrato.trim()) &&
        !participacaoExcedeLimite(
          fin.atual.participacao.mds,
          temCorretor ? fin.atual.participacao.corretorParceiro : '0'
        ),
    },
    {
      id: 'planos_atuais',
      label: 'Planos atuais do cliente (quando Saúde/Odonto)',
      done: planosOk,
    },
    {
      id: 'condicoes_planos',
      label: 'Upgrade, downgrade e reembolso atual',
      done: condicoesPlanosOk,
    },
    {
      id: 'analista_responsavel',
      label: 'Analista responsável designado',
      done: !!form.analistaResponsavelId?.trim(),
    },
  ]
}

export function buildChecklistEmCotacao(
  form: CotacaoFormState,
  operadoras: { id: string; nome: string }[] = [],
  operadorasById?: Record<string, { id: string; nome: string }>
): WorkflowChecklistItem[] {
  const fin = form.dadosFinanceiros
  const temCorretor = !!form.corretorParceiroId?.trim()
  const estudoFinOk =
    (!!fin.estudo.comissaoAgenciamento.trim() || !!fin.estudo.comissaoVitalicio.trim()) &&
    !participacaoExcedeLimite(
      fin.estudo.participacao.mds,
      temCorretor ? fin.estudo.participacao.corretorParceiro : '0'
    )
  return [
    ...buildChecklistBaseAtual(form),
    { id: 'financeiro_estudo', label: 'Cenário de estudo (comissões)', done: estudoFinOk },
    {
      id: 'comunicar_mercado',
      label: 'Comunicação ao mercado (todos os fornecedores)',
      done: comunicarMercadoIsComplete(form, operadoras, operadorasById),
    },
  ]
}

export function buildChecklistKickOff(form: CotacaoFormState): WorkflowChecklistItem[] {
  return buildKickOffEstrategiaPendencias(form.kickOffEstrategia).map((p) => ({
    id: p.id,
    label: p.label,
    done: p.done,
  }))
}

export function buildWorkflowChecklist(
  status: PlacementCotacaoWorkflowStatus | string,
  form: CotacaoFormState,
  operadoras: { id: string; nome: string }[] = [],
  operadorasById?: Record<string, { id: string; nome: string }>
): WorkflowChecklistItem[] {
  const idx = workflowStageIndex(status)
  if (idx === 0) return buildChecklistBaseAtual(form)
  if (idx === 1) return buildChecklistKickOff(form)
  if (idx === 2) return buildChecklistEmCotacao(form, operadoras, operadorasById)
  if (idx === 3) {
    return [
      {
        id: 'aguardando_retornos',
        label: 'Retorno de todas as operadoras registrado',
        done: aguardandoOperadoraIsComplete(form, operadoras, operadorasById),
      },
    ]
  }
  if (idx === 4) {
    return [{ id: 'proposta', label: 'Proposta formal enviada ao cliente', done: true }]
  }
  return []
}

export function isMainFlowTerminal(status: string): boolean {
  const t = status.toLowerCase()
  return t === 'fechada' || t === 'perdida' || t === 'cancelada'
}
