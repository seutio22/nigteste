import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  IconButton,
  LinearProgress
} from '@mui/material'
import {
  Close as CloseIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Download as DownloadIcon
} from '@mui/icons-material'
import { useExcelExport } from '../../hooks/useExcelExport'
import {
  exportDashboardToPdfAsync,
  type DashboardPdfMeta,
  type DashboardPdfSections
} from '../../utils/dashboardPdfExport'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../../types/dashboardIndicators'
import type { TempoExecucaoMetrics } from '../../hooks/useAdvancedIndicators'

export interface ExportDashboardModalProps {
  open: boolean
  onClose: () => void
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
  exportMeta?: DashboardPdfMeta
  chartPeriodComparison?: Array<{ page: string; current: number; previous: number }>
  chartDailyEvolution?: Array<{ label: string; total: number }>
  tempoExecucaoMetrics?: TempoExecucaoMetrics[]
  disabled?: boolean
}

const defaultSections: DashboardPdfSections = {
  summary: true,
  detailed: true,
  charts: true,
  comparison: true,
  vectorCharts: true,
  screenCapture: true
}

export const ExportDashboardModal: React.FC<ExportDashboardModalProps> = ({
  open,
  onClose,
  indicators,
  pageMetrics,
  generalStats,
  period,
  exportMeta,
  chartPeriodComparison = [],
  chartDailyEvolution = [],
  tempoExecucaoMetrics = [],
  disabled = false
}) => {
  const { exportToExcel } = useExcelExport()
  const [format, setFormat] = useState<'pdf' | 'excel'>('pdf')
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [sections, setSections] = useState<DashboardPdfSections>(defaultSections)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')

  const handleClose = () => {
    if (!exporting) onClose()
  }

  const handleExport = async () => {
    setError('')
    try {
      setExporting(true)
      if (format === 'pdf') {
        await exportDashboardToPdfAsync({
          indicators,
          pageMetrics,
          generalStats,
          period,
          meta: exportMeta,
          sections,
          orientation,
          chartPeriodComparison,
          chartDailyEvolution,
          tempoExecucaoMetrics
        })
      } else {
        await new Promise((r) => setTimeout(r, 200))
        exportToExcel({ indicators, pageMetrics, generalStats, period })
      }
      onClose()
    } catch (e) {
      console.error(e)
      setError('Não foi possível gerar o arquivo. Tente novamente.')
    } finally {
      setExporting(false)
    }
  }

  const toggleSection = (key: keyof DashboardPdfSections) => {
    setSections((s) => ({ ...s, [key]: !s[key] }))
  }

  const pdfSectionsValid =
    sections.summary ||
    sections.detailed ||
    sections.charts ||
    sections.comparison ||
    sections.vectorCharts ||
    sections.screenCapture

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6" component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DownloadIcon color="primary" />
            Exportar relatório do Dashboard
          </Typography>
          <IconButton onClick={handleClose} size="small" disabled={exporting}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          PDF no padrão institucional (como em Projetos): cabeçalho, cores NIG, gráficos de barras gerados no PDF,
          captura dos indicadores e gráficos da tela e tabelas detalhadas.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        {exporting && <LinearProgress sx={{ mb: 2 }} />}

        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Formato</InputLabel>
          <Select
            label="Formato"
            value={format}
            onChange={(e) => setFormat(e.target.value as 'pdf' | 'excel')}
            disabled={exporting || disabled}
          >
            <MenuItem value="pdf">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PdfIcon fontSize="small" /> PDF (relatório)
              </Box>
            </MenuItem>
            <MenuItem value="excel">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ExcelIcon fontSize="small" /> Excel (planilhas)
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {format === 'pdf' && (
          <>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Orientação</InputLabel>
              <Select
                label="Orientação"
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                disabled={exporting || disabled}
              >
                <MenuItem value="landscape">Paisagem (recomendado)</MenuItem>
                <MenuItem value="portrait">Retrato</MenuItem>
              </Select>
            </FormControl>

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Conteúdo do PDF
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sections.vectorCharts}
                    onChange={() => toggleSection('vectorCharts')}
                    disabled={exporting || disabled}
                  />
                }
                label="Gráficos no PDF (comparação, evolução, tempo de execução)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sections.screenCapture}
                    onChange={() => toggleSection('screenCapture')}
                    disabled={exporting || disabled}
                  />
                }
                label="Captura visual dos indicadores e gráficos (como na tela)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sections.summary}
                    onChange={() => toggleSection('summary')}
                    disabled={exporting || disabled}
                  />
                }
                label="Resumo executivo (tabela)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sections.detailed}
                    onChange={() => toggleSection('detailed')}
                    disabled={exporting || disabled}
                  />
                }
                label="Dados detalhados por período"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sections.charts}
                    onChange={() => toggleSection('charts')}
                    disabled={exporting || disabled}
                  />
                }
                label="Dados para gráficos (tabela)"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={sections.comparison}
                    onChange={() => toggleSection('comparison')}
                    disabled={exporting || disabled}
                  />
                }
                label="Comparação de períodos (tabela)"
              />
            </FormGroup>
          </>
        )}

        {format === 'excel' && (
          <Typography variant="body2" color="text.secondary">
            Será gerado um arquivo .xlsx com as abas: Resumo executivo, Dados detalhados, Dados para gráficos e
            Comparação de períodos.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={exporting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleExport}
          disabled={exporting || disabled || (format === 'pdf' && !pdfSectionsValid)}
          startIcon={format === 'pdf' ? <PdfIcon /> : <ExcelIcon />}
          sx={{
            backgroundColor: '#00A649',
            '&:hover': { backgroundColor: '#00A649' },
            fontWeight: 600,
            textTransform: 'none'
          }}
        >
          {exporting ? 'Gerando…' : format === 'pdf' ? 'Baixar PDF' : 'Baixar Excel'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
