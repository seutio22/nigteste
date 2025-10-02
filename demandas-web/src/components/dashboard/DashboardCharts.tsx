import React, { useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  useTheme
} from '@mui/material'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts'
import { useDashboardIndicators } from '../../hooks/useDashboardIndicators'
import type { PeriodType } from '../../types/dashboardIndicators'

interface DashboardChartsProps {
  period: PeriodType
}

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316']

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ period }) => {
  const theme = useTheme()
  const { indicators, pageMetrics, generalStats } = useDashboardIndicators(period)

  // Dados para gráfico de pizza - Status por categoria
  const categoryData = useMemo(() => {
    const categories = {
      primary: { name: 'Principais', value: 0, color: theme.palette.primary.main },
      secondary: { name: 'Secundárias', value: 0, color: theme.palette.success.main },
      tertiary: { name: 'Administrativas', value: 0, color: theme.palette.grey[500] }
    }

    indicators.forEach(indicator => {
      categories[indicator.category].value += indicator.value
    })

    return Object.values(categories).filter(cat => cat.value > 0)
  }, [indicators, theme.palette])

  // Dados para gráfico de barras - Top 10 páginas por atividade
  const topPagesData = useMemo(() => {
    return indicators
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map(indicator => ({
        name: indicator.title,
        value: indicator.value,
        color: indicator.color
      }))
  }, [indicators])

  // Dados para gráfico de linha - Evolução por período
  const evolutionData = useMemo(() => {
    const evolution = indicators.map(indicator => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return null

      return {
        page: indicator.title,
        daily: metrics.daily.total,
        monthly: metrics.monthly.total,
        quarterly: metrics.quarterly.total
      }
    }).filter(Boolean)

    return evolution
  }, [indicators, pageMetrics])

  // Dados para gráfico de barras - Comparação de períodos
  const periodComparisonData = useMemo(() => {
    const comparison = indicators.map(indicator => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return null

      return {
        page: indicator.title,
        [period]: metrics[period].total,
        previous: period === 'daily' ? metrics.monthly.total : 
                 period === 'monthly' ? metrics.quarterly.total : 
                 metrics.quarterly.total
      }
    }).filter(Boolean)

    return comparison
  }, [indicators, pageMetrics, period])

  // Dados para gráfico de pizza - Taxa de conclusão
  const completionData = useMemo(() => {
    const total = generalStats.total
    const completed = generalStats.completed
    const pending = total - completed

    return [
      { name: 'Concluídas', value: completed, color: theme.palette.success.main },
      { name: 'Pendentes', value: pending, color: theme.palette.warning.main }
    ].filter(item => item.value > 0)
  }, [generalStats, theme.palette])

  return (
    <Box>
      {/* Gráficos de Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Gráfico de Pizza - Atividades por Categoria */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Atividades por Categoria - {period === 'daily' ? 'Hoje' : period === 'monthly' ? 'Este Mês' : 'Este Trimestre'}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico de Pizza - Taxa de Conclusão */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Taxa de Conclusão - {period === 'daily' ? 'Hoje' : period === 'monthly' ? 'Este Mês' : 'Este Trimestre'}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Gráficos de Atividades */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Gráfico de Barras - Top 10 Páginas */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Top 10 Páginas - {period === 'daily' ? 'Hoje' : period === 'monthly' ? 'Este Mês' : 'Este Trimestre'}
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topPagesData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <RechartsTooltip />
                <Bar dataKey="value" fill={theme.palette.primary.main} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Gráfico de Barras - Comparação de Períodos */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
              Comparação de Períodos
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={periodComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="page" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar 
                  dataKey={period} 
                  fill={theme.palette.primary.main} 
                  name={period === 'daily' ? 'Hoje' : period === 'monthly' ? 'Este Mês' : 'Este Trimestre'}
                />
                <Bar 
                  dataKey="previous" 
                  fill={theme.palette.grey[400]} 
                  name="Período Anterior"
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Gráfico de Linha - Evolução Temporal */}
      <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Evolução Temporal das Atividades
        </Typography>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={evolutionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="page" angle={-45} textAnchor="end" height={100} />
            <YAxis />
            <RechartsTooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="daily" 
              stroke={theme.palette.primary.main} 
              strokeWidth={2}
              name="Diário"
              dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="monthly" 
              stroke={theme.palette.success.main} 
              strokeWidth={2}
              name="Mensal"
              dot={{ fill: theme.palette.success.main, strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="quarterly" 
              stroke={theme.palette.warning.main} 
              strokeWidth={2}
              name="Trimestral"
              dot={{ fill: theme.palette.warning.main, strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  )
}
