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
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  LabelList,
  ReferenceLine
} from 'recharts'
import { QuantitativeAnalysisPanel } from './QuantitativeAnalysisPanel'
import type { PeriodType } from '../../types/dashboardIndicators'
import { formatIntegerPtBR } from '../../utils/formatNumber'
import { parseDateForFilter } from '../../utils/dashboardFilters'

const tooltipInt = (value: number | string | undefined) =>
  formatIntegerPtBR(typeof value === 'number' ? value : Number(value))

interface DashboardChartsProps {
  period: PeriodType
  chartPeriodComparison: Array<{ page: string; current: number; previous: number }>
  chartDailyEvolution: Array<{ dateKey: string; label: string; total: number }>
  areaId?: string
  analistaId?: string
  fromDate?: string
  toDate?: string
  userScopePending?: boolean
  ownScopeFallback?: boolean
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  period,
  chartPeriodComparison,
  chartDailyEvolution,
  areaId,
  analistaId,
  fromDate,
  toDate,
  userScopePending,
  ownScopeFallback
}) => {
  const theme = useTheme()

  const comparisonLegend = useMemo(() => {
    if (period === 'daily') {
      return { current: 'Dia selecionado', previous: 'Dia anterior' }
    }
    if (period === 'monthly') {
      return { current: 'Mês atual', previous: 'Mês anterior' }
    }
    return { current: 'Trimestre atual', previous: 'Trimestre anterior' }
  }, [period])

  /** Só seg–sex; média aritmética dos totais nesses dias (inclui dias com 0). */
  const { businessDaysEvolution, businessDaysAverage, yAxisMax } = useMemo(() => {
    const rows = chartDailyEvolution.filter((row) => {
      const d = parseDateForFilter(row.dateKey)
      if (!d || isNaN(d.getTime())) return false
      const dow = d.getDay()
      return dow >= 1 && dow <= 5
    })
    const sum = rows.reduce((s, r) => s + r.total, 0)
    const avg = rows.length > 0 ? sum / rows.length : 0
    const maxVal = rows.length > 0 ? Math.max(...rows.map((r) => r.total), avg) : avg
    const yMax = Math.max(1, Math.ceil(maxVal * 1.08))
    return { businessDaysEvolution: rows, businessDaysAverage: avg, yAxisMax: yMax }
  }, [chartDailyEvolution])

  const averageLabel = businessDaysAverage.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  })

  return (
    <Box>
      <QuantitativeAnalysisPanel
        period={period}
        areaId={areaId}
        analistaId={analistaId}
        fromDate={fromDate}
        toDate={toDate}
        userScopePending={userScopePending}
        ownScopeFallback={ownScopeFallback}
      />

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3, borderRadius: 2, height: 400 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Comparação de Períodos
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              {period === 'monthly' &&
                'Cada barra compara o mês do filtro com o mês calendário anterior.'}
              {period === 'daily' && 'Compara o dia do filtro com o dia anterior.'}
              {period === 'quarterly' &&
                'Compara o trimestre do filtro com o trimestre calendário anterior.'}
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartPeriodComparison} margin={{ top: 28, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="page" angle={-45} textAnchor="end" height={100} />
                <YAxis tickFormatter={(v) => formatIntegerPtBR(v)} />
                <RechartsTooltip formatter={(value) => [tooltipInt(value as number), 'Itens criados']} />
                <Legend />
                <Bar dataKey="current" fill={theme.palette.primary.main} name={comparisonLegend.current}>
                  <LabelList
                    dataKey="current"
                    position="top"
                    formatter={(v: number | string) =>
                      formatIntegerPtBR(typeof v === 'number' ? v : Number(v ?? 0))
                    }
                    style={{ fill: theme.palette.primary.dark, fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
                <Bar dataKey="previous" fill={theme.palette.grey[400]} name={comparisonLegend.previous}>
                  <LabelList
                    dataKey="previous"
                    position="top"
                    formatter={(v: number | string) =>
                      formatIntegerPtBR(typeof v === 'number' ? v : Number(v ?? 0))
                    }
                    style={{ fill: theme.palette.text.secondary, fontSize: 11, fontWeight: 600 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Evolução diária no período (dias úteis)
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
          Apenas segunda a sexta: total de itens criados por dia (soma de todas as páginas), no intervalo do filtro.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
          <Box component="span" sx={{ fontWeight: 600, color: theme.palette.warning.dark }}>
            Média em dias úteis: {averageLabel}
          </Box>{' '}
          (média aritmética dos totais diários, incluindo dias sem lançamentos).
        </Typography>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={businessDaysEvolution} margin={{ top: 8, right: 12, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" interval="preserveStartEnd" minTickGap={8} />
            <YAxis
              domain={[0, yAxisMax]}
              tickFormatter={(v) => formatIntegerPtBR(v)}
              allowDecimals={false}
            />
            <RechartsTooltip
              formatter={(value) => [tooltipInt(value as number), 'Total do dia']}
              labelFormatter={(_, payload) => {
                const p = payload?.[0]?.payload as { dateKey?: string } | undefined
                return p?.dateKey ? `Data: ${p.dateKey}` : ''
              }}
            />
            <Legend />
            <ReferenceLine
              y={businessDaysAverage}
              stroke={theme.palette.warning.main}
              strokeDasharray="6 4"
              strokeWidth={2}
              label={{
                value: `Média ${averageLabel}`,
                position: 'insideTopRight',
                fill: theme.palette.warning.dark,
                fontSize: 12,
                fontWeight: 600
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke={theme.palette.primary.main}
              strokeWidth={2}
              name="Itens criados (dias úteis)"
              dot={{ fill: theme.palette.primary.main, strokeWidth: 2, r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  )
}
