import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import {
  ArrowBack as BackIcon,
  ExpandLess,
  ExpandMore,
  Refresh as RefreshIcon,
  WarningAmber as WarnIcon,
  CheckCircleOutline as OkIcon,
  AccessTime as TimeIcon,
  AssignmentTurnedIn as DoneIcon,
  TrendingUp as HighIcon,
  TrendingDown as LowIcon,
  Schedule as SlaIcon,
  TimerOff as LateIcon,
  Rule as RuleIcon,
} from '@mui/icons-material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { loadSlaRegras, loadStatusEventsByPage } from './slaData'
import { SLA_STATUS_PAUSA_LABEL, type SlaStatusEvent } from './slaCalendar'
import { useAuthStore } from '../store/authStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useDemandStore } from '../store/demandStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useReportStore } from '../store/reportStore'
import { PeriodSelector } from '../components/dashboard/PeriodSelector'
import type { PeriodType } from '../types/dashboardIndicators'
import { isItemConcluidoProducao } from '../types/dashboardIndicators'
import {
  getDataReferenciaConclusao,
  getExecutionEndDate,
  getExecutionStartDate,
} from '../utils/dashboardFilters'
import { formatSecondsToHms } from './produtividadeJornada'
import { getSlaImpactoShortLabel } from './slaImpact'
import {
  buildSlaDashboard,
  formatSlaCountsByPageLabel,
  type AnalistaSlaRow,
} from './slaDashboard'
import {
  evaluateTicketSla,
  extractAnalyticsDims,
  extractAtendimentoDims,
  extractDemandaDims,
  extractManutencaoDims,
  extractReajusteDims,
  extractValidacaoDims,
  formatPrazoSlaLabel,
  formatSlaStatusLabel,
  SLA_DASHBOARD_PAGES,
  SLA_PAGE_LABEL,
  type ChamadoSlaResult,
  type SlaDashboardPageKey,
  type SlaRegraRow,
} from './slaMatching'

function getTicketDetailPath(pageKey: SlaDashboardPageKey | string, id: string): string | null {
  const map: Partial<Record<SlaDashboardPageKey, string>> = {
    demandas: 'cadastro',
    manutencoes: 'manutencao',
    atendimentos: 'atendimento',
    validacoes: 'validacao',
    reajustes: 'reajuste',
    analytics: 'analytics',
  }
  const base = map[pageKey as SlaDashboardPageKey]
  if (!base || !id) return null
  return `/${base}/${encodeURIComponent(id)}`
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getMonthRange(yearMonth: string): { fromDate: string; toDate: string } {
  const [y, m] = yearMonth.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  return { fromDate: fmtDate(start), toDate: fmtDate(end) }
}

function getPeriodDates(
  period: PeriodType,
  opts?: { yearMonth?: string }
): { fromDate: string; toDate: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let start: Date
  let end: Date
  switch (period) {
    case 'daily':
      start = today
      end = today
      break
    case 'quarterly': {
      const q = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), q * 3, 1)
      end = new Date(now.getFullYear(), q * 3 + 3, 0)
      break
    }
    case 'monthly':
    default: {
      if (opts?.yearMonth) return getMonthRange(opts.yearMonth)
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    }
  }
  return { fromDate: fmtDate(start), toDate: fmtDate(end) }
}

const FILTER_CONTROL_SX = {
  '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' },
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string
  value: string
  subtitle?: string
  icon: React.ReactNode
  color: string
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) => alpha(color, t.palette.mode === 'dark' ? 0.12 : 0.06),
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(color, 0.18),
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.25 }}>
            {value}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  )
}

function statusChipColor(
  status: ChamadoSlaResult['status']
): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'dentro') return 'success'
  if (status === 'fora') return 'error'
  if (status === 'sem_execucao') return 'warning'
  return 'default'
}

export default function DashboardSlaPage() {
  const theme = useTheme()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const md = useMasterDataStore()
  const demandStore = useDemandStore()
  const manutencaoStore = useManutencaoStore()
  const atendimentoStore = useAtendimentoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const reportStore = useReportStore()

  const [period, setPeriod] = useState<PeriodType>('monthly')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = getPeriodDates('monthly')
    return d.fromDate.slice(0, 7)
  })
  const [fromDate, setFromDate] = useState(() => getPeriodDates('monthly').fromDate)
  const [toDate, setToDate] = useState(() => getPeriodDates('monthly').toDate)
  const [analistaId, setAnalistaId] = useState('')
  const [rules, setRules] = useState<SlaRegraRow[]>([])
  const [statusByPage, setStatusByPage] = useState<
    Partial<Record<SlaDashboardPageKey, Map<string, SlaStatusEvent[]>>>
  >({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const applyPeriod = useCallback((next: PeriodType, yearMonth?: string) => {
    setPeriod(next)
    if (next === 'monthly') {
      const ym =
        yearMonth ||
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
      setSelectedMonth(ym)
      const range = getPeriodDates('monthly', { yearMonth: ym })
      setFromDate(range.fromDate)
      setToDate(range.toDate)
      return
    }
    setSelectedMonth('')
    const range = getPeriodDates(next)
    setFromDate(range.fromDate)
    setToDate(range.toDate)
  }, [])

  const handleMonthChange = useCallback((value: string) => {
    if (!value) return
    setSelectedMonth(value)
    setPeriod('monthly')
    const range = getMonthRange(value)
    setFromDate(range.fromDate)
    setToDate(range.toDate)
  }, [])

  const loadAll = useCallback(async () => {
    if (!isAdmin) return
    setLoading(true)
    setError(null)
    try {
      await Promise.all([
        demandStore.syncFromApi?.(true),
        manutencaoStore.syncFromApi?.(true),
        atendimentoStore.syncFromApi?.(true),
        validationStore.syncFromApi?.({ force: true }),
        reajusteStore.syncFromApi?.(true),
        reportStore.syncFromApi?.(true),
        md.syncFromApi?.({
          force: true,
          entities: [
            'analistas',
            'tiposServico',
            'tiposDemanda',
            'tiposCadastro',
            'padrao',
            'relatorios',
            'modelos',
            'sistemas',
          ] as any,
        }),
      ])
      const [regras, ...statusMaps] = await Promise.all([
        loadSlaRegras(true),
        ...SLA_DASHBOARD_PAGES.map((p) =>
          loadStatusEventsByPage(p).catch(() => new Map<string, SlaStatusEvent[]>())
        ),
      ])
      setRules(regras)
      const next: Partial<Record<SlaDashboardPageKey, Map<string, SlaStatusEvent[]>>> = {}
      SLA_DASHBOARD_PAGES.forEach((p, i) => {
        next[p] = statusMaps[i]
      })
      setStatusByPage(next)
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar SLA')
    } finally {
      setLoading(false)
    }
  }, [
    isAdmin,
    demandStore,
    manutencaoStore,
    atendimentoStore,
    validationStore,
    reajusteStore,
    reportStore,
    md,
  ])

  useEffect(() => {
    if (isAdmin) void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  const analistasList = useMemo(
    () => (md.analistas || []).map((a) => ({ id: a.id, nome: a.nome })),
    [md.analistas]
  )

  const chamados = useMemo((): ChamadoSlaResult[] => {
    const out: ChamadoSlaResult[] = []
    const pushPage = (
      page: SlaDashboardPageKey,
      items: any[],
      extract: (item: any) => ReturnType<typeof extractDemandaDims>
    ) => {
      const statusMap = statusByPage[page]
      for (const item of items || []) {
        if (!isItemConcluidoProducao(page, item)) continue
        const dataConclusao = getDataReferenciaConclusao(page, item)
        if (!dataConclusao) continue
        out.push(
          evaluateTicketSla({
            item,
            dims: extract(item),
            rules,
            dataConclusao,
            dataInicio: getExecutionStartDate(page, item) || null,
            dataFinal: getExecutionEndDate(page, item) || null,
            concluido: true,
            statusEvents: statusMap?.get(String(item.id)) ?? null,
            analistas: analistasList,
          })
        )
      }
    }

    pushPage('demandas', demandStore.items, extractDemandaDims)
    pushPage('manutencoes', manutencaoStore.items, extractManutencaoDims)
    pushPage('atendimentos', atendimentoStore.items, extractAtendimentoDims)
    pushPage('validacoes', validationStore.items, extractValidacaoDims)
    pushPage('reajustes', reajusteStore.items, extractReajusteDims)
    pushPage('analytics', reportStore.items, extractAnalyticsDims)

    return out
  }, [
    demandStore.items,
    manutencaoStore.items,
    atendimentoStore.items,
    validationStore.items,
    reajusteStore.items,
    reportStore.items,
    rules,
    statusByPage,
    analistasList,
  ])

  const analistaNomeById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const a of md.analistas || []) {
      map[a.id] = a.nome || a.id
    }
    return map
  }, [md.analistas])

  const summary = useMemo(
    () =>
      buildSlaDashboard({
        chamados,
        fromDate,
        toDate,
        analistaNomeById,
        analistaIdFilter: analistaId || null,
      }),
    [chamados, fromDate, toDate, analistaNomeById, analistaId]
  )

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          A página de SLA do Dashboard é restrita a administradores.
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </Button>
      </Box>
    )
  }

  const toggleRow = (id: string) => setExpanded((s) => ({ ...s, [id]: !s[id] }))

  const diasLabel =
    summary.prazoSlaDiasUteis != null
      ? `${String(summary.prazoSlaDiasUteis).replace('.', ',')} dias úteis`
      : null

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'center' }}
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Button
            startIcon={<BackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{ mb: 1, textTransform: 'none' }}
          >
            Dashboard
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            SLA
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cumprimento de prazo por analista × regras de SLA (Dados → SLA), com faixas e impacto.
            Páginas: {SLA_DASHBOARD_PAGES.map((k) => SLA_PAGE_LABEL[k]).join(', ')}. Conclusão pelo
            dia em que o chamado foi concluído. Tempo em horas úteis (seg–sex, 09h–17h), descontando
            os status {SLA_STATUS_PAUSA_LABEL}.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => void loadAll()}
          disabled={loading}
          sx={{ textTransform: 'none', alignSelf: { xs: 'stretch', md: 'center' } }}
        >
          Atualizar
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} md="auto" sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.25 }}>
            <PeriodSelector
              period={period}
              onChange={(p) => applyPeriod(p)}
              showLabel={false}
              compact
            />
          </Grid>

          {period === 'monthly' ? (
            <Grid item xs={12} sm={6} md={2}>
              <TextField
                fullWidth
                type="month"
                label="Mês"
                size="small"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={FILTER_CONTROL_SX}
              />
            </Grid>
          ) : null}

          <Grid item xs={6} sm={4} md={2}>
            <TextField
              fullWidth
              type="date"
              label="De"
              size="small"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={FILTER_CONTROL_SX}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <TextField
              fullWidth
              type="date"
              label="Até"
              size="small"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={FILTER_CONTROL_SX}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" sx={FILTER_CONTROL_SX}>
              <InputLabel>Analista</InputLabel>
              <Select
                label="Analista"
                value={analistaId}
                onChange={(e) => setAnalistaId(String(e.target.value))}
              >
                <MenuItem value="">Todos</MenuItem>
                {(md.analistas || []).map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md="auto" sx={{ display: 'flex', alignItems: 'flex-end', pb: 0.5 }}>
            <Chip
              size="small"
              label={`${rules.length} regra(s) ativas`}
              variant="outlined"
              sx={{ height: 32 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Chamados concluídos"
            value={String(summary.totalChamados)}
            subtitle={formatSlaCountsByPageLabel(summary.countsByPage)}
            icon={<DoneIcon fontSize="small" />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Com regra SLA"
            value={String(summary.matchedCount)}
            subtitle={
              summary.unmatchedCount > 0
                ? `${summary.unmatchedCount} sem regra correspondente`
                : 'Todos com regra'
            }
            icon={<RuleIcon fontSize="small" />}
            color="#0b6e4f"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="% dentro do prazo"
            value={
              summary.pctDentro != null
                ? `${String(summary.pctDentro).replace('.', ',')}%`
                : '—'
            }
            subtitle={`${summary.dentroCount} dentro · ${summary.foraCount} fora`}
            icon={<OkIcon fontSize="small" />}
            color="#15803d"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="% fora do prazo"
            value={
              summary.pctFora != null ? `${String(summary.pctFora).replace('.', ',')}%` : '—'
            }
            subtitle={
              summary.semExecucaoCount > 0
                ? `${summary.semExecucaoCount} sem data de início`
                : 'Comparado ao prazo útil da regra'
            }
            icon={<LateIcon fontSize="small" />}
            color="#b91c1c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Prazo SLA (úteis)"
            value={summary.prazoSlaLabel}
            subtitle={diasLabel || 'Soma dos prazos das regras'}
            icon={<SlaIcon fontSize="small" />}
            color="#0f766e"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Tempo executado"
            value={summary.tempoExecutadoLabel}
            subtitle="Horas úteis do início ao fim, sem pausas"
            icon={<TimeIcon fontSize="small" />}
            color="#334155"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Maior cumprimento"
            value={
              summary.maiorCumprimento
                ? `${String(summary.maiorCumprimento.pctDentro).replace('.', ',')}%`
                : '—'
            }
            subtitle={
              summary.maiorCumprimento
                ? `${summary.maiorCumprimento.analistaNome} · ${summary.maiorCumprimento.dentroCount}/${summary.maiorCumprimento.totalChamados}`
                : 'Sem chamados avaliáveis no período'
            }
            icon={<HighIcon fontSize="small" />}
            color="#15803d"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Menor cumprimento"
            value={
              summary.menorCumprimento
                ? `${String(summary.menorCumprimento.pctDentro).replace('.', ',')}%`
                : '—'
            }
            subtitle={
              summary.menorCumprimento
                ? `${summary.menorCumprimento.analistaNome} · ${summary.menorCumprimento.dentroCount}/${summary.menorCumprimento.totalChamados}`
                : 'Sem chamados avaliáveis no período'
            }
            icon={<LowIcon fontSize="small" />}
            color="#b91c1c"
          />
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Por analista
          </Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={40} />
                <TableCell>Analista</TableCell>
                <TableCell>Por página</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Dentro</TableCell>
                <TableCell align="right">Fora</TableCell>
                <TableCell align="right">% cumprimento</TableCell>
                <TableCell align="right">Prazo SLA</TableCell>
                <TableCell align="right">Executado</TableCell>
                <TableCell align="right">Sem regra</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.byAnalista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Nenhum chamado concluído no período nas páginas monitoradas.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                summary.byAnalista.map((row) => (
                  <AnalistaBlock
                    key={row.analistaId}
                    row={row}
                    open={!!expanded[row.analistaId]}
                    onToggle={() => toggleRow(row.analistaId)}
                    isMaior={summary.maiorCumprimento?.analistaId === row.analistaId}
                    isMenor={
                      summary.menorCumprimento?.analistaId === row.analistaId &&
                      summary.maiorCumprimento?.analistaId !== row.analistaId
                    }
                  />
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}

function TicketLink({ chamado }: { chamado: ChamadoSlaResult }) {
  const href = getTicketDetailPath(chamado.pageKey, chamado.id)
  const label = chamado.ticket || 'Sem ticket'
  if (!href) {
    return (
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    )
  }
  return (
    <Link
      component={RouterLink}
      to={href}
      underline="hover"
      variant="body2"
      sx={{ fontWeight: 600 }}
      title={`Abrir ${chamado.pageLabel}`}
    >
      {label}
    </Link>
  )
}

function AnalistaBlock({
  row,
  open,
  onToggle,
  isMaior,
  isMenor,
}: {
  row: AnalistaSlaRow
  open: boolean
  onToggle: () => void
  isMaior?: boolean
  isMenor?: boolean
}) {
  return (
    <>
      <TableRow hover sx={{ '& > *': { borderBottom: open ? 'none' : undefined } }}>
        <TableCell>
          <IconButton size="small" onClick={onToggle}>
            {open ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.75} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {row.analistaNome}
            </Typography>
            {isMaior ? <Chip size="small" color="success" label="maior" /> : null}
            {isMenor ? <Chip size="small" color="error" variant="outlined" label="menor" /> : null}
          </Stack>
        </TableCell>
        <TableCell>
          <Typography variant="caption" color="text.secondary">
            {formatSlaCountsByPageLabel(row.countsByPage)}
          </Typography>
        </TableCell>
        <TableCell align="right">{row.totalChamados}</TableCell>
        <TableCell align="right">{row.dentroCount}</TableCell>
        <TableCell align="right">{row.foraCount}</TableCell>
        <TableCell align="right">
          {row.pctDentro != null ? `${String(row.pctDentro).replace('.', ',')}%` : '—'}
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2">{row.prazoSlaLabel}</Typography>
          {row.prazoSlaDiasUteis != null ? (
            <Typography variant="caption" color="text.secondary">
              {String(row.prazoSlaDiasUteis).replace('.', ',')}d úteis
            </Typography>
          ) : null}
        </TableCell>
        <TableCell align="right">{row.tempoExecutadoLabel}</TableCell>
        <TableCell align="right">
          {row.unmatchedCount > 0 ? (
            <Chip size="small" color="warning" variant="outlined" label={row.unmatchedCount} />
          ) : (
            '0'
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={10} sx={{ py: 0, borderBottom: open ? undefined : 'none' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 1.5, px: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket</TableCell>
                    <TableCell>Página</TableCell>
                    <TableCell>Impacto</TableCell>
                    <TableCell>Conclusão</TableCell>
                    <TableCell align="right">Prazo SLA</TableCell>
                    <TableCell align="right">Executado</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.chamados.map((c) => (
                    <TableRow key={c.id} hover>
                      <TableCell>
                        <TicketLink chamado={c} />
                      </TableCell>
                      <TableCell>{c.pageLabel}</TableCell>
                      <TableCell>{getSlaImpactoShortLabel(c.impacto)}</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {String(c.dataConclusao).slice(0, 10)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {c.matched ? formatPrazoSlaLabel(c.prazoSlaSeconds) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {c.tempoExecutadoSeconds != null
                          ? formatSecondsToHms(c.tempoExecutadoSeconds) || '00:00:00'
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={formatSlaStatusLabel(c.status)}
                          color={statusChipColor(c.status)}
                          variant={c.status === 'dentro' ? 'filled' : 'outlined'}
                          icon={
                            c.status === 'fora' ? (
                              <WarnIcon />
                            ) : c.status === 'dentro' ? (
                              <OkIcon />
                            ) : undefined
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  )
}
