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
  Speed as SpeedIcon,
  WarningAmber as WarnIcon,
  CheckCircleOutline as OkIcon,
  AccessTime as TimeIcon,
  AssignmentTurnedIn as DoneIcon,
  TrendingUp as HighIcon,
  TrendingDown as LowIcon,
  CalendarMonth as MonthIcon,
  Timeline as AvgIcon,
  PeopleOutline as PeopleIcon,
  CompareArrows as CompareIcon,
} from '@mui/icons-material'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { getApi } from '../lib/apiConfig'
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
import {
  buildProdutividadeDashboard,
  formatCountsByPageLabel,
  type AnalistaProdutividadeRow,
  type ProdutividadePresencaInput,
} from './produtividadeDashboard'
import {
  evaluateTicketProdutividade,
  extractAnalyticsDims,
  extractAtendimentoDims,
  extractDemandaDims,
  extractManutencaoDims,
  extractReajusteDims,
  extractValidacaoDims,
  PRODUTIVIDADE_DASHBOARD_PAGES,
  PRODUTIVIDADE_PAGE_LABEL,
  type ChamadoProdutividadeResult,
  type ProdutividadePageKey,
  type ProdutividadeRegraRow,
} from './produtividadeMatching'

/** Rota de detalhe do chamado por página de produtividade. */
function getTicketDetailPath(pageKey: ProdutividadePageKey | string, id: string): string | null {
  const map: Partial<Record<ProdutividadePageKey, string>> = {
    demandas: 'cadastro',
    manutencoes: 'manutencao',
    atendimentos: 'atendimento',
    validacoes: 'validacao',
    reajustes: 'reajuste',
    analytics: 'analytics',
  }
  const base = map[pageKey as ProdutividadePageKey]
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
      start = new Date(today)
      end = new Date(today)
      break
    case 'quarterly': {
      const quarter = Math.floor(now.getMonth() / 3)
      start = new Date(now.getFullYear(), quarter * 3, 1)
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0)
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
  minWidth: 0,
  '& .MuiInputBase-root': { height: 40 },
} as const

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
  const theme = useTheme()
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        height: '100%',
        borderRadius: 2,
        border: `1px solid ${alpha(color, 0.22)}`,
        background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${theme.palette.background.paper} 70%)`,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: alpha(color, 0.15),
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
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2, mt: 0.25 }}>
            {value}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  )
}

export default function DashboardProdutividadePage() {
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
  const [rules, setRules] = useState<ProdutividadeRegraRow[]>([])
  const [presenca, setPresenca] = useState<ProdutividadePresencaInput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const loadPresenca = useCallback(async (from: string, to: string) => {
    if (!from || !to) {
      setPresenca(null)
      return
    }
    try {
      const api = getApi()
      const data = await api.get<{
        equipePrevista: number
        pessoasComPresenca: number
        pessoaDiasPresentes: number
        users: Array<{ analistaId: string | null; daysPresent: number }>
        warning?: string
      }>(
        `/monitoring/presence-range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&department=${encodeURIComponent('NIG')}`
      )
      if (data?.warning) {
        console.warn('Presença NIG:', data.warning)
      }
      const diasPresentesByAnalistaId: Record<string, number> = {}
      for (const u of data?.users || []) {
        if (!u.analistaId) continue
        diasPresentesByAnalistaId[u.analistaId] =
          (diasPresentesByAnalistaId[u.analistaId] || 0) + (u.daysPresent || 0)
      }
      setPresenca({
        // Roster do departamento NIG (ex.: 6 pessoas ativas com department = NIG)
        equipePrevista: Math.max(data?.equipePrevista || 0, 0),
        pessoasPresentes: data?.pessoasComPresenca || 0,
        // Pessoa-dias só de users NIG (API já filtra o departamento)
        pessoaDiasPresentes: data?.pessoaDiasPresentes || 0,
        diasPresentesByAnalistaId,
      })
    } catch (e) {
      console.warn('Presença/monitoring indisponível para capacidade real:', e)
      setPresenca(null)
    }
  }, [])

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

  const handleFromDateChange = useCallback((value: string) => {
    setFromDate(value)
    if (value && value.length >= 7) setSelectedMonth(value.slice(0, 7))
  }, [])

  const handleToDateChange = useCallback((value: string) => {
    setToDate(value)
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
      const api = getApi()
      const data = await api.get<ProdutividadeRegraRow[]>('/produtividade-regras')
      setRules(Array.isArray(data) ? data.filter((r) => r.ativo !== false) : [])
      await loadPresenca(fromDate, toDate)
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar produtividade')
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
    fromDate,
    toDate,
    loadPresenca,
  ])

  useEffect(() => {
    if (isAdmin) void loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => {
    if (!isAdmin) return
    void loadPresenca(fromDate, toDate)
  }, [isAdmin, fromDate, toDate, loadPresenca])

  const analistasList = useMemo(
    () => (md.analistas || []).map((a) => ({ id: a.id, nome: a.nome })),
    [md.analistas]
  )

  const chamados = useMemo((): ChamadoProdutividadeResult[] => {
    const out: ChamadoProdutividadeResult[] = []
    const pushPage = (
      page: string,
      items: any[],
      extract: (item: any) => ReturnType<typeof extractDemandaDims>
    ) => {
      for (const item of items || []) {
        if (!isItemConcluidoProducao(page, item)) continue
        const dataConclusao = getDataReferenciaConclusao(page, item)
        if (!dataConclusao) continue
        out.push(
          evaluateTicketProdutividade({
            item,
            dims: extract(item),
            rules,
            dataConclusao,
            dataInicio: getExecutionStartDate(page, item) || null,
            dataFinal: getExecutionEndDate(page, item) || null,
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
      buildProdutividadeDashboard({
        chamados,
        fromDate,
        toDate,
        analistaNomeById,
        analistaIdFilter: analistaId || null,
        presenca,
      }),
    [chamados, fromDate, toDate, analistaNomeById, analistaId, presenca]
  )

  if (!isAdmin) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          A página de Produtividade do Dashboard é restrita a administradores.
        </Alert>
        <Button startIcon={<BackIcon />} onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </Button>
      </Box>
    )
  }

  const toggleRow = (id: string) =>
    setExpanded((s) => ({ ...s, [id]: !s[id] }))

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
            Produtividade
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Produção por analista × tempo previsto (Dados → Produtividade). Capacidade prevista/real
            considera só o departamento NIG (logins do painel de usuários). Páginas:{' '}
            {PRODUTIVIDADE_DASHBOARD_PAGES.map((k) => PRODUTIVIDADE_PAGE_LABEL[k]).join(', ')}.
            Conclusão pelo dia em que o chamado foi concluído.
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
              onChange={(e) => handleFromDateChange(e.target.value)}
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
              onChange={(e) => handleToDateChange(e.target.value)}
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
            subtitle={formatCountsByPageLabel(summary.countsByPage)}
            icon={<DoneIcon fontSize="small" />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Média / dia útil"
            value={summary.mediaDiaLabel}
            subtitle={
              summary.pctMediaDia != null
                ? `${String(summary.pctMediaDia).replace('.', ',')}% de 1 jornada · média por pessoa · ${summary.businessDaysInRange} dia(s)`
                : `Média por pessoa · ${summary.businessDaysInRange} dia(s) útil(is)`
            }
            icon={<AvgIcon fontSize="small" />}
            color="#0b6e4f"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="% do mês (previsto)"
            value={
              summary.pctMesCapacidade != null
                ? `${String(summary.pctMesCapacidade).replace('.', ',')}%`
                : '—'
            }
            subtitle={`Previsto ${summary.tempoPrevistoLabel} ÷ capacidade ${summary.capacidadePeriodoLabel}`}
            icon={<MonthIcon fontSize="small" />}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="% do mês (real)"
            value={
              summary.pctMesCapacidadeReal != null
                ? `${String(summary.pctMesCapacidadeReal).replace('.', ',')}%`
                : '—'
            }
            subtitle={
              summary.capacidadeRealLabel
                ? `Previsto ÷ capacidade real ${summary.capacidadeRealLabel}`
                : 'Sem dados de login/presença no período'
            }
            icon={<CompareIcon fontSize="small" />}
            color="#0f766e"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Jornadas 8h"
            value={String(summary.jornadasEquivalentes).replace('.', ',')}
            subtitle={
              summary.unmatchedCount > 0
                ? `${summary.unmatchedCount} chamado(s) sem regra`
                : 'Previsto total ÷ 08:00:00'
            }
            icon={
              summary.unmatchedCount > 0 ? (
                <WarnIcon fontSize="small" />
              ) : (
                <SpeedIcon fontSize="small" />
              )
            }
            color="#b45309"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Maior índice"
            value={
              summary.maiorIndice
                ? `${String(summary.maiorIndice.pctMesCapacidade).replace('.', ',')}%`
                : '—'
            }
            subtitle={
              summary.maiorIndice
                ? `${summary.maiorIndice.analistaNome} · média ${summary.maiorIndice.mediaDiaLabel}/dia`
                : 'Sem produção com regra no período'
            }
            icon={<HighIcon fontSize="small" />}
            color="#15803d"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Menor índice"
            value={
              summary.menorIndice
                ? `${String(summary.menorIndice.pctMesCapacidade).replace('.', ',')}%`
                : '—'
            }
            subtitle={
              summary.menorIndice
                ? `${summary.menorIndice.analistaNome} · média ${summary.menorIndice.mediaDiaLabel}/dia`
                : 'Sem produção com regra no período'
            }
            icon={<LowIcon fontSize="small" />}
            color="#b91c1c"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Tempo previsto"
            value={summary.tempoPrevistoLabel}
            subtitle="Soma de todas as páginas ativas"
            icon={<TimeIcon fontSize="small" />}
            color="#334155"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Capacidade prevista"
            value={summary.capacidadePeriodoLabel}
            subtitle={`${summary.businessDaysInRange} dia(s) × 08:00:00 × ${summary.pessoasCapacidade} pessoa(s) NIG`}
            icon={<OkIcon fontSize="small" />}
            color="#475569"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Capacidade real"
            value={summary.capacidadeRealLabel || '—'}
            subtitle={
              summary.pessoaDiasPresentes != null
                ? [
                    summary.pessoasPresentes != null
                      ? `${summary.pessoasPresentes} de ${summary.pessoasCapacidade} do NIG com login no período`
                      : null,
                    `soma ${summary.pessoaDiasPresentes} dia(s) de presença × 08:00:00`,
                    summary.pctPresencaCapacidade != null
                      ? `${String(summary.pctPresencaCapacidade).replace('.', ',')}% da prevista`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : 'Logins do departamento NIG (painel de usuários)'
            }
            icon={<PeopleIcon fontSize="small" />}
            color="#1d4ed8"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KpiCard
            title="Pessoas presentes (NIG)"
            value={
              summary.pessoasPresentes != null
                ? String(summary.pessoasPresentes)
                : '—'
            }
            subtitle={
              summary.pessoasPresentes != null
                ? `de ${summary.pessoasCapacidade} no departamento NIG · cada dia com login conta na capacidade real`
                : 'Aguardando monitoramento de login'
            }
            icon={<PeopleIcon fontSize="small" />}
            color="#64748b"
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
                <TableCell align="right">Previsto</TableCell>
                <TableCell align="right">Média/dia</TableCell>
                <TableCell align="right">% capacidade</TableCell>
                <TableCell align="right">Jornadas</TableCell>
                <TableCell align="right">Sem regra</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {summary.byAnalista.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9}>
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
                    isMaior={summary.maiorIndice?.analistaId === row.analistaId}
                    isMenor={
                      summary.menorIndice?.analistaId === row.analistaId &&
                      summary.maiorIndice?.analistaId !== row.analistaId
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

function TicketLink({ chamado }: { chamado: ChamadoProdutividadeResult }) {
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
  row: AnalistaProdutividadeRow
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
            {formatCountsByPageLabel(row.countsByPage)}
          </Typography>
        </TableCell>
        <TableCell align="right">{row.totalChamados}</TableCell>
        <TableCell align="right">{row.tempoPrevistoLabel}</TableCell>
        <TableCell align="right">
          <Typography variant="body2" component="span">
            {row.mediaDiaLabel}
          </Typography>
          {row.pctMediaDia != null ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {String(row.pctMediaDia).replace('.', ',')}% jorn.
            </Typography>
          ) : null}
        </TableCell>
        <TableCell align="right">
          {row.pctMesCapacidade != null
            ? `${String(row.pctMesCapacidade).replace('.', ',')}%`
            : '—'}
          {row.diasPresentes != null ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {row.diasPresentes} dia(s) presente
            </Typography>
          ) : null}
        </TableCell>
        <TableCell align="right">{String(row.jornadasEquivalentes).replace('.', ',')}</TableCell>
        <TableCell align="right">
          {row.unmatchedCount > 0 ? (
            <Chip size="small" color="warning" label={row.unmatchedCount} />
          ) : (
            0
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, bgcolor: 'action.hover' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Chamados do período (previsto pela regra; executado ainda não cadastrado no chamado)
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket</TableCell>
                    <TableCell>Página</TableCell>
                    <TableCell>Conclusão</TableCell>
                    <TableCell>Início</TableCell>
                    <TableCell>Fim</TableCell>
                    <TableCell align="right">Previsto</TableCell>
                    <TableCell align="right">Executado</TableCell>
                    <TableCell>Regra</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {row.chamados.map((c) => (
                    <TableRow key={`${c.pageKey}-${c.id}`}>
                      <TableCell>
                        <TicketLink chamado={c} />
                      </TableCell>
                      <TableCell>{c.pageLabel}</TableCell>
                      <TableCell>{String(c.dataConclusao).slice(0, 10)}</TableCell>
                      <TableCell>
                        {c.dataInicio ? String(c.dataInicio).slice(0, 10) : '—'}
                      </TableCell>
                      <TableCell>
                        {c.dataFinal ? String(c.dataFinal).slice(0, 10) : '—'}
                      </TableCell>
                      <TableCell align="right">
                        {formatSecondsToHms(c.tempoPrevistoSeconds) || '00:00:00'}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="caption" color="text.secondary">
                          em breve
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {c.matched ? (
                          <Chip size="small" color="success" label="ok" />
                        ) : (
                          <Chip size="small" color="warning" label="sem regra" />
                        )}
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
