import React, { useEffect, useRef } from 'react'
import { Box, Stack, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

export type WorkflowStepState = 'completed' | 'active' | 'upcoming'

export type WorkflowStepItem = {
  id: string
  label: string
  description?: string
  stepNumber: number
  state: WorkflowStepState
}

type Props = {
  steps: WorkflowStepItem[]
  onStepClick?: (id: string) => void
  /** Rótulo acima da trilha (ex.: «Etapas principais»). */
  heading?: string
}

function stepStyles(state: WorkflowStepState) {
  if (state === 'active') {
    return {
      borderColor: 'primary.main',
      bgcolor: 'primary.main',
      color: 'primary.contrastText',
      badgeBg: 'primary.light',
      badgeColor: 'primary.contrastText',
      shadow: '0 4px 14px rgba(0, 37, 97, 0.28)',
    }
  }
  if (state === 'completed') {
    return {
      borderColor: 'success.main',
      bgcolor: 'success.light',
      color: 'success.dark',
      badgeBg: 'success.main',
      badgeColor: 'success.contrastText',
      shadow: 'none',
    }
  }
  return {
    borderColor: 'grey.300',
    bgcolor: 'background.paper',
    color: 'text.secondary',
    badgeBg: 'grey.100',
    badgeColor: 'text.secondary',
    shadow: 'none',
  }
}

export function PlacementWorkflowStepsRail({ steps, onStepClick, heading }: Props) {
  const clickable = !!onStepClick
  const railRef = useRef<HTMLDivElement>(null)
  const activeId = steps.find((s) => s.state === 'active')?.id

  useEffect(() => {
    if (!activeId || !railRef.current) return
    const el = railRef.current.querySelector(`[data-step-id="${activeId}"]`)
    if (el && 'scrollIntoView' in el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeId])

  return (
    <Box>
      {heading && (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mb: 1,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'text.secondary',
          }}
        >
          {heading}
        </Typography>
      )}
      <Box
        ref={railRef}
        sx={{
          display: 'flex',
          gap: 1.25,
          overflowX: 'auto',
          pb: 0.5,
          mx: -0.5,
          px: 0.5,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {steps.map((step) => {
          const styles = stepStyles(step.state)
          const isActive = step.state === 'active'
          const isCompleted = step.state === 'completed'

          return (
            <Box
              key={step.id}
              data-step-id={step.id}
              component={clickable ? 'button' : 'div'}
              type={clickable ? 'button' : undefined}
              onClick={clickable ? () => onStepClick?.(step.id) : undefined}
              sx={{
                flex: '0 0 auto',
                minWidth: { xs: 128, sm: 148 },
                maxWidth: 180,
                scrollSnapAlign: 'start',
                border: '2px solid',
                borderColor: styles.borderColor,
                borderRadius: 2.5,
                bgcolor: styles.bgcolor,
                color: styles.color,
                boxShadow: styles.shadow,
                p: 1.25,
                textAlign: 'left',
                cursor: clickable ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                ...(clickable && {
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0, 37, 97, 0.15)',
                  },
                }),
              }}
            >
              <Stack direction="row" spacing={1} alignItems="flex-start">
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    bgcolor: isActive ? 'rgba(255,255,255,0.22)' : styles.badgeBg,
                    color: isActive ? 'primary.contrastText' : styles.badgeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.8rem',
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? (
                    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
                  ) : (
                    step.stepNumber
                  )}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isActive ? 800 : 600,
                      lineHeight: 1.25,
                      color: 'inherit',
                      fontSize: isActive ? '0.84rem' : '0.8rem',
                    }}
                  >
                    {step.label}
                  </Typography>
                  {step.description && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.35,
                        lineHeight: 1.3,
                        color: isActive ? 'rgba(255,255,255,0.88)' : 'text.secondary',
                        opacity: isActive ? 1 : 0.9,
                      }}
                    >
                      {step.description}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
