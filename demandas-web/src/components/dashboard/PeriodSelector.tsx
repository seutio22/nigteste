import React from 'react'
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
  alpha
} from '@mui/material'
import {
  Today as TodayIcon,
  CalendarMonth as MonthIcon,
  CalendarViewQuarter as QuarterIcon
} from '@mui/icons-material'
import type { PeriodType } from '../../types/dashboardIndicators'

interface PeriodSelectorProps {
  period: PeriodType
  onChange: (period: PeriodType) => void
  showLabel?: boolean
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  period,
  onChange,
  showLabel = true
}) => {
  const theme = useTheme()

  const periods = [
    {
      value: 'daily' as PeriodType,
      label: 'Diário',
      icon: <TodayIcon />,
      description: 'Lançamentos de hoje'
    },
    {
      value: 'monthly' as PeriodType,
      label: 'Mensal',
      icon: <MonthIcon />,
      description: 'Lançamentos do mês'
    },
    {
      value: 'quarterly' as PeriodType,
      label: 'Trimestral',
      icon: <QuarterIcon />,
      description: 'Lançamentos do trimestre'
    }
  ]

  return (
    <Box>
      {showLabel && (
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.text.primary }}>
          Período de Análise
        </Typography>
      )}
      
      <ToggleButtonGroup
        value={period}
        exclusive
        onChange={(_, value) => value && onChange(value)}
        aria-label="período de análise"
        sx={{
          '& .MuiToggleButton-root': {
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 2,
            px: 3,
            py: 1.5,
            minWidth: 120,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              borderColor: theme.palette.primary.main
            },
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderColor: theme.palette.primary.main,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark
              }
            }
          }
        }}
      >
        {periods.map((p) => (
          <ToggleButton
            key={p.value}
            value={p.value}
            aria-label={p.label}
            title={p.description}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {p.icon}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {p.label}
              </Typography>
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  )
}
