import { getWorkflowStageKey } from './placementCotacaoWorkflow'
import type { PlacementCotacaoWorkflowStatus } from './placementCotacaoStatus'

export type WorkflowRetreatMode = 'keep' | 'discard'

export type WorkflowRetreatDiscardScope = {
  kickOffEstrategia?: boolean
  beneficiarios?: boolean
  emCotacaoSubetapa?: boolean
}

export function getRetreatDiscardScope(fromStatus: string): WorkflowRetreatDiscardScope {
  const key = getWorkflowStageKey(fromStatus)
  if (key === 'estrategia') return { kickOffEstrategia: true }
  if (key === 'validacao' || key === 'em_cotacao') {
    return { beneficiarios: true, emCotacaoSubetapa: true }
  }
  return {}
}

export function hasRetreatDiscardData(fromStatus: string): boolean {
  const s = getRetreatDiscardScope(fromStatus)
  return !!(s.kickOffEstrategia || s.beneficiarios || s.emCotacaoSubetapa)
}

export function describeRetreatDiscard(fromStatus: string): string {
  const key = getWorkflowStageKey(fromStatus)
  if (key === 'estrategia') {
    return 'A estratégia formalizada (premissas, condições, mercado analisado e ajustes do resumo) será apagada.'
  }
  if (key === 'validacao') {
    return 'A base de beneficiários importada e o progresso da Análise serão removidos.'
  }
  if (key === 'em_cotacao') {
    return 'A base de beneficiários importada e o progresso das subetapas de Solicitação Mercado serão removidos.'
  }
  return 'Não há dados específicos desta etapa para descartar; apenas o status será alterado.'
}

export function describeRetreatKeep(fromStatus: string, prevStatus: PlacementCotacaoWorkflowStatus): string {
  const from = getWorkflowStageKey(fromStatus)
  const prev = getWorkflowStageKey(prevStatus)
  if (from === 'em_cotacao' && prev === 'estrategia') {
    return 'A estratégia formalizada e demais dados de Solicitação Mercado permanecem salvos para quando retornar.'
  }
  if (from === 'estrategia' && prev === 'kick_off') {
    return 'A estratégia em elaboração permanece salva para quando retornar a esta etapa.'
  }
  if (from === 'kick_off' && prev === 'validacao') {
    return 'Beneficiários e dados da Validação permanecem salvos para quando retornar.'
  }
  if (from === 'validacao' && prev === 'base_atual') {
    return 'Beneficiários e slides validados permanecem salvos para quando retornar.'
  }
  return 'Todos os dados já cadastrados permanecem salvos.'
}
