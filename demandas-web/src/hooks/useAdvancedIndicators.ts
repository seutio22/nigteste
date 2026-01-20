import { useMemo } from 'react'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useReportStore } from '../store/reportStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { calculateBusinessDays, getItemDateForPage, getItemEndDate, getItemStartDate, matchesByIdOrName, resolveIdFromValue, resolveNameFromValue } from '../utils/dashboardFilters'

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
  totalItens: number
  tempoMedioExecucao: number
  itensPorPagina: {
    demandas: number
    atendimentos: number
    validacoes: number
    reajustes: number
    manutencoes: number
    analytics: number
  }
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
  const masterDataStore = useMasterDataStore()

  // Função para calcular tempo de execução em dias
  const calcularTempoExecucao = (dataInicio?: string, dataFinalizacao?: string): number => {
    if (!dataInicio) return 0
    const inicio = new Date(dataInicio)
    if (isNaN(inicio.getTime())) return 0
    const fim = dataFinalizacao ? new Date(dataFinalizacao) : new Date()
    if (isNaN(fim.getTime())) return 0
    if (fim < inicio) return 0
    return calculateBusinessDays(inicio, fim)
  }

  // Função para aplicar filtros
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
      if (itemDate) {
        try {
          const itemDateObj = new Date(itemDate)
          if (isNaN(itemDateObj.getTime())) return true
          
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
      
      return true
    })
  }

  // Dados filtrados
  const demandasFiltradas = applyFilters(demandStore.items, 'demandas')
  const atendimentosFiltrados = applyFilters(atendimentoStore.items, 'atendimentos')
  const validacoesFiltradas = applyFilters(validationStore.items, 'validacoes')
  const reajustesFiltrados = applyFilters(reajusteStore.items, 'reajustes')
  const manutencoesFiltradas = applyFilters(manutencaoStore.items, 'manutencoes')
  const analyticsFiltrados = applyFilters(reportStore.items, 'analytics')

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
        const inicio = getItemStartDate(page.name, item)
        const fim = getItemEndDate(page.name, item)
        return calcularTempoExecucao(inicio, fim)
      }).filter(tempo => tempo > 0)

      const chamadosConcluidos = page.items.filter(item => 
        item.status === 'Concluída' || item.status === 'Finalizada' || 
        item.status === 'Resolvida' || item.status === 'Aprovada' ||
        item.status === 'Concluído' || item.status === 'Finalizado'
      ).length

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

  // Métricas por analista
  const analistaMetrics = useMemo((): AnalistaMetrics[] => {
    const analistasMap = new Map<string, AnalistaMetrics>()

    // Debug: verificar se dados mestres estão carregados
    if (masterDataStore.analistas.length === 0) {
      console.warn('⚠️ useAdvancedIndicators: masterDataStore.analistas está vazio. Os nomes dos analistas podem não ser encontrados.')
    }

    // Processar todas as páginas
    const allPages = [
      { name: 'demandas', items: demandasFiltradas },
      { name: 'atendimentos', items: atendimentosFiltrados },
      { name: 'validacoes', items: validacoesFiltradas },
      { name: 'reajustes', items: reajustesFiltrados },
      { name: 'manutencoes', items: manutencoesFiltradas },
      { name: 'analytics', items: analyticsFiltrados }
    ]

    allPages.forEach(page => {
      page.items.forEach(item => {
        // Determinar o campo de analista baseado no tipo de página
        let analistaRaw: any = null
        
        if (page.name === 'reajustes') {
          analistaRaw = item.responsavelAnalista
        } else if (page.name === 'manutencoes') {
          analistaRaw = item.analistaId || item.analista
        } else if (page.name === 'validacoes') {
          analistaRaw = item.analistaId || item.analistaObj || item.analista
        } else {
          analistaRaw = item.analistaId || item.analista
        }
        
        const resolvedId = resolveIdFromValue(analistaRaw, masterDataStore.analistas)
        const nameFromMaster = resolvedId
          ? masterDataStore.analistas.find(a => String(a.id) === String(resolvedId))?.nome
          : undefined
        const fallbackName = resolveNameFromValue(analistaRaw)
        let analistaNome = nameFromMaster
          || fallbackName
          || (resolvedId ? 'Carregando analista...' : 'Analista não encontrado')
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (uuidRegex.test(analistaNome)) {
          analistaNome = resolvedId ? 'Carregando analista...' : 'Analista não encontrado'
        }

        const analistaIdFinal = resolvedId ? String(resolvedId) : analistaNome
        const keyParaMap = analistaIdFinal || analistaNome
        
        if (!analistasMap.has(keyParaMap)) {
          analistasMap.set(keyParaMap, {
            analistaId: analistaIdFinal || analistaNome,
            analistaNome,
            totalItens: 0,
            tempoMedioExecucao: 0,
            itensPorPagina: {
              demandas: 0,
              atendimentos: 0,
              validacoes: 0,
              reajustes: 0,
              manutencoes: 0,
              analytics: 0
            }
          })
        }

        const analista = analistasMap.get(keyParaMap)!
        analista.totalItens++
        analista.itensPorPagina[page.name as keyof typeof analista.itensPorPagina]++

        // Calcular tempo de execução
        const dataInicio = getItemStartDate(page.name, item)
        const dataFim = getItemEndDate(page.name, item)
        const tempo = calcularTempoExecucao(dataInicio, dataFim)
        
        if (tempo > 0) {
          analista.tempoMedioExecucao = Math.round(
            (analista.tempoMedioExecucao * (analista.totalItens - 1) + tempo) / analista.totalItens
          )
        }
      })
    })

    return Array.from(analistasMap.values()).sort((a, b) => b.totalItens - a.totalItens)
  }, [demandasFiltradas, atendimentosFiltrados, validacoesFiltradas, reajustesFiltrados, manutencoesFiltradas, analyticsFiltrados, masterDataStore.analistas])

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
      color: '#3b82f6',
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
      color: '#10b981',
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
        color: '#f59e0b',
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
      color: '#ef4444',
      icon: 'Warning'
    })

    return indicators
  }, [tempoExecucaoMetrics, analistaMetrics])

  return {
    advancedIndicators,
    tempoExecucaoMetrics,
    analistaMetrics
  }
}
