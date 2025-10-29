import React, { useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  useTheme,
  alpha,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Button
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  AttachMoney as MoneyIcon,
  CalendarToday as CalendarIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { useMasterDataStore } from '../store/masterDataStore'
import { useDemandStore } from '../store/demandStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useMaillingStore } from '../store/maillingStore'
import { useDashboardStore } from '../store/dashboardStore'
import { useReportStore } from '../store/reportStore'
import { DashboardIndicators } from '../components/dashboard/DashboardIndicators'
import { DashboardCharts } from '../components/dashboard/DashboardCharts'
import { ExportButton } from '../components/dashboard/ExportButton'
import { PeriodSelector } from '../components/dashboard/PeriodSelector'
import { useDashboardIndicators } from '../hooks/useDashboardIndicators'
import type { PeriodType } from '../types/dashboardIndicators'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316']

export default function DashboardPage() {
  const theme = useTheme()
  const masterDataStore = useMasterDataStore()
  const demandStore = useDemandStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const maillingStore = useMaillingStore()
  const dashboardStore = useDashboardStore()
  const reportStore = useReportStore()

  // Filtros
  const [areaId, setAreaId] = useState('')
  const [analistaId, setAnalistaId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [indicatorPeriod, setIndicatorPeriod] = useState<PeriodType>('daily')
  
  // Hook para indicadores do dashboard
  const { indicators, pageMetrics, generalStats } = useDashboardIndicators(indicatorPeriod)

  // Função para filtrar por data
  const inRange = (iso?: string) => {
    if (!iso) return true
    const t = new Date(iso).getTime()
    if (fromDate && t < new Date(fromDate).getTime()) return false
    if (toDate && t > new Date(toDate + 'T23:59:59').getTime()) return false
    return true
  }

  // Dados filtrados
  const demandasFiltradas = useMemo(() => 
    demandStore.items.filter(d => 
      (!areaId || d.area === areaId) && 
      (!analistaId || d.analista === analistaId) && 
      inRange(d.dataInicio || d.createdAt)
    ), 
    [demandStore.items, areaId, analistaId, fromDate, toDate]
  )

  const validacoesFiltradas = useMemo(() => 
    validationStore.items.filter(v => 
      (!analistaId || v.analista === analistaId) && 
      inRange(v.dataInicio)
    ), 
    [validationStore.items, analistaId, fromDate, toDate]
  )

  const reajustesFiltrados = useMemo(() => 
    reajusteStore.items.filter(r => 
      (!analistaId || r.responsavelAnalista === analistaId) && 
      inRange(r.createdAt)
    ), 
    [reajusteStore.items, analistaId, fromDate, toDate]
  )

  const maillingFiltrados = useMemo(() => 
    maillingStore.contacts.filter(m => 
      inRange(m.createdAt)
    ), 
    [maillingStore.contacts, fromDate, toDate]
  )

  // Carregar dados automaticamente quando a página é carregada
  React.useEffect(() => {
    console.log('🔍 Dashboard: Carregando dados da API...')
    
    // Carregar dados mestres se necessário
    // Dados mestres são carregados apenas na página Dados Mestres
    // if (masterDataStore.analistas.length === 0) {
    //   console.log('🔍 Dashboard: Dados mestres vazios, chamando syncFromApi...')
    //   masterDataStore.syncFromApi?.()
    // }
    
    // Carregar dados das demandas se necessário
    if (demandStore.items.length === 0) {
      console.log('🔍 Dashboard: Demandas vazias, chamando syncFromApi...')
      demandStore.syncFromApi()
    }
    
    // Carregar dados de validação se necessário
    if (validationStore.items.length === 0) {
      console.log('🔍 Dashboard: Validações vazias, chamando syncFromApi...')
      validationStore.syncFromApi()
    }
    
    // Carregar dados de reajuste se necessário
    if (reajusteStore.items.length === 0) {
      console.log('🔍 Dashboard: Reajustes vazios, chamando syncFromApi...')
      reajusteStore.syncFromApi()
    }
    
    // Carregar dados do dashboard se necessário
    if (dashboardStore.dashboards.length === 0) {
      console.log('🔍 Dashboard: Dashboards vazios, chamando syncFromApi...')
      dashboardStore.syncFromApi()
    }
    
    // CORREÇÃO: Carregar dados de analytics se necessário
    if (reportStore.items.length === 0) {
      console.log('🔍 Dashboard: Analytics vazios, chamando syncFromApi...')
      reportStore.syncFromApi()
    }
  }, [])

  // Estatísticas principais
  const totalDemandas = demandasFiltradas.length
  const totalValidacoes = validacoesFiltradas.length
  const totalReajustes = reajustesFiltrados.length
  const totalMailling = maillingFiltrados.length

  // Status das demandas
  const demandasPorStatus = useMemo(() => {
    const map = new Map<string, number>()
    demandasFiltradas.forEach(d => map.set(d.status, (map.get(d.status) || 0) + 1))
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [demandasFiltradas])

  // Status das validações
  const validacoesPorStatus = useMemo(() => {
    const map = new Map<string, number>()
    validacoesFiltradas.forEach(v => {
      const key = v.status || 'Pendente'
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [validacoesFiltradas])

  // Status dos reajustes
  const reajustesPorStatus = useMemo(() => {
    const map = new Map<string, number>()
    reajustesFiltrados.forEach(r => {
      const key = r.status || 'Pendente'
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [reajustesFiltrados])

  // Status do mailling
  const maillingPorStatus = useMemo(() => {
    const map = new Map<string, number>()
    maillingFiltrados.forEach(m => {
      const key = 'Ativo' // Status padrão para mailling
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [maillingFiltrados])

  // Demandas por área
  const demandasPorArea = useMemo(() => {
    const map = new Map<string, number>()
    demandasFiltradas.forEach(d => {
      const name = masterDataStore.areas.find(a => a.id === d.area)?.nome || 'Sem área'
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
  }, [demandasFiltradas, masterDataStore.areas])

  // Evolução mensal das demandas
  const evolucaoMensal = useMemo(() => {
    const map = new Map<string, number>()
    demandasFiltradas.forEach(d => {
      const dt = d.dataInicio || d.createdAt
      const k = dt ? new Date(dt).toISOString().slice(0, 7) : '—'
      map.set(k, (map.get(k) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, total]) => ({ month, total }))
  }, [demandasFiltradas])

  // Valores dos reajustes
  const valoresReajuste = useMemo(() => {
    const total = reajustesFiltrados.reduce((sum, r) => sum + (r.total || 0), 0)
    const media = reajustesFiltrados.length > 0 ? total / reajustesFiltrados.length : 0
    return { total, media }
  }, [reajustesFiltrados])

  // Cards de estatísticas
  const statsCards = [
    {
      title: 'Total de Demandas',
      value: totalDemandas,
      icon: TrendingUpIcon,
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1)
    },
    {
      title: 'Validações Pendentes',
      value: validacoesFiltradas.filter(v => v.status === 'Pendente').length,
      icon: ScheduleIcon,
      color: theme.palette.warning.main,
      bgColor: alpha(theme.palette.warning.main, 0.1)
    },
    {
      title: 'Reajustes Ativos',
      value: reajustesFiltrados.filter(r => r.status === 'Ativo').length,
      icon: WarningIcon,
      color: theme.palette.error.main,
      bgColor: alpha(theme.palette.error.main, 0.1)
    },
    {
      title: 'Contatos Mailling',
      value: totalMailling,
      icon: MoneyIcon,
      color: theme.palette.info.main,
      bgColor: alpha(theme.palette.info.main, 0.1)
    }
  ]

  const limparFiltros = () => {
    setAreaId('')
    setAnalistaId('')
    setFromDate('')
    setToDate('')
  }

  return (
    <Box sx={{ p: 3, backgroundColor: theme.palette.grey[50], minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
            Dashboard Executivo
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Última atualização: {new Date().toLocaleString('pt-BR')}
            </Typography>
            <Tooltip title="Atualizar dados">
              <IconButton size="small">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Visão geral do sistema de gestão de demandas, validações e reajustes
        </Typography>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <FilterIcon color="action" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filtros
          </Typography>
        </Box>
        
        {/* Seletor de Período para Indicadores */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <PeriodSelector
            period={indicatorPeriod}
            onChange={setIndicatorPeriod}
            showLabel={true}
          />
          <ExportButton
            indicators={indicators}
            pageMetrics={pageMetrics}
            generalStats={generalStats}
            period={indicatorPeriod}
          />
        </Box>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Área</InputLabel>
              <Select
                value={areaId}
                label="Área"
                onChange={(e) => setAreaId(e.target.value)}
              >
                <MenuItem value="">Todas as áreas</MenuItem>
                {masterDataStore.areas.map(a => (
                  <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Analista</InputLabel>
              <Select
                value={analistaId}
                label="Analista"
                onChange={(e) => setAnalistaId(e.target.value)}
              >
                <MenuItem value="">Todos os analistas</MenuItem>
                {masterDataStore.analistas.map(a => (
                  <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data inicial"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data final"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={limparFiltros}
              size="medium"
              className="text-primary-600 border-primary-300 hover:text-primary-700 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 font-medium"
              sx={{
                borderRadius: '14px',
                padding: '10px 20px',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
                height: '44px',
                borderWidth: '2px',
                '&:hover': {
                  borderWidth: '2px',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
                }
              }}
            >
              Limpar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Cards de Estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ 
              borderRadius: 3, 
              height: '100%',
              transition: 'all 0.3s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: theme.shadows[8]
              }
            }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ 
                    p: 2, 
                    backgroundColor: card.bgColor, 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <card.icon sx={{ fontSize: 24, color: card.color }} />
                  </Box>
                  <Chip 
                    label={`${index + 1}/4`} 
                    size="small" 
                    sx={{ backgroundColor: alpha(theme.palette.grey[500], 0.1) }}
                  />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 1 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                  {card.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Novos Indicadores de Lançamentos */}
      <Box sx={{ mb: 4 }}>
        <DashboardIndicators
          period={indicatorPeriod}
          showCategories={true}
        />
      </Box>

      {/* Gráficos Baseados nos Indicadores de Período */}
      <DashboardCharts period={indicatorPeriod} />

      {/* Resumo Executivo */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
          Resumo Executivo
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 1 }}>
                {totalDemandas}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total de Demandas no Sistema
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.warning.main, mb: 1 }}>
                {totalValidacoes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Validações em Andamento
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center', p: 2 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main, mb: 1 }}>
                {totalMailling}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total de Contatos Mailling
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  )
}