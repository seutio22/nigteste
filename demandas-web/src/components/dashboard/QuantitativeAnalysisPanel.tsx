import React from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme
} from '@mui/material'
import { useQuantitativeAnalysis } from '../../hooks/useQuantitativeAnalysis'
import type { PeriodType } from '../../types/dashboardIndicators'
import { formatIntegerPtBR } from '../../utils/formatNumber'

function periodLabel(period: PeriodType): string {
  if (period === 'daily') return 'hoje'
  if (period === 'monthly') return 'no mês do filtro'
  return 'no trimestre do filtro'
}

interface QuantitativeAnalysisPanelProps {
  period: PeriodType
  areaId?: string
  analistaId?: string
  fromDate?: string
  toDate?: string
  userScopePending?: boolean
}

export const QuantitativeAnalysisPanel: React.FC<QuantitativeAnalysisPanelProps> = ({
  period,
  areaId,
  analistaId,
  fromDate,
  toDate,
  userScopePending
}) => {
  const theme = useTheme()
  const modules = useQuantitativeAnalysis({
    areaId,
    analistaId,
    fromDate,
    toDate,
    userScopePending
  })

  return (
    <Paper sx={{ p: 3, borderRadius: 2, mb: 4 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
        Métricas por aba
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 3 }}>
        Soma dos campos numéricos de cada módulo, respeitando área, analista e datas do filtro (
        {periodLabel(period)}).
      </Typography>

      <Grid container spacing={2}>
        {modules.map((mod) => (
          <Grid item xs={12} sm={6} md={4} key={mod.id}>
            <TableContainer
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              <Table size="small" padding="none">
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.primary.main }}>
                    <TableCell colSpan={2} sx={{ color: 'primary.contrastText', fontWeight: 700, py: 1.25, px: 1.5 }}>
                      {mod.title}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: theme.palette.grey[100] }}>
                    <TableCell sx={{ fontWeight: 600, py: 0.75, px: 1.5 }}>Campo</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 0.75, px: 1.5 }}>
                      Total
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mod.metrics.map((m) => (
                    <TableRow key={m.label} hover>
                      <TableCell sx={{ py: 1, px: 1.5, fontSize: '0.8125rem' }}>{m.label}</TableCell>
                      <TableCell align="right" sx={{ py: 1, px: 1.5, fontWeight: 600 }}>
                        {formatIntegerPtBR(Math.round(m.value))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        ))}
      </Grid>
    </Paper>
  )
}
