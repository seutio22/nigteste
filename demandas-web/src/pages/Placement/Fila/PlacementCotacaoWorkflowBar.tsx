import React from 'react'
import { Box } from '@mui/material'
import { PLACEMENT_WORKFLOW_MAIN_STAGES, workflowStageIndex } from './placementCotacaoWorkflow'
import { isRascunhoStatus } from './placementCotacaoStatus'
import { PlacementWorkflowSectionTitle } from './placementWorkflowNav'
import { PlacementWorkflowStepsRail } from './PlacementWorkflowStepsRail'
import RouteIcon from '@mui/icons-material/Route'

type Props = {
  status: string
  compact?: boolean
}

export function PlacementCotacaoWorkflowBar({ status, compact }: Props) {
  if (isRascunhoStatus(status)) {
    return null
  }

  const activeStep = Math.min(
    workflowStageIndex(status),
    PLACEMENT_WORKFLOW_MAIN_STAGES.length - 1
  )

  const steps = PLACEMENT_WORKFLOW_MAIN_STAGES.map((stage, index) => ({
    id: stage.key,
    label: stage.label,
    description: compact ? stage.description : undefined,
    stepNumber: (stage.mainFlowIndex ?? index) + 1,
    state:
      index < activeStep
        ? ('completed' as const)
        : index === activeStep
          ? ('active' as const)
          : ('upcoming' as const),
  }))

  return (
    <Box sx={{ mb: compact ? 2.5 : 1 }}>
      {compact && (
        <PlacementWorkflowSectionTitle title="Etapas do processo" icon={<RouteIcon fontSize="small" />} />
      )}
      <PlacementWorkflowStepsRail steps={steps} heading={compact ? undefined : 'Etapas principais'} />
    </Box>
  )
}
