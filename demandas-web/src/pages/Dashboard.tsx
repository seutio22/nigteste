import React, { useMemo, useState, useEffect, useRef, useCallback, startTransition } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Alert,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  useTheme,
  IconButton,
  Tooltip,
  Button,
  LinearProgress
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  FolderOpen as ProjectsDashboardIcon,
  Speed as ProdutividadeIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useDashboardStore } from '../store/dashboardStore'
import { useReportStore } from '../store/reportStore'
import { useProjectStore } from '../store/projectStore'
import { DashboardIndicators } from '../components/dashboard/DashboardIndicators'
import { DashboardCharts } from '../components/dashboard/DashboardCharts'
import { ExportButton } from '../components/dashboard/ExportButton'
import { PeriodSelector } from '../components/dashboard/PeriodSelector'
import { useDashboardIndicators } from '../hooks/useDashboardIndicators'
import { useAdvancedIndicators } from '../hooks/useAdvancedIndicators'
import { AdvancedIndicators } from '../components/dashboard/AdvancedIndicators'
import { StatusDetails } from '../components/dashboard/StatusDetails'
import { BeautifulLoading } from '../components/BeautifulLoading'
import type { PeriodType } from '../types/dashboardIndicators'
import type { DashboardPdfMeta } from '../utils/dashboardPdfExport'
import {
  resolveLinkedAnalistaId,
  shouldRestrictDashboardToOwnScope,
} from '../utils/dashboardUserScope'

const normalizeText = (value?: string) => (value || '').trim().toLowerCase()

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
  const { user } = useAuthStore()
  const masterDataStore = useMasterDataStore()

  const syncMasterData = useMasterDataStore((s) => s.syncFromApi)
  const syncDemandas = useDemandStore((s) => s.syncFromApi)
  const syncAtendimentos = useAtendimentoStore((s) => s.syncFromApi)
  const syncManutencoes = useManutencaoStore((s) => s.syncFromApi)
  const syncValidacoes = useValidationStore((s) => s.syncFromApi)
  const syncReajustes = useReajusteStore((s) => s.syncFromApi)
  const syncDashboard = useDashboardStore((s) => s.syncFromApi)
  const syncReport = useReportStore((s) => s.syncFromApi)
  const syncProjects = useProjectStore((s) => s.syncFromApi)

  const isAdmin = user?.role === 'admin'

  /** Gerente, analista ou usuário com “só meus dados”: filtro de analista fixo pelo cadastro vinculado. */
  const restrictAnalistaFilter = shouldRestrictDashboardToOwnScope(
    user?.role,
    user?.viewOwnDataOnly
  )

  const linkedAnalistaId = useMemo(
    () => resolveLinkedAnalistaId(user, masterDataStore.analistas),
    [user?.id, user?.email, user?.name, masterDataStore.analistas]
  )

  // Filtros
  const [areaId, setAreaId] = useState('')
  const [analistaId, setAnalistaId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [indicatorPeriod, setIndicatorPeriod] = useState<PeriodType>('monthly')
  const [isManualDateFilter, setIsManualDateFilter] = useState(false)
  const [dashboardSyncing, setDashboardSyncing] = useState(false)
  const prevDashboardSyncing = useRef(false)
  const [dashboardSyncFinishedOnce, setDashboardSyncFinishedOnce] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (prevDashboardSyncing.current && !dashboardSyncing) {
      setDashboardSyncFinishedOnce(true)
    }
    prevDashboardSyncing.current = dashboardSyncing
  }, [dashboardSyncing])

  /** Master carregou (ou sync inicial terminou): só então calculamos métricas com escopo do usuário. */
  const userScopeReady = useMemo(() => {
    if (!restrictAnalistaFilter || !user) return true
    if (masterDataStore.isSyncing) return false
    if (masterDataStore.analistas.length > 0) return true
    if (masterDataStore.lastSyncMs > 0) return true
    if (dashboardSyncFinishedOnce && !dashboardSyncing && !masterDataStore.isSyncing) return true
    return false
  }, [
    restrictAnalistaFilter,
    user,
    masterDataStore.isSyncing,
    masterDataStore.analistas.length,
    masterDataStore.lastSyncMs,
    dashboardSyncing,
    dashboardSyncFinishedOnce
  ])

  const userScopePending = restrictAnalistaFilter && !userScopeReady

  /** Cadastro de analistas precisa carregar antes de agrupar métricas (cache não persiste mais a lista). */
  const masterDataReady = useMemo(() => {
    if (masterDataStore.analistas.length > 0) return true
    if (masterDataStore.isSyncing || dashboardSyncing) return false
    return false
  }, [
    masterDataStore.analistas.length,
    masterDataStore.isSyncing,
    dashboardSyncing,
  ])

  const masterDataPending = !masterDataReady

  const dashboardDataLoading = userScopePending || masterDataPending || dashboardSyncing
  const showDashboardContentLoading = userScopePending || masterDataPending

  useEffect(() => {
    if (restrictAnalistaFilter && linkedAnalistaId && analistaId !== linkedAnalistaId) {
      setAnalistaId(linkedAnalistaId)
    }
  }, [restrictAnalistaFilter, linkedAnalistaId, analistaId])

  const effectiveAnalistaId = restrictAnalistaFilter ? (linkedAnalistaId || analistaId) : analistaId
  const ownScopeFallback = restrictAnalistaFilter && userScopeReady && !effectiveAnalistaId

  /** Departamento NIG: visão global só para admin/gerente sem escopo restrito. */
  const nigAllowedAnalistaIds = useMemo(() => {
    if (restrictAnalistaFilter) return undefined
    const nigArea = masterDataStore.areas.find((a) =>
      String(a.nome || '').toLowerCase().includes('nig')
    )
    if (!nigArea) return undefined
    const nigIds = (masterDataStore.analistas as any[])
      .filter((a) => {
        const depId = a?.departmentId || a?.department?.id || a?.areaId || a?.area?.id
        const depNome = a?.department?.nome || a?.area?.nome
        if (depId && String(depId) === String(nigArea.id)) return true
        if (depNome && String(depNome).toLowerCase().includes('nig')) return true
        return false
      })
      .map((a) => String(a?.id))
      .filter(Boolean)
    return nigIds.length > 0 ? nigIds : undefined
  }, [restrictAnalistaFilter, masterDataStore.areas, masterDataStore.analistas])

  /** Só admin/gerente podem pedir `/projetos/stats/summary?analistaId=`; vazio = visão global (admin) ou usuário logado. */
  const projectStatsAnalistaId = useMemo(() => {
    const canFilterByAnalista = isAdmin || user?.role === 'gerente'
    return canFilterByAnalista && effectiveAnalistaId ? effectiveAnalistaId : undefined
  }, [isAdmin, user?.role, effectiveAnalistaId])

  const dashboardExportMeta = useMemo((): DashboardPdfMeta => {
    const areaLabel = areaId
      ? masterDataStore.areas.find((a) => a.id === areaId)?.nome
      : undefined
    const analistaLabel = effectiveAnalistaId
      ? masterDataStore.analistas.find((a) => a.id === effectiveAnalistaId)?.nome
      : undefined
    return {
      areaLabel,
      analistaLabel,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined
    }
  }, [areaId, effectiveAnalistaId, fromDate, toDate, masterDataStore.areas, masterDataStore.analistas])

  // Ref para controlar carregamento inicial de dados
  const dataLoadedRef = useRef(false)
  const isRefreshingRef = useRef(false)
  const lastRefreshRef = useRef(0)
  const refreshCooldownMs = 2 * 60 * 1000
  const isDev = import.meta.env.DEV
  const logDev = (...args: unknown[]) => {
    if (isDev) console.log(...args)
  }

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
  const dashboardFilters = useMemo(() => ({
    areaId,
    analistaId: effectiveAnalistaId,
    allowedAnalistaIds: nigAllowedAnalistaIds,
    ownScopeFallback,
    userScopePending,
    // Passar filtros de data apenas se for filtro manual
    // Quando não é manual, o hook usa o período para calcular as datas automaticamente
    fromDate: isManualDateFilter && fromDate ? fromDate : undefined,
    toDate: isManualDateFilter && toDate ? toDate : undefined
  }), [areaId, effectiveAnalistaId, nigAllowedAnalistaIds, ownScopeFallback, userScopePending, isManualDateFilter, fromDate, toDate])

  const {
    indicators,
    indicatorsByCategory,
    pageMetrics,
    generalStats,
    debugCompletedDailyFallback,
    chartPeriodComparison,
    chartDailyEvolution
  } = useDashboardIndicators(effectivePeriod, dashboardFilters)

  // Hook para indicadores avançados
  // Quando há filtro manual de data, usar as datas manuais
  const advancedFilters = useMemo(() => ({
    areaId,
    analistaId: effectiveAnalistaId,
    allowedAnalistaIds: nigAllowedAnalistaIds,
    ownScopeFallback,
    userScopePending,
    masterDataPending,
    // Sempre usar as datas do período atual (ou manual, se aplicado)
    fromDate: fromDate || undefined,
    toDate: toDate || undefined
  }), [areaId, effectiveAnalistaId, nigAllowedAnalistaIds, ownScopeFallback, userScopePending, masterDataPending, fromDate, toDate])

  const { advancedIndicators, tempoExecucaoMetrics, analistaMetrics, unassignedPerformanceItems } =
    useAdvancedIndicators(advancedFilters)

  const concluidoAdvancedTotal = useMemo(() => {
    return (analistaMetrics || []).reduce((sum, a) => {
      return sum + (a.itensConcluidosNoPeriodoCriadosNoPeriodo || 0) + (a.itensConcluidosNoPeriodoCriadosFora || 0)
    }, 0)
  }, [analistaMetrics])

  // Função utilitária para formatar data
  const formatDateToString = useCallback((date: Date): string => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }, [])

  // Handler para mudança manual de datas - simplificado
  const handleFromDateChange = useCallback((value: string) => {
    setFromDate(value)
    setIsManualDateFilter(true)
    setSelectedMonth('')
  }, [])

  const handleToDateChange = useCallback((value: string) => {
    setToDate(value)
    setIsManualDateFilter(true)
    setSelectedMonth('')
  }, [])

  // Handler para seleção de mês - simplificado
  const handleMonthChange = useCallback((value: string) => {
    setSelectedMonth(value)
    if (value) {
      const [year, month] = value.split('-')
      const yearNum = parseInt(year)
      const monthNum = parseInt(month)
      
      const startDate = new Date(yearNum, monthNum - 1, 1)
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(yearNum, monthNum, 0)
      endDate.setHours(23, 59, 59, 999)
      
      setFromDate(formatDateToString(startDate))
      setToDate(formatDateToString(endDate))
      setIsManualDateFilter(true)
      setIndicatorPeriod('monthly')
    } else {
      setIsManualDateFilter(false)
    }
  }, [formatDateToString])

  const refreshData = useCallback(async (force: boolean = false) => {
    try {
      if (!force && typeof document !== 'undefined' && document.hidden) return
      const now = Date.now()
      if (!force && now - lastRefreshRef.current < refreshCooldownMs) return
      if (isRefreshingRef.current) return
      isRefreshingRef.current = true
      lastRefreshRef.current = now
      setDashboardSyncing(true)
      const promises: Promise<any>[] = []

      logDev('🔍 Dashboard: Sincronizando dados da API...')

      // Master primeiro: lista de analistas/áreas necessária para resolver o escopo do usuário antes dos totais.
      if (syncMasterData) {
        try {
          const analistasVazios = useMasterDataStore.getState().analistas.length === 0
          await syncMasterData(analistasVazios ? { force: true } : undefined)
        } catch (error) {
          console.error('❌ Dashboard: Erro ao carregar masterData:', error)
        }
      }

      promises.push(
        syncDemandas().catch(error => {
          console.error('❌ Dashboard: Erro ao carregar demandas:', error)
        })
      )
      promises.push(
        syncAtendimentos().catch(error => {
          console.error('❌ Dashboard: Erro ao carregar atendimentos:', error)
        })
      )
      promises.push(
        syncManutencoes().catch(error => {
          console.error('❌ Dashboard: Erro ao carregar manutenções:', error)
        })
      )
      promises.push(
        syncValidacoes().catch(error => {
          console.error('❌ Dashboard: Erro ao carregar validações:', error)
        })
      )
      promises.push(
        syncReajustes().catch(error => {
          console.error('❌ Dashboard: Erro ao carregar reajustes:', error)
        })
      )
      promises.push(
        syncDashboard().catch(error => {
          console.error('❌ Dashboard: Erro ao carregar dashboards:', error)
        })
      )
      promises.push(
        syncReport().catch(error => {
          console.error('❌ Dashboard: Erro ao carregar analytics:', error)
        })
      )
      if (syncProjects) {
        promises.push(
          syncProjects().catch(error => {
            console.error('❌ Dashboard: Erro ao carregar projetos:', error)
          })
        )
      }

      await Promise.allSettled(promises)
      logDev('✅ Dashboard: Dados sincronizados')
    } catch (error) {
      console.error('❌ Dashboard: Erro geral ao carregar dados:', error)
    } finally {
      isRefreshingRef.current = false
      setDashboardSyncing(false)
    }
  }, [
    syncMasterData,
    syncDemandas,
    syncAtendimentos,
    syncManutencoes,
    syncValidacoes,
    syncReajustes,
    syncDashboard,
    syncReport,
    syncProjects
  ])

  // Carregar dados após a primeira pintura (evita travar a thread principal no mount).
  useEffect(() => {
    if (dataLoadedRef.current) return
    dataLoadedRef.current = true

    let cancelled = false
    let raf1 = 0
    let raf2 = 0
    let idleId = 0
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    const runSync = () => {
      if (cancelled) return
      startTransition(() => {
        void refreshData(false)
      })
    }

    const schedule = () => {
      if (cancelled) return
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(runSync, { timeout: 2000 })
      } else {
        timeoutId = setTimeout(runSync, 0)
      }
    }

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(schedule)
      })
    } else {
      schedule()
    }

    return () => {
      cancelled = true
      dataLoadedRef.current = false
      if (typeof window !== 'undefined') {
        if (raf1) window.cancelAnimationFrame(raf1)
        if (raf2) window.cancelAnimationFrame(raf2)
        if (idleId && 'cancelIdleCallback' in window) {
          window.cancelIdleCallback(idleId)
        }
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId)
    }
  }, [refreshData])

  // Recarregar ao voltar para a aba
  useEffect(() => {
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        refreshData(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refreshData])

  const limparFiltros = useCallback(() => {
    setAreaId('')
    setAnalistaId(restrictAnalistaFilter ? linkedAnalistaId : '')
    setSelectedMonth('')
    setIsManualDateFilter(false)
    // As datas serão atualizadas automaticamente pelo useEffect quando isManualDateFilter for false
  }, [restrictAnalistaFilter, linkedAnalistaId])

  // Handler para mudança de período - resetar filtro manual e atualizar datas
  const handlePeriodChange = useCallback((newPeriod: PeriodType) => {
    setIndicatorPeriod(newPeriod)
    setIsManualDateFilter(false)
    setSelectedMonth('')
    
    // Atualizar datas imediatamente quando período mudar
    const { fromDate: newFromDate, toDate: newToDate } = getPeriodDates(newPeriod)
    setFromDate(newFromDate)
    setToDate(newToDate)
  }, [])

  return (
    <Box sx={{ p: 3, backgroundColor: theme.palette.grey[50], minHeight: '100vh' }}>
      {dashboardDataLoading ? (
        <LinearProgress
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: (theme) => theme.zIndex.drawer + 2
          }}
        />
      ) : null}
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
              <IconButton size="small" onClick={() => refreshData(true)}>
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FilterIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Filtros
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="medium"
              startIcon={<ProjectsDashboardIcon />}
              onClick={() => navigate('/dashboard/projetos')}
              sx={{
                borderRadius: '14px',
                padding: '10px 18px',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                height: '40px',
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: '0 4px 12px 0 rgba(0, 37, 97, 0.18)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              Dashboard de projetos
            </Button>
            {isAdmin ? (
              <Button
                variant="contained"
                size="medium"
                color="secondary"
                startIcon={<ProdutividadeIcon />}
                onClick={() => navigate('/dashboard/produtividade')}
                sx={{
                  borderRadius: '14px',
                  padding: '10px 18px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  height: '40px',
                  boxShadow: 'none',
                  bgcolor: '#0b6e4f',
                  '&:hover': {
                    bgcolor: '#095c42',
                    boxShadow: '0 4px 12px 0 rgba(11, 110, 79, 0.22)',
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                Produtividade
              </Button>
            ) : null}
            <Button
              variant="outlined"
              onClick={limparFiltros}
              size="medium"
              className="text-primary-600 border-primary-300 hover:text-primary-700 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 font-medium"
              sx={{
                borderRadius: '14px',
                padding: '10px 18px',
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '0.9rem',
                height: '40px',
                borderWidth: '2px',
                minWidth: 120,
                '&:hover': {
                  borderWidth: '2px',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 12px 0 rgba(0, 37, 97, 0.15)'
                }
              }}
            >
              Limpar
            </Button>
          </Box>
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
            exportMeta={dashboardExportMeta}
            chartPeriodComparison={chartPeriodComparison}
            chartDailyEvolution={chartDailyEvolution.map(({ label, total }) => ({ label, total }))}
            tempoExecucaoMetrics={tempoExecucaoMetrics}
            analistaId={projectStatsAnalistaId}
            disabled={userScopePending}
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

          {!restrictAnalistaFilter ? (
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Analista</InputLabel>
              <Select
                value={analistaId}
                label="Analista"
                onChange={(e) => setAnalistaId(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">Todos os analistas</MenuItem>
                {masterDataStore.analistas.map(a => (
                  <MenuItem key={a.id} value={a.id}>{a.nome}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          ) : null}
          
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

        </Grid>
      </Paper>


      {/* Área capturada no PDF (indicadores + gráficos) — id usado por html2canvas */}
      {showDashboardContentLoading ? (
        <Box sx={{ py: 10 }}>
          <BeautifulLoading message="Carregando dados" size="medium" showDots={false} />
        </Box>
      ) : (
        <>
      <Box id="dashboard-pdf-export-root" component="section">
        {/* Novos Indicadores de Lançamentos */}
        <Box sx={{ mb: 4 }}>
          <DashboardIndicators
            period={effectivePeriod}
            indicators={indicators}
            indicatorsByCategory={indicatorsByCategory}
            generalStats={generalStats}
            showCategories={true}
          />
        </Box>

        {/* Indicadores Avançados */}
        <Box sx={{ mb: 4 }}>
          <AdvancedIndicators
            indicators={advancedIndicators}
            tempoExecucaoMetrics={tempoExecucaoMetrics}
            analistaMetrics={analistaMetrics}
            unassignedPerformanceItems={unassignedPerformanceItems}
            loading={masterDataPending || dashboardSyncing}
          />
        </Box>

        {/* Gráficos Baseados nos Indicadores de Período */}
        <DashboardCharts
          period={effectivePeriod}
          chartPeriodComparison={chartPeriodComparison}
          chartDailyEvolution={chartDailyEvolution}
          areaId={areaId}
          analistaId={effectiveAnalistaId}
          fromDate={fromDate || undefined}
          toDate={toDate || undefined}
          userScopePending={userScopePending}
          ownScopeFallback={ownScopeFallback}
        />
      </Box>

      {/* Detalhes de Status e Tempo de Abertura */}
      <StatusDetails
        areaId={areaId}
        analistaId={effectiveAnalistaId}
        fromDate={fromDate || undefined}
        toDate={toDate || undefined}
        showAnalistaFilter={isAdmin && !restrictAnalistaFilter}
        userScopePending={userScopePending}
        ownScopeFallback={ownScopeFallback}
      />
        </>
      )}

      {typeof generalStats?.completed === 'number' &&
      typeof concluidoAdvancedTotal === 'number' &&
      !showDashboardContentLoading &&
      !masterDataPending &&
      !dashboardSyncing &&
      generalStats.completed !== concluidoAdvancedTotal ? (
        <Card sx={{ mt: 3, borderRadius: 2, border: '1px solid', borderColor: 'warning.light' }}>
          <CardContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Divergência detectada: Resumo Geral (concluídas) = {generalStats.completed} vs Performance por analista ={' '}
              {concluidoAdvancedTotal}.
            </Alert>
            {Array.isArray(debugCompletedDailyFallback) && debugCompletedDailyFallback.length > 0 ? (
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  Itens contados como concluídos no diário por fallback (“criado hoje”)
                </Typography>
                {debugCompletedDailyFallback.slice(0, 12).map((it, idx) => (
                  <Typography key={`${it.page}-${it.id ?? idx}`} variant="caption" sx={{ display: 'block', mb: 0.5 }}>
                    {it.page} — {it.label} (createdAt: {it.createdAt ?? '-'} | refConclusao: {it.completedRef ?? '-'})
                  </Typography>
                ))}
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Nenhum item entrou por fallback do diário (criado hoje). Se a divergência persistir, o item extra está
                vindo de outra regra (status/data) e eu ajusto exibindo a lista completa.
              </Typography>
            )}
          </CardContent>
        </Card>
      ) : null}

    </Box>
  )
}