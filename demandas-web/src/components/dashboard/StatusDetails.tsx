import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  useTheme,
  alpha,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import {
  AccessTime as TimeIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { useDemandStore } from '../../store/demandStore'
import { useManutencaoStore } from '../../store/manutencaoStore'
import { useReajusteStore } from '../../store/reajusteStore'
import { useValidationStore } from '../../store/validationStore'
import { useAtendimentoStore } from '../../store/atendimentoStore'
import { useReportStore } from '../../store/reportStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { useAuthStore } from '../../store/authStore'
import {
  calculateBusinessDays,
  getExecutionEndDate,
  getExecutionStartDate,
  getItemDateForPage,
  matchesByIdOrName,
  parseDateForFilter
} from '../../utils/dashboardFilters'
import { canViewDashboardPage, isDashboardItemOwnedByUser } from '../../utils/dashboardUserScope'
import { getUserPermissions } from '../../utils/defaultPermissions'
import { formatIntegerPtBR } from '../../utils/formatNumber'

interface StatusDetailsProps {
  areaId?: string
  analistaId?: string
  fromDate?: string
  toDate?: string
  showAnalistaFilter?: boolean
  /** Enquanto o vínculo usuário↔analista não foi resolvido, não exibe contagens globais. */
  userScopePending?: boolean
  /** Sem analista vinculado: filtra por nome/e-mail do usuário logado. */
  ownScopeFallback?: boolean
}

// Tempo em aberto = dias úteis (seg–sex) entre data de início e data final do chamado; sem data final, até hoje.
const calculateOpenTime = (dataInicio?: string, dataFinal?: string): number => {
  if (!dataInicio) return 0
  try {
    const start = new Date(dataInicio)
    if (isNaN(start.getTime())) return 0

    const end = dataFinal ? new Date(dataFinal) : new Date()
    if (dataFinal && isNaN(end.getTime())) {
      return calculateBusinessDays(start, new Date())
    }

    if (end < start) return 0

    return calculateBusinessDays(start, end)
  } catch {
    return 0
  }
}

// Função para formatar tempo
const formatTime = (days: number): string => {
  const n = (x: number) => formatIntegerPtBR(x)
  if (days === 0) return 'Hoje'
  if (days === 1) return '1 dia'
  if (days < 30) return `${n(days)} dias`
  if (days < 365) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    if (remainingDays === 0) return `${n(months)} ${months === 1 ? 'mês' : 'meses'}`
    return `${n(months)} ${months === 1 ? 'mês' : 'meses'} e ${n(remainingDays)} ${remainingDays === 1 ? 'dia' : 'dias'}`
  }
  const years = Math.floor(days / 365)
  const remainingDays = days % 365
  const months = Math.floor(remainingDays / 30)
  if (months === 0) return `${n(years)} ${years === 1 ? 'ano' : 'anos'}`
  return `${n(years)} ${years === 1 ? 'ano' : 'anos'} e ${n(months)} ${months === 1 ? 'mês' : 'meses'}`
}

// Função para obter cor do status
const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase()
  if (statusLower.includes('concluíd') || statusLower.includes('finalizad') || statusLower.includes('resolvid') || statusLower.includes('aprovad')) {
    return '#00A649' // verde
  }
  if (statusLower.includes('pendente') || statusLower.includes('aguardando')) {
    return '#E5B800' // amarelo
  }
  if (statusLower.includes('em andamento') || statusLower.includes('em progresso')) {
    return '#009FDF' // azul
  }
  if (statusLower.includes('cancelad') || statusLower.includes('rejeitad')) {
    return '#DA3832' // vermelho
  }
  return '#6b7280' // cinza
}

export const StatusDetails: React.FC<StatusDetailsProps> = ({
  areaId,
  analistaId,
  fromDate,
  toDate,
  showAnalistaFilter = false,
  userScopePending = false,
  ownScopeFallback = false
}) => {
  const theme = useTheme()
  const user = useAuthStore((s) => s.user)
  const permissions = getUserPermissions(user?.permissions, user?.role ?? '')
  const demandStore = useDemandStore()
  const manutencaoStore = useManutencaoStore()
  const reajusteStore = useReajusteStore()
  const validationStore = useValidationStore()
  const atendimentoStore = useAtendimentoStore()
  const reportStore = useReportStore()
  const masterDataStore = useMasterDataStore()
  const [selectedAnalistaId, setSelectedAnalistaId] = useState('')

  useEffect(() => {
    if (!selectedAnalistaId) {
      setSelectedAnalistaId(analistaId || '')
    }
  }, [analistaId, selectedAnalistaId])

  const analistaIdForFilter = selectedAnalistaId || analistaId || ''

  const matchesAnalistaScope = (page: string, item: Record<string, unknown>) => {
    if (analistaIdForFilter) {
      const getAnalistaValue = () => {
        if (page === 'reajustes') return item.responsavelAnalista
        if (page === 'manutencoes') return item.analistaId || item.analista
        if (page === 'validacoes') {
          return item.analistaId
            || (item.analistaObj as { id?: string } | undefined)?.id
            || (typeof item.analista === 'object' ? (item.analista as { id?: string })?.id : item.analista)
        }
        if (page === 'analytics') return item.analista
        return item.analistaId || item.analista
      }
      return matchesByIdOrName(getAnalistaValue(), analistaIdForFilter, masterDataStore.analistas)
    }
    if (ownScopeFallback) {
      return isDashboardItemOwnedByUser(page, item, user, masterDataStore.analistas)
    }
    return true
  }

  // Função para filtrar por data
  const inRange = (iso?: string) => {
    if (!iso) return true
    if (!fromDate && !toDate) return true
    
    try {
      const itemDate = parseDateForFilter(iso)
      if (!itemDate || isNaN(itemDate.getTime())) return true
      
      // Normalizar para início do dia (00:00:00)
      const normalizeStart = (dateStr: string) => {
        const d = parseDateForFilter(dateStr)
        if (!d) return new Date().getTime()
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      }
      
      // Normalizar para fim do dia (23:59:59.999)
      const normalizeEnd = (dateStr: string) => {
        const d = parseDateForFilter(dateStr)
        if (!d) return new Date().getTime()
        d.setHours(23, 59, 59, 999)
        return d.getTime()
      }
      
      const itemTime = itemDate.getTime()
      
      if (fromDate) {
        const fromTime = normalizeStart(fromDate)
        if (itemTime < fromTime) return false
      }
      
      if (toDate) {
        const toTime = normalizeEnd(toDate)
        if (itemTime > toTime) return false
      }
      
      return true
    } catch {
      return true
    }
  }

  // Filtrar dados
  const demandasFiltradas = useMemo(() => {
    if (userScopePending) return []
    return demandStore.items.filter(d =>
      matchesByIdOrName(d.areaId || d.area, areaId, masterDataStore.areas) &&
      matchesAnalistaScope('demandas', d as Record<string, unknown>) &&
      inRange(getItemDateForPage('demandas', d))
    )
  }, [userScopePending, demandStore.items, areaId, analistaIdForFilter, ownScopeFallback, fromDate, toDate, masterDataStore.areas, masterDataStore.analistas, user?.id])

  const manutencoesFiltradas = useMemo(() => {
    if (userScopePending) return []
    return manutencaoStore.items.filter(m =>
      matchesAnalistaScope('manutencoes', m as Record<string, unknown>) &&
      inRange(getItemDateForPage('manutencoes', m))
    )
  }, [userScopePending, manutencaoStore.items, analistaIdForFilter, ownScopeFallback, fromDate, toDate, masterDataStore.analistas, user?.id])

  const reajustesFiltrados = useMemo(() => {
    if (userScopePending) return []
    return reajusteStore.items.filter(r =>
      matchesAnalistaScope('reajustes', r as Record<string, unknown>) &&
      inRange(getItemDateForPage('reajustes', r))
    )
  }, [userScopePending, reajusteStore.items, analistaIdForFilter, ownScopeFallback, fromDate, toDate, masterDataStore.analistas, user?.id])

  const validacoesFiltradas = useMemo(() => {
    if (userScopePending) return []
    return validationStore.items.filter(v =>
      matchesAnalistaScope('validacoes', v as Record<string, unknown>) &&
      inRange(getItemDateForPage('validacoes', v))
    )
  }, [userScopePending, validationStore.items, analistaIdForFilter, ownScopeFallback, fromDate, toDate, masterDataStore.analistas, user?.id])

  const atendimentosFiltrados = useMemo(() => {
    if (userScopePending) return []
    return atendimentoStore.items.filter(a =>
      matchesByIdOrName((a as { areaId?: string }).areaId || a.area, areaId, masterDataStore.areas) &&
      matchesAnalistaScope('atendimentos', a as Record<string, unknown>) &&
      inRange(getItemDateForPage('atendimentos', a))
    )
  }, [userScopePending, atendimentoStore.items, areaId, analistaIdForFilter, ownScopeFallback, fromDate, toDate, masterDataStore.areas, masterDataStore.analistas, user?.id])

  const analyticsFiltrados = useMemo(() => {
    if (userScopePending) return []
    return reportStore.items.filter(r =>
      matchesAnalistaScope('analytics', r as Record<string, unknown>) &&
      inRange(getItemDateForPage('analytics', r))
    )
  }, [userScopePending, reportStore.items, analistaIdForFilter, ownScopeFallback, fromDate, toDate, masterDataStore.analistas, user?.id])

  // Estatísticas por status: tempo médio em dias úteis entre início e fim operacionais (mesma regra dos indicadores de execução).
  const calculateStatusStats = (items: any[], page: string) => {
    const statusMap = new Map<string, { count: number; totalDays: number; items: any[] }>()

    items.forEach(item => {
      const status = item.status || 'Sem status'
      const start = getExecutionStartDate(page, item)
      const end = getExecutionEndDate(page, item)
      const openTime = calculateOpenTime(start, end)
      
      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, totalDays: 0, items: [] })
      }
      
      const stats = statusMap.get(status)!
      stats.count++
      stats.totalDays += openTime
      stats.items.push(item)
    })
    
    return Array.from(statusMap.entries()).map(([status, stats]) => ({
      status,
      count: stats.count,
      averageDays: stats.count > 0 ? Math.round(stats.totalDays / stats.count) : 0,
      totalDays: stats.totalDays,
      items: stats.items
    })).sort((a, b) => b.count - a.count)
  }

  const demandasPorStatus = useMemo(() => calculateStatusStats(demandasFiltradas, 'demandas'), [demandasFiltradas])

  const manutencoesPorStatus = useMemo(() => calculateStatusStats(manutencoesFiltradas, 'manutencoes'), [manutencoesFiltradas])

  const reajustesPorStatus = useMemo(() => calculateStatusStats(reajustesFiltrados, 'reajustes'), [reajustesFiltrados])

  const validacoesPorStatus = useMemo(() => calculateStatusStats(validacoesFiltradas, 'validacoes'), [validacoesFiltradas])

  const atendimentosPorStatus = useMemo(() => calculateStatusStats(atendimentosFiltrados, 'atendimentos'), [atendimentosFiltrados])

  const analyticsPorStatus = useMemo(() => calculateStatusStats(analyticsFiltrados, 'analytics'), [analyticsFiltrados])

  const renderStatusTable = (title: string, data: typeof demandasPorStatus, color: string) => {
    if (data.length === 0) return null

    const totalItems = data.reduce((sum, item) => sum + item.count, 0)

    return (
      <Card sx={{ mb: 3, height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Box
              sx={{
                width: 4,
                height: 24,
                backgroundColor: color,
                borderRadius: 1,
                mr: 1.5
              }}
            />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Chip
              label={formatIntegerPtBR(totalItems)}
              size="small"
              sx={{
                ml: 'auto',
                backgroundColor: alpha(color, 0.1),
                color: color,
                fontWeight: 600
              }}
            />
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Quantidade</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>Tempo Médio (dias úteis)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>% do Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.status} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(row.status)
                          }}
                        />
                        <Typography variant="body2">{row.status}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatIntegerPtBR(row.count)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                        <TimeIcon sx={{ fontSize: 16, color: theme.palette.text.secondary }} />
                        <Typography variant="body2" color="text.secondary">
                          {formatTime(row.averageDays)}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        {formatIntegerPtBR(totalItems > 0 ? Math.round((row.count / totalItems) * 100) : 0)}%
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    )
  }

  // Verificar se há alguma tabela para exibir
  const hasAnyData = (
    (canViewDashboardPage('demandas', permissions, user?.role ?? '') && demandasPorStatus.length > 0) ||
    (canViewDashboardPage('manutencoes', permissions, user?.role ?? '') && manutencoesPorStatus.length > 0) ||
    (canViewDashboardPage('reajustes', permissions, user?.role ?? '') && reajustesPorStatus.length > 0) ||
    (canViewDashboardPage('validacoes', permissions, user?.role ?? '') && validacoesPorStatus.length > 0) ||
    (canViewDashboardPage('atendimentos', permissions, user?.role ?? '') && atendimentosPorStatus.length > 0) ||
    (canViewDashboardPage('analytics', permissions, user?.role ?? '') && analyticsPorStatus.length > 0)
  )

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 2, flexWrap: 'wrap' }}>
          <TimeIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Detalhes de Status e Tempo de Abertura
          </Typography>
          {showAnalistaFilter && (
            <FormControl size="small" sx={{ minWidth: 240, ml: 'auto' }}>
              <InputLabel>Analista</InputLabel>
              <Select
                value={selectedAnalistaId}
                label="Analista"
                onChange={(e) => setSelectedAnalistaId(String(e.target.value))}
              >
                <MenuItem value="">Todos os analistas</MenuItem>
                {masterDataStore.analistas.map((analista) => (
                  <MenuItem key={analista.id} value={analista.id}>
                    {analista.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Análise detalhada dos status e tempo médio (em dias úteis) que cada item permanece aberto no sistema
        </Typography>

        {hasAnyData ? (
          <Grid container spacing={3}>
            {canViewDashboardPage('demandas', permissions, user?.role ?? '') ? (
            <Grid item xs={12} md={6}>
              {renderStatusTable('Demandas', demandasPorStatus, '#009FDF')}
            </Grid>
            ) : null}
            {canViewDashboardPage('manutencoes', permissions, user?.role ?? '') ? (
            <Grid item xs={12} md={6}>
              {renderStatusTable('Manutenções', manutencoesPorStatus, '#DA3832')}
            </Grid>
            ) : null}
            {canViewDashboardPage('reajustes', permissions, user?.role ?? '') ? (
            <Grid item xs={12} md={6}>
              {renderStatusTable('Reajustes', reajustesPorStatus, '#8b5cf6')}
            </Grid>
            ) : null}
            {canViewDashboardPage('validacoes', permissions, user?.role ?? '') ? (
            <Grid item xs={12} md={6}>
              {renderStatusTable('Validações', validacoesPorStatus, '#E5B800')}
            </Grid>
            ) : null}
            {canViewDashboardPage('atendimentos', permissions, user?.role ?? '') ? (
            <Grid item xs={12} md={6}>
              {renderStatusTable('Atendimentos', atendimentosPorStatus, '#00A649')}
            </Grid>
            ) : null}
            {canViewDashboardPage('analytics', permissions, user?.role ?? '') ? (
            <Grid item xs={12} md={6}>
              {renderStatusTable('Analytics', analyticsPorStatus, '#06b6d4')}
            </Grid>
            ) : null}
          </Grid>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              Nenhum dado disponível para exibir. Os dados serão carregados automaticamente.
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}

