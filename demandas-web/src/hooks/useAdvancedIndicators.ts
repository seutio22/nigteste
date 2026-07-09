import { useMemo } from 'react'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useReportStore } from '../store/reportStore'
import { useProjectStore } from '../store/projectStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useAuthStore } from '../store/authStore'
import { isProjectLinkedToUser } from '../utils/projectAccess'
import {
  calculateBusinessDays,
  getExecutionEndDate,
  getExecutionStartDate,
  getDataReferenciaConclusao,
  getItemDateForPage,
  matchesByIdOrName,
  parseDateForFilter,
  resolveIdFromValue,
  resolveNameFromValue,
  buildAnalistaAggregationKey,
  isAnalistaKnownInMaster,
  resolveAnalistaDisplayName,
  resolveProjectAnalistaValue,
  UNASSIGNED_ANALISTA_KEY
} from '../utils/dashboardFilters'
import { isItemConcluidoProducao } from '../types/dashboardIndicators'

export interface AdvancedIndicator {
  id: string
  title: string
  value: number | string
  unit?: string
  description: string
  color: string
  icon: string
  trend?: 'up' | 'down' | 'stable'
}

export interface AnalistaMetrics {
  analistaId: string
  analistaNome: string
  /** Itens criados no período selecionado (createdAt dentro do intervalo). */
  itensCriadosNoPeriodo: number
  /** Itens concluídos no período E criados no período. */
  itensConcluidosNoPeriodoCriadosNoPeriodo: number
  /** Itens concluídos no período, mas criados fora do período. */
  itensConcluidosNoPeriodoCriadosFora: number
  /** Total (no período): criados + concluídos no período (criados no período + criados fora). */
  totalNoPeriodo: number
  /**
   * Mantido por compatibilidade (ex.: “analista mais produtivo”).
   * No dashboard, representa os itens criados no período.
   */
  totalItens: number
  tempoMedioExecucao: number
  itensPorPagina: {
    demandas: number
    atendimentos: number
    validacoes: number
    reajustes: number
    manutencoes: number
    analytics: number
    projetos: number
  }
  /** Distribuição de itens concluídos no período por página (independente da data de criação). */
  concluidosNoPeriodoPorPagina: {
    demandas: number
    atendimentos: number
    validacoes: number
    reajustes: number
    manutencoes: number
    analytics: number
    projetos: number
  }
}

export interface UnassignedPerformanceItem {
  page: string
  id?: string
  label: string
  reason: string
  createdAt?: string
  completedAt?: string
  rawAnalista?: any
  /** Criado e/ou concluído no período filtrado. */
  kind?: 'created' | 'completed' | 'both'
}

export interface TempoExecucaoMetrics {
  pagina: string
  tempoMedio: number
  tempoMinimo: number
  tempoMaximo: number
  totalChamados: number
  chamadosConcluidos: number
  taxaConclusao: number
}

export const useAdvancedIndicators = (
  filters?: {
    areaId?: string
    analistaId?: string
    /** Quando preenchido, restringe o dashboard a um conjunto de analistas (ex.: departamento NIG). */
    allowedAnalistaIds?: string[]
    fromDate?: string
    toDate?: string
    userScopePending?: boolean
    /** Enquanto true, aguarda cadastro de analistas antes de agrupar métricas. */
    masterDataPending?: boolean
  }
) => {
  // Stores
  const demandStore = useDemandStore()
  const atendimentoStore = useAtendimentoStore()
  const validationStore = useValidationStore()
  const reajusteStore = useReajusteStore()
  const manutencaoStore = useManutencaoStore()
  const reportStore = useReportStore()
  const projectStore = useProjectStore()
  const masterDataStore = useMasterDataStore()
  const user = useAuthStore((s) => s.user)

  // Tempo entre data de início e data final do chamado, em dias úteis (sem fim de semana). Exige ambas as datas.
  const calcularTempoExecucao = (dataInicio?: string, dataFinal?: string): number => {
    if (!dataInicio || !dataFinal) return 0
    const inicio = new Date(dataInicio)
    const fim = new Date(dataFinal)
    if (isNaN(inicio.getTime()) || isNaN(fim.getTime())) return 0
    if (fim < inicio) return 0
    return calculateBusinessDays(inicio, fim)
  }

  // Função para aplicar filtros
  const applyFilters = (items: any[], page: string, opts?: { skipDate?: boolean }) => {
    if (!filters) return items
    if (filters.userScopePending || filters.masterDataPending) return []

    const getAnalistaValue = (item: any) => {
      if (page === 'reajustes') return item.responsavelAnalista
      if (page === 'manutencoes') return item.analistaId || item.analista
      if (page === 'projetos') return resolveProjectAnalistaValue(item, masterDataStore.analistas)
      if (page === 'validacoes') {
        return item.analistaId
          || item.analistaObj?.id
          || (typeof item.analista === 'object' ? item.analista?.id : item.analista)
          || item.analistaObj
          || item.analista
      }
      return item.analistaId || item.analistaObj || item.analista
    }

    return items.filter(item => {
      // Projetos: manter apenas os vinculados ao utilizador (mesma regra do Dashboard)
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
      
      // Filtro por analista
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

      // Restrição por conjunto de analistas permitido (ex.: NIG), exceto projetos (já filtrado acima)
      if (filters.allowedAnalistaIds && filters.allowedAnalistaIds.length > 0 && page !== 'projetos') {
        const itemAnalista = getAnalistaValue(item)
        const resolvedId = itemAnalista && typeof itemAnalista === 'object' ? itemAnalista.id : itemAnalista
        if (!filters.allowedAnalistaIds.includes(String(resolvedId ?? ''))) {
          return false
        }
      }
      
      if (!opts?.skipDate) {
        // Filtro por data (criação) - Analytics usa dataCriacao, atendimentos e outros usam createdAt
        const itemDate = getItemDateForPage(page, item)
        if (itemDate) {
          try {
            const itemDateObj = parseDateForFilter(itemDate)
            if (!itemDateObj || isNaN(itemDateObj.getTime())) return true
            
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
            
            const itemTime = itemDateObj.getTime()
            
            if (filters.fromDate) {
              const fromTime = normalizeStart(filters.fromDate)
              if (itemTime < fromTime) return false
            }
            
            if (filters.toDate) {
              const toTime = normalizeEnd(filters.toDate)
              if (itemTime > toTime) return false
            }
          } catch {
            // Se houver erro ao processar a data, manter o item
          }
        }
      }
      
      return true
    })
  }

  // Checagem de intervalo (from/to) reaproveitada para criação/conclusão.
  const inRange = (iso?: string): boolean => {
    if (!filters) return true
    if (!iso) return false
    if (!filters.fromDate && !filters.toDate) return true
    try {
      // Caso especial: data-only serializada como meia-noite UTC quebra o recorte diário no fuso -03.
      // Quando ocorrer, comparar por YYYY-MM-DD diretamente contra from/to.
      const isoStr = String(iso)
      if (
        filters.fromDate &&
        filters.toDate &&
        /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z$/.test(isoStr)
      ) {
        const ymd = isoStr.slice(0, 10)
        return ymd >= String(filters.fromDate) && ymd <= String(filters.toDate)
      }
      const d = parseDateForFilter(iso)
      if (!d || isNaN(d.getTime())) return false
      const normalizeStart = (dateStr: string) => {
        const dd = parseDateForFilter(dateStr)
        if (!dd) return new Date().getTime()
        dd.setHours(0, 0, 0, 0)
        return dd.getTime()
      }
      const normalizeEnd = (dateStr: string) => {
        const dd = parseDateForFilter(dateStr)
        if (!dd) return new Date().getTime()
        dd.setHours(23, 59, 59, 999)
        return dd.getTime()
      }
      const t = d.getTime()
      if (filters.fromDate && t < normalizeStart(filters.fromDate)) return false
      if (filters.toDate && t > normalizeEnd(filters.toDate)) return false
      return true
    } catch {
      return false
    }
  }

  // Dados filtrados
  const demandasFiltradas = applyFilters(demandStore.items, 'demandas')
  const atendimentosFiltrados = applyFilters(atendimentoStore.items, 'atendimentos')
  const validacoesFiltradas = applyFilters(validationStore.items, 'validacoes')
  const reajustesFiltrados = applyFilters(reajusteStore.items, 'reajustes')
  const manutencoesFiltradas = applyFilters(manutencaoStore.items, 'manutencoes')
  const analyticsFiltrados = applyFilters(reportStore.items, 'analytics')
  const projetosFiltrados = applyFilters(projectStore.projects, 'projetos')

  // Mesmos dados por escopo (área/analista), mas sem filtro por data de criação.
  const demandasSemData = applyFilters(demandStore.items, 'demandas', { skipDate: true })
  const atendimentosSemData = applyFilters(atendimentoStore.items, 'atendimentos', { skipDate: true })
  const validacoesSemData = applyFilters(validationStore.items, 'validacoes', { skipDate: true })
  const reajustesSemData = applyFilters(reajusteStore.items, 'reajustes', { skipDate: true })
  const manutencoesSemData = applyFilters(manutencaoStore.items, 'manutencoes', { skipDate: true })
  const analyticsSemData = applyFilters(reportStore.items, 'analytics', { skipDate: true })
  const projetosSemData = applyFilters(projectStore.projects, 'projetos', { skipDate: true })

  // Métricas de tempo de execução por página
  const tempoExecucaoMetrics = useMemo((): TempoExecucaoMetrics[] => {
    const pages = [
      { name: 'demandas', items: demandasFiltradas },
      { name: 'atendimentos', items: atendimentosFiltrados },
      { name: 'validacoes', items: validacoesFiltradas },
      { name: 'reajustes', items: reajustesFiltrados },
      { name: 'manutencoes', items: manutencoesFiltradas },
      { name: 'analytics', items: analyticsFiltrados }
    ]

    return pages.map(page => {
      const tempos = page.items.map(item => {
        const inicio = getExecutionStartDate(page.name, item)
        const fim = getExecutionEndDate(page.name, item)
        return calcularTempoExecucao(inicio, fim)
      }).filter(tempo => tempo > 0)

      const chamadosConcluidos = page.items.filter(item => isItemConcluidoProducao(page.name, item)).length

      return {
        pagina: page.name,
        tempoMedio: tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : 0,
        tempoMinimo: tempos.length > 0 ? Math.min(...tempos) : 0,
        tempoMaximo: tempos.length > 0 ? Math.max(...tempos) : 0,
        totalChamados: page.items.length,
        chamadosConcluidos,
        taxaConclusao: page.items.length > 0 ? Math.round((chamadosConcluidos / page.items.length) * 100) : 0
      }
    })
  }, [demandasFiltradas, atendimentosFiltrados, validacoesFiltradas, reajustesFiltrados, manutencoesFiltradas, analyticsFiltrados])

  // Métricas por analista + diagnóstico de itens não atribuídos
  const analistaAggregation = useMemo((): {
    analistaMetrics: AnalistaMetrics[]
    unassignedPerformanceItems: UnassignedPerformanceItem[]
  } => {
    if (filters?.userScopePending || filters?.masterDataPending) {
      return { analistaMetrics: [], unassignedPerformanceItems: [] }
    }

    const analistasMap = new Map<string, AnalistaMetrics>()
    const tempoCounts = new Map<string, number>()
    const unassigned: UnassignedPerformanceItem[] = []

    const getItemId = (page: string, item: any): string | undefined => {
      return (
        (item?.id != null ? String(item.id) : undefined) ||
        (item?.ticket != null ? String(item.ticket) : undefined) ||
        (item?._id != null ? String(item._id) : undefined)
      )
    }

    const getItemLabel = (page: string, item: any): string => {
      const title =
        item?.titulo ||
        item?.title ||
        item?.nome ||
        item?.name ||
        item?.descricao ||
        item?.descricaoCurta
      if (page === 'projetos' && title) return String(title)

      const parts: string[] = []
      const id = getItemId(page, item)
      if (id) parts.push(id)
      if (title) parts.push(String(title))
      return parts.length ? parts.join(' • ') : `${page} • ${id ?? '(sem id)'}`
    }

    // Debug: verificar se dados mestres estão carregados
    if (masterDataStore.analistas.length === 0 && import.meta.env.DEV) {
      console.warn('⚠️ useAdvancedIndicators: masterDataStore.analistas está vazio.')
    }

    // Processar todas as páginas
    const allPages = [
      { name: 'demandas', items: demandasSemData },
      { name: 'atendimentos', items: atendimentosSemData },
      { name: 'validacoes', items: validacoesSemData },
      { name: 'reajustes', items: reajustesSemData },
      { name: 'manutencoes', items: manutencoesSemData },
      { name: 'analytics', items: analyticsSemData },
      { name: 'projetos', items: projetosSemData }
    ]

    allPages.forEach(page => {
      page.items.forEach(item => {
        // Preferir IDs/objetos canônicos antes de strings soltas (evita duplicar analista por id vs nome).
        let analistaRaw: any = null

        if (page.name === 'reajustes') {
          analistaRaw = item.responsavelAnalista
        } else if (page.name === 'manutencoes') {
          analistaRaw = item.analistaId || item.analista
        } else if (page.name === 'projetos') {
          analistaRaw = resolveProjectAnalistaValue(item, masterDataStore.analistas)
        } else if (page.name === 'validacoes') {
          analistaRaw = item.analistaId || item.analistaObj || item.analista
        } else {
          analistaRaw = item.analistaId || item.analistaObj || item.analista
        }

        const resolvedId = resolveIdFromValue(analistaRaw, masterDataStore.analistas)
        const analistaNome = resolveAnalistaDisplayName(
          analistaRaw,
          resolvedId,
          masterDataStore.analistas
        )

        const unknownInMaster = !isAnalistaKnownInMaster(resolvedId, masterDataStore.analistas)

        const { key: keyParaMap, canonicalId, canonicalNome } = buildAnalistaAggregationKey(
          resolvedId,
          analistaNome,
          masterDataStore.analistas
        )
        const displayNome = canonicalNome

        if (!analistasMap.has(keyParaMap)) {
          analistasMap.set(keyParaMap, {
            analistaId: canonicalId,
            analistaNome: displayNome,
            itensCriadosNoPeriodo: 0,
            itensConcluidosNoPeriodoCriadosNoPeriodo: 0,
            itensConcluidosNoPeriodoCriadosFora: 0,
            totalNoPeriodo: 0,
            totalItens: 0,
            tempoMedioExecucao: 0,
            itensPorPagina: {
              demandas: 0,
              atendimentos: 0,
              validacoes: 0,
              reajustes: 0,
              manutencoes: 0,
              analytics: 0,
              projetos: 0
            },
            concluidosNoPeriodoPorPagina: {
              demandas: 0,
              atendimentos: 0,
              validacoes: 0,
              reajustes: 0,
              manutencoes: 0,
              analytics: 0,
              projetos: 0
            }
          })
        }

        const analista = analistasMap.get(keyParaMap)!

        const createdIso = getItemDateForPage(page.name, item)
        // Importante: usar a MESMA data de referência de conclusão do Dashboard (end vs updatedAt vs createdAt)
        const completedIso = isItemConcluidoProducao(page.name, item)
          ? getDataReferenciaConclusao(page.name, item)
          : undefined
        const createdInPeriod = inRange(createdIso)
        const completedInPeriod = completedIso ? inRange(completedIso) : false

        // Diagnóstico: itens no período sem analista reconhecido no cadastro.
        if ((createdInPeriod || completedInPeriod) && unknownInMaster) {
          const rawLabel = resolveNameFromValue(analistaRaw)
          const reason =
            !analistaRaw
              ? 'Sem responsável/analista preenchido'
              : rawLabel && rawLabel !== String(resolvedId)
                ? `Responsável "${rawLabel}" não está no cadastro de analistas`
                : resolvedId
                  ? `ID ${resolvedId} não está no cadastro de analistas`
                  : 'Responsável não reconhecido no cadastro'
          unassigned.push({
            page: page.name,
            id: getItemId(page.name, item),
            label: getItemLabel(page.name, item),
            reason,
            createdAt: createdIso,
            completedAt: completedIso,
            rawAnalista: analistaRaw,
            kind:
              createdInPeriod && completedInPeriod
                ? 'both'
                : createdInPeriod
                  ? 'created'
                  : 'completed'
          })
        }

        if (createdInPeriod) {
          analista.itensCriadosNoPeriodo++
          analista.totalItens = analista.itensCriadosNoPeriodo
          analista.itensPorPagina[page.name as keyof typeof analista.itensPorPagina]++
        }
        if (completedInPeriod) {
          if (createdInPeriod) {
            analista.itensConcluidosNoPeriodoCriadosNoPeriodo++
          } else {
            analista.itensConcluidosNoPeriodoCriadosFora++
          }
          analista.concluidosNoPeriodoPorPagina[
            page.name as keyof typeof analista.concluidosNoPeriodoPorPagina
          ]++
        }

        analista.totalNoPeriodo =
          analista.itensCriadosNoPeriodo
          + analista.itensConcluidosNoPeriodoCriadosNoPeriodo
          + analista.itensConcluidosNoPeriodoCriadosFora

        // Tempo médio: considerar apenas itens concluídos no período (faz sentido para execução)
        if (completedInPeriod) {
          const dataInicio = getExecutionStartDate(page.name, item)
          const dataFim = getExecutionEndDate(page.name, item)
          const tempo = calcularTempoExecucao(dataInicio, dataFim)
          if (tempo > 0) {
            const prevCount = tempoCounts.get(keyParaMap) ?? 0
            const nextCount = prevCount + 1
            tempoCounts.set(keyParaMap, nextCount)
            analista.tempoMedioExecucao = Math.round(
              (analista.tempoMedioExecucao * prevCount + tempo) / nextCount
            )
          }
        }
      })
    })

    const concluidoNoPeriodo = (a: AnalistaMetrics) =>
      a.itensConcluidosNoPeriodoCriadosNoPeriodo + a.itensConcluidosNoPeriodoCriadosFora

    const sorted = Array.from(analistasMap.values())
      .filter((a) => {
        if (a.analistaId === UNASSIGNED_ANALISTA_KEY && a.totalNoPeriodo === 0) return false
        return true
      })
      .sort((a, b) => {
        // Ordena por “movimentação” no período: criados + concluídos no período
        const aScore = a.itensCriadosNoPeriodo + concluidoNoPeriodo(a)
        const bScore = b.itensCriadosNoPeriodo + concluidoNoPeriodo(b)
        return bScore - aScore
      })
    return {
      analistaMetrics: sorted,
      unassignedPerformanceItems: unassigned
    }
  }, [
    demandasSemData,
    atendimentosSemData,
    validacoesSemData,
    reajustesSemData,
    manutencoesSemData,
    analyticsSemData,
    projetosSemData,
    masterDataStore.analistas,
    filters?.fromDate,
    filters?.toDate,
    filters?.areaId,
    filters?.analistaId,
    filters?.userScopePending,
    filters?.masterDataPending,
    user?.id
  ])
  const analistaMetrics = analistaAggregation.analistaMetrics
  const unassignedPerformanceItems = analistaAggregation.unassignedPerformanceItems

  // Indicadores avançados
  const advancedIndicators = useMemo((): AdvancedIndicator[] => {
    const indicators: AdvancedIndicator[] = []

    // Tempo médio de execução geral
    const todosTempos = tempoExecucaoMetrics.flatMap(metric => 
      Array(metric.totalChamados).fill(metric.tempoMedio)
    )
    const tempoMedioGeral = todosTempos.length > 0 
      ? Math.round(todosTempos.reduce((a, b) => a + b, 0) / todosTempos.length)
      : 0

    indicators.push({
      id: 'tempo-medio-execucao',
      title: 'Tempo Médio de Execução',
      value: tempoMedioGeral,
      unit: 'dias',
      description: 'Tempo médio para conclusão de chamados',
      color: '#009FDF',
      icon: 'Schedule'
    })

    // Taxa de conclusão geral
    const totalChamados = tempoExecucaoMetrics.reduce((sum, metric) => sum + metric.totalChamados, 0)
    const totalConcluidos = tempoExecucaoMetrics.reduce((sum, metric) => sum + metric.chamadosConcluidos, 0)
    const taxaConclusaoGeral = totalChamados > 0 ? Math.round((totalConcluidos / totalChamados) * 100) : 0

    indicators.push({
      id: 'taxa-conclusao',
      title: 'Taxa de Conclusão',
      value: taxaConclusaoGeral,
      unit: '%',
      description: 'Percentual de chamados concluídos',
      color: '#00A649',
      icon: 'CheckCircle'
    })

    // Analista mais produtivo
    const analistaMaisProdutivo = analistaMetrics.length > 0 ? analistaMetrics[0] : null
    if (analistaMaisProdutivo) {
      indicators.push({
        id: 'analista-produtivo',
        title: 'Analista Mais Produtivo',
        value: analistaMaisProdutivo.totalItens,
        unit: 'itens',
        description: `${analistaMaisProdutivo.analistaNome} - ${analistaMaisProdutivo.totalItens} itens`,
        color: '#E5B800',
        icon: 'Person'
      })
    }

    // Página com maior tempo médio
    const paginaMaiorTempo = tempoExecucaoMetrics.reduce((max, current) => 
      current.tempoMedio > max.tempoMedio ? current : max
    )

    indicators.push({
      id: 'pagina-maior-tempo',
      title: 'Maior Tempo de Execução',
      value: paginaMaiorTempo.tempoMedio,
      unit: 'dias',
      description: `${paginaMaiorTempo.pagina} - ${paginaMaiorTempo.tempoMedio} dias`,
      color: '#DA3832',
      icon: 'Warning'
    })

    return indicators
  }, [tempoExecucaoMetrics, analistaMetrics])

  return {
    advancedIndicators,
    tempoExecucaoMetrics,
    analistaMetrics,
    unassignedPerformanceItems
  }
}
