import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  useTheme,
  alpha,
  Tooltip,
  IconButton,
  Divider,
  Stack
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Checklist as ChecklistIcon
} from '@mui/icons-material'
import type { DashboardIndicator, PeriodType } from '../../types/dashboardIndicators'
import { formatIntegerPtBR } from '../../utils/formatNumber'

interface DashboardIndicatorsProps {
  period: PeriodType
  indicators: DashboardIndicator[]
  indicatorsByCategory: {
    primary: DashboardIndicator[]
    secondary: DashboardIndicator[]
    tertiary: DashboardIndicator[]
  }
  /** Painel de projetos (cronograma + logs) no lugar da antiga secção «Páginas Secundárias». */
  projectsPanel?: React.ReactNode
  generalStats: {
    total: number
    completed: number
    canceled: number
    inProgress: number
    completionRate: number
    period: PeriodType
  }
  showCategories?: boolean
  maxItems?: number
}

export const DashboardIndicators: React.FC<DashboardIndicatorsProps> = ({
  period,
  indicators,
  indicatorsByCategory,
  projectsPanel,
  generalStats,
  showCategories = true,
  maxItems
}) => {
  const theme = useTheme()

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUpIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
      case 'decrease':
        return <TrendingDownIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
      default:
        return <TrendingFlatIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
    }
  }

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return theme.palette.success.main
      case 'decrease':
        return theme.palette.error.main
      default:
        return theme.palette.grey[500]
    }
  }

  const renderIndicatorCard = (indicator: any) => (
    <Card
      key={indicator.id}
      sx={{
        height: '100%',
        transition: 'all 0.3s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: indicator.color }}>
            {indicator.title}
          </Typography>
          <Chip
            label={period === 'daily' ? 'Hoje' : period === 'monthly' ? 'Mês' : 'Trimestre'}
            size="small"
            sx={{ 
              backgroundColor: alpha(indicator.color, 0.1),
              color: indicator.color,
              fontWeight: 500
            }}
            title={`Filtrado por período: ${period === 'daily' ? 'Hoje' : period === 'monthly' ? 'Este mês' : 'Este trimestre'}`}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Tooltip 
            title={`Total filtrado por período: ${period === 'daily' ? 'Hoje' : period === 'monthly' ? 'Este mês' : 'Este trimestre'}. Diferente da Home que mostra o total geral.`}
            arrow
          >
            <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary, cursor: 'help' }}>
              {formatIntegerPtBR(indicator.value)}
            </Typography>
          </Tooltip>
          {indicator.change !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {getChangeIcon(indicator.changeType)}
              <Typography
                variant="body2"
                sx={{
                  color: getChangeColor(indicator.changeType),
                  fontWeight: 600
                }}
              >
                {indicator.change > 0 ? '+' : ''}{formatIntegerPtBR(indicator.change)}%
              </Typography>
            </Box>
          )}
        </Box>

        {indicator.description && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {indicator.description}
          </Typography>
        )}

        {indicator.previousValue !== undefined && (
          <Typography variant="caption" color="text.secondary">
            {indicator.comparisonPeriodLabel
              ? `Base (${indicator.comparisonPeriodLabel}): ${formatIntegerPtBR(indicator.previousValue)}`
              : `Período anterior: ${formatIntegerPtBR(indicator.previousValue)}`}
          </Typography>
        )}
      </CardContent>
    </Card>
  )

  const renderCategorySection = (category: string, items: any[]) => {
    if (items.length === 0) return null

    const categoryTitle = {
      primary: 'Páginas Principais',
      secondary: 'Páginas Secundárias',
      tertiary: 'Páginas Administrativas'
    }[category as keyof typeof categoryTitle] || category

    const categoryColor = {
      primary: theme.palette.primary.main,
      secondary: theme.palette.success.main,
      tertiary: theme.palette.grey[500]
    }[category as keyof typeof categoryColor] || theme.palette.grey[500]

    return (
      <Box key={category} sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: categoryColor, mr: 1 }}>
            {categoryTitle}
          </Typography>
          <Chip
            label={formatIntegerPtBR(items.length)}
            size="small"
            sx={{ 
              backgroundColor: alpha(categoryColor, 0.1),
              color: categoryColor
            }}
          />
        </Box>
        
        <Grid container spacing={2}>
          {items.slice(0, maxItems).map((indicator) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={indicator.id}>
              {renderIndicatorCard(indicator)}
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  return (
    <Box>
      {/* Estatísticas Gerais */}
      <Card sx={{ mb: 4, background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)` }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
              Resumo Geral - {period === 'daily' ? 'Hoje' : period === 'monthly' ? 'Este Mês' : 'Este Trimestre'}
            </Typography>
            <Tooltip title="Indicadores de todas as páginas do sistema">
              <IconButton size="small">
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>
          
          <Stack
            direction="row"
            divider={<Divider orientation="vertical" flexItem sx={{ opacity: 0.7 }} />}
            sx={{
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              px: 1,
              py: 0.5,
              flexWrap: { xs: 'wrap', lg: 'nowrap' }
            }}
          >
            <Box sx={{ minWidth: 150, flex: '1 1 160px' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <ChecklistIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.primary.main }}>
                  {formatIntegerPtBR(generalStats.total)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                Total
              </Typography>
            </Box>

            <Box sx={{ minWidth: 150, flex: '1 1 160px' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <AssignmentTurnedInIcon sx={{ color: theme.palette.success.main }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.success.main }}>
                  {formatIntegerPtBR(generalStats.completed)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                Concluídas (produção)
              </Typography>
            </Box>

            <Box sx={{ minWidth: 170, flex: '1 1 180px' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <CancelIcon sx={{ color: theme.palette.error.main }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.error.main }}>
                  {formatIntegerPtBR(generalStats.canceled)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                Canceladas / Transf.
              </Typography>
            </Box>

            <Box sx={{ minWidth: 150, flex: '1 1 160px' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                <HourglassEmptyIcon sx={{ color: theme.palette.info.main }} />
                <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.info.main }}>
                  {formatIntegerPtBR(generalStats.inProgress)}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                Em andamento
              </Typography>
            </Box>

            <Tooltip
              title="Taxa de produção: Concluídas ÷ (Total − Canceladas/Transf.)."
              arrow
            >
              <Box sx={{ minWidth: 180, flex: '1 1 200px', cursor: 'help' }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
                  <InfoIcon sx={{ color: theme.palette.warning.main }} />
                  <Typography variant="h5" sx={{ fontWeight: 800, color: theme.palette.warning.main }}>
                    {formatIntegerPtBR(generalStats.completionRate)}%
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                  Taxa (produção)
                </Typography>
              </Box>
            </Tooltip>
          </Stack>
        </CardContent>
      </Card>

      {/* Indicadores por Categoria */}
      {showCategories ? (
        <>
          {renderCategorySection('primary', indicatorsByCategory.primary)}
          {projectsPanel ? <Box sx={{ mb: 4 }}>{projectsPanel}</Box> : null}
          {renderCategorySection('tertiary', indicatorsByCategory.tertiary)}
        </>
      ) : (
        <Grid container spacing={2}>
          {indicators.slice(0, maxItems).map((indicator) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={indicator.id}>
              {renderIndicatorCard(indicator)}
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
