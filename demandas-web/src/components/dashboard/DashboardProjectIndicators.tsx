import React, { useCallback, useEffect, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Tooltip,
  Button,
  Skeleton,
  alpha,
  useTheme
} from '@mui/material'
import {
  AccountTree as PhasesIcon,
  FolderOpen as ProjectsIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Assignment as TaskIcon,
  Subtitles as SubIcon,
  History as LogIcon,
  OpenInNew as OpenIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

export type ProjectStatsSummary = {
  projectCount: number
  activeProjectCount: number
  completedProjectCount: number
  pausedProjectCount: number
  totalPhases: number
  phasesCompleted: number
  phasesOverdue: number
  phasesOpenOnTrack: number
  totalTasksInTimeline: number
  totalSubtasksInTimeline: number
  tasksCompleted: number
  tasksOverdue: number
  subtasksCompleted: number
  subtasksOverdue: number
  tasksDeadlineMet: number
  subtasksDeadlineMet: number
  projectEndOverdue: number
  audit: {
    totalEvents: number
    last30Days: number
    byEntityType: Record<string, number>
    byAction: Record<string, number>
  }
}

type Props = {
  /** Incrementa após cada sincronização do dashboard para recarregar indicadores */
  refreshTick: number
}

function StatCard(props: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: 'primary' | 'success' | 'warning' | 'error' | 'info'
  tooltip?: string
}) {
  const theme = useTheme()
  const { title, value, subtitle, icon, color, tooltip } = props
  const palette =
    color === 'primary'
      ? theme.palette.primary
      : color === 'success'
        ? theme.palette.success
        : color === 'warning'
          ? theme.palette.warning
          : color === 'error'
            ? theme.palette.error
            : theme.palette.info

  const inner = (
    <Box
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        border: `1px solid ${alpha(palette.main, 0.25)}`,
        background: alpha(palette.main, 0.06)
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
        <Box sx={{ color: palette.main, opacity: 0.9 }}>{icon}</Box>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, color: palette.main }}>
        {value}
      </Typography>
      {subtitle ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
          {subtitle}
        </Typography>
      ) : null}
    </Box>
  )

  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        <span style={{ display: 'block', height: '100%' }}>{inner}</span>
      </Tooltip>
    )
  }
  return inner
}

export function DashboardProjectIndicators({ refreshTick }: Props) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [stats, setStats] = useState<ProjectStatsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.get<ProjectStatsSummary>('/projetos/stats/summary')
      setStats(data)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Não foi possível carregar os indicadores.'
      setError(msg)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, refreshTick])

  const prazosAtendidos =
    stats != null ? stats.tasksDeadlineMet + stats.subtasksDeadlineMet : 0
  const topEntity = stats
    ? Object.entries(stats.audit.byEntityType).sort((a, b) => b[1] - a[1])[0]
    : undefined
  const topAction = stats
    ? Object.entries(stats.audit.byAction).sort((a, b) => b[1] - a[1])[0]
    : undefined

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Projetos e cronograma
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
            Indicadores dos projetos a que tem acesso, com base no cronograma (etapas e tarefas) e nos registros de trabalho guardados na base — os mesmos eventos usados na página de projetos (aba de log).
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          endIcon={<OpenIcon />}
          onClick={() => navigate('/projetos')}
        >
          Abrir projetos
        </Button>
      </Box>

      {error ? (
        <Typography color="error" variant="body2" sx={{ mb: 2 }}>
          {error}
        </Typography>
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
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Projetos acompanhados"
                value={stats.projectCount}
                subtitle={`${stats.activeProjectCount} ativos · ${stats.completedProjectCount} concluídos · ${stats.pausedProjectCount} pausados`}
                icon={<ProjectsIcon />}
                color="primary"
                tooltip="Total de projetos visíveis para si (mesma regra da lista de projetos)."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Etapas criadas"
                value={stats.totalPhases}
                subtitle={`${stats.phasesCompleted} concluídas · ${stats.phasesOverdue} em atraso`}
                icon={<PhasesIcon />}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Tarefas no cronograma"
                value={stats.totalTasksInTimeline}
                subtitle={`${stats.tasksCompleted} concluídas · ${stats.tasksOverdue} em atraso`}
                icon={<TaskIcon />}
                color="primary"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Subtarefas"
                value={stats.totalSubtasksInTimeline}
                subtitle={`${stats.subtasksCompleted} concluídas · ${stats.subtasksOverdue} em atraso`}
                icon={<SubIcon />}
                color="info"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Prazos atendidos (tarefas)"
                value={prazosAtendidos}
                subtitle="Conclusões dentro ou sem data planeada"
                icon={<CheckIcon />}
                color="success"
                tooltip="Tarefas e subtarefas concluídas com entrega até à data planeada (ou sem prazo definido)."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Projetos com fim em atraso"
                value={stats.projectEndOverdue}
                subtitle="Prazo final ultrapassado e projeto ainda aberto"
                icon={<WarningIcon />}
                color="warning"
              />
            </Grid>
          </Grid>

          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.secondary.main, 0.06),
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <LogIcon color="secondary" fontSize="small" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Atividade registrada (logs de trabalho)
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Eventos gravados ao criar ou alterar etapas, tarefas e subtarefas — agregados para todos os seus projetos.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Chip size="small" label={`Total: ${stats.audit.totalEvents}`} />
              <Chip size="small" color="secondary" variant="outlined" label={`Últimos 30 dias: ${stats.audit.last30Days}`} />
              {topEntity ? (
                <Chip size="small" variant="outlined" label={`Tipo mais frequente: ${topEntity[0]} (${topEntity[1]})`} />
              ) : null}
              {topAction ? (
                <Chip size="small" variant="outlined" label={`Ação: ${topAction[0]} (${topAction[1]})`} />
              ) : null}
            </Box>
          </Box>
        </>
      ) : null}
    </Paper>
  )
}
