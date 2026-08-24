import React, { useMemo } from 'react'
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import {
  AccessTime,
  Api,
  Insights,
  Login,
  OnlinePrediction,
  People,
  Refresh,
  Visibility
} from '@mui/icons-material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis
} from 'recharts'
import { formatIntegerPtBR } from '../../utils/formatNumber'
import type { AnalyticsDashboard } from './monitoringTypes'
import { actionLabel, formatSecondsAsHM } from './monitoringFormatters'

const PRESENCE_COLORS = {
  online: '#2e7d32',
  away: '#ed6c02',
  offline: '#9e9e9e'
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  gerente: 'Gerente',
  analista: 'Analista',
  solicitante: 'Solicitante',
  viewer: 'Viewer'
}

interface MonitoringOverviewTabProps {
  data: AnalyticsDashboard | null
  loading: boolean
  error: string | null
  onRefresh: () => void
  onSelectUser: (userId: string, userName: string) => void
}

function KpiCard({
  icon,
  color,
  value,
  label,
  sub
}: {
  icon: React.ReactNode
  color: string
  value: string
  label: string
  sub?: string
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Box sx={{ bgcolor: color, color: '#fff', p: 1, borderRadius: 1, display: 'flex' }}>{icon}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" noWrap>{value}</Typography>
            <Typography variant="body2" color="text.secondary">{label}</Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {sub}
              </Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function MonitoringOverviewTab({
  data,
  loading,
  error,
  onRefresh,
  onSelectUser
}: MonitoringOverviewTabProps) {
  const presencePie = useMemo(() => {
    if (!data) return []
    const { onlineUsers, awayUsers, offlineUsers } = data.summary
    return [
      { name: 'Online', value: onlineUsers, color: PRESENCE_COLORS.online },
      { name: 'Ausente', value: awayUsers, color: PRESENCE_COLORS.away },
      { name: 'Offline', value: offlineUsers, color: PRESENCE_COLORS.offline }
    ].filter((x) => x.value > 0)
  }, [data])

  const trendChart = useMemo(() => {
    if (!data) return []
    return data.dailyTrend.map((d) => ({
      ...d,
      dwellMinutes: Math.round(d.pageDwellSeconds / 60)
    }))
  }, [data])

  const moduleChart = useMemo(() => {
    if (!data) return []
    return data.moduleUsage.slice(0, 10).map((m) => ({
      area: m.area.length > 22 ? `${m.area.slice(0, 21)}…` : m.area,
      fullArea: m.area,
      minutesWeek: Math.round(m.secondsWeek / 60),
      minutesToday: Math.round(m.secondsToday / 60)
    }))
  }, [data])

  if (loading && !data) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>Carregando analytics…</Typography>
      </Box>
    )
  }

  if (error) {
    return (
      <Alert severity="error" action={
        <IconButton color="inherit" size="small" onClick={onRefresh}><Refresh /></IconButton>
      }>
        {error}
      </Alert>
    )
  }

  if (!data) return null

  const s = data.summary

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" color="text.secondary">
          Visão consolidada dos últimos {formatIntegerPtBR(data.trendDays)} dias · atualizado em tempo real
        </Typography>
        <IconButton onClick={onRefresh} color="primary" disabled={loading}>
          <Refresh />
        </IconButton>
      </Stack>

      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<People />}
            color="primary.main"
            value={formatIntegerPtBR(s.totalUsers)}
            label="Usuários ativos"
            sub={`${formatIntegerPtBR(s.activeTodayUsers)} com atividade hoje`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<OnlinePrediction />}
            color="success.main"
            value={formatIntegerPtBR(s.onlineUsers)}
            label="Online agora"
            sub={`${formatIntegerPtBR(s.awayUsers)} ausentes · ${formatIntegerPtBR(s.offlineUsers)} offline`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<AccessTime />}
            color="info.main"
            value={formatSecondsAsHM(s.totalPageDwellSecondsToday)}
            label="Tempo em páginas (hoje)"
            sub={`Média ${formatSecondsAsHM(s.avgDwellSecondsPerActiveUserToday)} por usuário ativo`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            icon={<Login />}
            color="warning.main"
            value={formatIntegerPtBR(s.totalLoginsToday)}
            label="Logins hoje"
            sub={`${formatIntegerPtBR(s.totalActivitiesToday)} eventos registrados`}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            icon={<Api />}
            color="#5c6bc0"
            value={formatIntegerPtBR(s.totalApiCallsToday)}
            label="Chamadas de API (hoje)"
            sub="Contabilizadas pelo servidor"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            icon={<Visibility />}
            color="#00838f"
            value={formatIntegerPtBR(s.totalPageViewsToday)}
            label="Page views (hoje)"
            sub="Navegações inferidas pelo backend"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            icon={<Insights />}
            color="#6a1b9a"
            value={formatSecondsAsHM(s.totalPageDwellSecondsWeek)}
            label="Tempo em páginas (semana)"
            sub="Soma de permanência medida por rota"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, height: 340 }}>
            <Typography variant="h6" gutterBottom>Tendência diária</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Usuários ativos, logins e tempo em páginas por dia
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendChart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'dwellMinutes') return [`${formatIntegerPtBR(value)} min`, 'Tempo em páginas']
                    return [formatIntegerPtBR(value), name === 'activeUsers' ? 'Usuários ativos' : 'Logins']
                  }}
                />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="activeUsers" name="Usuários ativos" stroke="#1976d2" strokeWidth={2} dot={false} />
                <Line yAxisId="left" type="monotone" dataKey="logins" name="Logins" stroke="#ed6c02" strokeWidth={2} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="dwellMinutes" name="Tempo (min)" stroke="#2e7d32" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 2, height: 340 }}>
            <Typography variant="h6" gutterBottom>Presença agora</Typography>
            {presencePie.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
                Sem usuários online ou ausentes no momento.
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={presencePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={88} label={({ name, value }) => `${name}: ${value}`}>
                    {presencePie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(v: number) => formatIntegerPtBR(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 2, height: 360 }}>
            <Typography variant="h6" gutterBottom>Uso por módulo (semana)</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Tempo de permanência agregado por área do sistema
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={moduleChart} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="area" width={120} tick={{ fontSize: 10 }} />
                <RechartsTooltip
                  formatter={(v: number, name: string, props: { payload?: { fullArea?: string } }) => [
                    `${formatIntegerPtBR(v)} min`,
                    name === 'minutesWeek' ? 'Semana' : 'Hoje'
                  ]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullArea ?? ''}
                />
                <Legend />
                <Bar dataKey="minutesWeek" name="Semana (min)" fill="#1976d2" radius={[0, 4, 4, 0]} />
                <Bar dataKey="minutesToday" name="Hoje (min)" fill="#90caf9" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 2, height: 360 }}>
            <Typography variant="h6" gutterBottom>Atividade por hora (hoje)</Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.hourlyToday} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <RechartsTooltip formatter={(v: number) => formatIntegerPtBR(v)} />
                <Bar dataKey="activities" name="Eventos" fill="#7b1fa2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Mix de eventos (hoje)</Typography>
            <Stack spacing={1} sx={{ mt: 1 }}>
              {data.actionMixToday.slice(0, 8).map((row) => {
                const max = data.actionMixToday[0]?.count ?? 1
                return (
                  <Box key={row.action}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                      <Typography variant="body2">{actionLabel(row.action)}</Typography>
                      <Typography variant="body2" fontWeight={600}>{formatIntegerPtBR(row.count)}</Typography>
                    </Stack>
                    <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, height: 6, overflow: 'hidden' }}>
                      <Box sx={{ bgcolor: 'primary.main', height: '100%', width: `${Math.min(100, (100 * row.count) / max)}%` }} />
                    </Box>
                  </Box>
                )
              })}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Presença por perfil</Typography>
            <TableContainer sx={{ maxHeight: 280 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Perfil</TableCell>
                    <TableCell align="right">Online</TableCell>
                    <TableCell align="right">Ausente</TableCell>
                    <TableCell align="right">Offline</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.presenceByRole.map((row) => (
                    <TableRow key={row.role}>
                      <TableCell>{ROLE_LABELS[row.role] ?? row.role}</TableCell>
                      <TableCell align="right">{formatIntegerPtBR(row.online)}</TableCell>
                      <TableCell align="right">{formatIntegerPtBR(row.away)}</TableCell>
                      <TableCell align="right">{formatIntegerPtBR(row.offline)}</TableCell>
                      <TableCell align="right">{formatIntegerPtBR(row.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Ranking — tempo em páginas hoje</Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
              Clique em um usuário para ver log detalhado de atividades e sessões
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Perfil</TableCell>
                    <TableCell>Departamento</TableCell>
                    <TableCell>Presença</TableCell>
                    <TableCell align="right">Tempo hoje</TableCell>
                    <TableCell align="right">Tempo semana</TableCell>
                    <TableCell align="right">Logins</TableCell>
                    <TableCell align="right">API calls</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.topUsers.map((u, idx) => (
                    <TableRow
                      key={u.userId}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => onSelectUser(u.userId, u.userName)}
                    >
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell>{u.userName}</TableCell>
                      <TableCell>{ROLE_LABELS[u.userRole] ?? u.userRole}</TableCell>
                      <TableCell>{u.departmentName ?? '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={u.presenceStatus === 'online' ? 'Online' : u.presenceStatus === 'away' ? 'Ausente' : 'Offline'}
                          color={u.presenceStatus === 'online' ? 'success' : u.presenceStatus === 'away' ? 'warning' : 'default'}
                        />
                      </TableCell>
                      <TableCell align="right">{formatSecondsAsHM(u.dwellSecondsToday)}</TableCell>
                      <TableCell align="right">{formatSecondsAsHM(u.dwellSecondsWeek)}</TableCell>
                      <TableCell align="right">{formatIntegerPtBR(u.loginsToday)}</TableCell>
                      <TableCell align="right">{formatIntegerPtBR(u.apiCallsToday)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  )
}
