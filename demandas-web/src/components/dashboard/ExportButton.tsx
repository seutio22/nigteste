import React, { useState } from 'react'
import { Button, CircularProgress } from '@mui/material'
import { FileDownload } from '@mui/icons-material'
import { ExportDashboardModal } from './ExportDashboardModal'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../../types/dashboardIndicators'
import type { DashboardPdfMeta } from '../../utils/dashboardPdfExport'
import type { TempoExecucaoMetrics } from '../../hooks/useAdvancedIndicators'

interface ExportButtonProps {
  indicators: DashboardIndicator[]
  pageMetrics: { [key: string]: PageMetrics }
  generalStats: {
    total: number
    completed: number
    canceled: number
    inProgress: number
    completionRate: number
    period: PeriodType
  }
  period: PeriodType
  /** Rótulos de filtros para o cabeçalho do PDF */
  exportMeta?: DashboardPdfMeta
  chartPeriodComparison?: Array<{ page: string; current: number; previous: number }>
  chartDailyEvolution?: Array<{ label: string; total: number }>
  tempoExecucaoMetrics?: TempoExecucaoMetrics[]
  disabled?: boolean
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  indicators,
  pageMetrics,
  generalStats,
  period,
  exportMeta,
  chartPeriodComparison,
  chartDailyEvolution,
  tempoExecucaoMetrics,
  disabled = false
}) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="contained"
        startIcon={<FileDownload />}
        onClick={() => setOpen(true)}
        disabled={disabled}
        sx={{
          backgroundColor: '#00A649',
          '&:hover': {
            backgroundColor: '#00A649'
          },
          fontWeight: 600,
          textTransform: 'none',
          px: 3,
          py: 1.5
        }}
      >
        Exportar
      </Button>

      <ExportDashboardModal
        open={open}
        onClose={() => setOpen(false)}
        indicators={indicators}
        pageMetrics={pageMetrics}
        generalStats={generalStats}
        period={period}
        exportMeta={exportMeta}
        chartPeriodComparison={chartPeriodComparison}
        chartDailyEvolution={chartDailyEvolution}
        tempoExecucaoMetrics={tempoExecucaoMetrics}
        disabled={disabled}
      />
    </>
  )
}
