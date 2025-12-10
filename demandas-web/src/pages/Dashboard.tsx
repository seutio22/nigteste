import React, { useMemo, useState, useEffect } from 'react'
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
  FilterList as FilterIcon,
  Info as InfoIcon
} from '@mui/icons-material'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { useMasterDataStore } from '../store/masterDataStore'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useManutencaoStore } from '../store/manutencaoStore'
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
import { useAdvancedIndicators } from '../hooks/useAdvancedIndicators'
import { AdvancedIndicators } from '../components/dashboard/AdvancedIndicators'
import { StatusDetails } from '../components/dashboard/StatusDetails'
import type { PeriodType } from '../types/dashboardIndicators'

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316']

// Função utilitária para converter período em datas
const getPeriodDates = (period: PeriodType): { fromDate: string; toDate: string } => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  let start: Date
  let end: Date
  
  switch (period) {
    case 'daily':
      start = new Date(today)
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      break
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      break
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59)
      break
    default:
      start = today
      end = today
  }
  
  // Converter para formato YYYY-MM-DD
  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  return {
    fromDate: formatDate(start),
    toDate: formatDate(end)
  }
}

export default function DashboardPage() {
  const theme = useTheme()
  const masterDataStore = useMasterDataStore()
  const demandStore = useDemandStore()
  const atendimentoStore = useAtendimentoStore()
  const manutencaoStore = useManutencaoStore()
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
  const [selectedMonth, setSelectedMonth] = useState('')
  const [indicatorPeriod, setIndicatorPeriod] = useState<PeriodType>('daily')
  const [isManualDateFilter, setIsManualDateFilter] = useState(false)

  // Atualizar automaticamente as datas quando o período mudar (se não for filtro manual)
  useEffect(() => {
    if (!isManualDateFilter) {
      const { fromDate: newFromDate, toDate: newToDate } = getPeriodDates(indicatorPeriod)
      setFromDate(newFromDate)
      setToDate(newToDate)
      
      // Se o período for mensal, atualizar o campo de mês selecionado
      if (indicatorPeriod === 'monthly') {
        const monthValue = newFromDate.substring(0, 7) // YYYY-MM
        setSelectedMonth(monthValue)
      } else {
        // Limpar seleção de mês para outros períodos
        setSelectedMonth('')
      }
    }
  }, [indicatorPeriod, isManualDateFilter])

  // Hook para indicadores do dashboard
  // Quando há filtro manual de data, usar as datas manuais e ignorar o período
  // Quando não há filtro manual, usar o período selecionado (daily/monthly/quarterly)
  const effectivePeriod = isManualDateFilter ? 'monthly' : indicatorPeriod
  const { indicators, pageMetrics, generalStats } = useDashboardIndicators(effectivePeriod, {
    areaId,
    analistaId,
    // Passar filtros de data apenas se for filtro manual
    // Quando não é manual, o hook usa o período para calcular as datas automaticamente
    fromDate: isManualDateFilter && fromDate ? fromDate : undefined,
    toDate: isManualDateFilter && toDate ? toDate : undefined
  })

  // Hook para indicadores avançados
  // Quando há filtro manual de data, usar as datas manuais
  const { advancedIndicators, tempoExecucaoMetrics, analistaMetrics } = useAdvancedIndicators({
    areaId,
    analistaId,
    // Passar filtros de data apenas se for filtro manual
    fromDate: isManualDateFilter && fromDate ? fromDate : undefined,
    toDate: isManualDateFilter && toDate ? toDate : undefined
  })

  // Função para filtrar por data
  const inRange = (iso?: string) => {
    if (!iso) return true
    if (!fromDate && !toDate) return true
    
    try {
      const itemDate = new Date(iso)
      if (isNaN(itemDate.getTime())) return true
      
      // Normalizar para início do dia (00:00:00)
      const normalizeStart = (dateStr: string) => {
        const d = new Date(dateStr)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      }
      
      // Normalizar para fim do dia (23:59:59.999)
      const normalizeEnd = (dateStr: string) => {
        const d = new Date(dateStr)
        d.setHours(23, 59, 59, 999)
        return d.getTime()
      }
      
      const itemTime = itemDate.getTime()
      
      if (fromDate) {
        const fromTime = normalizeStart(fromDate)
        if (itemTime < fromTime) return false
      }
      
      if (toDate) {
        const toTime = normalizeEnd(toDate)
        if (itemTime > toTime) return false
      }
      
      return true
    } catch {
      return true
    }
  }

  // Handler para mudança manual de datas
  const handleFromDateChange = (value: string) => {
    setFromDate(value)
    setIsManualDateFilter(true)
    setSelectedMonth('') // Limpar seleção de mês quando data manual for alterada
    // Quando há filtro manual, não usar período automático - usar 'monthly' como padrão para cálculos
    // O hook useDashboardIndicators vai usar as datas manuais ao invés do período
  }

  const handleToDateChange = (value: string) => {
    setToDate(value)
    setIsManualDateFilter(true)
    setSelectedMonth('') // Limpar seleção de mês quando data manual for alterada
    // Quando há filtro manual, não usar período automático - usar 'monthly' como padrão para cálculos
    // O hook useDashboardIndicators vai usar as datas manuais ao invés do período
  }

  // Handler para seleção de mês
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value)
    if (value) {
      // Converter formato YYYY-MM para datas de início e fim do mês
      const [year, month] = value.split('-')
      const yearNum = parseInt(year)
      const monthNum = parseInt(month)
      
      // Primeiro dia do mês (00:00:00)
      const startDate = new Date(yearNum, monthNum - 1, 1)
      startDate.setHours(0, 0, 0, 0)
      
      // Último dia do mês (23:59:59)
      const endDate = new Date(yearNum, monthNum, 0) // Dia 0 do próximo mês = último dia do mês atual
      endDate.setHours(23, 59, 59, 999)
      
      // Formatar para YYYY-MM-DD (apenas a data, sem hora)
      const formatDate = (date: Date): string => {
        const y = date.getFullYear()
        const m = String(date.getMonth() + 1).padStart(2, '0')
        const d = String(date.getDate()).padStart(2, '0')
        return `${y}-${m}-${d}`
      }
      
      setFromDate(formatDate(startDate))
      setToDate(formatDate(endDate))
      setIsManualDateFilter(true)
      // Mudar período para mensal quando um mês específico for selecionado
      setIndicatorPeriod('monthly')
    } else {
      // Se limpar o mês, voltar ao período atual (as datas serão atualizadas pelo useEffect)
      setIsManualDateFilter(false)
    }
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
    
    // Carregar dados de atendimentos se necessário
    if (atendimentoStore.items.length === 0) {
      console.log('🔍 Dashboard: Atendimentos vazios, chamando syncFromApi...')
      atendimentoStore.syncFromApi()
    }
    
    // Carregar dados de manutenções - sempre sincronizar para garantir dados atualizados
    console.log('🔍 Dashboard: Verificando manutenções...', {
      itemsNoStore: manutencaoStore.items.length,
      isLoading: manutencaoStore.isLoading
    })
    if (manutencaoStore.items.length === 0 || !manutencaoStore.isLoading) {
      console.log('🔍 Dashboard: Sincronizando manutenções da API...')
      manutencaoStore.syncFromApi().then(() => {
        console.log('✅ Dashboard: Manutenções sincronizadas:', manutencaoStore.items.length, 'itens')
      }).catch((error) => {
        console.error('❌ Dashboard: Erro ao sincronizar manutenções:', error)
      })
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


  const limparFiltros = () => {
    setAreaId('')
    setAnalistaId('')
    setSelectedMonth('')
    setIsManualDateFilter(false)
    // As datas serão atualizadas automaticamente pelo useEffect quando isManualDateFilter for false
  }

  // Handler para mudança de período - resetar filtro manual e atualizar datas
  const handlePeriodChange = (newPeriod: PeriodType) => {
    setIndicatorPeriod(newPeriod)
    setIsManualDateFilter(false)
    setSelectedMonth('') // Limpar seleção de mês quando período mudar
    
    // Atualizar datas imediatamente quando período mudar
    const { fromDate: newFromDate, toDate: newToDate } = getPeriodDates(newPeriod)
    setFromDate(newFromDate)
    setToDate(newToDate)
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
            onChange={handlePeriodChange}
            showLabel={true}
          />
          <ExportButton
            indicators={indicators}
            pageMetrics={pageMetrics}
            generalStats={generalStats}
            period={effectivePeriod}
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
              type="month"
              label="Selecionar Mês"
              value={selectedMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText="Filtrar por mês específico"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data inicial"
              value={fromDate}
              onChange={(e) => handleFromDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={isManualDateFilter ? "Filtro manual ativo - período ignorado" : `Atualizado pelo período ${indicatorPeriod === 'daily' ? '(Hoje)' : indicatorPeriod === 'monthly' ? '(Este Mês)' : '(Este Trimestre)'}`}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Data final"
              value={toDate}
              onChange={(e) => handleToDateChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              helperText={isManualDateFilter ? "Filtro manual ativo - período ignorado" : `Atualizado pelo período ${indicatorPeriod === 'daily' ? '(Hoje)' : indicatorPeriod === 'monthly' ? '(Este Mês)' : '(Este Trimestre)'}`}
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


      {/* Novos Indicadores de Lançamentos */}
      <Box sx={{ mb: 4 }}>
        <DashboardIndicators
          period={effectivePeriod}
          showCategories={true}
          areaId={areaId}
          analistaId={analistaId}
          fromDate={isManualDateFilter && fromDate ? fromDate : undefined}
          toDate={isManualDateFilter && toDate ? toDate : undefined}
        />
      </Box>

      {/* Indicadores Avançados */}
      <Box sx={{ mb: 4 }}>
        <AdvancedIndicators
          indicators={advancedIndicators}
          tempoExecucaoMetrics={tempoExecucaoMetrics}
          analistaMetrics={analistaMetrics}
        />
      </Box>

      {/* Gráficos Baseados nos Indicadores de Período */}
      <DashboardCharts 
        period={effectivePeriod}
        areaId={areaId}
        analistaId={analistaId}
        fromDate={isManualDateFilter && fromDate ? fromDate : undefined}
        toDate={isManualDateFilter && toDate ? toDate : undefined}
      />

      {/* Detalhes de Status e Tempo de Abertura */}
      <StatusDetails
        areaId={areaId}
        analistaId={analistaId}
        fromDate={isManualDateFilter && fromDate ? fromDate : undefined}
        toDate={isManualDateFilter && toDate ? toDate : undefined}
      />

      {/* Resumo Executivo */}
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Resumo Executivo
          </Typography>
          <Tooltip 
            title={`Dados filtrados por período: ${indicatorPeriod === 'daily' ? 'Hoje' : indicatorPeriod === 'monthly' ? 'Este mês' : 'Este trimestre'}. A Home mostra o total geral sem filtros.`}
            arrow
          >
            <Chip
              label={indicatorPeriod === 'daily' ? 'Período: Hoje' : indicatorPeriod === 'monthly' ? 'Período: Este Mês' : 'Período: Este Trimestre'}
              size="small"
              color="primary"
              icon={<InfoIcon />}
              sx={{ cursor: 'help' }}
            />
          </Tooltip>
        </Box>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Tooltip 
              title={`Total filtrado por período e filtros aplicados. Diferente da Home que mostra o total geral.`}
              arrow
            >
              <Box sx={{ textAlign: 'center', p: 2, cursor: 'help' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 1 }}>
                  {totalDemandas}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Demandas (Filtrado)
                </Typography>
              </Box>
            </Tooltip>
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