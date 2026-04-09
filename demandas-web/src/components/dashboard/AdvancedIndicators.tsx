import React from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  LinearProgress,
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
import type { AdvancedIndicator, TempoExecucaoMetrics, AnalistaMetrics } from '../../hooks/useAdvancedIndicators'
import { formatDecimalPtBR, formatIntegerPtBR, formatNumberPtBR } from '../../utils/formatNumber'

interface AdvancedIndicatorsProps {
  indicators: AdvancedIndicator[]
  tempoExecucaoMetrics: TempoExecucaoMetrics[]
  analistaMetrics: AnalistaMetrics[]
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
  analytics: 'Analytics'
}

export const AdvancedIndicators: React.FC<AdvancedIndicatorsProps> = ({
  indicators,
  tempoExecucaoMetrics,
  analistaMetrics
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
        <Grid container spacing={3}>
          {analistaMetrics.map((analista) => (
            <Grid item xs={12} sm={6} md={4} key={analista.analistaId}>
              <Card sx={{ borderRadius: 3, height: '100%' }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PersonIcon sx={{ fontSize: 20, color: theme.palette.primary.main, mr: 1 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {analista.analistaNome}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="h3" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                      {formatIntegerPtBR(analista.totalItens)} <span style={{ fontSize: '0.5em', color: theme.palette.text.secondary }}>itens</span>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Tempo médio: {formatDecimalPtBR(analista.tempoMedioExecucao, 1)} dias
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Distribuição por página:
                    </Typography>
                    {Object.entries(analista.itensPorPagina)
                      .sort(([, a], [, b]) => Number(b) - Number(a)) // Ordenar por quantidade (maior primeiro)
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
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  )
}
