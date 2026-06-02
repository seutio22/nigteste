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
  if (key === 'kick_off') return { kickOffEstrategia: true }
  if (key === 'em_cotacao') return { beneficiarios: true, emCotacaoSubetapa: true }
  return {}
}

export function hasRetreatDiscardData(fromStatus: string): boolean {
  const s = getRetreatDiscardScope(fromStatus)
  return !!(s.kickOffEstrategia || s.beneficiarios || s.emCotacaoSubetapa)
}

export function describeRetreatDiscard(fromStatus: string): string {
  const key = getWorkflowStageKey(fromStatus)
  if (key === 'kick_off') {
    return 'A estratégia do Kick off (premissas, condições, mercado analisado e ajustes do resumo) será apagada.'
  }
  if (key === 'em_cotacao') {
    return 'A base de beneficiários importada e o progresso das subetapas de Em cotação serão removidos.'
  }
  return 'Não há dados específicos desta etapa para descartar; apenas o status será alterado.'
}

export function describeRetreatKeep(fromStatus: string, prevStatus: PlacementCotacaoWorkflowStatus): string {
  const from = getWorkflowStageKey(fromStatus)
  const prev = getWorkflowStageKey(prevStatus)
  if (from === 'em_cotacao' && prev === 'kick_off') {
    return 'Beneficiários, cenário de estudo e demais dados de Em cotação permanecem salvos para quando retornar.'
  }
  if (from === 'kick_off' && prev === 'base_atual') {
    return 'A estratégia do Kick off permanece salva para quando retornar a esta etapa.'
  }
  return 'Todos os dados já cadastrados permanecem salvos.'
}
