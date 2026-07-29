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
  CalendarViewWeek as QuarterIcon
} from '@mui/icons-material'
import type { PeriodType } from '../../types/dashboardIndicators'

interface PeriodSelectorProps {
  period: PeriodType
  onChange: (period: PeriodType) => void
  showLabel?: boolean
  /** Botões menores para caber na mesma linha de outros filtros */
  compact?: boolean
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  period,
  onChange,
  showLabel = true,
  compact = false
}) => {
  const theme = useTheme()

  const periods = [
    {
      value: 'daily' as PeriodType,
      label: 'Diário',
      icon: <TodayIcon fontSize={compact ? 'small' : 'medium'} />,
      description: 'Lançamentos de hoje'
    },
    {
      value: 'monthly' as PeriodType,
      label: 'Mensal',
      icon: <MonthIcon fontSize={compact ? 'small' : 'medium'} />,
      description: 'Lançamentos do mês'
    },
    {
      value: 'quarterly' as PeriodType,
      label: 'Trimestral',
      icon: <QuarterIcon fontSize={compact ? 'small' : 'medium'} />,
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
        size={compact ? 'small' : 'medium'}
        onChange={(_, value) => value && onChange(value)}
        aria-label="período de análise"
        sx={{
          '& .MuiToggleButton-root': {
            border: `2px solid ${theme.palette.divider}`,
            borderRadius: 2,
            px: compact ? 1.5 : 3,
            py: compact ? 0.75 : 1.5,
            minWidth: compact ? 96 : 120,
            height: compact ? 40 : undefined,
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
