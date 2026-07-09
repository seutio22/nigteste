import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  CircularProgress,
  useTheme,
  alpha
} from '@mui/material'
import {
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material'
import type { AdvancedIndicator, TempoExecucaoMetrics, AnalistaMetrics, UnassignedPerformanceItem } from '../../hooks/useAdvancedIndicators'
import { UNASSIGNED_ANALISTA_KEY } from '../../utils/dashboardFilters'
import { formatDecimalPtBR, formatIntegerPtBR, formatNumberPtBR } from '../../utils/formatNumber'

interface AdvancedIndicatorsProps {
  indicators: AdvancedIndicator[]
  tempoExecucaoMetrics: TempoExecucaoMetrics[]
  analistaMetrics: AnalistaMetrics[]
  unassignedPerformanceItems?: UnassignedPerformanceItem[]
  loading?: boolean
}

const iconMap = {
  Schedule: ScheduleIcon,
  CheckCircle: CheckCircleIcon,
  Person: PersonIcon,
  Warning: WarningIcon,
  TrendingUp: TrendingUpIcon,
  Assessment: AssessmentIcon
}

// Mapeamento de nomes de páginas para exibição
const paginaNomeMap: Record<string, string> = {
  demandas: 'Cadastro',
  atendimentos: 'Atendimentos',
  validacoes: 'Validações',
  reajustes: 'Reajustes',
  manutencoes: 'Manutenções',
  analytics: 'Analytics',
  projetos: 'Projetos'
}

export const AdvancedIndicators: React.FC<AdvancedIndicatorsProps> = ({
  indicators,
  tempoExecucaoMetrics,
  analistaMetrics,
  unassignedPerformanceItems = [],
  loading = false
}) => {
  const theme = useTheme()

  return (
    <Box>
      {/* Indicadores Principais */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: theme.palette.text.primary }}>
          📊 Indicadores de Performance
        </Typography>
        <Grid container spacing={3}>
          {indicators.map((indicator) => {
            const IconComponent = iconMap[indicator.icon as keyof typeof iconMap] || AssessmentIcon
            
            return (
              <Grid item xs={12} sm={6} md={3} key={indicator.id}>
                <Card sx={{ 
                  borderRadius: 3, 
                  height: '100%',
                  transition: 'all 0.3s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: theme.shadows[8]
                  }
                }}>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ 
                        p: 2, 
                        backgroundColor: alpha(indicator.color, 0.1), 
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComponent sx={{ fontSize: 24, color: indicator.color }} />
                      </Box>
                      {indicator.trend && (
                        <Chip 
                          label={indicator.trend === 'up' ? '↗' : indicator.trend === 'down' ? '↘' : '→'} 
                          size="small" 
                          sx={{ backgroundColor: alpha(theme.palette.grey[500], 0.1) }}
                        />
                      )}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary, mb: 1 }}>
                      {typeof indicator.value === 'number' ? formatNumberPtBR(indicator.value) : indicator.value}
                      {indicator.unit && <span style={{ fontSize: '0.6em', color: theme.palette.text.secondary }}> {indicator.unit}</span>}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, mb: 1 }}>
                      {indicator.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {indicator.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>

      {/* Tempo de Execução por Página */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: theme.palette.text.primary }}>
          ⏱️ Tempo de Execução por Página
        </Typography>
        <Grid container spacing={3}>
          {tempoExecucaoMetrics.map((metric) => (
            <Grid item xs={12} sm={6} md={4} key={metric.pagina}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <ScheduleIcon sx={{ fontSize: 20, color: theme.palette.primary.main, mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {metric.pagina}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      {formatDecimalPtBR(metric.tempoMedio, 1)} <span style={{ fontSize: '0.5em', color: theme.palette.text.secondary }}>dias</span>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tempo médio de execução
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Dias úteis (seg–sex) entre data de início e data final
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Taxa de conclusão
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatIntegerPtBR(metric.taxaConclusao)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={metric.taxaConclusao} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: alpha(theme.palette.grey[300], 0.3),
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: metric.taxaConclusao >= 70 ? theme.palette.success.main : 
                                         metric.taxaConclusao >= 50 ? theme.palette.warning.main : 
                                         theme.palette.error.main
                        }
                      }} 
                    />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Total: {formatIntegerPtBR(metric.totalChamados)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Concluídos: {formatIntegerPtBR(metric.chamadosConcluidos)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Métricas por Analista */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 3, color: theme.palette.text.primary }}>
          👥 Performance por Analista
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
        <>
        {unassignedPerformanceItems.length > 0 ? (
          <Card sx={{ borderRadius: 3, mb: 3, border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}` }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: theme.palette.warning.main, mb: 1 }}>
                Itens no período sem analista cadastrado ({formatIntegerPtBR(unassignedPerformanceItems.length)})
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                Lista para diagnóstico (página + id/título + responsável informado no registro).
              </Typography>
              <Grid container spacing={1}>
                {unassignedPerformanceItems.slice(0, 12).map((it, idx) => (
                  <Grid item xs={12} md={6} key={`${it.page}-${it.id ?? it.label}-${idx}`}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {paginaNomeMap[it.page] || it.page}: {it.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {it.reason}
                        {it.kind === 'created' ? ' · criado no período' : it.kind === 'completed' ? ' · concluído no período' : it.kind === 'both' ? ' · criado e concluído' : ''}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {unassignedPerformanceItems.length > 12 ? (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                  Mostrando 12 de {formatIntegerPtBR(unassignedPerformanceItems.length)} (reduza filtros para ver mais).
                </Typography>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Grid container spacing={3}>
          {analistaMetrics.map((analista) => (
            <Grid item xs={12} sm={6} md={4} key={`${analista.analistaId}-${analista.analistaNome}`}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ fontSize: 20, color: theme.palette.primary.main, mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {analista.analistaNome}
                    </Typography>
                    <Chip
                      label={`Total: ${formatIntegerPtBR(analista.totalNoPeriodo)}`}
                      size="small"
                      sx={{ ml: 'auto', backgroundColor: alpha(theme.palette.primary.main, 0.08) }}
                    />
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Grid container spacing={1.5}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.info.main, lineHeight: 1.1 }}>
                          {formatIntegerPtBR(analista.itensCriadosNoPeriodo)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Criados no período
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.success.main, lineHeight: 1.1 }}>
                          {formatIntegerPtBR(analista.itensConcluidosNoPeriodoCriadosNoPeriodo)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Concluídos no período (criados no período)
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="h4" sx={{ fontWeight: 800, color: theme.palette.warning.main, lineHeight: 1.1 }}>
                          {formatIntegerPtBR(analista.itensConcluidosNoPeriodoCriadosFora)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Concluídos no período (criados fora)
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>

                  <Box>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Criados por página (no período)
                        </Typography>
                        {Object.entries(analista.itensPorPagina)
                          .filter(([, qtd]) => Number(qtd) > 0)
                          .sort(([, a], [, b]) => Number(b) - Number(a))
                          .map(([pagina, quantidade]) => {
                            const nomePagina = paginaNomeMap[pagina] || pagina
                            return (
                              <Box key={pagina} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                  {nomePagina}:
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                  {formatIntegerPtBR(quantidade)}
                                </Typography>
                              </Box>
                            )
                          })}
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          Concluídos por página (no período)
                        </Typography>
                        {Object.entries(analista.concluidosNoPeriodoPorPagina)
                          .filter(([, qtd]) => Number(qtd) > 0)
                          .sort(([, a], [, b]) => Number(b) - Number(a))
                          .map(([pagina, quantidade]) => {
                            const nomePagina = paginaNomeMap[pagina] || pagina
                            return (
                              <Box key={pagina} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                                  {nomePagina}:
                                </Typography>
                                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                  {formatIntegerPtBR(quantidade)}
                                </Typography>
                              </Box>
                            )
                          })}
                      </Grid>
                    </Grid>
                  </Box>

                  {analista.analistaId === UNASSIGNED_ANALISTA_KEY && unassignedPerformanceItems.length > 0 ? (
                    <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}` }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
                        Detalhe dos registros
                      </Typography>
                      {unassignedPerformanceItems.slice(0, 8).map((it, idx) => (
                        <Box key={`unassigned-${it.page}-${it.id ?? idx}`} sx={{ mb: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                            {paginaNomeMap[it.page] || it.page}: {it.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {it.reason}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  ) : null}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        </>
        )}
      </Box>
    </Box>
  )
}
