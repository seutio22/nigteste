import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Chip,
  Stack,
  Skeleton,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Tooltip,
  Alert,
  alpha,
  useTheme,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  Refresh as RefreshIcon,
  FolderOpen as ProjectsIcon,
  WarningAmber as RiskIcon,
  CheckCircleOutline as OnTimeIcon,
  Speed as ThroughputIcon,
  AccessTime as SlippageIcon,
  Timeline as TraceIcon,
  OpenInNew as OpenIcon,
  AssignmentLate as OverdueIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { PeriodSelector } from '../components/dashboard/PeriodSelector'
import type { PeriodType } from '../types/dashboardIndicators'
import type { ProjectStatsSummary } from '../components/dashboard/DashboardProjectIndicators'
import { formatIntegerPtBR } from '../utils/formatNumber'

const normalizeText = (value?: string) => (value || '').trim().toLowerCase()

function getPeriodDates(period: PeriodType): { fromDate: string; toDate: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start: Date
  let end: Date
  switch (period) {
    case 'daily':
      start = new Date(today)
      end = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      break
    case 'quarterly': {
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59)
      break
    }
    case 'monthly':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      break
  }
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { fromDate: fmt(start), toDate: fmt(end) }
}

function KpiCard({
  title,
  value,
  subtitle,
  tone = 'primary',
  icon,
}: {
  title: string
  value: string | number
  subtitle?: string
  tone?: 'primary' | 'success' | 'warning' | 'error' | 'info'
  icon: React.ReactNode
}) {
  const theme = useTheme()
  const palette = theme.palette[tone]
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        height: '100%',
        borderRadius: 2,
        border: `1px solid ${alpha(palette.main, 0.28)}`,
        background: `linear-gradient(160deg, ${alpha(palette.main, 0.1)} 0%, ${alpha('#fff', 0.9)} 55%)`,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
          {title}
        </Typography>
        <Box sx={{ color: palette.main }}>{icon}</Box>
      </Stack>
      <Typography variant="h4" sx={{ fontWeight: 800, color: palette.main, lineHeight: 1.1 }}>
        {value}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Paper>
  )
}

function formatPct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n}%`
}

function formatDays(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n}d`
}

function formatDateLabel(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

function formatDateTimeLabel(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

export default function DashboardProjetosPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const masterDataStore = useMasterDataStore()

  const roleLc = String(user?.role || '')
    .trim()
    .toLowerCase()
  const isAdmin = roleLc === 'admin'
  const isGerente = roleLc === 'gerente'
  /** Admin e gerente podem filtrar por analista neste dashboard. */
  const canFilterByAnalista = isAdmin || isGerente
  /** Analista (ou “só meus dados”) fica travado no próprio cadastro. */
  const restrictAnalistaFilter = roleLc === 'analista' || Boolean(user?.viewOwnDataOnly)

  const linkedAnalistaId = useMemo(() => {
    if (!restrictAnalistaFilter || !user) return ''
    const analistas = masterDataStore.analistas
    if (!analistas?.length) return ''
    const emailNorm = (user.email || '').trim().toLowerCase()
    const nameNorm = normalizeText(user.name || '')
    const found = analistas.find((a) => {
      const aEmail = (a.email || '').trim().toLowerCase()
      const aNome = normalizeText(a.nome || '')
      if (emailNorm && aEmail && aEmail === emailNorm) return true
      if (nameNorm && aNome && (aNome === nameNorm || aNome.includes(nameNorm) || nameNorm.includes(aNome))) return true
      return false
    })
    return found?.id || ''
  }, [restrictAnalistaFilter, user, masterDataStore.analistas])

  const initialRange = getPeriodDates('monthly')
  const [period, setPeriod] = useState<PeriodType>('monthly')
  const [isManualDateFilter, setIsManualDateFilter] = useState(false)
  const [fromDate, setFromDate] = useState(initialRange.fromDate)
  const [toDate, setToDate] = useState(initialRange.toDate)
  const [analistaId, setAnalistaId] = useState('')
  const [stats, setStats] = useState<ProjectStatsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const loadSeqRef = useRef(0)
  const hasStatsRef = useRef(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (masterDataStore.analistas.length === 0) {
      void masterDataStore.syncFromApi?.()
    }
  }, [masterDataStore])

  useEffect(() => {
    if (!isManualDateFilter) {
      const range = getPeriodDates(period)
      setFromDate(range.fromDate)
      setToDate(range.toDate)
    }
  }, [period, isManualDateFilter])

  useEffect(() => {
    if (restrictAnalistaFilter && linkedAnalistaId && analistaId !== linkedAnalistaId) {
      setAnalistaId(linkedAnalistaId)
    }
  }, [restrictAnalistaFilter, linkedAnalistaId, analistaId])

  const effectiveAnalistaId = restrictAnalistaFilter ? linkedAnalistaId || analistaId : analistaId
  const projectStatsAnalistaId = useMemo(() => {
    if (restrictAnalistaFilter) return linkedAnalistaId || undefined
    if (!canFilterByAnalista) return undefined
    return effectiveAnalistaId || undefined
  }, [canFilterByAnalista, restrictAnalistaFilter, linkedAnalistaId, effectiveAnalistaId])

  const selectedAnalistaLabel = useMemo(() => {
    if (!projectStatsAnalistaId) return 'Todos (visão ampla)'
    return masterDataStore.analistas.find((a) => a.id === projectStatsAnalistaId)?.nome || 'Analista'
  }, [projectStatsAnalistaId, masterDataStore.analistas])

  const load = useCallback(async () => {
    if (!fromDate || !toDate) return
    const seq = ++loadSeqRef.current
    if (!hasStatsRef.current) setLoading(true)
    else setRefreshing(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (projectStatsAnalistaId) params.set('analistaId', projectStatsAnalistaId)
      params.set('fromDate', fromDate)
      params.set('toDate', toDate)
      params.set('tzOffsetMinutes', String(new Date().getTimezoneOffset()))
      const data = await api.get<ProjectStatsSummary>(`/projetos/stats/summary?${params.toString()}`)
      if (seq !== loadSeqRef.current) return
      setStats(data)
      hasStatsRef.current = true
    } catch (e: unknown) {
      if (seq !== loadSeqRef.current) return
      const msg =
        e && typeof e === 'object' && 'message' in e
          ? String((e as { message: string }).message)
          : 'Não foi possível carregar os indicadores de projetos.'
      setError(msg)
      setStats(null)
      hasStatsRef.current = false
    } finally {
      if (seq === loadSeqRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [projectStatsAnalistaId, fromDate, toDate])

  useEffect(() => {
    void load()
  }, [load, refreshTick])

  const prod = stats?.productivity
  const ra = stats?.responsibleAsAnalyst
  const myOverdue = (ra?.tasks.overdue ?? 0) + (ra?.subtasks.overdue ?? 0)
  const myOpen =
    (ra ? ra.tasks.total - ra.tasks.completed : 0) + (ra ? ra.subtasks.total - ra.subtasks.completed : 0)
  const myCompletionRate =
    ra && ra.tasks.total + ra.subtasks.total > 0
      ? Math.round(
          ((ra.tasks.completed + ra.subtasks.completed) / (ra.tasks.total + ra.subtasks.total)) * 1000
        ) / 10
      : null

  const riskProjects = useMemo(
    () => (stats?.projectsBreakdown ?? []).filter((p) => p.riskScore > 0 || p.endOverdue).slice(0, 12),
    [stats]
  )

  const topAuditEntity = useMemo(() => {
    if (!stats?.audit?.byEntityType) return null
    const entries = Object.entries(stats.audit.byEntityType).sort((a, b) => b[1] - a[1])
    return entries[0] ?? null
  }, [stats])

  const topAuditAction = useMemo(() => {
    if (!stats?.audit?.byAction) return null
    const entries = Object.entries(stats.audit.byAction).sort((a, b) => b[1] - a[1])
    return entries[0] ?? null
  }, [stats])

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, pb: 6 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', md: 'flex-start' }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Button size="small" startIcon={<BackIcon />} onClick={() => navigate('/dashboard')} sx={{ mb: 1 }}>
            Voltar ao dashboard
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Dashboard de Projetos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
            Indicadores de atuação do analista, produtividade no cronograma e rastreabilidade das mudanças —
            para priorizar riscos e acompanhar entrega por projeto.
          </Typography>
        </Box>
      </Stack>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'stretch', md: 'center' }}
          spacing={2}
          mb={2}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Filtros
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              color={projectStatsAnalistaId ? 'primary' : 'default'}
              variant="outlined"
              label={`Visão: ${selectedAnalistaLabel}`}
            />
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => setRefreshTick((n) => n + 1)} disabled={loading}>
              Atualizar
            </Button>
            <Button variant="contained" size="small" startIcon={<ProjectsIcon />} onClick={() => navigate('/projetos')}>
              Abrir projetos
            </Button>
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
          Período de Análise
        </Typography>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          flexWrap="wrap"
          useFlexGap
        >
          <PeriodSelector
            period={period}
            showLabel={false}
            compact
            onChange={(p) => {
              setIsManualDateFilter(false)
              setPeriod(p)
            }}
          />
          {canFilterByAnalista ? (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel id="dashboard-projetos-analista-label">Analista</InputLabel>
              <Select
                labelId="dashboard-projetos-analista-label"
                label="Analista"
                value={analistaId}
                onChange={(e) => setAnalistaId(String(e.target.value))}
              >
                <MenuItem value="">Todos (visão ampla)</MenuItem>
                {masterDataStore.analistas.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : restrictAnalistaFilter ? (
            <FormControl size="small" sx={{ minWidth: 200 }} disabled>
              <InputLabel>Analista</InputLabel>
              <Select label="Analista" value={effectiveAnalistaId || ''}>
                <MenuItem value={effectiveAnalistaId || ''}>{selectedAnalistaLabel}</MenuItem>
              </Select>
            </FormControl>
          ) : null}
          <TextField
            size="small"
            type="date"
            label="De"
            InputLabelProps={{ shrink: true }}
            value={fromDate}
            onChange={(e) => {
              setIsManualDateFilter(true)
              setFromDate(e.target.value)
            }}
            sx={{ minWidth: 150 }}
          />
          <TextField
            size="small"
            type="date"
            label="Até"
            InputLabelProps={{ shrink: true }}
            value={toDate}
            onChange={(e) => {
              setIsManualDateFilter(true)
              setToDate(e.target.value)
            }}
            sx={{ minWidth: 150 }}
          />
          {isManualDateFilter ? (
            <Button size="small" onClick={() => setIsManualDateFilter(false)}>
              Usar período padrão
            </Button>
          ) : null}
        </Stack>
        {loading || refreshing ? <LinearProgress sx={{ mt: 2, borderRadius: 1 }} /> : null}
      </Paper>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading && !stats ? (
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((k) => (
            <Grid item xs={12} sm={6} md={4} key={k}>
              <Skeleton variant="rounded" height={120} />
            </Grid>
          ))}
        </Grid>
      ) : stats ? (
        <>
          {/* Visão do portfólio (migrada do Dashboard executivo) */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Portfólio e cronograma
          </Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                title="Projetos acompanhados"
                value={formatIntegerPtBR(stats.projectCount)}
                subtitle={`${stats.activeProjectCount} ativos · ${stats.completedProjectCount} concluídos · ${stats.pausedProjectCount} pausados · ${stats.cancelledProjectCount ?? 0} cancelados`}
                tone="primary"
                icon={<ProjectsIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                title={stats.period ? 'Etapas criadas no período' : 'Etapas no cronograma'}
                value={formatIntegerPtBR(stats.period ? stats.period.phasesCreated : stats.totalPhases)}
                subtitle={
                  stats.period
                    ? `${stats.period.phasesCompleted} concluídas no período · ${stats.phasesOverdue} em atraso (atual)`
                    : `${stats.phasesCompleted} concluídas · ${stats.phasesOverdue} em atraso`
                }
                tone="info"
                icon={<TraceIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                title={
                  ra
                    ? 'Tarefas em que é responsável'
                    : stats.period
                      ? 'Tarefas criadas no período'
                      : 'Tarefas no cronograma'
                }
                value={formatIntegerPtBR(
                  ra ? ra.tasks.total : stats.period ? stats.period.tasksCreated : stats.totalTasksInTimeline
                )}
                subtitle={
                  ra
                    ? `${ra.tasks.completed} concluídas · ${ra.tasks.overdue} em atraso`
                    : stats.period
                      ? `${stats.period.tasksCompleted} concluídas no período · ${stats.tasksOverdue} em atraso (atual)`
                      : `${stats.tasksCompleted} concluídas · ${stats.tasksOverdue} em atraso`
                }
                tone="primary"
                icon={<ThroughputIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                title={
                  ra
                    ? 'Subtarefas em que é responsável'
                    : stats.period
                      ? 'Subtarefas criadas no período'
                      : 'Subtarefas no cronograma'
                }
                value={formatIntegerPtBR(
                  ra
                    ? ra.subtasks.total
                    : stats.period
                      ? stats.period.subtasksCreated
                      : stats.totalSubtasksInTimeline
                )}
                subtitle={
                  ra
                    ? `${ra.subtasks.completed} concluídas · ${ra.subtasks.overdue} em atraso`
                    : stats.period
                      ? `${stats.period.subtasksCompleted} concluídas no período · ${stats.subtasksOverdue} em atraso (atual)`
                      : `${stats.subtasksCompleted} concluídas · ${stats.subtasksOverdue} em atraso`
                }
                tone="info"
                icon={<OnTimeIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                title="Prazos atendidos"
                value={formatIntegerPtBR(stats.tasksDeadlineMet + stats.subtasksDeadlineMet)}
                subtitle="Tarefas + subtarefas concluídas no prazo (estado atual)"
                tone="success"
                icon={<OnTimeIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <KpiCard
                title="Projetos com fim em atraso"
                value={formatIntegerPtBR(stats.projectEndOverdue)}
                subtitle="Prazo final ultrapassado e projeto ainda aberto"
                tone={stats.projectEndOverdue > 0 ? 'warning' : 'success'}
                icon={<RiskIcon />}
              />
            </Grid>
          </Grid>

          {/* KPIs de atuação */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Atuação do analista
          </Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <KpiCard
                title="% no prazo"
                value={formatPct(prod?.onTimeRate)}
                subtitle={
                  prod?.deadlineEvaluated
                    ? `${prod.deadlineMet} de ${prod.deadlineEvaluated} conclusões avaliadas`
                    : 'Sem conclusões com prazo para avaliar'
                }
                tone="success"
                icon={<OnTimeIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <KpiCard
                title="Atrasos sob sua responsabilidade"
                value={formatIntegerPtBR(myOverdue)}
                subtitle={
                  ra
                    ? `${ra.tasks.overdue} tarefas · ${ra.subtasks.overdue} subtarefas`
                    : 'Disponível ao filtrar por analista / visão pessoal'
                }
                tone={myOverdue > 0 ? 'error' : 'success'}
                icon={<OverdueIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard
                title="Throughput no período"
                value={`${formatIntegerPtBR(prod?.completedInPeriod ?? 0)} / ${formatIntegerPtBR(prod?.createdInPeriod ?? 0)}`}
                subtitle="Concluídos / criados (etapas, tarefas e subtarefas)"
                tone="info"
                icon={<ThroughputIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={2}>
              <KpiCard
                title="Projetos em risco"
                value={formatIntegerPtBR(prod?.projectsAtRisk ?? 0)}
                subtitle={`${stats.projectEndOverdue} com fim ultrapassado · ${stats.activeProjectCount} ativos`}
                tone={(prod?.projectsAtRisk ?? 0) > 0 ? 'warning' : 'primary'}
                icon={<RiskIcon />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4} lg={3}>
              <KpiCard
                title="Conclusão da sua carga"
                value={formatPct(myCompletionRate)}
                subtitle={
                  ra
                    ? `${formatIntegerPtBR(myOpen)} itens abertos · ${formatIntegerPtBR(ra.tasks.total + ra.subtasks.total)} no total`
                    : 'Filtre por analista para ver a carga pessoal'
                }
                tone="primary"
                icon={<ProjectsIcon />}
              />
            </Grid>
          </Grid>

          {/* Produtividade */}
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
            Produtividade no cronograma
          </Typography>
          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} md={4}>
              <KpiCard
                title="Desvio médio de prazo"
                value={formatDays(prod?.avgSlippageDays)}
                subtitle="Média (conclusão real − prazo planejado). Positivo = atraso."
                tone={(prod?.avgSlippageDays ?? 0) > 0 ? 'warning' : 'success'}
                icon={<SlippageIcon />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <KpiCard
                title="Esforço estimado × real"
                value={`${prod?.estimatedHours ?? 0}h / ${prod?.actualHours ?? 0}h`}
                subtitle={
                  prod?.effortVariancePct != null
                    ? `Variância ${prod.effortVariancePct > 0 ? '+' : ''}${prod.effortVariancePct}%`
                    : 'Preencha estimatedHours/actualHours no cronograma para medir'
                }
                tone="info"
                icon={<ThroughputIcon />}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <KpiCard
                title="Atividade no período"
                value={formatIntegerPtBR(stats.audit.totalEvents)}
                subtitle={
                  typeof stats.audit.teamEventsInPeriod === 'number'
                    ? `${stats.audit.teamEventsInPeriod} eventos da equipe no mesmo intervalo · ${stats.audit.last30Days} seus nos últimos 30 dias`
                    : `${stats.audit.last30Days} nos últimos 30 dias`
                }
                tone="primary"
                icon={<TraceIcon />}
              />
            </Grid>
          </Grid>

          <Grid container spacing={2.5}>
            {/* Fila de atrasos */}
            <Grid item xs={12} lg={5}>
              <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Fila de atrasos
                  </Typography>
                  <Chip size="small" label={`${stats.overdueItems?.length ?? 0} itens`} color="error" variant="outlined" />
                </Stack>
                {(stats.overdueItems?.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhum item em atraso no escopo atual.
                  </Typography>
                ) : (
                  <Stack spacing={1.25} sx={{ maxHeight: 420, overflow: 'auto' }}>
                    {stats.overdueItems!.map((item, idx) => (
                      <Box
                        key={`${item.projectId}-${item.label}-${idx}`}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
                          bgcolor: alpha(theme.palette.error.main, 0.04),
                          cursor: 'pointer',
                          '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
                        }}
                        onClick={() => navigate(`/projetos/${item.projectId}`)}
                      >
                        <Stack direction="row" justifyContent="space-between" gap={1} mb={0.5}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {item.projectName}
                          </Typography>
                          <Chip size="small" color="error" label={`${item.daysOverdue}d`} />
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          {item.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Prazo {formatDateLabel(item.dueDate)} · {item.responsible}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Saúde por projeto */}
            <Grid item xs={12} lg={7}>
              <Paper sx={{ p: 2.5, borderRadius: 2, height: '100%' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Saúde por projeto
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ordenado por risco
                  </Typography>
                </Stack>
                <TableContainer sx={{ maxHeight: 420 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Projeto</TableCell>
                        <TableCell align="center">Progresso</TableCell>
                        <TableCell align="center">Atrasos</TableCell>
                        <TableCell align="center">Sua carga</TableCell>
                        <TableCell align="right" />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(riskProjects.length ? riskProjects : (stats.projectsBreakdown ?? []).slice(0, 12)).map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {p.name}
                            </Typography>
                            <Stack direction="row" spacing={0.75} mt={0.5} flexWrap="wrap" useFlexGap>
                              <Chip size="small" label={p.status || '—'} variant="outlined" />
                              {p.endOverdue ? <Chip size="small" color="error" label="Fim ultrapassado" /> : null}
                              {p.priority ? <Chip size="small" label={p.priority} variant="outlined" /> : null}
                            </Stack>
                          </TableCell>
                          <TableCell align="center" sx={{ minWidth: 110 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700 }}>
                              {p.progress}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={Math.max(0, Math.min(100, p.progress))}
                              sx={{ mt: 0.5, height: 6, borderRadius: 999 }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title={`Etapas ${p.phasesOverdue} · Tarefas ${p.tasksOverdue} · Subtarefas ${p.subtasksOverdue}`}>
                              <Chip
                                size="small"
                                color={p.tasksOverdue + p.subtasksOverdue + p.phasesOverdue > 0 ? 'warning' : 'default'}
                                label={p.tasksOverdue + p.subtasksOverdue + p.phasesOverdue}
                              />
                            </Tooltip>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="caption">
                              {p.myTasksCompleted + p.mySubtasksCompleted}/{p.myTasksTotal + p.mySubtasksTotal}
                            </Typography>
                            {(p.myTasksOverdue + p.mySubtasksOverdue) > 0 ? (
                              <Typography variant="caption" color="error" display="block">
                                {p.myTasksOverdue + p.mySubtasksOverdue} atrasados
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell align="right">
                            <Button size="small" endIcon={<OpenIcon />} onClick={() => navigate(`/projetos/${p.id}`)}>
                              Abrir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(stats.projectsBreakdown?.length ?? 0) === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Typography variant="body2" color="text.secondary">
                              Nenhum projeto no escopo atual.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Rastreabilidade */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
                  Atividade registrada (logs)
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Cada gravação do cronograma gera um evento de auditoria. Os totais respeitam o intervalo dos filtros.
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
                  <Chip
                    size="small"
                    label={
                      stats.period
                        ? `Suas ações (período): ${stats.audit.totalEvents}`
                        : `Suas ações (total): ${stats.audit.totalEvents}`
                    }
                  />
                  {typeof stats.audit.teamEventsInPeriod === 'number' ? (
                    <Chip
                      size="small"
                      color="info"
                      variant="outlined"
                      label={`Cronograma (equipe): ${stats.audit.teamEventsInPeriod}`}
                    />
                  ) : null}
                  <Chip size="small" color="secondary" variant="outlined" label={`Últimos 30 dias: ${stats.audit.last30Days}`} />
                  {topAuditEntity ? (
                    <Chip size="small" variant="outlined" label={`Tipo: ${topAuditEntity[0]} (${topAuditEntity[1]})`} />
                  ) : null}
                  {topAuditAction ? (
                    <Chip size="small" variant="outlined" label={`Ação: ${topAuditAction[0]} (${topAuditAction[1]})`} />
                  ) : null}
                </Stack>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                  Eventos recentes
                </Typography>
                {(stats.recentAudit?.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Sem eventos de auditoria no período.
                  </Typography>
                ) : (
                  <Stack spacing={1.25} sx={{ maxHeight: 300, overflow: 'auto' }}>
                    {stats.recentAudit!.map((ev) => (
                      <Box
                        key={ev.id}
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => navigate(`/projetos/${ev.projectId}`)}
                      >
                        <Stack direction="row" justifyContent="space-between" gap={1}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {ev.projectName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTimeLabel(ev.createdAt)}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {ev.action} · {ev.entityType}
                          {ev.targetLabel ? ` · ${ev.targetLabel}` : ''}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {ev.actorName || 'Usuário'}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>

            {/* Concluídos no período */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                  Concluído no período
                </Typography>
                {(stats.period?.completedItems?.length ?? 0) === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma conclusão registrada no intervalo selecionado.
                  </Typography>
                ) : (
                  <Stack spacing={1.25} sx={{ maxHeight: 360, overflow: 'auto' }}>
                    {stats.period!.completedItems!.map((item, idx) => (
                      <Box
                        key={`${item.projectId}-${item.completedAt}-${idx}`}
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          border: '1px solid',
                          borderColor: 'divider',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => navigate(`/projetos/${item.projectId}`)}
                      >
                        <Stack direction="row" justifyContent="space-between" gap={1}>
                          <Chip size="small" label={item.type} variant="outlined" />
                          <Typography variant="caption" color="text.secondary">
                            {formatDateTimeLabel(item.completedAt)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600 }}>
                          {item.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : null}
    </Box>
  )
}
