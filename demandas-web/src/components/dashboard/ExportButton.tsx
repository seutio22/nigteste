import React, { useState } from 'react'
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material'
import {
  FileDownload,
  TableChart,
  BarChart,
  PieChart,
  TrendingUp
} from '@mui/icons-material'
import { useExcelExport } from '../../hooks/useExcelExport'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../../types/dashboardIndicators'

interface ExportButtonProps {
  indicators: DashboardIndicator[]
  pageMetrics: { [key: string]: PageMetrics }
  generalStats: {
    total: number
    completed: number
    completionRate: number
    period: PeriodType
  }
  period: PeriodType
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  indicators,
  pageMetrics,
  generalStats,
  period
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [snackbarOpen, setSnackbarOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success')
  
  const { exportToExcel } = useExcelExport()
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }
  
  const handleExport = async (type: 'complete' | 'summary' | 'charts' | 'comparison') => {
    try {
      setIsExporting(true)
      
      // Simular delay para mostrar loading
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      exportToExcel({
        indicators,
        pageMetrics,
        generalStats,
        period
      })
      
      setSnackbarMessage('Arquivo Excel exportado com sucesso!')
      setSnackbarSeverity('success')
      setSnackbarOpen(true)
    } catch (error) {
      console.error('Erro ao exportar:', error)
      setSnackbarMessage('Erro ao exportar arquivo Excel')
      setSnackbarSeverity('error')
      setSnackbarOpen(true)
    } finally {
      setIsExporting(false)
      handleClose()
    }
  }
  
  const handleSnackbarClose = () => {
    setSnackbarOpen(false)
  }
  
  return (
    <>
      <Button
        variant="contained"
        startIcon={isExporting ? <CircularProgress size={20} color="inherit" /> : <FileDownload />}
        onClick={handleClick}
        disabled={isExporting}
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
        {isExporting ? 'Exportando...' : 'Exportar Excel'}
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: {
            mt: 1,
            minWidth: 200,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }
        }}
      >
        <MenuItem onClick={() => handleExport('complete')}>
          <ListItemIcon>
            <TableChart color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Relatório Completo" 
            secondary="Todos os dados e gráficos"
          />
        </MenuItem>
        
        <MenuItem onClick={() => handleExport('summary')}>
          <ListItemIcon>
            <BarChart color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Resumo Executivo" 
            secondary="Apenas indicadores principais"
          />
        </MenuItem>
        
        <MenuItem onClick={() => handleExport('charts')}>
          <ListItemIcon>
            <PieChart color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Dados para Gráficos" 
            secondary="Dados formatados para gráficos"
          />
        </MenuItem>
        
        <MenuItem onClick={() => handleExport('comparison')}>
          <ListItemIcon>
            <TrendingUp color="primary" />
          </ListItemIcon>
          <ListItemText 
            primary="Comparação de Períodos" 
            secondary="Análise temporal dos dados"
          />
        </MenuItem>
      </Menu>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  )
}
