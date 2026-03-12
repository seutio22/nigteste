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
import { useMasterDataStore } from '../store/masterDataStore'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../types/dashboardIndicators'
import { PAGE_CONFIGS, COMPLETION_STATUS } from '../types/dashboardIndicators'
import { getItemDateForPage, matchesByIdOrName, parseDateForFilter } from '../utils/dashboardFilters'

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
    const itemDate = parseDateForFilter(date)
    if (!itemDate || isNaN(itemDate.getTime())) return false
    
    // Obter data atual e normalizar para início do dia (timezone local)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    // Normalizar data do item para início do dia (timezone local)
    const itemDateNormalized = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate())
    
    // Para período daily, comparar apenas se a data é igual a hoje
    if (period === 'daily') {
      // Comparar apenas as datas (ignorar horas, minutos, segundos)
      return itemDateNormalized.getTime() === today.getTime()
    }
    
    // Para outros períodos, usar getPeriodDates
    const { start, end } = getPeriodDates(period)
    const startNormalized = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endNormalized = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    
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
    // Se há filtros de data manuais, usar os dados já filtrados (não filtrar por período)
    // Caso contrário, filtrar por período
    let periodItems: any[]
    
    if (hasDateFilters) {
      // Dados já filtrados por data manual - usar todos
      periodItems = items
    } else if (p === 'daily') {
      // SEMPRE filtrar por HOJE quando período é daily e não há filtros manuais
      periodItems = items.filter(item => {
        let itemDate: string | undefined | null = null
        
        if (page === 'analytics') {
          if (item.dataCriacao && item.dataCriacao !== null && item.dataCriacao !== '') {
            itemDate = item.dataCriacao
          } else if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
            itemDate = item.createdAt
          }
        } else if (page === 'atendimentos') {
          if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
            itemDate = item.createdAt
          }
        } else {
          if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
            itemDate = item.createdAt
          }
        }
        
        if (!itemDate) return false
        return isInPeriod(itemDate, p)
      })
    } else {
      // Filtrar por período baseado na data de criação do chamado
      periodItems = items.filter(item => {
        // Analytics usa dataCriacao (que vem de createdAt do backend), outros usam createdAt
        let itemDate: string | undefined | null = null
        
        if (page === 'analytics') {
          // Analytics: dataCriacao é mapeado de createdAt no store
          // Verificar se dataCriacao existe e é válido, senão usar createdAt
          if (item.dataCriacao && item.dataCriacao !== null && item.dataCriacao !== '') {
            itemDate = item.dataCriacao
          } else if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
            itemDate = item.createdAt
          }
        } else if (page === 'atendimentos') {
          // Atendimentos: usar createdAt (data de criação do chamado)
          if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
            itemDate = item.createdAt
          }
        } else {
          // Outras páginas: usar createdAt
          if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
            itemDate = item.createdAt
          }
        }
        
        // Se não há data válida, não incluir no período
        if (!itemDate) {
          return false
        }
        
        // Debug para analytics e atendimentos - logar todos os itens quando daily
        if ((page === 'analytics' || page === 'atendimentos') && p === 'daily') {
          const hoje = new Date()
          const hojeNormalized = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
          const itemDateObj = new Date(itemDate)
          const itemDateNormalized = new Date(itemDateObj.getFullYear(), itemDateObj.getMonth(), itemDateObj.getDate())
          const isHoje = itemDateNormalized.getTime() === hojeNormalized.getTime()
          const isInPeriodResult = isInPeriod(itemDate, p)
          
          // Debug removido para produção
          // console.log(`🔍 DEBUG ${page} filtro período [${items.indexOf(item) + 1}/${items.length}]:`, {
          //   id: item.id,
          //   titulo: item.titulo || item.ticket,
          //   createdAt: item.createdAt,
          //   dataCriacao: item.dataCriacao,
          //   itemDateUsado: itemDate,
          //   isInPeriod: isInPeriodResult,
          //   isHojeCalculado: isHoje,
          //   hojeNormalized: hojeNormalized.toISOString(),
          //   itemDateNormalized: itemDateNormalized.toISOString(),
          //   itemDateObjISO: itemDateObj.toISOString()
          // })
        } else if (page === 'manutencoes' && p === 'daily') {
          const hoje = new Date()
          const hojeNormalized = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
          const itemDateObj = new Date(itemDate)
          const itemDateNormalized = new Date(itemDateObj.getFullYear(), itemDateObj.getMonth(), itemDateObj.getDate())
          const isHoje = itemDateNormalized.getTime() === hojeNormalized.getTime()
          const isInPeriodResult = isInPeriod(itemDate, p)
          
          // Debug removido para produção
          // if (isHoje) {
          //   console.log(`🔍 DEBUG ${page} filtro período:`, {
          //     id: item.id,
          //     ticket: item.ticket || item.titulo,
          //     createdAt: item.createdAt,
          //     itemDateUsado: itemDate,
          //     isInPeriod: isInPeriodResult,
          //     isHojeCalculado: isHoje,
          //     hojeNormalized: hojeNormalized.toISOString(),
          //     itemDateNormalized: itemDateNormalized.toISOString()
          //   })
          // }
        }
        
        return isInPeriod(itemDate, p)
      })
      
      // Debug resumo - sempre logar para analytics, manutenções e atendimentos
      if ((page === 'analytics' || page === 'manutencoes' || page === 'atendimentos') && p === 'daily') {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)
        const hojeNormalized = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
        const totalHoje = items.filter(item => {
          let itemDate: string | undefined | null = null
          if (page === 'analytics') {
            if (item.dataCriacao && item.dataCriacao !== null && item.dataCriacao !== '') {
              itemDate = item.dataCriacao
            } else if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
              itemDate = item.createdAt
            }
          } else if (page === 'atendimentos') {
            if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
              itemDate = item.createdAt
            }
          } else {
            if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
              itemDate = item.createdAt
            }
          }
          if (!itemDate) return false
          const itemDateObj = new Date(itemDate)
          const itemDateNormalized = new Date(itemDateObj.getFullYear(), itemDateObj.getMonth(), itemDateObj.getDate())
          return itemDateNormalized.getTime() === hojeNormalized.getTime()
        }).length
        
        // Debug removido para produção
        // console.log(`🔍 DEBUG ${page} resumo daily:`, {
        //   totalNoStore: items.length,
        //   totalFiltradas: periodItems.length,
        //   totalHojeCalculado: totalHoje,
        //   periodo: p,
        //   hasDateFilters: hasDateFilters,
        //   hojeISO: hojeNormalized.toISOString(),
        //   hojeLocal: hojeNormalized.toLocaleDateString('pt-BR')
        // })
      }
    }
    
    const total = periodItems.length
    // Se há filtros manuais, todos os items já foram filtrados por data
    // Se período é daily e não há filtros manuais, periodItems já foi filtrado por HOJE
    const created = hasDateFilters
      ? periodItems.length // Com filtros manuais, todos foram criados no período filtrado
      : (p === 'daily')
      ? periodItems.length // Já filtrado por HOJE
      : periodItems.filter(item => {
          // Analytics usa dataCriacao (verificar se é válido), outros usam createdAt
          let itemDate: string | undefined | null = null
          if (page === 'analytics') {
            if (item.dataCriacao && item.dataCriacao !== null && item.dataCriacao !== '') {
              itemDate = item.dataCriacao
            } else if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
              itemDate = item.createdAt
            }
          } else if (page === 'atendimentos') {
            if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
              itemDate = item.createdAt
            }
          } else {
            if (item.createdAt && item.createdAt !== null && item.createdAt !== '') {
              itemDate = item.createdAt
            }
          }
          if (!itemDate) return false
          return isInPeriod(itemDate, p)
        }).length
    
    const updated = hasDateFilters
      ? periodItems.length // Com filtros manuais, todos foram atualizados no período filtrado
      : (p === 'daily')
      ? periodItems.length // Já filtrado por HOJE
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
  // Debug removido para produção
  // if (period === 'daily') {
  //   console.log(`🔍 DEBUG useDashboardIndicators INICIADO:`, {
  //     period,
  //     hasFromDate: !!filters?.fromDate,
  //     hasToDate: !!filters?.toDate,
  //     fromDate: filters?.fromDate,
  //     toDate: filters?.toDate
  //   })
  // }
  
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
  const masterDataStore = useMasterDataStore()

  // Função para filtrar por data - mesma lógica para todas as páginas
  const inRange = useMemo(() => {
    return (iso?: string) => {
      if (!filters) return true
      if (!iso) return true
      if (!filters.fromDate && !filters.toDate) return true
      
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
  }, [filters?.fromDate, filters?.toDate])

  // Função para aplicar filtros aos dados
  const applyFilters = (items: any[], page: string) => {
    if (!filters) return items
    
    const getAnalistaValue = (item: any) => {
      if (page === 'reajustes') return item.responsavelAnalista
      if (page === 'manutencoes') return item.analistaId || item.analista
      if (page === 'validacoes') {
        return item.analistaId
          || item.analistaObj?.id
          || (typeof item.analista === 'object' ? item.analista?.id : item.analista)
      }
      return item.analistaId || item.analista
    }

    return items.filter(item => {
      // Filtro por área (para demandas e atendimentos)
      if (filters.areaId && (page === 'demandas' || page === 'atendimentos')) {
        const itemArea = item.areaId || item.area
        if (!matchesByIdOrName(itemArea, filters.areaId, masterDataStore.areas)) {
          return false
        }
      }
      
      // Filtro por analista
      if (filters.analistaId) {
        const itemAnalista = getAnalistaValue(item)
        if (!matchesByIdOrName(itemAnalista, filters.analistaId, masterDataStore.analistas)) {
          return false
        }
      }
      
      // Filtro por data - Analytics usa dataCriacao, atendimentos e outros usam createdAt
      const itemDate = getItemDateForPage(page, item)
      if (!itemDate || !inRange(itemDate)) {
        return false
      }
      
      return true
    })
  }

  // Verificar se há filtros de data ativos
  const hasDateFilters = !!(filters?.fromDate || filters?.toDate)

  // Mapeamento de stores por página com verificações de segurança e filtros aplicados
  // Usar useMemo para recalcular quando os stores mudarem
  const storeMap = useMemo(() => {
    const manutencoesRaw = Array.isArray(manutencaoStore.items) ? manutencaoStore.items : []
    return {
      demandas: applyFilters(Array.isArray(demandStore.items) ? demandStore.items : [], 'demandas'),
      atendimentos: applyFilters(Array.isArray(atendimentoStore.items) ? atendimentoStore.items : [], 'atendimentos'),
      validacoes: applyFilters(Array.isArray(validationStore.items) ? validationStore.items : [], 'validacoes'),
      reajustes: applyFilters(Array.isArray(reajusteStore.items) ? reajusteStore.items : [], 'reajustes'),
      manutencoes: applyFilters(manutencoesRaw, 'manutencoes'),
      analytics: applyFilters(Array.isArray(reportStore.items) ? reportStore.items : [], 'analytics'),
      mailling: applyFilters(Array.isArray(maillingStore.contacts) ? maillingStore.contacts : [], 'mailling'),
      comunicados: applyFilters(Array.isArray(comunicadoStore.items) ? comunicadoStore.items : [], 'comunicados'),
      projetos: applyFilters(Array.isArray(projectStore.projects) ? projectStore.projects : [], 'projetos')
    }
  }, [
    demandStore.items,
    atendimentoStore.items,
    validationStore.items,
    reajusteStore.items,
    manutencaoStore.items,
    reportStore.items,
    maillingStore.contacts,
    comunicadoStore.items,
    projectStore.projects,
    filters?.areaId,
    filters?.analistaId,
    filters?.fromDate,
    filters?.toDate,
    masterDataStore.areas,
    masterDataStore.analistas
  ])

  // Calcular métricas para todas as páginas
  // IMPORTANTE: Forçar recálculo quando os dados dos stores mudarem
  // Usar uma combinação de tamanho + timestamp do último item atualizado para detectar mudanças
  const storeDataHash = useMemo(() => {
    return Object.entries(storeMap).map(([page, items]) => {
      if (!Array.isArray(items) || items.length === 0) return `${page}:0:0`
      
      // Calcular hash baseado em: tamanho + soma dos IDs + último updatedAt
      // Isso detecta mudanças mesmo quando items são adicionados no meio
      const idsSum = items.reduce((sum, item) => {
        const id = item.id || item.ticket || item._id || '0'
        return sum + (typeof id === 'string' ? id.length : id)
      }, 0)
      
      // Pegar o último updatedAt para detectar atualizações
      const lastUpdated = items.reduce((latest, item) => {
        const updated = item.updatedAt || item.updated_at || item.createdAt || item.created_at || '0'
        return updated > latest ? updated : latest
      }, '0')
      
      return `${page}:${items.length}:${idsSum}:${lastUpdated}`
    }).join('|')
  }, [storeMap])

  const pageMetrics = useMemo(() => {
    const metrics: { [key: string]: PageMetrics } = {}
    
    Object.entries(storeMap).forEach(([page, items]) => {
      metrics[page] = calculatePageMetrics(items, page, period, hasDateFilters)
    })
    
    return metrics
  }, [
    storeDataHash, // Usar hash para detectar mudanças no conteúdo
    period,
    hasDateFilters
  ])

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
