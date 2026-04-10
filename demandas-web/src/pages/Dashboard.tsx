import React, { useMemo, useState, useEffect, useRef, useCallback, startTransition } from 'react'
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
  Divider,
  IconButton,
  Tooltip,
  Button,
  LinearProgress,
  Alert,
  CircularProgress
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
} from '@mui/icons-material'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { useAuthStore } from '../store/authStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useMaillingStore } from '../store/maillingStore'
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
import { DashboardProjectIndicators } from '../components/dashboard/DashboardProjectIndicators'
import type { PeriodType } from '../types/dashboardIndicators'
import { getItemDateForPage, parseDateForFilter } from '../utils/dashboardFilters'
import type { DashboardPdfMeta } from '../utils/dashboardPdfExport'
const COLORS = ['#002561', '#009FDF', '#00A649', '#E5B800', '#DA3832', '#050032', '#004F75', '#A3B5BC']
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
  const demandStore = useDemandStore()
  const atendimentoStore = useAtendimentoStore()
  const manutencaoStore = useManutencaoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const maillingStore = useMaillingStore()
  const dashboardStore = useDashboardStore()
  const reportStore = useReportStore()

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
  const restrictAnalistaFilter =
    user?.role === 'gerente' || user?.role === 'analista' || Boolean(user?.viewOwnDataOnly)

  const linkedAnalistaId = useMemo(() => {
    if (!restrictAnalistaFilter || !user) return ''
    const analistas = masterDataStore.analistas
    if (!analistas?.length) return ''
    const emailNorm = (user.email || '').trim().toLowerCase()
    const nameNorm = normalizeText(user.name || '')
    const found = analistas.find((a) => {
      const aEmail = (a.email || '').trim().toLowerCase()
      const aNome = (a.nome || '').trim()
      if (emailNorm && aEmail && aEmail === emailNorm) return true
      if (nameNorm && aNome && normalizeText(aNome) === nameNorm) return true
      if (nameNorm && aNome && normalizeText(aNome).includes(nameNorm)) return true
      if (nameNorm && aNome && nameNorm.includes(normalizeText(aNome))) return true
      return false
    })
    return found?.id ?? ''
  }, [restrictAnalistaFilter, user?.id, user?.email, user?.name, masterDataStore.analistas])

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
  const [projectStatsRefreshTick, setProjectStatsRefreshTick] = useState(0)
  const projectStatsBumpSkipRef = useRef(true)

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

  useEffect(() => {
    if (restrictAnalistaFilter && linkedAnalistaId && analistaId !== linkedAnalistaId) {
      setAnalistaId(linkedAnalistaId)
    }
  }, [restrictAnalistaFilter, linkedAnalistaId, analistaId])

  const effectiveAnalistaId = restrictAnalistaFilter ? (linkedAnalistaId || analistaId) : analistaId

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
    userScopePending,
    // Passar filtros de data apenas se for filtro manual
    // Quando não é manual, o hook usa o período para calcular as datas automaticamente
    fromDate: isManualDateFilter && fromDate ? fromDate : undefined,
    toDate: isManualDateFilter && toDate ? toDate : undefined
  }), [areaId, effectiveAnalistaId, userScopePending, isManualDateFilter, fromDate, toDate])

  const {
    indicators,
    indicatorsByCategory,
    pageMetrics,
    generalStats,
    chartPeriodComparison,
    chartDailyEvolution
  } = useDashboardIndicators(effectivePeriod, dashboardFilters)

  // Hook para indicadores avançados
  // Quando há filtro manual de data, usar as datas manuais
  const advancedFilters = useMemo(() => ({
    areaId,
    analistaId: effectiveAnalistaId,
    userScopePending,
    // Sempre usar as datas do período atual (ou manual, se aplicado)
    fromDate: fromDate || undefined,
    toDate: toDate || undefined
  }), [areaId, effectiveAnalistaId, userScopePending, fromDate, toDate])

  const { advancedIndicators, tempoExecucaoMetrics, analistaMetrics } = useAdvancedIndicators(advancedFilters)

  const dateBounds = useMemo(() => {
    if (!fromDate && !toDate) {
      return { fromTime: undefined as number | undefined, toTime: undefined as number | undefined }
    }
    const parseBound = (dateStr?: string, endOfDay?: boolean) => {
      if (!dateStr) return undefined
      const d = parseDateForFilter(dateStr)
      if (!d) return undefined
      if (endOfDay) {
        d.setHours(23, 59, 59, 999)
      } else {
        d.setHours(0, 0, 0, 0)
      }
      const ts = d.getTime()
      return Number.isFinite(ts) ? ts : undefined
    }
    return {
      fromTime: parseBound(fromDate, false),
      toTime: parseBound(toDate, true)
    }
  }, [fromDate, toDate])

  const hasAreaFilter = !!areaId
  const hasAnalistaFilter = !!effectiveAnalistaId
  const hasDateFilter = !!dateBounds.fromTime || !!dateBounds.toTime

  const areaIndex = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>()
    const byName = new Map<string, string>()
    masterDataStore.areas.forEach((area) => {
      const id = area.id || ''
      const name = area.nome || (area as any).name || ''
      if (id) byId.set(id, { id, name })
      if (name) byName.set(normalizeText(name), id)
    })
    return { byId, byName }
  }, [masterDataStore.areas])

  const analistaIndex = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>()
    const byName = new Map<string, string>()
    masterDataStore.analistas.forEach((analista) => {
      const id = analista.id || ''
      const name = analista.nome || (analista as any).name || ''
      if (id) byId.set(id, { id, name })
      if (name) byName.set(normalizeText(name), id)
    })
    return { byId, byName }
  }, [masterDataStore.analistas])

  const resolveId = (value: unknown, index: { byId: Map<string, { id: string; name: string }>; byName: Map<string, string> }) => {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'object') {
      const obj = value as { id?: string; nome?: string; name?: string; value?: string }
      if (obj.id) return obj.id
      if (obj.value) return obj.value
      const name = obj.nome || obj.name
      if (name) return index.byName.get(normalizeText(name)) || name
      return undefined
    }
    if (typeof value === 'string') {
      return index.byName.get(normalizeText(value)) || value
    }
    return String(value)
  }

  const resolveName = (value: unknown) => {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'object') {
      const obj = value as { nome?: string; name?: string; titulo?: string }
      return obj.nome || obj.name || obj.titulo
    }
    return String(value)
  }

  const areaMatches = useCallback((value: unknown) => {
    if (!areaId) return true
    if (value === null || value === undefined) return false
    const itemId = resolveId(value, areaIndex)
    if (itemId === areaId) return true
    const filterName = areaIndex.byId.get(areaId)?.name
    if (filterName) {
      const itemName = resolveName(value)
      if (itemName && normalizeText(itemName) === normalizeText(filterName)) return true
    }
    return false
  }, [areaId, areaIndex])

  const analistaMatches = useCallback((value: unknown) => {
    if (!effectiveAnalistaId) return true
    if (value === null || value === undefined) return false
    const itemId = resolveId(value, analistaIndex)
    if (itemId === effectiveAnalistaId) return true
    const filterName = analistaIndex.byId.get(effectiveAnalistaId)?.name
    if (filterName) {
      const itemName = resolveName(value)
      if (itemName && normalizeText(itemName) === normalizeText(filterName)) return true
    }
    return false
  }, [effectiveAnalistaId, analistaIndex])

  // Função para filtrar por data
  const inRange = (iso?: string) => {
    if (!iso) return true
    if (!dateBounds.fromTime && !dateBounds.toTime) return true
    
    try {
      const itemDate = parseDateForFilter(iso)
      if (!itemDate || isNaN(itemDate.getTime())) return true
      const itemTime = itemDate.getTime()
      
      if (dateBounds.fromTime && itemTime < dateBounds.fromTime) return false
      if (dateBounds.toTime && itemTime > dateBounds.toTime) return false
      return true
    } catch {
      return true
    }
  }

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

  // Dados filtrados
  const demandasFiltradas = useMemo(() => {
      if (userScopePending) return []
      if (!hasAreaFilter && !hasAnalistaFilter && !hasDateFilter) return demandStore.items
      return demandStore.items.filter(d =>
        areaMatches(d.areaId || d.area) &&
        analistaMatches(d.analistaId || d.analista) &&
        inRange(getItemDateForPage('demandas', d))
      )
    },
    [userScopePending, demandStore.items, areaMatches, analistaMatches, inRange, hasAreaFilter, hasAnalistaFilter, hasDateFilter]
  )

  const validacoesFiltradas = useMemo(() => {
      if (userScopePending) return []
      if (!hasAnalistaFilter && !hasDateFilter) return validationStore.items
      return validationStore.items.filter(v =>
        analistaMatches((v as any).analistaId || v.analista) &&
        inRange(getItemDateForPage('validacoes', v))
      )
    },
    [userScopePending, validationStore.items, analistaMatches, inRange, hasAnalistaFilter, hasDateFilter]
  )

  const reajustesFiltrados = useMemo(() => {
      if (userScopePending) return []
      if (!hasAnalistaFilter && !hasDateFilter) return reajusteStore.items
      return reajusteStore.items.filter(r =>
        analistaMatches(r.responsavelAnalista) &&
        inRange(getItemDateForPage('reajustes', r))
      )
    },
    [userScopePending, reajusteStore.items, analistaMatches, inRange, hasAnalistaFilter, hasDateFilter]
  )

  const maillingFiltrados = useMemo(() => {
      if (userScopePending) return []
      if (!hasDateFilter) return maillingStore.contacts
      return maillingStore.contacts.filter(m =>
        inRange(getItemDateForPage('mailling', m))
      )
    },
    [userScopePending, maillingStore.contacts, inRange, hasDateFilter]
  )

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
          await syncMasterData()
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
      if (!projectStatsBumpSkipRef.current) {
        setProjectStatsRefreshTick((t) => t + 1)
      } else {
        projectStatsBumpSkipRef.current = false
      }
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

  const demandasAggregates = useMemo(() => {
    const statusMap = new Map<string, number>()
    const areaMap = new Map<string, number>()
    const monthMap = new Map<string, number>()
    demandasFiltradas.forEach(d => {
      statusMap.set(d.status, (statusMap.get(d.status) || 0) + 1)

      const rawArea = d.areaId || d.area
      let areaName = 'Sem área'
      if (rawArea !== null && rawArea !== undefined) {
        if (typeof rawArea === 'object') {
          const obj = rawArea as { id?: string; value?: string; nome?: string; name?: string; titulo?: string }
          const objId = obj.id || obj.value
          const objName = obj.nome || obj.name || obj.titulo
          if (objId) {
            areaName = areaIndex.byId.get(objId)?.name || objName || objId
          } else if (objName) {
            const mappedId = areaIndex.byName.get(normalizeText(objName))
            areaName = mappedId ? (areaIndex.byId.get(mappedId)?.name || objName) : objName
          }
        } else if (typeof rawArea === 'string') {
          const mappedId = areaIndex.byName.get(normalizeText(rawArea))
          areaName = mappedId
            ? (areaIndex.byId.get(mappedId)?.name || rawArea)
            : (areaIndex.byId.get(rawArea)?.name || rawArea)
        } else {
          areaName = String(rawArea)
        }
      }
      areaMap.set(areaName, (areaMap.get(areaName) || 0) + 1)

      const dt = d.dataInicio || d.createdAt
      const key = dt ? new Date(dt).toISOString().slice(0, 7) : '—'
      monthMap.set(key, (monthMap.get(key) || 0) + 1)
    })

    return {
      demandasPorStatus: Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })),
      demandasPorArea: Array.from(areaMap.entries()).map(([name, value]) => ({ name, value })),
      evolucaoMensal: Array.from(monthMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([month, total]) => ({ month, total }))
    }
  }, [demandasFiltradas, areaIndex])

  const otherAggregates = useMemo(() => {
    const validacoesStatusMap = new Map<string, number>()
    const reajustesStatusMap = new Map<string, number>()
    const maillingStatusMap = new Map<string, number>()
    let reajustesTotal = 0

    validacoesFiltradas.forEach(v => {
      const key = v.status || 'Pendente'
      validacoesStatusMap.set(key, (validacoesStatusMap.get(key) || 0) + 1)
    })

    reajustesFiltrados.forEach(r => {
      const key = r.status || 'Pendente'
      reajustesStatusMap.set(key, (reajustesStatusMap.get(key) || 0) + 1)
      reajustesTotal += r.valorTotal ?? 0
    })

    maillingFiltrados.forEach(() => {
      const key = 'Ativo' // Status padrão para mailling
      maillingStatusMap.set(key, (maillingStatusMap.get(key) || 0) + 1)
    })

    const reajustesMedia = reajustesFiltrados.length > 0 ? reajustesTotal / reajustesFiltrados.length : 0

    return {
      validacoesPorStatus: Array.from(validacoesStatusMap.entries()).map(([name, value]) => ({ name, value })),
      reajustesPorStatus: Array.from(reajustesStatusMap.entries()).map(([name, value]) => ({ name, value })),
      maillingPorStatus: Array.from(maillingStatusMap.entries()).map(([name, value]) => ({ name, value })),
      valoresReajuste: { total: reajustesTotal, media: reajustesMedia }
    }
  }, [validacoesFiltradas, reajustesFiltrados, maillingFiltrados])

  const { validacoesPorStatus, reajustesPorStatus, maillingPorStatus, valoresReajuste } = otherAggregates

  const { demandasPorStatus, demandasPorArea, evolucaoMensal } = demandasAggregates

  // valoresReajuste agora vem de otherAggregates


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
      {dashboardSyncing ? (
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

      {userScopePending ? (
        <Alert
          severity="info"
          icon={<CircularProgress size={20} />}
          sx={{ mb: 3, alignItems: 'center' }}
        >
          Identificando seu perfil de analista e carregando dados mestres. Os números aparecem já filtrados para você.
        </Alert>
      ) : null}

      {/* Filtros */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FilterIcon color="action" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Filtros
            </Typography>
          </Box>

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
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Analista</InputLabel>
              <Select
                value={restrictAnalistaFilter ? effectiveAnalistaId : analistaId}
                label="Analista"
                onChange={(e) => !restrictAnalistaFilter && setAnalistaId(e.target.value)}
                disabled={restrictAnalistaFilter}
                readOnly={restrictAnalistaFilter}
                displayEmpty
                renderValue={(v) => {
                  if (restrictAnalistaFilter) {
                    if (!v) return 'Seus dados (nenhum analista vinculado ao usuário)'
                    const a = masterDataStore.analistas.find((x) => x.id === v)
                    return a ? `Seus dados (${a.nome})` : 'Seus dados'
                  }
                  return undefined
                }}
              >
                <MenuItem value="">Todos os analistas</MenuItem>
                {masterDataStore.analistas.map(a => (
                  <MenuItem key={a.id} value={a.id} disabled={restrictAnalistaFilter}>{a.nome}</MenuItem>
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

        </Grid>
      </Paper>


      {/* Área capturada no PDF (indicadores + gráficos) — id usado por html2canvas */}
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
        />
      </Box>

      {/* Detalhes de Status e Tempo de Abertura */}
      <StatusDetails
        areaId={areaId}
        analistaId={effectiveAnalistaId}
        fromDate={fromDate || undefined}
        toDate={toDate || undefined}
        showAnalistaFilter={isAdmin}
        userScopePending={userScopePending}
      />

      <DashboardProjectIndicators refreshTick={projectStatsRefreshTick} />
    </Box>
  )
}