import { useCallback } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../types/dashboardIndicators'

const emptyPeriodMetrics = () => ({
  total: 0,
  created: 0,
  updated: 0,
  completed: 0,
  canceled: 0,
  inProgress: 0
})

/** Taxa de conclusão de produção: concluídos ÷ (total − cancelados). */
const taxaProducao = (p: { total: number; completed: number; canceled: number }) => {
  const denom = p.total - p.canceled
  return denom > 0 ? (p.completed / denom) * 100 : 0
}

interface ExcelExportData {
  indicators: DashboardIndicator[]
  pageMetrics: { [key: string]: PageMetrics }
  generalStats: {
    total: number
    completed: number
    canceled: number
    inProgress: number
    completionRate: number
    period: PeriodType
  }
  period: PeriodType
}

export const useExcelExport = () => {
  const exportToExcel = useCallback((data: ExcelExportData) => {
    const { indicators, pageMetrics, generalStats, period } = data
    
    // Criar workbook
    const workbook = XLSX.utils.book_new()
    
    // 1. Resumo Executivo
    const summaryData: (string | number)[][] = [
      ['RESUMO EXECUTIVO - DASHBOARD'],
      [''],
      ['Período:', period === 'daily' ? 'Diário' : period === 'monthly' ? 'Mensal' : 'Trimestral'],
      ['Data de Exportação:', new Date().toLocaleDateString('pt-BR')],
      [''],
      ['ESTATÍSTICAS GERAIS'],
      ['Total de Atividades:', generalStats.total],
      ['Atividades Concluídas (produção):', generalStats.completed],
      ['Atividades Canceladas:', generalStats.canceled],
      ['Taxa de Conclusão (produção):', `${generalStats.completionRate.toFixed(1)}%`],
      ['(Concluídas ÷ (Total − Canceladas))', ''],
      [''],
      ['INDICADORES POR CATEGORIA'],
      ['Categoria', 'Página', 'Total', 'Criados', 'Concluídos', 'Cancelados', 'Em andamento', 'Taxa produção %'],
    ]
    
    // Adicionar dados dos indicadores por categoria
    const primaryIndicators = indicators.filter(i => i.category === 'primary')
    const tertiaryIndicators = indicators.filter(i => i.category === 'tertiary')
    
    // Principais
    primaryIndicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      const periodData = metrics ? metrics[period] : emptyPeriodMetrics()
      const completionRate = taxaProducao(periodData)
      
      summaryData.push([
        'Principais',
        indicator.title,
        periodData.total,
        periodData.created,
        periodData.completed,
        periodData.canceled,
        periodData.inProgress,
        `${completionRate.toFixed(1)}%`
      ])
    })
    
    // Terciárias
    tertiaryIndicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      const periodData = metrics ? metrics[period] : emptyPeriodMetrics()
      const completionRate = taxaProducao(periodData)
      
      summaryData.push([
        'Terciárias',
        indicator.title,
        periodData.total,
        periodData.created,
        periodData.completed,
        periodData.canceled,
        periodData.inProgress,
        `${completionRate.toFixed(1)}%`
      ])
    })
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Executivo')
    
    // 2. Dados Detalhados por Período
    const detailedData: (string | number)[][] = [
      ['DADOS DETALHADOS POR PERÍODO'],
      [''],
      ['Página', 'Período', 'Total', 'Criados', 'Atualizados', 'Concluídos', 'Cancelados', 'Em andamento', 'Taxa produção %']
    ]
    
    indicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return
      
      // Dados do período selecionado
      const periodData = metrics[period]
      const completionRate = taxaProducao(periodData)
      
      detailedData.push([
        indicator.title,
        period === 'daily' ? 'Diário' : period === 'monthly' ? 'Mensal' : 'Trimestral',
        periodData.total,
        periodData.created,
        periodData.updated,
        periodData.completed,
        periodData.canceled,
        periodData.inProgress,
        `${completionRate.toFixed(1)}%`
      ])
      
      // Dados dos outros períodos para comparação
      if (period !== 'daily') {
        const dailyData = metrics.daily
        const dailyCompletionRate = taxaProducao(dailyData)
        
        detailedData.push([
          indicator.title,
          'Diário',
          dailyData.total,
          dailyData.created,
          dailyData.updated,
          dailyData.completed,
          dailyData.canceled,
          dailyData.inProgress,
          `${dailyCompletionRate.toFixed(1)}%`
        ])
      }
      
      if (period !== 'monthly') {
        const monthlyData = metrics.monthly
        const monthlyCompletionRate = taxaProducao(monthlyData)
        
        detailedData.push([
          indicator.title,
          'Mensal',
          monthlyData.total,
          monthlyData.created,
          monthlyData.updated,
          monthlyData.completed,
          monthlyData.canceled,
          monthlyData.inProgress,
          `${monthlyCompletionRate.toFixed(1)}%`
        ])
      }
      
      if (period !== 'quarterly') {
        const quarterlyData = metrics.quarterly
        const quarterlyCompletionRate = taxaProducao(quarterlyData)
        
        detailedData.push([
          indicator.title,
          'Trimestral',
          quarterlyData.total,
          quarterlyData.created,
          quarterlyData.updated,
          quarterlyData.completed,
          quarterlyData.canceled,
          quarterlyData.inProgress,
          `${quarterlyCompletionRate.toFixed(1)}%`
        ])
      }
    })
    
    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData)
    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Dados Detalhados')
    
    // 3. Dados para Gráficos
    const chartData: (string | number)[][] = [
      ['DADOS PARA GRÁFICOS'],
      [''],
      ['Página', 'Total', 'Concluídos', 'Cancelados', 'Em andamento', 'Taxa produção (%)']
    ]
    
    indicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return
      
      const periodData = metrics[period]
      const open = periodData.inProgress
      const completionRate = taxaProducao(periodData)
      
      chartData.push([
        indicator.title,
        periodData.total,
        periodData.completed,
        periodData.canceled,
        open,
        completionRate.toFixed(1)
      ])
    })
    
    const chartSheet = XLSX.utils.aoa_to_sheet(chartData)
    XLSX.utils.book_append_sheet(workbook, chartSheet, 'Dados para Gráficos')
    
    // 4. Comparação de Períodos
    const comparisonData: (string | number)[][] = [
      ['COMPARAÇÃO DE PERÍODOS'],
      [''],
      ['Página', 'Diário', 'Mensal', 'Trimestral', 'Variação Diário-Mensal (%)', 'Variação Mensal-Trimestral (%)']
    ]
    
    indicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return
      
      const daily = metrics.daily.total
      const monthly = metrics.monthly.total
      const quarterly = metrics.quarterly.total
      
      const dailyMonthlyVar = daily > 0 ? ((monthly - daily) / daily) * 100 : 0
      const monthlyQuarterlyVar = monthly > 0 ? ((quarterly - monthly) / monthly) * 100 : 0
      
      comparisonData.push([
        indicator.title,
        daily,
        monthly,
        quarterly,
        dailyMonthlyVar.toFixed(1),
        monthlyQuarterlyVar.toFixed(1)
      ])
    })
    
    const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData)
    XLSX.utils.book_append_sheet(workbook, comparisonSheet, 'Comparação Períodos')
    
    // Gerar arquivo Excel
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
    const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    const fileName = `Dashboard_${period === 'daily' ? 'Diario' : period === 'monthly' ? 'Mensal' : 'Trimestral'}_${new Date().toISOString().split('T')[0]}.xlsx`
    saveAs(excelBlob, fileName)
  }, [])
  
  return { exportToExcel }
}
