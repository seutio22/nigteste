import { useMemo } from 'react'
import { useDemandStore } from '../store/demandStore'
import { useAtendimentoStore } from '../store/atendimentoStore'
import { useValidationStore } from '../store/validationStore'
import { useReajusteStore } from '../store/reajusteStore'
import { useManutencaoStore } from '../store/manutencaoStore'
import { useReportStore } from '../store/reportStore'
import { useMasterDataStore } from '../store/masterDataStore'

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
    const fim = dataFinalizacao ? new Date(dataFinalizacao) : new Date()
    const diffTime = Math.abs(fim.getTime() - inicio.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) // dias
  }

  // Função para aplicar filtros
  const applyFilters = (items: any[], page: string) => {
    if (!filters) return items
    
    return items.filter(item => {
      // Filtro por área (apenas para demandas)
      if (filters.areaId && page === 'demandas' && item.area !== filters.areaId) {
        return false
      }
      
      // Filtro por analista
      if (filters.analistaId) {
        let itemAnalista: any = null
        
        if (page === 'reajustes') {
          itemAnalista = item.responsavelAnalista
        } else if (page === 'manutencoes') {
          itemAnalista = item.analistaId || item.analista
        } else if (page === 'validacoes') {
          // Validações podem ter analistaId, analista (string ou objeto), ou analistaObj
          if (item.analistaId) {
            itemAnalista = item.analistaId
          } else if (typeof item.analista === 'object' && item.analista?.id) {
            itemAnalista = item.analista.id
          } else if (typeof item.analista === 'string') {
            itemAnalista = item.analista
          } else if (item.analistaObj?.id) {
            itemAnalista = item.analistaObj.id
          } else {
            itemAnalista = item.analista
          }
        } else {
          itemAnalista = item.analista || item.analistaId
        }
        
        if (itemAnalista !== filters.analistaId) {
          return false
        }
      }
      
      // Filtro por data
      let dateField = 'dataInicio'
      if (page === 'analytics') {
        dateField = 'dataCriacao'
      } else if (page === 'reajustes') {
        dateField = 'createdAt'
      }
      
      const itemDate = item[dateField]
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
      { name: 'demandas', items: demandasFiltradas, dataInicio: 'dataInicio', dataFim: 'dataFinalizacao' },
      { name: 'atendimentos', items: atendimentosFiltrados, dataInicio: 'dataInicio', dataFim: 'dataFinalizacao' },
      { name: 'validacoes', items: validacoesFiltradas, dataInicio: 'dataInicio', dataFim: 'dataFinalizacao' },
      { name: 'reajustes', items: reajustesFiltrados, dataInicio: 'createdAt', dataFim: 'dataFinalizacao' },
      { name: 'manutencoes', items: manutencoesFiltradas, dataInicio: 'dataInicio', dataFim: 'dataFinalizacao' },
      { name: 'analytics', items: analyticsFiltrados, dataInicio: 'dataCriacao', dataFim: 'dataFinalizacao' }
    ]

    return pages.map(page => {
      const tempos = page.items.map(item => 
        calcularTempoExecucao(item[page.dataInicio], item[page.dataFim])
      ).filter(tempo => tempo > 0)

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
        let analistaIdRaw: any = null
        
        if (page.name === 'reajustes') {
          analistaIdRaw = item.responsavelAnalista
        } else if (page.name === 'manutencoes') {
          // Manutenções usam analistaId
          analistaIdRaw = item.analistaId || item.analista
        } else if (page.name === 'validacoes') {
          // Validações podem ter analistaId, analista (string ou objeto), ou analistaObj
          if (item.analistaId) {
            analistaIdRaw = item.analistaId
          } else if (typeof item.analista === 'object' && item.analista?.id) {
            analistaIdRaw = item.analista.id
          } else if (typeof item.analista === 'string') {
            analistaIdRaw = item.analista
          } else if (item.analistaObj?.id) {
            analistaIdRaw = item.analistaObj.id
          } else {
            analistaIdRaw = item.analista
          }
        } else {
          // Outras páginas usam analista
          analistaIdRaw = item.analista || item.analistaId
        }
        
        // Pular itens sem analistaId
        if (!analistaIdRaw) {
          return
        }
        
        // Converter para string imediatamente para evitar erros
        const analistaId = String(analistaIdRaw)
        
        // Garantir que analistaNome seja sempre uma string
        let analistaNome = 'Sem analista'
        let analistaIdFinal = analistaId
        
        // 1. Se já tem analistaNome no item, usar ele (mas verificar se não é objeto mal formatado)
        if (item.analistaNome) {
          if (typeof item.analistaNome === 'string') {
            analistaNome = item.analistaNome
          } else if (typeof item.analistaNome === 'object' && item.analistaNome !== null) {
            // Se for objeto, tentar extrair o nome
            if (item.analistaNome.nome && typeof item.analistaNome.nome === 'string') {
              analistaNome = item.analistaNome.nome
            } else if (item.analistaNome.id && typeof item.analistaNome.id === 'string') {
              // Se não tem nome mas tem ID, buscar no masterDataStore
              const analistaEncontrado = masterDataStore.analistas.find(a => a.id === item.analistaNome.id)
              analistaNome = analistaEncontrado ? analistaEncontrado.nome : 'Analista não encontrado'
            } else {
              // Evitar "object object" - não usar String() diretamente em objeto
              analistaNome = 'Analista inválido'
            }
          } else {
            analistaNome = String(item.analistaNome)
          }
        } else if (page.name === 'validacoes' && typeof item.analista === 'object' && item.analista?.nome) {
          // Para validações, pode ter analista como objeto
          analistaNome = String(item.analista.nome)
          if (!analistaIdFinal || analistaIdFinal === 'Sem analista') {
            analistaIdFinal = item.analista.id || analistaId
          }
        } else if (page.name === 'validacoes' && item.analistaObj?.nome) {
          // Para validações, pode ter analistaObj
          analistaNome = String(item.analistaObj.nome)
          if (!analistaIdFinal || analistaIdFinal === 'Sem analista') {
            analistaIdFinal = item.analistaObj.id || analistaId
          }
        } else if (analistaId) {
          // 2. Verificar se analistaId é um UUID (ID) ou um nome
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(analistaId)
          
          if (isUUID) {
            // É um ID (UUID) - buscar por ID
            const analista = masterDataStore.analistas.find(a => a && a.id && String(a.id) === analistaId)
            if (analista && analista.nome) {
              analistaNome = String(analista.nome)
              analistaIdFinal = String(analista.id || analistaId)
            } else {
              // Não encontrou por ID - tentar usar o valor como nome se não for UUID válido
              analistaNome = analistaId.length > 36 ? 'Analista não encontrado' : analistaId
            }
          } else {
            // Não é UUID - pode ser um nome, verificar se existe no masterDataStore
            const analistaIdStr = analistaId.toLowerCase()
            const analistaPorNome = masterDataStore.analistas.find(a => {
              if (!a || !a.nome || typeof a.nome !== 'string') return false
              const nomeAnalista = String(a.nome).toLowerCase()
              return nomeAnalista === analistaIdStr ||
                     nomeAnalista.includes(analistaIdStr) ||
                     analistaIdStr.includes(nomeAnalista)
            })
            
            if (analistaPorNome && analistaPorNome.nome) {
              // Encontrou por nome - usar o nome e atualizar o ID
              analistaNome = String(analistaPorNome.nome)
              analistaIdFinal = String(analistaPorNome.id || analistaId)
            } else {
              // Não encontrou - usar o valor original como nome
              analistaNome = analistaId
            }
          }
        }

        // Usar analistaIdFinal para agrupar (pode ter sido atualizado se encontramos por nome)
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
        const dataInicio = page.name === 'analytics' ? item.dataCriacao : 
                          page.name === 'reajustes' ? item.createdAt : item.dataInicio
        const dataFim = item.dataFinalizacao
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
