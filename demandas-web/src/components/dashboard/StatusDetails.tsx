import React, { useMemo } from 'react'
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
  alpha
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

interface StatusDetailsProps {
  areaId?: string
  analistaId?: string
  fromDate?: string
  toDate?: string
}

// Função para calcular dias úteis (exclui sábados e domingos)
const calculateBusinessDays = (startDate: Date, endDate: Date): number => {
  let count = 0
  const current = new Date(startDate)
  current.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  
  while (current <= end) {
    const dayOfWeek = current.getDay()
    // 0 = domingo, 6 = sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return count
}

// Função para calcular tempo em aberto (dias úteis)
const calculateOpenTime = (createdAt?: string, dataFinal?: string): number => {
  if (!createdAt) return 0
  try {
    const start = new Date(createdAt)
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
  if (days === 0) return 'Hoje'
  if (days === 1) return '1 dia'
  if (days < 30) return `${days} dias`
  if (days < 365) {
    const months = Math.floor(days / 30)
    const remainingDays = days % 30
    if (remainingDays === 0) return `${months} ${months === 1 ? 'mês' : 'meses'}`
    return `${months} ${months === 1 ? 'mês' : 'meses'} e ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`
  }
  const years = Math.floor(days / 365)
  const remainingDays = days % 365
  const months = Math.floor(remainingDays / 30)
  if (months === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${months} ${months === 1 ? 'mês' : 'meses'}`
}

// Função para obter cor do status
const getStatusColor = (status: string): string => {
  const statusLower = status.toLowerCase()
  if (statusLower.includes('concluíd') || statusLower.includes('finalizad') || statusLower.includes('resolvid') || statusLower.includes('aprovad')) {
    return '#10b981' // verde
  }
  if (statusLower.includes('pendente') || statusLower.includes('aguardando')) {
    return '#f59e0b' // amarelo
  }
  if (statusLower.includes('em andamento') || statusLower.includes('em progresso')) {
    return '#3b82f6' // azul
  }
  if (statusLower.includes('cancelad') || statusLower.includes('rejeitad')) {
    return '#ef4444' // vermelho
  }
  return '#6b7280' // cinza
}

export const StatusDetails: React.FC<StatusDetailsProps> = ({
  areaId,
  analistaId,
  fromDate,
  toDate
}) => {
  const theme = useTheme()
  const demandStore = useDemandStore()
  const manutencaoStore = useManutencaoStore()
  const reajusteStore = useReajusteStore()
  const validationStore = useValidationStore()
  const atendimentoStore = useAtendimentoStore()
  const reportStore = useReportStore()

  // Função para filtrar por data
  const inRange = (iso?: string) => {
    if (!iso) return true
    if (!fromDate && !toDate) return true
    
    try {
      const itemDate = new Date(iso)
      if (isNaN(itemDate.getTime())) return true
      
      // Normalizar para início do dia (00:00:00)
      const normalizeStart = (dateStr: string) => {
        const d = new Date(dateStr)
        d.setHours(0, 0, 0, 0)
        return d.getTime()
      }
      
      // Normalizar para fim do dia (23:59:59.999)
      const normalizeEnd = (dateStr: string) => {
        const d = new Date(dateStr)
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
  const demandasFiltradas = useMemo(() => 
    demandStore.items.filter(d => 
      (!areaId || d.area === areaId) && 
      (!analistaId || d.analista === analistaId) && 
      inRange(d.dataInicio || d.createdAt)
    ), 
    [demandStore.items, areaId, analistaId, fromDate, toDate]
  )

  const manutencoesFiltradas = useMemo(() => 
    manutencaoStore.items.filter(m => 
      (!analistaId || m.analista === analistaId) && 
      inRange(m.dataInicio || m.createdAt)
    ), 
    [manutencaoStore.items, analistaId, fromDate, toDate]
  )

  const reajustesFiltrados = useMemo(() => 
    reajusteStore.items.filter(r => 
      (!analistaId || r.responsavelAnalista === analistaId) && 
      inRange(r.createdAt)
    ), 
    [reajusteStore.items, analistaId, fromDate, toDate]
  )

  const validacoesFiltradas = useMemo(() => 
    validationStore.items.filter(v => 
      (!analistaId || v.analista === analistaId) && 
      inRange(v.dataInicio)
    ), 
    [validationStore.items, analistaId, fromDate, toDate]
  )

  const atendimentosFiltrados = useMemo(() => 
    atendimentoStore.items.filter(a => 
      (!areaId || a.area === areaId) && 
      (!analistaId || a.analista === analistaId) && 
      inRange(a.dataInicio || a.createdAt)
    ), 
    [atendimentoStore.items, areaId, analistaId, fromDate, toDate]
  )

  const analyticsFiltrados = useMemo(() => 
    reportStore.items.filter(r => 
      (!analistaId || r.analista === analistaId) && 
      inRange(r.dataCriacao || r.createdAt)
    ), 
    [reportStore.items, analistaId, fromDate, toDate]
  )

  // Calcular estatísticas por status
  const calculateStatusStats = (items: any[], dateField: string = 'createdAt', finalField?: string) => {
    const statusMap = new Map<string, { count: number; totalDays: number; items: any[] }>()
    
    items.forEach(item => {
      const status = item.status || 'Sem status'
      const openTime = calculateOpenTime(item[dateField] || item.createdAt, finalField ? item[finalField] : undefined)
      
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

  const demandasPorStatus = useMemo(() => 
    calculateStatusStats(demandasFiltradas, 'dataInicio', 'dataFinal'),
    [demandasFiltradas]
  )

  const manutencoesPorStatus = useMemo(() => 
    calculateStatusStats(manutencoesFiltradas, 'dataInicio', 'dataFinal'),
    [manutencoesFiltradas]
  )

  const reajustesPorStatus = useMemo(() => 
    calculateStatusStats(reajustesFiltrados, 'createdAt'),
    [reajustesFiltrados]
  )

  const validacoesPorStatus = useMemo(() => 
    calculateStatusStats(validacoesFiltradas, 'dataInicio', 'dataFim'),
    [validacoesFiltradas]
  )

  const atendimentosPorStatus = useMemo(() => 
    calculateStatusStats(atendimentosFiltrados, 'dataInicio', 'dataFinal'),
    [atendimentosFiltrados]
  )

  const analyticsPorStatus = useMemo(() => 
    calculateStatusStats(analyticsFiltrados, 'dataCriacao', 'dataAtualizacao'),
    [analyticsFiltrados]
  )

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
              label={totalItems}
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
                        {row.count}
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
                        {totalItems > 0 ? Math.round((row.count / totalItems) * 100) : 0}%
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
  const hasAnyData = demandasPorStatus.length > 0 || 
                    manutencoesPorStatus.length > 0 || 
                    reajustesPorStatus.length > 0 || 
                    validacoesPorStatus.length > 0 ||
                    atendimentosPorStatus.length > 0 ||
                    analyticsPorStatus.length > 0

  return (
    <Box>
      <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <TimeIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Detalhes de Status e Tempo de Abertura
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Análise detalhada dos status e tempo médio (em dias úteis) que cada item permanece aberto no sistema
        </Typography>

        {hasAnyData ? (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              {renderStatusTable('Demandas', demandasPorStatus, '#3b82f6')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderStatusTable('Manutenções', manutencoesPorStatus, '#ef4444')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderStatusTable('Reajustes', reajustesPorStatus, '#8b5cf6')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderStatusTable('Validações', validacoesPorStatus, '#f59e0b')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderStatusTable('Atendimentos', atendimentosPorStatus, '#10b981')}
            </Grid>
            <Grid item xs={12} md={6}>
              {renderStatusTable('Analytics', analyticsPorStatus, '#06b6d4')}
            </Grid>
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

