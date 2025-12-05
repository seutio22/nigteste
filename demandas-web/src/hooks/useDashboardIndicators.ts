import { useMemo } from 'react'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useReportStore } from '../store/reportStore'
import { useMaillingStore } from '../store/maillingStore'
import { useComunicadoStore } from '../store/comunicadoStore'
import { useProjectStore } from '../store/projectStore'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../types/dashboardIndicators'
import { PAGE_CONFIGS, COMPLETION_STATUS } from '../types/dashboardIndicators'

// Função utilitária para calcular períodos
const getPeriodDates = (period: PeriodType) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (period) {
    case 'daily':
      return {
        start: new Date(today),
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
      }
    case 'monthly':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      }
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3)
      return {
        start: new Date(now.getFullYear(), quarter * 3, 1),
        end: new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59)
      }
    default:
      return { start: today, end: today }
  }
}

// Função para verificar se um item está no período
const isInPeriod = (date: string | undefined | null, period: PeriodType): boolean => {
  if (!date || date === null || date === '') return false
  try {
    const itemDate = new Date(date)
    if (isNaN(itemDate.getTime())) return false
    
    const { start, end } = getPeriodDates(period)
    
    // Normalizar datas para comparação correta (ignorar horas) - igual a demandas
    const itemDateNormalized = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())
    const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    
    // Comparação simples: itemDate >= start && itemDate <= end
    return itemDateNormalized >= startNormalized && itemDateNormalized <= endNormalized
  } catch {
    return false
  }
}

// Função para verificar se um item está concluído
const isCompleted = (item: any, page: string): boolean => {
  const completionStatuses = COMPLETION_STATUS[page as keyof typeof COMPLETION_STATUS] || []
  const statusField = PAGE_CONFIGS.find(config => config.page === page)?.fields.completed || 'status'
  const status = item[statusField]
  return completionStatuses.includes(status) || status === true
}

// Função para calcular métricas de uma página
const calculatePageMetrics = (items: any[], page: string, period: PeriodType, hasDateFilters: boolean = false): PageMetrics => {
  const config = PAGE_CONFIGS.find(c => c.page === page)
  if (!config) {
    return {
      page,
      daily: { total: 0, created: 0, updated: 0, completed: 0 },
      monthly: { total: 0, created: 0, updated: 0, completed: 0 },
      quarterly: { total: 0, created: 0, updated: 0, completed: 0 }
    }
  }

  // Verificar se items é um array válido
  if (!Array.isArray(items)) {
    return {
      page,
      daily: { total: 0, created: 0, updated: 0, completed: 0 },
      monthly: { total: 0, created: 0, updated: 0, completed: 0 },
      quarterly: { total: 0, created: 0, updated: 0, completed: 0 }
    }
  }

  const calculateForPeriod = (p: PeriodType) => {
    // Se há filtros de data, os items já estão filtrados - usar todos
    // Caso contrário, filtrar por período
    let periodItems: any[]
    
    if (hasDateFilters) {
      // Dados já filtrados por data - usar todos
      periodItems = items
    } else {
      // Filtrar por período baseado no campo de criação
      const dateField = config.fields.created
      periodItems = items.filter(item => {
        // Obter a data correta para cada página com fallback
        let itemDate: string | undefined | null
        
        if (page === 'atendimentos') {
          // Atendimentos: dataAbertura (se existir e válido) ou createdAt
          // Se dataAbertura for null, undefined ou string vazia, usar createdAt
          if (item.dataAbertura && item.dataAbertura !== null && item.dataAbertura !== '') {
            itemDate = item.dataAbertura
          } else {
            itemDate = item.createdAt
          }
        } else if (page === 'demandas' || page === 'manutencoes') {
          // Demandas e Manutenções: dataInicio (se existir e válido) ou createdAt
          // Se dataInicio for null, undefined ou string vazia, usar createdAt
          if (item.dataInicio && item.dataInicio !== null && item.dataInicio !== '') {
            itemDate = item.dataInicio
          } else {
            itemDate = item.createdAt
          }
          
        } else if (page === 'analytics') {
          // Analytics: dataCriacao ou dataInicio ou createdAt
          itemDate = item.dataCriacao || item.dataInicio || item.createdAt
        } else {
          // Outras páginas: usar o campo configurado ou createdAt como fallback
          itemDate = item[dateField] || item.createdAt
        }
        
        return isInPeriod(itemDate, p)
      })
    }
    
    const total = periodItems.length
    const created = hasDateFilters 
      ? periodItems.length // Se já filtrado, todos foram criados no período
      : periodItems.filter(item => {
          // Obter a data correta para cada página com fallback
          let itemDate: string | undefined | null
          
          if (page === 'atendimentos') {
            // Atendimentos: dataAbertura (se existir e válido) ou createdAt
            // Se dataAbertura for null, undefined ou string vazia, usar createdAt
            if (item.dataAbertura && item.dataAbertura !== null && item.dataAbertura !== '') {
              itemDate = item.dataAbertura
            } else {
              itemDate = item.createdAt
            }
          } else if (page === 'demandas' || page === 'manutencoes') {
            // Demandas e Manutenções: dataInicio (se existir e válido) ou createdAt
            // Se dataInicio for null, undefined ou string vazia, usar createdAt
            itemDate = (item.dataInicio && item.dataInicio !== null && item.dataInicio !== '') 
              ? item.dataInicio 
              : item.createdAt
          } else if (page === 'analytics') {
            itemDate = item.dataCriacao || item.dataInicio || item.createdAt
          } else {
            const dateField = config.fields.created
            itemDate = item[dateField] || item.createdAt
          }
          
          return isInPeriod(itemDate, p)
        }).length
    
    const updated = hasDateFilters
      ? periodItems.length // Se já filtrado, considerar todos atualizados
      : periodItems.filter(item => {
          const updateField = config.fields.updated
          return isInPeriod(item[updateField], p)
        }).length
    
    const completed = periodItems.filter(item => isCompleted(item, page)).length

    return { total, created, updated, completed }
  }

  return {
    page,
    daily: calculateForPeriod('daily'),
    monthly: calculateForPeriod('monthly'),
    quarterly: calculateForPeriod('quarterly')
  }
}

export const useDashboardIndicators = (
  period: PeriodType = 'daily',
  filters?: {
    areaId?: string
    analistaId?: string
    fromDate?: string
    toDate?: string
  }
) => {
  // Stores
  const demandStore = useDemandStore()
  const atendimentoStore = useAtendimentoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const manutencaoStore = useManutencaoStore()
  const reportStore = useReportStore()
  const maillingStore = useMaillingStore()
  const comunicadoStore = useComunicadoStore()
  const projectStore = useProjectStore()

  // Função para filtrar por data
  const inRange = (iso?: string) => {
    if (!filters) return true
    if (!iso) return true
    if (!filters.fromDate && !filters.toDate) return true
    
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
      
      if (filters.fromDate) {
        const fromTime = normalizeStart(filters.fromDate)
        if (itemTime < fromTime) return false
      }
      
      if (filters.toDate) {
        const toTime = normalizeEnd(filters.toDate)
        if (itemTime > toTime) return false
      }
      
      return true
    } catch {
      return true
    }
  }

  // Função para aplicar filtros aos dados
  const applyFilters = (items: any[], page: string) => {
    if (!filters) return items
    
    return items.filter(item => {
      // Filtro por área (para demandas e atendimentos)
      if (filters.areaId && (page === 'demandas' || page === 'atendimentos')) {
        const itemArea = item.area || item.areaId
        if (itemArea !== filters.areaId) {
          return false
        }
      }
      
      // Filtro por analista
      if (filters.analistaId) {
        const analistaField = page === 'reajustes' ? 'responsavelAnalista' : 'analista'
        const itemAnalista = item[analistaField]
        if (itemAnalista !== filters.analistaId) {
          return false
        }
      }
      
      // Filtro por data - usar campo correto para cada página com fallback
      let itemDate: string | undefined
      
      if (page === 'atendimentos') {
        // Atendimentos: dataAbertura (se existir e válido) ou createdAt
        // Se dataAbertura for null, undefined ou string vazia, usar createdAt
        itemDate = (item.dataAbertura && item.dataAbertura !== null && item.dataAbertura !== '') 
          ? item.dataAbertura 
          : item.createdAt
      } else if (page === 'demandas' || page === 'manutencoes' || page === 'validacoes') {
        // Demandas, Manutenções e Validações: dataInicio (se existir e válido) ou createdAt
        // Se dataInicio for null, undefined ou string vazia, usar createdAt
        itemDate = (item.dataInicio && item.dataInicio !== null && item.dataInicio !== '') 
          ? item.dataInicio 
          : item.createdAt
      } else if (page === 'analytics') {
        // Analytics (Report): dataInicio ou createdAt
        itemDate = item.dataInicio || item.createdAt
      } else if (page === 'reajustes') {
        // Reajustes: createdAt
        itemDate = item.createdAt
      } else if (page === 'mailling') {
        // Mailling: createdAt
        itemDate = item.createdAt
      } else {
        // Outras páginas: tentar dataInicio primeiro, depois createdAt
        itemDate = item.dataInicio || item.createdAt
      }
      
      if (!inRange(itemDate)) {
        return false
      }
      
      return true
    })
  }

  // Mapeamento de stores por página com verificações de segurança e filtros aplicados
  const manutencoesRaw = Array.isArray(manutencaoStore.items) ? manutencaoStore.items : []
  const storeMap = {
    demandas: applyFilters(Array.isArray(demandStore.items) ? demandStore.items : [], 'demandas'),
    atendimentos: applyFilters(Array.isArray(atendimentoStore.items) ? atendimentoStore.items : [], 'atendimentos'),
    validacoes: applyFilters(Array.isArray(validationStore.items) ? validationStore.items : [], 'validacoes'),
    reajustes: applyFilters(Array.isArray(reajusteStore.items) ? reajusteStore.items : [], 'reajustes'),
    manutencoes: applyFilters(manutencoesRaw, 'manutencoes'),
    analytics: applyFilters(Array.isArray(reportStore.items) ? reportStore.items : [], 'analytics'),
    mailling: applyFilters(Array.isArray(maillingStore.contacts) ? maillingStore.contacts : [], 'mailling'),
    comunicados: applyFilters(Array.isArray(comunicadoStore.items) ? comunicadoStore.items : [], 'comunicados'),
    projetos: applyFilters(Array.isArray(projectStore.items) ? projectStore.items : [], 'projetos')
  }


  // Verificar se há filtros de data ativos
  const hasDateFilters = !!(filters?.fromDate || filters?.toDate)

  // Calcular métricas para todas as páginas
  const pageMetrics = useMemo(() => {
    const metrics: { [key: string]: PageMetrics } = {}
    
    Object.entries(storeMap).forEach(([page, items]) => {
      metrics[page] = calculatePageMetrics(items, page, period, hasDateFilters)
    })
    
    return metrics
  }, [storeMap, period, hasDateFilters, manutencoesRaw])

  // Gerar indicadores para o período selecionado
  const indicators = useMemo(() => {
    const result: DashboardIndicator[] = []
    
    PAGE_CONFIGS.forEach(config => {
      const metrics = pageMetrics[config.page]
      if (!metrics) return

      // Quando há filtros de data, usar os dados do período atual
      // Caso contrário, usar o período selecionado normalmente
      const periodData = metrics[period]
      
      // Para comparação, se há filtros de data, não comparar com período anterior
      // (pois os dados já estão filtrados)
      let previousData = metrics[period]
      if (!hasDateFilters) {
        const previousPeriod = period === 'daily' ? 'monthly' : period === 'monthly' ? 'quarterly' : 'quarterly'
        previousData = metrics[previousPeriod]
      }

      // Calcular mudança percentual (apenas se não houver filtros de data)
      const change = hasDateFilters 
        ? 0 // Não calcular mudança quando há filtros de data
        : (previousData.total > 0 
            ? ((periodData.total - previousData.total) / previousData.total) * 100
            : 0)

      const changeType: 'increase' | 'decrease' | 'neutral' = 
        change > 5 ? 'increase' : change < -5 ? 'decrease' : 'neutral'

      result.push({
        id: `${config.page}-${period}`,
        page: config.page,
        title: config.title,
        value: periodData.total,
        previousValue: hasDateFilters ? undefined : previousData.total,
        change: Math.round(change * 10) / 10,
        changeType,
        period,
        category: config.category,
        icon: config.icon,
        color: config.color,
        description: `${periodData.created} criados, ${periodData.completed} concluídos`
      })
    })

    return result
  }, [pageMetrics, period, hasDateFilters])

  // Separar indicadores por categoria
  const indicatorsByCategory = useMemo(() => {
    return {
      primary: indicators.filter(i => i.category === 'primary'),
      secondary: indicators.filter(i => i.category === 'secondary'),
      tertiary: indicators.filter(i => i.category === 'tertiary')
    }
  }, [indicators, filters])

  // Estatísticas gerais
  const generalStats = useMemo(() => {
    const total = indicators.reduce((sum, i) => sum + i.value, 0)
    const completed = indicators.reduce((sum, i) => {
      const metrics = pageMetrics[i.page]
      return sum + (metrics ? metrics[period].completed : 0)
    }, 0)
    const completionRate = total > 0 ? (completed / total) * 100 : 0

    return {
      total,
      completed,
      completionRate: Math.round(completionRate * 10) / 10,
      period
    }
  }, [indicators, pageMetrics, period, filters])

  return {
    indicators,
    indicatorsByCategory,
    pageMetrics,
    generalStats,
    period
  }
}
