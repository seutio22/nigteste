import { PLACEMENT_WORKFLOW_MAIN_STAGES, type WorkflowStageMeta } from './placementCotacaoWorkflow'
import type { PlacementCronogramaAtividade } from '../../../store/placementStore'

/** Uma tarefa padrão por etapa do fluxo — garante cronograma completo mesmo sem template no banco. */
export function buildDefaultAtividadeForStage(stage: WorkflowStageMeta): PlacementCronogramaAtividade {
  const idx = stage.mainFlowIndex ?? 0
  return {
    id: `workflow-stage-${stage.key}`,
    ordem: (idx + 1) * 100,
    etapaKey: stage.key,
    tarefa: stage.label,
    parentId: null,
    slaDias: idx === 0 ? 2 : 3,
    slaReferencia: idx === 0 ? 'inicio_processo' : 'apos_anterior',
    responsavelPadrao: null,
    ativo: true,
    observacoes: stage.objective,
  }
}

export function buildDefaultAtividadesPorEtapa(): PlacementCronogramaAtividade[] {
  return PLACEMENT_WORKFLOW_MAIN_STAGES.map(buildDefaultAtividadeForStage)
}

/** Mescla template do banco com defaults das etapas que ainda não têm tarefa. */
export function ensureAtividadesPorEtapaWorkflow(
  atividades: PlacementCronogramaAtividade[]
): PlacementCronogramaAtividade[] {
  const ativas = atividades.filter((a) => a.ativo !== false)
  const etapasComTarefa = new Set(
    ativas.filter((a) => !a.parentId).map((a) => a.etapaKey)
  )
  const extras: PlacementCronogramaAtividade[] = []
  for (const stage of PLACEMENT_WORKFLOW_MAIN_STAGES) {
    if (!etapasComTarefa.has(stage.key)) {
      extras.push(buildDefaultAtividadeForStage(stage))
    }
  }
  return [...ativas, ...extras]
}

export const PLACEMENT_CRONOGRAMA_ETAPAS = PLACEMENT_WORKFLOW_MAIN_STAGES
