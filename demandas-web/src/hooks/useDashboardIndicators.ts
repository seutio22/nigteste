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
import { useAuthStore } from '../store/authStore'
import { isProjectLinkedToUser } from '../utils/projectAccess'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../types/dashboardIndicators'
import {
  PAGE_CONFIGS,
  isItemCancelado,
  isItemConcluidoProducao,
  isItemPendente
} from '../types/dashboardIndicators'
import {
  getItemDateForPage,
  getDataReferenciaConclusao,
  matchesByIdOrName,
  parseDateForFilter,
  resolveIndicatorDateRange,
  getPreviousComparisonRange,
  isItemDateInRange,
  isSameCalendarDay,
  enumerateDaysYmd
} from '../utils/dashboardFilters'

/**
 * Mesma origem de data usada em `calculatePageMetrics` para contar itens no período (data de criação).
 */
function getDashboardItemCreatedDate(page: string, item: any): string | undefined {
  if (page === 'analytics') {
    if (item.dataCriacao && item.dataCriacao !== null && item.dataCriacao !== '') return item.dataCriacao
    if (item.createdAt && item.createdAt !== null && item.createdAt !== '') return item.createdAt
    return undefined
  }
  if (page === 'atendimentos') {
    if (item.createdAt && item.createdAt !== null && item.createdAt !== '') return item.createdAt
    return undefined
  }
  if (page === 'projetos') {
    if (item.createdAt && item.createdAt !== null && item.createdAt !== '') return item.createdAt
    if (item.startDate && item.startDate !== null && item.startDate !== '') return item.startDate
    return undefined
  }
  if (item.createdAt && item.createdAt !== null && item.createdAt !== '') return item.createdAt
  return undefined
}

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

// Função para calcular métricas de uma página
const calculatePageMetrics = (items: any[], page: string, period: PeriodType, hasDateFilters: boolean = false): PageMetrics => {
  const config = PAGE_CONFIGS.find(c => c.page === page)
  if (!config) {
    return {
      page,
      daily: { total: 0, created: 0, updated: 0, completed: 0, canceled: 0, inProgress: 0 },
      monthly: { total: 0, created: 0, updated: 0, completed: 0, canceled: 0, inProgress: 0 },
      quarterly: { total: 0, created: 0, updated: 0, completed: 0, canceled: 0, inProgress: 0 }
    }
  }

  // Verificar se items é um array válido
  if (!Array.isArray(items)) {
    return {
      page,
      daily: { total: 0, created: 0, updated: 0, completed: 0, canceled: 0, inProgress: 0 },
      monthly: { total: 0, created: 0, updated: 0, completed: 0, canceled: 0, inProgress: 0 },
      quarterly: { total: 0, created: 0, updated: 0, completed: 0, canceled: 0, inProgress: 0 }
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
      periodItems = items.filter((item) => {
        const itemDate = getDashboardItemCreatedDate(page, item)
        if (!itemDate) return false
        return isInPeriod(itemDate, p)
      })
    } else {
      // Filtrar por período baseado na data de referência por página (criação / início do projeto etc.)
      periodItems = items.filter((item) => {
        const itemDate = getDashboardItemCreatedDate(page, item)
        if (!itemDate) return false
        return isInPeriod(itemDate, p)
      })
    }
    
    const total = periodItems.length
    // Se há filtros manuais, todos os items já foram filtrados por data
    // Se período é daily e não há filtros manuais, periodItems já foi filtrado por HOJE
    const created = hasDateFilters
      ? periodItems.length // Com filtros manuais, todos foram criados no período filtrado
      : (p === 'daily')
      ? periodItems.length // Já filtrado por HOJE
      : periodItems.filter((item) => {
          const itemDate = getDashboardItemCreatedDate(page, item)
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
    
    const canceled = periodItems.filter(item => isItemCancelado(page, item)).length
    const completed = periodItems.filter(item => isItemConcluidoProducao(page, item)).length
    const inProgress =
      page === 'reajustes'
        ? periodItems.filter(item => isItemPendente('reajustes', item)).length
        : Math.max(0, total - completed - canceled)

    return { total, created, updated, completed, canceled, inProgress }
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
    /** Quando preenchido, restringe os dados a um conjunto de analistas (ex.: departamento NIG). */
    allowedAnalistaIds?: string[]
    fromDate?: string
    toDate?: string
    /** Enquanto true, não agrega dados (evita flash de totais globais antes de resolver analista vinculado). */
    userScopePending?: boolean
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
  const user = useAuthStore((s) => s.user)

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

  // Função para aplicar filtros aos dados (skipDate: só área/analista — para gráficos de evolução/comparação)
  const applyFilters = (items: any[], page: string, opts?: { skipDate?: boolean }) => {
    if (!filters) return items
    if (filters.userScopePending) return []

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
      // Projetos: quando há escopo por analistas (ex.: NIG), filtra por owner/manager/team;
      // caso contrário, mantém regra do usuário vinculado.
      if (page === 'projetos') {
        const allowed = filters.allowedAnalistaIds?.filter(Boolean) ?? []
        if (allowed.length > 0) {
          const hitDirect = allowed.includes(String(item.ownerId || '')) || allowed.includes(String(item.managerId || ''))
          const team = item.team
          const inTeam = Array.isArray(team) && team.some((x: any) => allowed.includes(String(x)))
          if (!hitDirect && !inTeam) return false
        } else {
          if (!isProjectLinkedToUser(item, user?.id)) return false
        }
      }

      // Filtro por área (para demandas e atendimentos)
      if (filters.areaId && (page === 'demandas' || page === 'atendimentos')) {
        const itemArea = item.areaId || item.area
        if (!matchesByIdOrName(itemArea, filters.areaId, masterDataStore.areas)) {
          return false
        }
      }
      
      // Filtro por conjunto de analistas permitido (ex.: departamento NIG)
      if (filters.allowedAnalistaIds && filters.allowedAnalistaIds.length > 0 && page !== 'projetos') {
        const itemAnalista = getAnalistaValue(item)
        const resolvedId = itemAnalista && typeof itemAnalista === 'object' ? itemAnalista.id : itemAnalista
        if (!filters.allowedAnalistaIds.includes(String(resolvedId ?? ''))) {
          return false
        }
      }

      // Filtro por analista (projetos: dono, gerente, equipe — não usam analistaId de demanda)
      if (filters.analistaId) {
        if (page === 'projetos') {
          const aid = filters.analistaId
          const hitDirect = item.ownerId === aid || item.managerId === aid
          const team = item.team
          const inTeam = Array.isArray(team) && team.includes(aid)
          const hitManager = matchesByIdOrName(item.manager, aid, masterDataStore.analistas)
          const hitManagerId = matchesByIdOrName(item.managerId, aid, masterDataStore.analistas)
          const hitOwner = matchesByIdOrName(item.ownerId, aid, masterDataStore.analistas)
          if (!hitDirect && !inTeam && !hitManager && !hitManagerId && !hitOwner) {
            return false
          }
        } else {
          const itemAnalista = getAnalistaValue(item)
          if (!matchesByIdOrName(itemAnalista, filters.analistaId, masterDataStore.analistas)) {
            return false
          }
        }
      }
      
      if (!opts?.skipDate) {
        const itemDate = getItemDateForPage(page, item)
        if (!itemDate || !inRange(itemDate)) {
          return false
        }
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
    filters?.userScopePending,
    filters?.fromDate,
    filters?.toDate,
    masterDataStore.areas,
    masterDataStore.analistas,
    user?.id
  ])

  /** Mesmos dados com filtro de área/analista, sem recorte por data (para comparar períodos e evolução diária). */
  const storeMapSansDate = useMemo(() => {
    const manutencoesRaw = Array.isArray(manutencaoStore.items) ? manutencaoStore.items : []
    return {
      demandas: applyFilters(Array.isArray(demandStore.items) ? demandStore.items : [], 'demandas', { skipDate: true }),
      atendimentos: applyFilters(Array.isArray(atendimentoStore.items) ? atendimentoStore.items : [], 'atendimentos', { skipDate: true }),
      validacoes: applyFilters(Array.isArray(validationStore.items) ? validationStore.items : [], 'validacoes', { skipDate: true }),
      reajustes: applyFilters(Array.isArray(reajusteStore.items) ? reajusteStore.items : [], 'reajustes', { skipDate: true }),
      manutencoes: applyFilters(manutencoesRaw, 'manutencoes', { skipDate: true }),
      analytics: applyFilters(Array.isArray(reportStore.items) ? reportStore.items : [], 'analytics', { skipDate: true }),
      mailling: applyFilters(Array.isArray(maillingStore.contacts) ? maillingStore.contacts : [], 'mailling', { skipDate: true }),
      comunicados: applyFilters(Array.isArray(comunicadoStore.items) ? comunicadoStore.items : [], 'comunicados', { skipDate: true }),
      projetos: applyFilters(Array.isArray(projectStore.projects) ? projectStore.projects : [], 'projetos', { skipDate: true })
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
    filters?.userScopePending,
    masterDataStore.areas,
    masterDataStore.analistas,
    user?.id
  ])

  const chartPeriodComparison = useMemo(() => {
    const { from, to } = resolveIndicatorDateRange(period, filters?.fromDate, filters?.toDate)
    const prev = getPreviousComparisonRange(from, to, period)
    if (!prev) return []
    return PAGE_CONFIGS.map((cfg) => {
      const items = storeMapSansDate[cfg.page as keyof typeof storeMapSansDate] || []
      const cur = items.filter((item) =>
        isItemDateInRange(getItemDateForPage(cfg.page, item), from, to)
      ).length
      const prv = items.filter((item) =>
        isItemDateInRange(getItemDateForPage(cfg.page, item), prev.from, prev.to)
      ).length
      return { page: cfg.title, current: cur, previous: prv }
    })
  }, [storeMapSansDate, period, filters?.fromDate, filters?.toDate])

  const chartDailyEvolution = useMemo(() => {
    const { from, to } = resolveIndicatorDateRange(period, filters?.fromDate, filters?.toDate)
    const days = enumerateDaysYmd(from, to)
    return days.map((dateKey) => {
      let total = 0
      for (const cfg of PAGE_CONFIGS) {
        const items = storeMapSansDate[cfg.page as keyof typeof storeMapSansDate] || []
        total += items.filter((item) => isSameCalendarDay(getItemDateForPage(cfg.page, item), dateKey)).length
      }
      const label = new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
      })
      return { dateKey, label, total }
    })
  }, [storeMapSansDate, period, filters?.fromDate, filters?.toDate])

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

  /**
   * Concluídos (produção): data de referência de conclusão no intervalo (`getDataReferenciaConclusao`).
   * Em "Hoje" sem filtro de datas manual, conta também concluídos cujo chamado foi **criado** hoje
   * (alinha ao Total do dia e cobre casos em que dataFinal fica antiga mas o status fecha no mesmo dia).
   */
  const pageMetricsWithProducao = useMemo(() => {
    const range = resolveIndicatorDateRange(period, filters?.fromDate, filters?.toDate)
    const out: { [key: string]: PageMetrics } = {}

    PAGE_CONFIGS.forEach((cfg) => {
      const page = cfg.page
      const base = pageMetrics[page]
      if (!base) return
      const itemsSans = storeMapSansDate[page as keyof typeof storeMapSansDate] || []
      const completedInRange = itemsSans.filter((item) => {
        if (!isItemConcluidoProducao(page, item)) return false
        const d = getDataReferenciaConclusao(page, item)
        const refOk = d ? isItemDateInRange(d, range.from, range.to) : false
        if (refOk) return true
        // Fallback do diário ("criado hoje") é válido para chamados, mas NÃO para Projetos.
        // Em Projetos, "criado hoje" não implica "concluído hoje".
        if (page !== 'projetos' && period === 'daily' && !hasDateFilters) {
          const created = getDashboardItemCreatedDate(page, item)
          return !!(created && isItemDateInRange(created, range.from, range.to))
        }
        return false
      }).length

      out[page] = {
        ...base,
        [period]: {
          ...base[period],
          completed: completedInRange
        }
      }
    })

    return out
  }, [pageMetrics, storeMapSansDate, period, filters?.fromDate, filters?.toDate, hasDateFilters])

  /**
   * Diagnóstico: quando há divergência entre "Resumo Geral" e "Performance por analista",
   * conseguimos apontar exatamente quais itens entraram por fallback do diário (criado hoje).
   */
  const debugCompletedDailyFallback = useMemo(() => {
    if (period !== 'daily' || hasDateFilters) return null
    const range = resolveIndicatorDateRange(period, filters?.fromDate, filters?.toDate)
    const getId = (item: any) =>
      (item?.id != null ? String(item.id) : undefined) ||
      (item?.ticket != null ? String(item.ticket) : undefined) ||
      (item?._id != null ? String(item._id) : undefined)
    const getLabel = (page: string, item: any) => {
      const parts: string[] = []
      const id = getId(item)
      if (id) parts.push(id)
      const title =
        item?.titulo ||
        item?.title ||
        item?.nome ||
        item?.name ||
        item?.descricao ||
        item?.descricaoCurta
      if (title) parts.push(String(title))
      return parts.length ? parts.join(' • ') : `${page} • ${id ?? '(sem id)'}`
    }

    const out: Array<{
      page: string
      id?: string
      label: string
      createdAt?: string
      completedRef?: string
    }> = []

    PAGE_CONFIGS.forEach((cfg) => {
      const page = cfg.page
      if (page === 'projetos') return
      const itemsSans = storeMapSansDate[page as keyof typeof storeMapSansDate] || []
      itemsSans.forEach((item) => {
        if (!isItemConcluidoProducao(page, item)) return
        const d = getDataReferenciaConclusao(page, item)
        const refOk = d ? isItemDateInRange(d, range.from, range.to) : false
        if (refOk) return
        const created = getDashboardItemCreatedDate(page, item)
        const createdOk = !!(created && isItemDateInRange(created, range.from, range.to))
        if (!createdOk) return
        out.push({
          page,
          id: getId(item),
          label: getLabel(page, item),
          createdAt: created,
          completedRef: d
        })
      })
    })

    return out.slice(0, 50)
  }, [period, hasDateFilters, filters?.fromDate, filters?.toDate, storeMapSansDate])

  // Gerar indicadores para o período selecionado
  const indicators = useMemo(() => {
    const result: DashboardIndicator[] = []

    const comparisonPeriodLabel =
      period === 'daily' ? 'dia anterior' : period === 'monthly' ? 'mês anterior' : 'trimestre anterior'

    const currentRange = resolveIndicatorDateRange(period, filters?.fromDate, filters?.toDate)
    const prevRange = !hasDateFilters ? getPreviousComparisonRange(currentRange.from, currentRange.to, period) : null

    PAGE_CONFIGS.forEach((config) => {
      const metrics = pageMetricsWithProducao[config.page]
      if (!metrics) return

      // Quando há filtros de data, usar os dados do período atual
      // Caso contrário, usar o período selecionado normalmente
      const periodData = metrics[period]

      let previousTotal = 0
      if (!hasDateFilters && prevRange) {
        const items = storeMap[config.page as keyof typeof storeMap] || []
        previousTotal = items.filter((item) => {
          const d = getDashboardItemCreatedDate(config.page, item)
          return d ? isItemDateInRange(d, prevRange.from, prevRange.to) : false
        }).length
      }

      const change = hasDateFilters
        ? 0
        : previousTotal > 0
          ? ((periodData.total - previousTotal) / previousTotal) * 100
          : periodData.total > 0
            ? 100
            : 0

      const changeType: 'increase' | 'decrease' | 'neutral' =
        change > 5 ? 'increase' : change < -5 ? 'decrease' : 'neutral'

      result.push({
        id: `${config.page}-${period}`,
        page: config.page,
        title: config.title,
        value: periodData.total,
        previousValue: hasDateFilters ? undefined : previousTotal,
        comparisonPeriodLabel: hasDateFilters ? undefined : comparisonPeriodLabel,
        change: Math.round(change * 10) / 10,
        changeType,
        period,
        category: config.category,
        icon: config.icon,
        color: config.color,
        description: `${periodData.created} criados, ${periodData.completed} concluídos, ${periodData.canceled} cancelados`
      })
    })

    return result
  }, [pageMetricsWithProducao, period, hasDateFilters, storeMap, filters?.fromDate, filters?.toDate])

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
    // "Itens criados" = soma do campo "created" do período (por página)
    const itemsCreated = indicators.reduce((sum, i) => {
      const metrics = pageMetricsWithProducao[i.page]
      return sum + (metrics ? metrics[period].created : 0)
    }, 0)
    /** Concluídos agregados pelas entradas «primary» em PAGE_CONFIG (inclui Projetos). */
    const primaryPages = PAGE_CONFIGS.filter((c) => c.category === 'primary').map((c) => c.page)
    const completed = primaryPages.reduce((sum, p) => {
      const metrics = pageMetricsWithProducao[p]
      return sum + (metrics ? metrics[period].completed : 0)
    }, 0)
    const canceled = indicators.reduce((sum, i) => {
      const metrics = pageMetricsWithProducao[i.page]
      return sum + (metrics ? metrics[period].canceled : 0)
    }, 0)
    const inProgress = indicators.reduce((sum, i) => {
      const metrics = pageMetricsWithProducao[i.page]
      return sum + (metrics ? metrics[period].inProgress : 0)
    }, 0)
    const totalPrimary = primaryPages.reduce((sum, p) => {
      const ind = indicators.find((i) => i.page === p)
      return sum + (ind?.value ?? 0)
    }, 0)
    const canceledPrimary = primaryPages.reduce((sum, p) => {
      const metrics = pageMetricsWithProducao[p]
      return sum + (metrics ? metrics[period].canceled : 0)
    }, 0)
    const eligible = totalPrimary - canceledPrimary
    const completionRate = eligible > 0 ? (completed / eligible) * 100 : 0

    // "Total" (por período) = soma dos indicadores do período
    // (itens criados + concluídas + canceladas + em andamento).
    const total = itemsCreated + completed + canceled + inProgress

    return {
      total,
      itemsCreated,
      completed,
      canceled,
      inProgress,
      completionRate: Math.round(completionRate * 10) / 10,
      period
    }
  }, [indicators, pageMetricsWithProducao, period])

  return {
    indicators,
    indicatorsByCategory,
    pageMetrics: pageMetricsWithProducao,
    generalStats,
    period,
    chartPeriodComparison,
    chartDailyEvolution,
    debugCompletedDailyFallback
  }
}
