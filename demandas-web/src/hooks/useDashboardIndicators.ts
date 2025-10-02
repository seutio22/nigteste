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
import { useKanbanStore } from '../store/kanbanStore'
import { useDadosStore } from '../store/dadosStore'
import { useMasterDataStore } from '../store/masterDataStore'
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
const isInPeriod = (date: string | undefined, period: PeriodType): boolean => {
  if (!date) return false
  const itemDate = new Date(date)
  const { start, end } = getPeriodDates(period)
  return itemDate >= start && itemDate <= end
}

// Função para verificar se um item está concluído
const isCompleted = (item: any, page: string): boolean => {
  const completionStatuses = COMPLETION_STATUS[page as keyof typeof COMPLETION_STATUS] || []
  const statusField = PAGE_CONFIGS.find(config => config.page === page)?.fields.completed || 'status'
  const status = item[statusField]
  return completionStatuses.includes(status) || status === true
}

// Função para calcular métricas de uma página
const calculatePageMetrics = (items: any[], page: string, period: PeriodType): PageMetrics => {
  const config = PAGE_CONFIGS.find(c => c.page === page)
  if (!config) {
    return {
      page,
      daily: { total: 0, created: 0, updated: 0, completed: 0 },
      monthly: { total: 0, created: 0, updated: 0, completed: 0 },
      quarterly: { total: 0, created: 0, updated: 0, completed: 0 }
    }
  }

  const calculateForPeriod = (p: PeriodType) => {
    const periodItems = items.filter(item => isInPeriod(item[config.fields.created], p))
    const total = periodItems.length
    const created = periodItems.filter(item => isInPeriod(item[config.fields.created], p)).length
    const updated = periodItems.filter(item => isInPeriod(item[config.fields.updated], p)).length
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

export const useDashboardIndicators = (period: PeriodType = 'daily') => {
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
  const kanbanStore = useKanbanStore()
  const dadosStore = useDadosStore()
  const masterDataStore = useMasterDataStore()

  // Mapeamento de stores por página
  const storeMap = {
    demandas: demandStore.items,
    atendimentos: atendimentoStore.items,
    validacoes: validationStore.items,
    reajustes: reajusteStore.items,
    manutencoes: manutencaoStore.items,
    analytics: reportStore.items,
    mailling: maillingStore.contacts,
    comunicados: comunicadoStore.items,
    projetos: projectStore.items,
    kanban: kanbanStore.items,
    dados: dadosStore.items,
    usuarios: masterDataStore.analistas // Usando analistas como proxy para usuários
  }

  // Calcular métricas para todas as páginas
  const pageMetrics = useMemo(() => {
    const metrics: { [key: string]: PageMetrics } = {}
    
    Object.entries(storeMap).forEach(([page, items]) => {
      metrics[page] = calculatePageMetrics(items, page, period)
    })
    
    return metrics
  }, [storeMap, period])

  // Gerar indicadores para o período selecionado
  const indicators = useMemo(() => {
    const result: DashboardIndicator[] = []
    
    PAGE_CONFIGS.forEach(config => {
      const metrics = pageMetrics[config.page]
      if (!metrics) return

      const periodData = metrics[period]
      const previousPeriod = period === 'daily' ? 'monthly' : period === 'monthly' ? 'quarterly' : 'quarterly'
      const previousData = metrics[previousPeriod]

      // Calcular mudança percentual
      const change = previousData.total > 0 
        ? ((periodData.total - previousData.total) / previousData.total) * 100
        : 0

      const changeType: 'increase' | 'decrease' | 'neutral' = 
        change > 5 ? 'increase' : change < -5 ? 'decrease' : 'neutral'

      result.push({
        id: `${config.page}-${period}`,
        page: config.page,
        title: config.title,
        value: periodData.total,
        previousValue: previousData.total,
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
  }, [pageMetrics, period])

  // Separar indicadores por categoria
  const indicatorsByCategory = useMemo(() => {
    return {
      primary: indicators.filter(i => i.category === 'primary'),
      secondary: indicators.filter(i => i.category === 'secondary'),
      tertiary: indicators.filter(i => i.category === 'tertiary')
    }
  }, [indicators])

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
  }, [indicators, pageMetrics, period])

  return {
    indicators,
    indicatorsByCategory,
    pageMetrics,
    generalStats,
    period
  }
}
