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
  cancelledProjectCount?: number
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
  period?: null | {
    fromDate: string
    toDate: string
    phasesCreated: number
    tasksCreated: number
    subtasksCreated: number
    phasesCompleted: number
    tasksCompleted: number
    subtasksCompleted: number
    responsibleTasksCreated?: number
    responsibleTasksCompleted?: number
    responsibleSubtasksCreated?: number
    responsibleSubtasksCompleted?: number
  }
  /** Tarefas/subtarefas onde o analista corresponde ao campo responsável (nome do cadastro). */
  responsibleAsAnalyst?: null | {
    aliases: string[]
    tasks: { total: number; completed: number; overdue: number }
    subtasks: { total: number; completed: number; overdue: number }
  }
  audit: {
    totalEvents: number
    last30Days: number
    teamEventsInPeriod?: number
    byEntityType: Record<string, number>
    byAction: Record<string, number>
  }
}

type Props = {
  /** Incrementa após cada sincronização do dashboard para recarregar indicadores */
  refreshTick: number
  /**
   * Quando preenchido (admin/gerente), a API calcula indicadores como se fosse esse analista
   * (projetos em que participa + auditoria dele). Ignorado para outros perfis.
   */
  analistaId?: string
  /** Mesmo intervalo do dashboard (diário / mensal / trimestral ou datas manuais). */
  fromDate?: string
  toDate?: string
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

export function DashboardProjectIndicators({ refreshTick, analistaId, fromDate, toDate }: Props) {
  const theme = useTheme()
  const navigate = useNavigate()
  const [stats, setStats] = useState<ProjectStatsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (analistaId && String(analistaId).trim()) {
        params.set('analistaId', String(analistaId).trim())
      }
      if (fromDate && String(fromDate).trim() && toDate && String(toDate).trim()) {
        params.set('fromDate', String(fromDate).trim())
        params.set('toDate', String(toDate).trim())
      }
      const qs = params.toString() ? `?${params.toString()}` : ''
      const data = await api.get<ProjectStatsSummary>(`/projetos/stats/summary${qs}`)
      setStats(data)
    } catch (e: unknown) {
      const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Não foi possível carregar os indicadores.'
      setError(msg)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }, [analistaId, fromDate, toDate])

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

  const period = stats?.period ?? null
  const cancelled = stats?.cancelledProjectCount ?? 0
  const ra = stats?.responsibleAsAnalyst ?? null

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Projetos e cronograma
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
                subtitle={`${stats.activeProjectCount} ativos · ${stats.completedProjectCount} concluídos · ${stats.pausedProjectCount} pausados · ${cancelled} cancelados`}
                icon={<ProjectsIcon />}
                color="primary"
                tooltip="Total de projetos em que está vinculado (dono, gestor, membro ou equipe). Inclui cancelados na última linha."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title={period ? 'Etapas criadas no período' : 'Etapas no cronograma (atual)'}
                value={period ? period.phasesCreated : stats.totalPhases}
                subtitle={
                  period
                    ? `${period.phasesCompleted} concluídas no período · ${stats.phasesOverdue} em atraso (estado atual)`
                    : `${stats.phasesCompleted} concluídas · ${stats.phasesOverdue} em atraso`
                }
                icon={<PhasesIcon />}
                color="info"
                tooltip={
                  period
                    ? 'Contagem por data de criação e de conclusão no intervalo selecionado. Atraso reflete o estado atual do cronograma.'
                    : 'Etapas existentes no cronograma neste momento.'
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title={
                  ra
                    ? 'Tarefas em que é responsável'
                    : period
                      ? 'Tarefas criadas no período (cronograma)'
                      : 'Tarefas no cronograma (atual)'
                }
                value={
                  ra
                    ? ra.tasks.total
                    : period
                      ? period.tasksCreated
                      : stats.totalTasksInTimeline
                }
                subtitle={
                  ra
                    ? period &&
                        typeof period.responsibleTasksCreated === 'number' &&
                        typeof period.responsibleTasksCompleted === 'number'
                      ? `${period.responsibleTasksCreated} criadas no perí · ${period.responsibleTasksCompleted} concluídas no perí · ${ra.tasks.overdue} em atraso (estado atual)`
                      : `${ra.tasks.completed} concluídas · ${ra.tasks.overdue} em atraso (estado atual)`
                    : period
                      ? `${period.tasksCompleted} concluídas no período · ${stats.tasksOverdue} em atraso (estado atual)`
                      : `${stats.tasksCompleted} concluídas · ${stats.tasksOverdue} em atraso`
                }
                icon={<TaskIcon />}
                color="primary"
                tooltip={
                  ra
                    ? `Conta tarefas onde o responsável corresponde ao analista (${ra.aliases.length ? ra.aliases.join(', ') : 'sem nome no cadastro'}). Subtarefa sem responsável herda o da tarefa.`
                    : period
                      ? 'Tarefas com data de criação no período; conclusões por data de término real no período. Itens sem data de criação não entram na contagem do período.'
                      : 'Tarefas existentes no cronograma neste momento.'
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title={
                  ra
                    ? 'Subtarefas em que é responsável'
                    : period
                      ? 'Subtarefas criadas no período (cronograma)'
                      : 'Subtarefas no cronograma (atual)'
                }
                value={
                  ra
                    ? ra.subtasks.total
                    : period
                      ? period.subtasksCreated
                      : stats.totalSubtasksInTimeline
                }
                subtitle={
                  ra
                    ? period &&
                        typeof period.responsibleSubtasksCreated === 'number' &&
                        typeof period.responsibleSubtasksCompleted === 'number'
                      ? `${period.responsibleSubtasksCreated} criadas no perí · ${period.responsibleSubtasksCompleted} concluídas no perí · ${ra.subtasks.overdue} em atraso (estado atual)`
                      : `${ra.subtasks.completed} concluídas · ${ra.subtasks.overdue} em atraso (estado atual)`
                    : period
                      ? `${period.subtasksCompleted} concluídas no período · ${stats.subtasksOverdue} em atraso (estado atual)`
                      : `${stats.subtasksCompleted} concluídas · ${stats.subtasksOverdue} em atraso`
                }
                icon={<SubIcon />}
                color="info"
                tooltip={
                  ra
                    ? `Conta subtarefas onde o responsável corresponde ao analista (${ra.aliases.length ? ra.aliases.join(', ') : 'sem nome no cadastro'}).`
                    : period
                      ? 'Subtarefas com data de criação no período; conclusões por data de término real no período.'
                      : 'Subtarefas existentes no cronograma neste momento.'
                }
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Prazos atendidos (tarefas)"
                value={prazosAtendidos}
                subtitle={period ? 'Estado atual — não filtrado pelo período' : 'Conclusões dentro ou sem data planeada'}
                icon={<CheckIcon />}
                color="success"
                tooltip="Tarefas e subtarefas concluídas com entrega até à data planeada (ou sem prazo definido). Indicador de estado atual do cronograma."
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Projetos com fim em atraso"
                value={stats.projectEndOverdue}
                subtitle={period ? 'Estado atual — não filtrado pelo período' : 'Prazo final ultrapassado e projeto ainda aberto'}
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
              Cada vez que o cronograma é gravado no servidor, regista-se um evento de auditoria (tipo «cronograma»), com o detalhe das alterações.
              {period
                ? ' Os totais abaixo respeitam o intervalo de datas do dashboard; «últimos 30 dias» é uma referência fixa (calendário).'
                : ' Contagens sem filtro de datas no intervalo (histórico das suas ações nestes projetos).'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
              <Chip
                size="small"
                label={period ? `Suas ações (período): ${stats.audit.totalEvents}` : `Suas ações (total): ${stats.audit.totalEvents}`}
              />
              {period && typeof stats.audit.teamEventsInPeriod === 'number' ? (
                <Chip
                  size="small"
                  color="info"
                  variant="outlined"
                  label={`Cronograma no projeto (todos): ${stats.audit.teamEventsInPeriod}`}
                />
              ) : null}
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
