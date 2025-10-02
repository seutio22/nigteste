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
  IconButton
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
  Info as InfoIcon
} from '@mui/icons-material'
import { useDashboardIndicators } from '../../hooks/useDashboardIndicators'
import type { PeriodType } from '../../types/dashboardIndicators'

interface DashboardIndicatorsProps {
  period: PeriodType
  showCategories?: boolean
  maxItems?: number
}

export const DashboardIndicators: React.FC<DashboardIndicatorsProps> = ({
  period,
  showCategories = true,
  maxItems
}) => {
  const theme = useTheme()
  const { indicators, indicatorsByCategory, generalStats } = useDashboardIndicators(period)

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
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            {indicator.value}
          </Typography>
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
                {indicator.change > 0 ? '+' : ''}{indicator.change}%
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
            Período anterior: {indicator.previousValue}
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
            label={items.length}
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
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 1 }}>
                  {generalStats.total}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Total de Atividades
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.success.main, mb: 1 }}>
                  {generalStats.completed}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Concluídas
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.warning.main, mb: 1 }}>
                  {generalStats.completionRate}%
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Taxa de Conclusão
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Indicadores por Categoria */}
      {showCategories ? (
        <>
          {renderCategorySection('primary', indicatorsByCategory.primary)}
          {renderCategorySection('secondary', indicatorsByCategory.secondary)}
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
