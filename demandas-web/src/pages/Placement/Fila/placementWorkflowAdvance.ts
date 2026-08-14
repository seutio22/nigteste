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
import {
  consolidandoHasCondicoes,
  consolidandoHasDiferenciais,
  consolidandoHasIndicadores,
} from './placementConsolidandoDados'
import {
  parseValidacaoPropostaFromKickOff,
  validacaoPropostaHasValidador,
  validacaoPropostaItensComAjuste,
  validacaoPropostaItensPendentes,
  validacaoPropostaPodeAprovar,
} from './placementValidacaoProposta'

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
    return 'Informe a data de início (Solicitação de Estudo).'
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
    return 'Informe a comissão vitalícia do contrato atual (Cliente da Carteira).'
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

/** Validação para avançar de Base atual → Validação. */
export function validateAvancarParaValidacao(form: CotacaoFormState): string | null {
  return validateEtapaBaseAtual(form)
}

/** Validação para avançar de Validação → Kick off. */
export function validateAvancarParaKickOff(
  form: CotacaoFormState,
  ctx?: { beneficiariosTotal?: number },
): string | null {
  if (!form.analistaResponsavelId?.trim()) {
    return 'Designe o analista responsável (catálogo Placement) antes de avançar para Kick off.'
  }
  const total = ctx?.beneficiariosTotal ?? 0
  if (total < 1) {
    return 'Importe a base de beneficiários na Análise antes de avançar para Kick off.'
  }
  return null
}

/** @deprecated Use validateAvancarParaKickOff */
export function validateAvancarParaEmCotacao(form: CotacaoFormState): string | null {
  return validateAvancarParaKickOff(form)
}

export function validateEtapaKickOff(form: CotacaoFormState): string | null {
  if (!kickOffEstrategiaIsComplete(form.kickOffEstrategia)) {
    return 'Preencha a estratégia (premissas, condições e mercado analisado) antes de avançar para Solicitação Mercado.'
  }
  return null
}

export function validateForWorkflowAdvance(
  status: string,
  form: CotacaoFormState,
  ctx?: { beneficiariosTotal?: number },
): string | null {
  const idx = workflowStageIndex(status)
  if (idx === 0) return validateAvancarParaValidacao(form)
  if (idx === 1) return validateAvancarParaKickOff(form, ctx)
  if (idx === 2) return null
  if (idx === 3) return validateEtapaKickOff(form)
  if (idx === 4) return validateEtapaEmCotacao(form)
  if (idx === 6) {
    const faltando: string[] = []
    if (!consolidandoHasCondicoes(form)) {
      faltando.push('condições contratuais (matriz ou observações na aba Condições)')
    }
    if (!consolidandoHasDiferenciais(form)) {
      faltando.push('diferenciais (matriz na aba Diferenciais)')
    }
    if (faltando.length) {
      return `Preencha antes de avançar para Validação: ${faltando.join('; ')}.`
    }
    const vp = parseValidacaoPropostaFromKickOff(form.kickOffEstrategia)
    if (!validacaoPropostaHasValidador(vp)) {
      return 'Designe o analista validador (catálogo Placement) antes de avançar para Validação.'
    }
    return null
  }
  if (idx === 7) {
    const check = validacaoPropostaPodeAprovar(parseValidacaoPropostaFromKickOff(form.kickOffEstrategia))
    return check.ok ? null : check.message ?? 'Conclua a validação antes de enviar a proposta.'
  }
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

export function buildChecklistValidacao(
  form: CotacaoFormState,
  beneficiariosTotal: number,
): WorkflowChecklistItem[] {
  return [
    {
      id: 'beneficiarios',
      label: 'Base de beneficiários importada',
      done: beneficiariosTotal >= 1,
    },
    {
      id: 'analista_responsavel',
      label: 'Analista responsável designado',
      done: !!form.analistaResponsavelId?.trim(),
    },
  ]
}

export function buildWorkflowChecklist(
  status: PlacementCotacaoWorkflowStatus | string,
  form: CotacaoFormState,
  operadoras: { id: string; nome: string }[] = [],
  operadorasById?: Record<string, { id: string; nome: string }>,
  ctx?: { beneficiariosTotal?: number },
): WorkflowChecklistItem[] {
  const idx = workflowStageIndex(status)
  if (idx === 0) return buildChecklistBaseAtual(form)
  if (idx === 1) return buildChecklistValidacao(form, ctx?.beneficiariosTotal ?? 0)
  if (idx === 2) return []
  if (idx === 3) return buildChecklistKickOff(form)
  if (idx === 4) return buildChecklistEmCotacao(form, operadoras, operadorasById)
  if (idx === 5) {
    return [
      {
        id: 'aguardando_retornos',
        label: 'Retorno de todas as operadoras registrado',
        done: aguardandoOperadoraIsComplete(form, operadoras, operadorasById),
      },
    ]
  }
  if (idx === 6) {
    const vp = parseValidacaoPropostaFromKickOff(form.kickOffEstrategia)
    return [
      {
        id: 'consolidando_condicoes',
        label: 'Condições contratuais (aba Condições)',
        done: consolidandoHasCondicoes(form),
      },
      {
        id: 'consolidando_diferenciais',
        label: 'Diferenciais (matriz na aba Diferenciais)',
        done: consolidandoHasDiferenciais(form),
      },
      {
        id: 'consolidando_indicadores',
        label: 'Indicadores das operadoras preenchidos',
        done: consolidandoHasIndicadores(form),
      },
      {
        id: 'consolidando_validador',
        label: 'Analista validador designado (Placement)',
        done: validacaoPropostaHasValidador(vp),
      },
    ]
  }
  if (idx === 7) {
    const vp = parseValidacaoPropostaFromKickOff(form.kickOffEstrategia)
    const pendentes = validacaoPropostaItensPendentes(vp).length
    const ajustes = validacaoPropostaItensComAjuste(vp).length
    return [
      {
        id: 'vp_validador',
        label: 'Analista validador designado',
        done: validacaoPropostaHasValidador(vp),
      },
      {
        id: 'vp_itens',
        label: pendentes
          ? `Itens avaliados (${pendentes} pendente(s))`
          : 'Todos os itens avaliados',
        done: pendentes === 0 && (vp.itens?.length ?? 0) > 0,
      },
      {
        id: 'vp_sem_ajuste',
        label: ajustes
          ? `${ajustes} ajuste(s) — devolver ou corrigir`
          : 'Sem ajustes pendentes',
        done: ajustes === 0,
      },
    ]
  }
  if (idx === 8) {
    return [{ id: 'proposta', label: 'Proposta formal enviada ao cliente', done: true }]
  }
  return []
}

export function isMainFlowTerminal(status: string): boolean {
  const t = status.toLowerCase()
  return t === 'fechada' || t === 'perdida' || t === 'cancelada'
}
