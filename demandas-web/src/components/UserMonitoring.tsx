import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  LinearProgress
} from '@mui/material'
import {
  Person,
  OnlinePrediction,
  AccessTime,
  TrendingUp,
  TrendingDown,
  Refresh,
  Visibility,
  Schedule,
  CalendarToday,
  QueryStats,
  CalendarMonth,
  ExpandMore
} from '@mui/icons-material'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import { useAuthStore } from '../store/authStore'
import { getApi } from '../lib/apiConfig'
import { formatIntegerPtBR } from '../utils/formatNumber'
import {
  aggregateDwellByArea,
  getPageAreaLabel,
  shortenPathDisplay
} from '../utils/pageMonitoringLabels'

interface MonthlyPanoramaDay {
  date: string
  loginCount: number
  sessionCount: number
  pageDwellSeconds: number
  pageDwellSessions: number
  pages: Array<{ path: string; seconds: number }>
  hasData: boolean
}

interface MonthlyPanoramaUser {
  userId: string
  userName: string
  userEmail: string
  monthTotals: {
    loginCount: number
    monitoringSessions: number
    pageDwellSeconds: number
    pageDwellSessions: number
    distinctPaths: number
  }
  pagesMonth: Array<{ path: string; seconds: number }>
  byDay: MonthlyPanoramaDay[]
}

interface UserActivity {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  lastAccess: string
  isOnline: boolean
  /** online | away | offline — baseado na última atividade/heartbeat */
  presenceStatus?: 'online' | 'away' | 'offline'
  lastSeenAt?: string
  minutesSinceLastActivity?: number
  /** Minutos desde o início da sessão atual (se houver sessão ativa) */
  currentSessionMinutes?: number | null
  totalTimeToday: number // em minutos
  totalTimeThisMonth: number // em minutos
  totalTimeThisQuarter: number // em minutos
  sessionCount: number
  averageSessionTime: number // em minutos
  lastActivity: string
  loginCount: number
  logoutCount: number
  activitiesTodayCount?: number
  hasRealActivity?: boolean
  /** Tempo total medido por permanência em rotas (segundos) */
  pageDwellTotalSecondsToday?: number
  pageDwellTotalSecondsWeek?: number
  pageDwellTotalSecondsMonth?: number
  pageDwellTotalSecondsQuarter?: number
  pageDwellVisitsToday?: number
  pageDwellVisitsWeek?: number
  pageDwellVisitsMonth?: number
  pageDwellVisitsQuarter?: number
  pageDwellByPageToday?: Array<{ path: string; seconds: number }>
  pageDwellByPageWeek?: Array<{ path: string; seconds: number }>
  pageDwellByPageMonth?: Array<{ path: string; seconds: number }>
  pageDwellByPageQuarter?: Array<{ path: string; seconds: number }>
}

interface MonitoringStats {
  totalUsers: number
  onlineUsers: number
  offlineUsers: number
  averageTimeToday: number
  averageTimeThisMonth: number
  mostActiveUser: string
  leastActiveUser: string
  totalSessionsToday: number
  totalSessionsThisMonth: number
}

interface TabPanelProps {
  children?: React.ReactNode
  index: number
  value: number
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  )
}

export default function UserMonitoring() {
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [stats, setStats] = useState<MonitoringStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tabValue, setTabValue] = useState(0)
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'quarter'>('today')
  const [sortBy, setSortBy] = useState<'name' | 'lastAccess' | 'timeOnline' | 'sessions' | 'pageDwell'>('lastAccess')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const nowInit = new Date()
  const [panoramaYear, setPanoramaYear] = useState(nowInit.getFullYear())
  const [panoramaMonth, setPanoramaMonth] = useState(nowInit.getMonth() + 1)
  const [monthlyData, setMonthlyData] = useState<{
    year: number
    month: number
    users: MonthlyPanoramaUser[]
  } | null>(null)
  const [monthlyLoading, setMonthlyLoading] = useState(false)
  const [monthlyError, setMonthlyError] = useState<string | null>(null)

  const { token } = useAuthStore()
  const isDev = import.meta.env.DEV
  const logDev = (...args: unknown[]) => {
    if (isDev) console.log(...args)
  }
  const isFetchingRef = useRef(false)
  const lastFetchRef = useRef(0)
  const monitoringCacheTtlMs = 2 * 60 * 1000

  // Carregar dados de monitoramento
  const loadMonitoringData = useCallback(async () => {
    try {
      if (isFetchingRef.current) return
      isFetchingRef.current = true
      setLoading(true)
      setError(null)

      if (!token) {
        setError('Token de autenticação não encontrado')
        return
      }

      logDev('🔍 Carregando dados de monitoramento REAIS...')
      
      // Buscar dados reais de monitoramento da API
      const monitoringResponse = await fetch(`https://nigteste-production.up.railway.app/monitoring/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!monitoringResponse.ok) {
        throw new Error(`Erro ao buscar dados de monitoramento: ${monitoringResponse.status}`)
      }

      const monitoringData = await monitoringResponse.json()
      logDev(`✅ Dados de monitoramento carregados: ${monitoringData.length} usuários`)

      // Usar dados reais de monitoramento da API
      logDev(`✅ Usando dados reais de monitoramento: ${monitoringData.length} registros`)

      logDev('🎯 DADOS REAIS - Sistema de monitoramento ativo!')

      // Usar dados reais de monitoramento
      setActivities(monitoringData)

      // Calcular estatísticas
      const totalUsers = monitoringData.length
      const onlineUsers = monitoringData.filter(u => u.isOnline).length
      const offlineUsers = totalUsers - onlineUsers
      const averageTimeToday = totalUsers > 0 ? monitoringData.reduce((sum, u) => sum + u.totalTimeToday, 0) / totalUsers : 0
      const averageTimeThisMonth = totalUsers > 0 ? monitoringData.reduce((sum, u) => sum + u.totalTimeThisMonth, 0) / totalUsers : 0
      
      const mostActive = monitoringData.length > 0 ? monitoringData.reduce((max, u) => u.totalTimeToday > max.totalTimeToday ? u : max) : null
      const leastActive = monitoringData.length > 0 ? monitoringData.reduce((min, u) => u.totalTimeToday < min.totalTimeToday ? u : min) : null
      
      const totalSessionsToday = monitoringData.reduce((sum, u) => sum + (u.sessionCount || 0), 0)
      const totalSessionsThisMonth = monitoringData.reduce((sum, u) => sum + (u.loginCount || 0), 0)

      setStats({
        totalUsers,
        onlineUsers,
        offlineUsers,
        averageTimeToday: Math.round(averageTimeToday),
        averageTimeThisMonth: Math.round(averageTimeThisMonth),
        mostActiveUser: mostActive ? mostActive.userName : 'N/A',
        leastActiveUser: leastActive ? leastActive.userName : 'N/A',
        totalSessionsToday,
        totalSessionsThisMonth
      })

    } catch (err) {
      setError('Erro ao carregar dados de monitoramento')
      console.error('Erro ao carregar monitoramento:', err)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [token])

  const loadMonthlyPanorama = useCallback(async () => {
    if (!token) {
      setMonthlyError('Token de autenticação não encontrado')
      return
    }
    setMonthlyLoading(true)
    setMonthlyError(null)
    try {
      const api = getApi()
      const q = `year=${panoramaYear}&month=${panoramaMonth}`
      const data = await api.get<{ year: number; month: number; users: MonthlyPanoramaUser[] }>(
        `/monitoring/monthly-panorama?${q}`
      )
      setMonthlyData(data)
    } catch (e) {
      console.error('monthly-panorama:', e)
      setMonthlyError('Não foi possível carregar o panorama mensal. Verifique permissão em Usuários (visualizar).')
      setMonthlyData(null)
    } finally {
      setMonthlyLoading(false)
    }
  }, [token, panoramaYear, panoramaMonth])

  // Carregar dados ao montar componente
  useEffect(() => {
    lastFetchRef.current = Date.now()
    loadMonitoringData()
  }, [loadMonitoringData])

  // Atualizar dados automaticamente a cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      if (isFetchingRef.current) return
      const now = Date.now()
      if (now - lastFetchRef.current < monitoringCacheTtlMs) return
      lastFetchRef.current = now
      loadMonitoringData()
    }, 60000) // 60 segundos

    return () => clearInterval(interval)
  }, [loadMonitoringData])

  useEffect(() => {
    if (tabValue !== 3) return
    void loadMonthlyPanorama()
  }, [tabValue, loadMonthlyPanorama])

  // Filtrar e ordenar atividades
  const filteredActivities = useMemo(() => {
    let filtered = [...activities]

    // Aplicar filtro de tempo
    const now = new Date()
    switch (timeFilter) {
      case 'today':
        filtered = filtered.filter(a => {
          const lastAccess = new Date(a.lastSeenAt || a.lastAccess)
          return lastAccess.toDateString() === now.toDateString()
        })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(a => new Date(a.lastSeenAt || a.lastAccess) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(a => new Date(a.lastSeenAt || a.lastAccess) >= monthAgo)
        break
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(a => new Date(a.lastSeenAt || a.lastAccess) >= quarterAgo)
        break
    }

    // Aplicar ordenação
    filtered.sort((a, b) => {
      let aValue: any, bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.userName
          bValue = b.userName
          break
        case 'lastAccess':
          aValue = new Date(a.lastSeenAt || a.lastAccess).getTime()
          bValue = new Date(b.lastSeenAt || b.lastAccess).getTime()
          break
        case 'timeOnline':
          aValue = timeFilter === 'today' ? a.totalTimeToday : 
                   timeFilter === 'week' ? a.totalTimeToday * 7 :
                   timeFilter === 'month' ? a.totalTimeThisMonth : a.totalTimeThisQuarter
          bValue = timeFilter === 'today' ? b.totalTimeToday : 
                   timeFilter === 'week' ? b.totalTimeToday * 7 :
                   timeFilter === 'month' ? b.totalTimeThisMonth : b.totalTimeThisQuarter
          break
        case 'pageDwell': {
          const sec = (u: UserActivity) =>
            timeFilter === 'today' ? (u.pageDwellTotalSecondsToday ?? 0) :
            timeFilter === 'week' ? (u.pageDwellTotalSecondsWeek ?? 0) :
            timeFilter === 'month' ? (u.pageDwellTotalSecondsMonth ?? 0) :
            (u.pageDwellTotalSecondsQuarter ?? 0)
          aValue = sec(a)
          bValue = sec(b)
          break
        }
        case 'sessions':
          aValue = a.sessionCount
          bValue = b.sessionCount
          break
        default:
          aValue = a.userName
          bValue = b.userName
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [activities, timeFilter, sortBy, sortOrder])

  // Formatar tempo em horas e minutos
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  /** Duração a partir de segundos (registros page_time). */
  const formatSecondsAsHM = (totalSeconds: number): string => {
    if (!totalSeconds || totalSeconds < 0) return '0h 0m'
    return formatTime(Math.floor(totalSeconds / 60))
  }

  const getPageDwellSeconds = (a: UserActivity, f: typeof timeFilter): number => {
    switch (f) {
      case 'today': return a.pageDwellTotalSecondsToday ?? 0
      case 'week': return a.pageDwellTotalSecondsWeek ?? 0
      case 'month': return a.pageDwellTotalSecondsMonth ?? 0
      default: return a.pageDwellTotalSecondsQuarter ?? 0
    }
  }

  const getPageDwellVisits = (a: UserActivity, f: typeof timeFilter): number => {
    switch (f) {
      case 'today': return a.pageDwellVisitsToday ?? 0
      case 'week': return a.pageDwellVisitsWeek ?? 0
      case 'month': return a.pageDwellVisitsMonth ?? 0
      default: return a.pageDwellVisitsQuarter ?? 0
    }
  }

  const getPageDwellBreakdown = (a: UserActivity, f: typeof timeFilter): Array<{ path: string; seconds: number }> => {
    switch (f) {
      case 'today': return a.pageDwellByPageToday ?? []
      case 'week': return a.pageDwellByPageWeek ?? []
      case 'month': return a.pageDwellByPageMonth ?? []
      default: return a.pageDwellByPageQuarter ?? []
    }
  }

  const periodFilterLabel: Record<typeof timeFilter, string> = {
    today: 'Hoje',
    week: 'Semana (segunda a domingo)',
    month: 'Mês calendário atual',
    quarter: 'Trimestre calendário atual'
  }

  // Formatar data relativa
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Agora'
    if (diffMins < 60) return `${diffMins}m atrás`
    if (diffHours < 24) return `${diffHours}h atrás`
    return `${diffDays}d atrás`
  }

  const presenceLabel = (u: UserActivity): string => {
    const p = u.presenceStatus
    if (p === 'online') return 'Online'
    if (p === 'away') return 'Ausente'
    return 'Offline'
  }

  const presenceChipColor = (u: UserActivity): 'success' | 'warning' | 'default' => {
    const p = u.presenceStatus
    if (p === 'online') return 'success'
    if (p === 'away') return 'warning'
    return 'default'
  }

  // Obter ícone do role
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑'
      case 'gerente': return '👔'
      case 'analista': return '👨‍💻'
      case 'solicitante': return '📋'
      default: return '👤'
    }
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando dados de monitoramento...
        </Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <IconButton color="inherit" size="small" onClick={loadMonitoringData}>
            <Refresh />
          </IconButton>
        }>
          {error}
        </Alert>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              📊 Monitoramento de Usuários
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Sistema de monitoramento ativo - Coletando dados reais de atividade dos usuários
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
              <strong>Online</strong>: atividade ou heartbeat nos últimos 5 minutos.{' '}
              <strong>Ausente</strong>: entre 5 e 15 minutos sem sinal.{' '}
              <strong>Offline</strong>: mais de 15 minutos ou sem histórico.{' '}
              Com usuário logado, o app envia heartbeat a cada 2 minutos.{' '}
              <strong>Tempo por página</strong>: cada rota é uma sessão de tela; ao trocar de página ou sair, o tempo naquela rota é enviado ao servidor.
            </Typography>
          </Box>
          <IconButton onClick={loadMonitoringData} color="primary" size="large">
            <Refresh />
          </IconButton>
        </Stack>
      </Paper>

      {/* Estatísticas Gerais */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Person />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{formatIntegerPtBR(stats.totalUsers)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Usuários
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <OnlinePrediction />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{formatIntegerPtBR(stats.onlineUsers)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Usuários Online
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'info.main' }}>
                    <AccessTime />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{formatTime(stats.averageTimeToday)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tempo Médio Hoje
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <QueryStats />
                  </Avatar>
                  <Box>
                    <Typography variant="h4">{formatIntegerPtBR(stats.totalSessionsToday)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sessões Hoje
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filtros e Controles (abas 0–2) */}
      {tabValue < 3 && (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Período</InputLabel>
            <Select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              label="Período"
            >
              <MenuItem value="today">Hoje</MenuItem>
              <MenuItem value="week">Esta Semana</MenuItem>
              <MenuItem value="month">Este Mês</MenuItem>
              <MenuItem value="quarter">Este Trimestre</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Ordenar por</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              label="Ordenar por"
            >
              <MenuItem value="name">Nome</MenuItem>
              <MenuItem value="lastAccess">Último Acesso</MenuItem>
              <MenuItem value="timeOnline">Tempo estimado (legado)</MenuItem>
              <MenuItem value="pageDwell">Tempo nas páginas (período)</MenuItem>
              <MenuItem value="sessions">Sessões</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Ordem</InputLabel>
            <Select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              label="Ordem"
            >
              <MenuItem value="asc">Crescente</MenuItem>
              <MenuItem value="desc">Decrescente</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Paper>
      )}

      {/* Tabs de Visualização */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Lista Detalhada" icon={<Visibility />} />
            <Tab label="Resumo por Período" icon={<CalendarToday />} />
            <Tab label="Análise de Sessões" icon={<Schedule />} />
            <Tab label="Panorama mensal" icon={<CalendarMonth />} />
          </Tabs>
        </Box>

        {/* Tab 1: Lista Detalhada */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Presença</TableCell>
                  <TableCell>Última atividade</TableCell>
                  <TableCell>Sessão atual</TableCell>
                  <TableCell>Tempo nas páginas (hoje)</TableCell>
                  <TableCell>Logins hoje</TableCell>
                  <TableCell>Tempo médio/sessão</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {getRoleIcon(activity.userRole)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {activity.userName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {activity.userEmail}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      {activity.hasRealActivity ? (
                        <Tooltip
                          title={
                            typeof activity.minutesSinceLastActivity === 'number'
                              ? `Sem sinal há ${formatIntegerPtBR(activity.minutesSinceLastActivity)} min`
                              : ''
                          }
                        >
                          <Chip
                            label={presenceLabel(activity)}
                            color={presenceChipColor(activity)}
                            size="small"
                          />
                        </Tooltip>
                      ) : (
                        <Chip
                          label="Sem atividade"
                          color="default"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatRelativeTime(activity.lastSeenAt || activity.lastAccess)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(activity.lastSeenAt || activity.lastAccess).toLocaleString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={activity.hasRealActivity ? 'text.primary' : 'text.secondary'}>
                        {activity.currentSessionMinutes != null && activity.currentSessionMinutes >= 0
                          ? formatTime(activity.currentSessionMinutes)
                          : '—'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        desde o login neste navegador
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium" color="text.primary">
                        {formatSecondsAsHM(activity.pageDwellTotalSecondsToday ?? 0)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        permanência medida por rota
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={activity.hasRealActivity ? 'text.primary' : 'text.secondary'}>
                        {activity.hasRealActivity ? formatIntegerPtBR(activity.loginCount ?? 0) : '0'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={activity.hasRealActivity ? 'text.primary' : 'text.secondary'}>
                        {activity.hasRealActivity ? formatTime(activity.averageSessionTime) : '0h 0m'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Tab 2: Resumo por Período */}
        <TabPanel value={tabValue} index={1}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Use o filtro <strong>Período</strong> acima. Os totais abaixo refletem o tempo em que o usuário permaneceu em cada <strong>rota</strong> (cada página = uma sessão de tela até sair ou navegar).
          </Alert>
          <Grid container spacing={3}>
            {filteredActivities.map((activity) => {
              const dwellSec = getPageDwellSeconds(activity, timeFilter)
              const visits = getPageDwellVisits(activity, timeFilter)
              const breakdown = getPageDwellBreakdown(activity, timeFilter)
              const byArea = aggregateDwellByArea(breakdown)
              return (
              <Grid item xs={12} md={6} lg={4} key={activity.id}>
                <Card>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {getRoleIcon(activity.userRole)}
                      </Avatar>
                      <Box>
                        <Typography variant="h6">{activity.userName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {activity.userRole}
                        </Typography>
                      </Box>
                    </Stack>

                    <Typography variant="caption" color="primary" fontWeight={600} display="block" sx={{ mb: 1 }}>
                      {periodFilterLabel[timeFilter]}
                    </Typography>

                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Tempo total nas páginas (rotas)
                        </Typography>
                        <Typography variant="h5" color={dwellSec > 0 ? 'text.primary' : 'text.secondary'}>
                          {formatSecondsAsHM(dwellSec)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Visitas / sessões de página encerradas
                        </Typography>
                        <Typography variant="h6" color={visits > 0 ? 'text.primary' : 'text.secondary'}>
                          {formatIntegerPtBR(visits)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Uma visita = uma permanência na rota até trocar de página, fechar o app ou fazer logout
                        </Typography>
                      </Box>

                      <Divider />

                      <Typography variant="subtitle2" color="text.secondary">
                        Por área do sistema (top {Math.min(12, byArea.length)})
                      </Typography>
                      {breakdown.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Sem registros de permanência neste período.
                        </Typography>
                      ) : (
                        <List dense disablePadding sx={{ maxHeight: 220, overflow: 'auto' }}>
                          {byArea.slice(0, 12).map((ar) => (
                            <ListItem key={ar.area} disablePadding sx={{ py: 0.35 }}>
                              <ListItemText
                                primary={
                                  <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                                    <Chip label={ar.area} size="small" color="primary" variant="outlined" sx={{ flexShrink: 0 }} />
                                    <Typography variant="body2" fontWeight="medium" noWrap component="span">
                                      {formatSecondsAsHM(ar.seconds)}
                                      {dwellSec > 0 ? ` (${formatIntegerPtBR(Math.round((100 * ar.seconds) / dwellSec))}%)` : ''}
                                    </Typography>
                                  </Stack>
                                }
                                secondaryTypographyProps={{ component: 'div' }}
                                secondary={
                                  <LinearProgress
                                    variant="determinate"
                                    value={dwellSec > 0 ? Math.min(100, Math.round((100 * ar.seconds) / dwellSec)) : 0}
                                    sx={{ mt: 0.5, height: 4, borderRadius: 1, maxWidth: 280 }}
                                  />
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      )}

                      {breakdown.length > 0 && (
                        <>
                          <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                            Detalhe por rota (top {Math.min(12, breakdown.length)})
                          </Typography>
                          <List dense disablePadding sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {breakdown.slice(0, 12).map((row) => (
                              <ListItem key={row.path} disablePadding sx={{ py: 0.25 }}>
                                <ListItemText
                                  primary={
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                                      <Chip label={getPageAreaLabel(row.path)} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
                                      <Typography variant="body2" noWrap component="span" title={row.path}>
                                        {shortenPathDisplay(row.path)}
                                      </Typography>
                                    </Stack>
                                  }
                                  secondary={formatSecondsAsHM(row.seconds)}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        {/* Tab 3: Análise de Sessões (sessão = permanência em uma página/rota) */}
        <TabPanel value={tabValue} index={2}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Sessão de página</strong> = tempo em uma rota até navegar, recarregar ou sair. Abaixo, o tempo é <strong>sinalizado por área</strong> (Cadastro, Manutenção, Atendimento, etc.) e depois por URL. Período: filtro <strong>Período</strong> acima.
          </Alert>
          <Grid container spacing={3}>
            {filteredActivities.map((activity) => {
              const dwellSec = getPageDwellSeconds(activity, timeFilter)
              const visits = getPageDwellVisits(activity, timeFilter)
              const avgSecPerVisit = visits > 0 ? Math.round(dwellSec / visits) : 0
              const breakdown = getPageDwellBreakdown(activity, timeFilter)
              const byArea = aggregateDwellByArea(breakdown)
              return (
              <Grid item xs={12} md={6} key={activity.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {activity.userName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                      {periodFilterLabel[timeFilter]}
                    </Typography>

                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Sessões de página (visitas encerradas)
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatIntegerPtBR(visits)}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Tempo total nas páginas
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatSecondsAsHM(dwellSec)}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Média por sessão de página
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {visits > 0 ? formatSecondsAsHM(avgSecPerVisit) : '—'}
                          </Typography>
                        </Stack>
                      </Box>

                      <Divider />

                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Logins hoje (registro na API)
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatIntegerPtBR(activity.loginCount ?? 0)}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Última atividade
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {activity.hasRealActivity ? formatRelativeTime(activity.lastSeenAt || activity.lastActivity) : 'Nunca'}
                          </Typography>
                        </Stack>
                      </Box>

                      {breakdown.length > 0 && (
                        <>
                          <Divider />
                          <Typography variant="subtitle2" color="primary" fontWeight={600}>
                            Tempo de atuação por página (módulo)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                            Áreas como Cadastro, Manutenção e Atendimento agrupam todas as URLs daquele módulo. A barra indica a participação no tempo total do período.
                          </Typography>
                          <Stack spacing={2}>
                            {byArea.map((ar) => {
                              const pct = dwellSec > 0 ? Math.min(100, Math.round((100 * ar.seconds) / dwellSec)) : 0
                              return (
                                <Box key={ar.area}>
                                  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                    <Tooltip title={`${ar.area} · ${formatIntegerPtBR(ar.routes.length)} rota(s) distinta(s)`}>
                                      <Chip
                                        label={ar.area}
                                        color="primary"
                                        variant="filled"
                                        size="small"
                                        sx={{ maxWidth: { xs: '100%', sm: '72%' } }}
                                      />
                                    </Tooltip>
                                    <Typography variant="body2" fontWeight="bold" sx={{ flexShrink: 0 }}>
                                      {formatSecondsAsHM(ar.seconds)}
                                    </Typography>
                                  </Stack>
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <LinearProgress
                                      variant="determinate"
                                      value={pct}
                                      sx={{ flexGrow: 1, height: 10, borderRadius: 1 }}
                                    />
                                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 40, textAlign: 'right' }}>
                                      {formatIntegerPtBR(pct)}%
                                    </Typography>
                                  </Stack>
                                </Box>
                              )
                            })}
                          </Stack>

                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle2" color="text.secondary">
                            Rotas específicas (URL + tempo)
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            {periodFilterLabel[timeFilter]} — até {Math.min(10, breakdown.length)} rotas com mais tempo
                          </Typography>
                          <List dense disablePadding sx={{ maxHeight: 300, overflow: 'auto' }}>
                            {breakdown.slice(0, 10).map((row) => (
                              <ListItem key={row.path} disablePadding sx={{ py: 0.35 }}>
                                <ListItemText
                                  primary={
                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                                      <Chip label={getPageAreaLabel(row.path)} size="small" color="secondary" variant="outlined" sx={{ flexShrink: 0 }} />
                                      <Typography variant="body2" noWrap component="span" title={row.path}>
                                        {shortenPathDisplay(row.path, 56)}
                                      </Typography>
                                    </Stack>
                                  }
                                  secondary={
                                    dwellSec > 0
                                      ? `${formatSecondsAsHM(row.seconds)} · ${formatIntegerPtBR(Math.round((100 * row.seconds) / dwellSec))}% do tempo no período`
                                      : formatSecondsAsHM(row.seconds)
                                  }
                                />
                              </ListItem>
                            ))}
                          </List>
                        </>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              )
            })}
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <strong>Armazenamento por dia:</strong> cada login e cada encerramento de permanência em página (
            <code>page_time</code>) atualiza o registro do <strong>dia</strong> do usuário. O panorama abaixo
            consolida o mês: totais, dias com atividade e rotas mais visitadas (tempo acumulado). Requer permissão
            de visualizar Usuários.
          </Alert>

          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Ano</InputLabel>
              <Select
                value={panoramaYear}
                label="Ano"
                onChange={(e) => setPanoramaYear(Number(e.target.value))}
              >
                {Array.from({ length: 6 }, (_, i) => nowInit.getFullYear() - 2 + i).map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Mês</InputLabel>
              <Select
                value={panoramaMonth}
                label="Mês"
                onChange={(e) => setPanoramaMonth(Number(e.target.value))}
              >
                {[
                  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
                ].map((label, idx) => (
                  <MenuItem key={label} value={idx + 1}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton color="primary" onClick={() => void loadMonthlyPanorama()} disabled={monthlyLoading} size="large">
              <Refresh />
            </IconButton>
          </Stack>

          {monthlyLoading && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Carregando panorama do mês…
              </Typography>
            </Box>
          )}

          {monthlyError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {monthlyError}
            </Alert>
          )}

          {!monthlyLoading && monthlyData && (
            <Stack spacing={1.5}>
              {monthlyData.users.map((u) => {
                const activeDays = u.byDay.filter((d) => d.hasData)
                const hasMonth =
                  u.monthTotals.pageDwellSeconds > 0 ||
                  u.monthTotals.pageDwellSessions > 0 ||
                  u.monthTotals.loginCount > 0 ||
                  u.monthTotals.monitoringSessions > 0
                if (!hasMonth && activeDays.length === 0) {
                  return null
                }
                return (
                  <Accordion key={u.userId} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Stack direction="row" alignItems="center" spacing={2} sx={{ width: '100%', pr: 1 }}>
                        <Typography fontWeight={600}>{u.userName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {u.monthTotals.pageDwellSessions} sessões página ·{' '}
                          {formatSecondsAsHM(u.monthTotals.pageDwellSeconds)} nas rotas ·{' '}
                          {formatIntegerPtBR(u.monthTotals.loginCount)} logins (registro) ·{' '}
                          {u.monthTotals.distinctPaths} rotas distintas
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="subtitle2" gutterBottom>
                        Dias com registro ({activeDays.length})
                      </Typography>
                      <TableContainer sx={{ maxHeight: 280, mb: 2 }}>
                        <Table size="small" stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell>Dia</TableCell>
                              <TableCell align="right">Logins</TableCell>
                              <TableCell align="right">Sessões (monitor)</TableCell>
                              <TableCell align="right">Sessões página</TableCell>
                              <TableCell align="right">Tempo em páginas</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {activeDays.map((row) => (
                              <TableRow key={row.date}>
                                <TableCell>{row.date}</TableCell>
                                <TableCell align="right">{formatIntegerPtBR(row.loginCount)}</TableCell>
                                <TableCell align="right">{formatIntegerPtBR(row.sessionCount)}</TableCell>
                                <TableCell align="right">{formatIntegerPtBR(row.pageDwellSessions)}</TableCell>
                                <TableCell align="right">{formatSecondsAsHM(row.pageDwellSeconds)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Typography variant="subtitle2" gutterBottom>
                        Rotas mais usadas no mês (tempo total)
                      </Typography>
                      <List dense disablePadding sx={{ maxHeight: 220, overflow: 'auto' }}>
                        {u.pagesMonth.slice(0, 15).map((row) => (
                          <ListItem key={row.path} disablePadding sx={{ py: 0.35 }}>
                            <ListItemText
                              primary={
                                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                                  <Chip label={getPageAreaLabel(row.path)} size="small" variant="outlined" sx={{ flexShrink: 0 }} />
                                  <Typography variant="body2" noWrap component="span" title={row.path}>
                                    {shortenPathDisplay(row.path, 48)}
                                  </Typography>
                                </Stack>
                              }
                              secondary={formatSecondsAsHM(row.seconds)}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </AccordionDetails>
                  </Accordion>
                )
              })}
              {monthlyData.users.every(
                (u) =>
                  u.monthTotals.pageDwellSeconds === 0 &&
                  u.monthTotals.pageDwellSessions === 0 &&
                  u.monthTotals.loginCount === 0 &&
                  u.monthTotals.monitoringSessions === 0 &&
                  !u.byDay.some((d) => d.hasData)
              ) && (
                <Alert severity="warning">
                  Nenhum dado agregado neste mês. Após uso do sistema com a versão atual, os totais por dia passam a
                  aparecer aqui.
                </Alert>
              )}
            </Stack>
          )}
        </TabPanel>
      </Paper>
    </Box>
  )
}
