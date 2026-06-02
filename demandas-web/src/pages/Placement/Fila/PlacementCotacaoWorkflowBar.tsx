import React from 'react'
import { Box, Step, StepLabel, Stepper, Typography } from '@mui/material'
import { PLACEMENT_WORKFLOW_MAIN_STAGES, workflowStageIndex } from './placementCotacaoWorkflow'
import { isRascunhoStatus } from './placementCotacaoStatus'

type Props = {
  status: string
  compact?: boolean
}

export function PlacementCotacaoWorkflowBar({ status, compact }: Props) {
  if (isRascunhoStatus(status)) {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Esta cotação ainda é um rascunho. Use «Iniciar processo» para entrar no workflow da fila.
        </Typography>
      </Box>
    )
  }

  const activeStep = Math.min(
    workflowStageIndex(status),
    PLACEMENT_WORKFLOW_MAIN_STAGES.length - 1
  )

  return (
    <Box sx={{ py: compact ? 0 : 1 }}>
      {!compact && (
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
          Workflow do processo
        </Typography>
      )}
      <Stepper activeStep={activeStep} alternativeLabel={!compact}>
        {PLACEMENT_WORKFLOW_MAIN_STAGES.map((stage) => (
          <Step
            key={stage.status}
            completed={
              stage.mainFlowIndex != null && stage.mainFlowIndex < activeStep
            }
          >
            <StepLabel
              optional={
                !compact ? (
                  <Typography variant="caption" color="text.secondary">
                    {stage.description}
                  </Typography>
                ) : undefined
              }
            >
              {stage.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  )
}
