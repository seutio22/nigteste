import React, { useState } from 'react'
import { Box, Button, Collapse, Stack, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import type { WorkflowChecklistItem } from './placementWorkflowAdvance'
import { placementNavButtonSx } from './placementWorkflowNav'

type Props = {
  items: WorkflowChecklistItem[]
  title?: string
}

export function PlacementWorkflowChecklistCompact({ items, title = 'Requisitos da etapa' }: Props) {
  const [expanded, setExpanded] = useState(false)
  const pending = items.filter((i) => !i.done)
  const doneCount = items.filter((i) => i.done).length

  if (items.length === 0) return null

  if (pending.length === 0) {
    return (
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{
          px: 1.5,
          py: 1,
          borderRadius: 2,
          bgcolor: 'success.light',
          border: '1px solid',
          borderColor: 'rgba(0, 166, 73, 0.2)',
        }}
      >
        <CheckCircleOutlineIcon sx={{ color: 'success.main', fontSize: 22 }} />
        <Typography variant="body2" sx={{ color: 'success.dark', fontWeight: 600 }}>
          Pronto para avançar
        </Typography>
      </Stack>
    )
  }

  return (
    <Box sx={{ minWidth: 0, width: { xs: '100%', lg: 'auto' } }}>
      <Button
        variant="outlined"
        color="warning"
        onClick={() => setExpanded((v) => !v)}
        startIcon={<WarningAmberOutlinedIcon />}
        endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        sx={{
          ...placementNavButtonSx,
          width: { xs: '100%', lg: 'auto' },
          borderColor: 'warning.main',
          color: 'warning.dark',
          bgcolor: 'warning.light',
          '&:hover': { bgcolor: 'rgba(229, 184, 0, 0.22)', borderColor: 'warning.dark' },
        }}
      >
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
            {pending.length} pendência(s)
          </Typography>
          <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'warning.dark', opacity: 0.5 }} />
          <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>
            {doneCount}/{items.length} ok
          </Typography>
        </Box>
      </Button>
      <Collapse in={expanded}>
        <Box
          sx={{
            mt: 1.25,
            p: 2,
            bgcolor: 'grey.50',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            maxWidth: 520,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            {title}
          </Typography>
          <Stack spacing={0.75}>
            {pending.map((item) => (
              <Stack key={item.id} direction="row" spacing={1.25} alignItems="flex-start">
                <WarningAmberOutlinedIcon sx={{ color: 'warning.main', fontSize: 18, mt: 0.2 }} />
                <Typography variant="body2" color="text.primary" sx={{ lineHeight: 1.45 }}>
                  {item.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Box>
  )
}
