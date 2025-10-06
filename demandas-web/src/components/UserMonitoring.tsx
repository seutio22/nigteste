import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  LinearProgress,
  Tooltip,
  IconButton,
  RefreshIcon
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
  QueryStats
} from '@mui/icons-material'
import { useAuthStore } from '../store/authStore'
import { useActivityTracking } from '../hooks/useActivityTracking'

interface UserActivity {
  id: string
  userId: string
  userName: string
  userEmail: string
  userRole: string
  lastAccess: string
  isOnline: boolean
  totalTimeToday: number // em minutos
  totalTimeThisMonth: number // em minutos
  totalTimeThisQuarter: number // em minutos
  sessionCount: number
  averageSessionTime: number // em minutos
  lastActivity: string
  loginCount: number
  logoutCount: number
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
  const [sortBy, setSortBy] = useState<'name' | 'lastAccess' | 'timeOnline' | 'sessions'>('lastAccess')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const { token } = useAuthStore()
  
  // Tracking de atividade na página de monitoramento
  useActivityTracking({
    page: '/users/monitoring',
    action: 'page_view'
  })


  // Carregar dados de monitoramento
  const loadMonitoringData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!token) {
        setError('Token de autenticação não encontrado')
        return
      }

      console.log('🔍 Carregando dados de monitoramento dos usuários reais...')
      
      // Buscar dados REAIS da API de monitoramento
      const response = await fetch(`https://nigteste-production.up.railway.app/monitoring/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }

      const monitoringData = await response.json()
      console.log(`✅ Encontrados ${monitoringData.length} registros de monitoramento REAIS`)

      // Usar dados reais da API
      setActivities(monitoringData)

      // Calcular estatísticas
      const totalUsers = monitoringData.length
      const onlineUsers = monitoringData.filter(u => u.isOnline).length
      const offlineUsers = totalUsers - onlineUsers
      const averageTimeToday = totalUsers > 0 ? monitoringData.reduce((sum, u) => sum + u.totalTimeToday, 0) / totalUsers : 0
      const averageTimeThisMonth = totalUsers > 0 ? monitoringData.reduce((sum, u) => sum + u.totalTimeThisMonth, 0) / totalUsers : 0
      
      const mostActive = monitoringData.length > 0 ? monitoringData.reduce((max, u) => u.totalTimeToday > max.totalTimeToday ? u : max) : null
      const leastActive = monitoringData.length > 0 ? monitoringData.reduce((min, u) => u.totalTimeToday < min.totalTimeToday ? u : min) : null
      
      const totalSessionsToday = monitoringData.reduce((sum, u) => sum + u.sessionCount, 0)
      const totalSessionsThisMonth = monitoringData.reduce((sum, u) => sum + u.loginCount, 0)

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
    }
  }, [token])

  // Carregar dados ao montar componente
  useEffect(() => {
    loadMonitoringData()
  }, [loadMonitoringData])

  // Atualizar dados automaticamente a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadMonitoringData()
    }, 30000) // 30 segundos

    return () => clearInterval(interval)
  }, [loadMonitoringData])

  // Filtrar e ordenar atividades
  const filteredActivities = useMemo(() => {
    let filtered = [...activities]

    // Aplicar filtro de tempo
    const now = new Date()
    switch (timeFilter) {
      case 'today':
        filtered = filtered.filter(a => {
          const lastAccess = new Date(a.lastAccess)
          return lastAccess.toDateString() === now.toDateString()
        })
        break
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(a => new Date(a.lastAccess) >= weekAgo)
        break
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(a => new Date(a.lastAccess) >= monthAgo)
        break
      case 'quarter':
        const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(a => new Date(a.lastAccess) >= quarterAgo)
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
          aValue = new Date(a.lastAccess).getTime()
          bValue = new Date(b.lastAccess).getTime()
          break
        case 'timeOnline':
          aValue = timeFilter === 'today' ? a.totalTimeToday : 
                   timeFilter === 'week' ? a.totalTimeToday * 7 :
                   timeFilter === 'month' ? a.totalTimeThisMonth : a.totalTimeThisQuarter
          bValue = timeFilter === 'today' ? b.totalTimeToday : 
                   timeFilter === 'week' ? b.totalTimeToday * 7 :
                   timeFilter === 'month' ? b.totalTimeThisMonth : b.totalTimeThisQuarter
          break
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

  // Obter cor do status online
  const getOnlineStatusColor = (isOnline: boolean) => {
    return isOnline ? 'success' : 'default'
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
              Acompanhe a atividade e tempo online dos usuários
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
                    <Typography variant="h4">{stats.totalUsers}</Typography>
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
                    <Typography variant="h4">{stats.onlineUsers}</Typography>
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
                    <Typography variant="h4">{stats.totalSessionsToday}</Typography>
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

      {/* Filtros e Controles */}
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
              <MenuItem value="timeOnline">Tempo Online</MenuItem>
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

      {/* Tabs de Visualização */}
      <Paper>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="Lista Detalhada" icon={<Visibility />} />
            <Tab label="Resumo por Período" icon={<CalendarToday />} />
            <Tab label="Análise de Sessões" icon={<Schedule />} />
          </Tabs>
        </Box>

        {/* Tab 1: Lista Detalhada */}
        <TabPanel value={tabValue} index={0}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Último Acesso</TableCell>
                  <TableCell>Tempo Online</TableCell>
                  <TableCell>Sessões</TableCell>
                  <TableCell>Tempo Médio/Sessão</TableCell>
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
                      <Chip
                        label={activity.isOnline ? 'Online' : 'Offline'}
                        color={getOnlineStatusColor(activity.isOnline)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatRelativeTime(activity.lastAccess)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(activity.lastAccess).toLocaleString('pt-BR')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {timeFilter === 'today' ? formatTime(activity.totalTimeToday) :
                         timeFilter === 'week' ? formatTime(activity.totalTimeToday * 7) :
                         timeFilter === 'month' ? formatTime(activity.totalTimeThisMonth) :
                         formatTime(activity.totalTimeThisQuarter)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {activity.sessionCount}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {formatTime(activity.averageSessionTime)}
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
          <Grid container spacing={3}>
            {filteredActivities.map((activity) => (
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

                    <Stack spacing={1}>
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Tempo Hoje
                        </Typography>
                        <Typography variant="h6">
                          {formatTime(activity.totalTimeToday)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Tempo Este Mês
                        </Typography>
                        <Typography variant="h6">
                          {formatTime(activity.totalTimeThisMonth)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Tempo Este Trimestre
                        </Typography>
                        <Typography variant="h6">
                          {formatTime(activity.totalTimeThisQuarter)}
                        </Typography>
                      </Box>

                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Total de Sessões
                        </Typography>
                        <Typography variant="h6">
                          {activity.sessionCount}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Tab 3: Análise de Sessões */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            {filteredActivities.map((activity) => (
              <Grid item xs={12} md={6} key={activity.id}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {activity.userName}
                    </Typography>
                    
                    <Stack spacing={2}>
                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Sessões Hoje
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {activity.sessionCount}
                          </Typography>
                        </Stack>
                        <LinearProgress 
                          variant="determinate" 
                          value={(activity.sessionCount / 20) * 100} 
                          sx={{ mt: 1 }}
                        />
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Tempo Médio por Sessão
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatTime(activity.averageSessionTime)}
                          </Typography>
                        </Stack>
                        <LinearProgress 
                          variant="determinate" 
                          value={(activity.averageSessionTime / 120) * 100} 
                          sx={{ mt: 1 }}
                        />
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Logins Totais
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {activity.loginCount}
                          </Typography>
                        </Stack>
                      </Box>

                      <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Última Atividade
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {formatRelativeTime(activity.lastActivity)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  )
}
