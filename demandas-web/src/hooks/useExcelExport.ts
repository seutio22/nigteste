import { useCallback } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../types/dashboardIndicators'

interface ExcelExportData {
  indicators: DashboardIndicator[]
  pageMetrics: { [key: string]: PageMetrics }
  generalStats: {
    total: number
    completed: number
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
    const summaryData = [
      ['RESUMO EXECUTIVO - DASHBOARD'],
      [''],
      ['Período:', period === 'daily' ? 'Diário' : period === 'monthly' ? 'Mensal' : 'Trimestral'],
      ['Data de Exportação:', new Date().toLocaleDateString('pt-BR')],
      [''],
      ['ESTATÍSTICAS GERAIS'],
      ['Total de Atividades:', generalStats.total],
      ['Atividades Concluídas:', generalStats.completed],
      ['Taxa de Conclusão:', `${generalStats.completionRate.toFixed(1)}%`],
      [''],
      ['INDICADORES POR CATEGORIA'],
      ['Categoria', 'Página', 'Total', 'Criados', 'Concluídos', 'Taxa Conclusão'],
    ]
    
    // Adicionar dados dos indicadores por categoria
    const primaryIndicators = indicators.filter(i => i.category === 'primary')
    const secondaryIndicators = indicators.filter(i => i.category === 'secondary')
    const tertiaryIndicators = indicators.filter(i => i.category === 'tertiary')
    
    // Principais
    primaryIndicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      const periodData = metrics ? metrics[period] : { total: 0, created: 0, completed: 0 }
      const completionRate = periodData.total > 0 ? (periodData.completed / periodData.total) * 100 : 0
      
      summaryData.push([
        'Principais',
        indicator.title,
        periodData.total,
        periodData.created,
        periodData.completed,
        `${completionRate.toFixed(1)}%`
      ])
    })
    
    // Secundárias
    secondaryIndicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      const periodData = metrics ? metrics[period] : { total: 0, created: 0, completed: 0 }
      const completionRate = periodData.total > 0 ? (periodData.completed / periodData.total) * 100 : 0
      
      summaryData.push([
        'Secundárias',
        indicator.title,
        periodData.total,
        periodData.created,
        periodData.completed,
        `${completionRate.toFixed(1)}%`
      ])
    })
    
    // Terciárias
    tertiaryIndicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      const periodData = metrics ? metrics[period] : { total: 0, created: 0, completed: 0 }
      const completionRate = periodData.total > 0 ? (periodData.completed / periodData.total) * 100 : 0
      
      summaryData.push([
        'Terciárias',
        indicator.title,
        periodData.total,
        periodData.created,
        periodData.completed,
        `${completionRate.toFixed(1)}%`
      ])
    })
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Executivo')
    
    // 2. Dados Detalhados por Período
    const detailedData = [
      ['DADOS DETALHADOS POR PERÍODO'],
      [''],
      ['Página', 'Período', 'Total', 'Criados', 'Atualizados', 'Concluídos', 'Taxa Conclusão']
    ]
    
    indicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return
      
      // Dados do período selecionado
      const periodData = metrics[period]
      const completionRate = periodData.total > 0 ? (periodData.completed / periodData.total) * 100 : 0
      
      detailedData.push([
        indicator.title,
        period === 'daily' ? 'Diário' : period === 'monthly' ? 'Mensal' : 'Trimestral',
        periodData.total,
        periodData.created,
        periodData.updated,
        periodData.completed,
        `${completionRate.toFixed(1)}%`
      ])
      
      // Dados dos outros períodos para comparação
      if (period !== 'daily') {
        const dailyData = metrics.daily
        const dailyCompletionRate = dailyData.total > 0 ? (dailyData.completed / dailyData.total) * 100 : 0
        
        detailedData.push([
          indicator.title,
          'Diário',
          dailyData.total,
          dailyData.created,
          dailyData.updated,
          dailyData.completed,
          `${dailyCompletionRate.toFixed(1)}%`
        ])
      }
      
      if (period !== 'monthly') {
        const monthlyData = metrics.monthly
        const monthlyCompletionRate = monthlyData.total > 0 ? (monthlyData.completed / monthlyData.total) * 100 : 0
        
        detailedData.push([
          indicator.title,
          'Mensal',
          monthlyData.total,
          monthlyData.created,
          monthlyData.updated,
          monthlyData.completed,
          `${monthlyCompletionRate.toFixed(1)}%`
        ])
      }
      
      if (period !== 'quarterly') {
        const quarterlyData = metrics.quarterly
        const quarterlyCompletionRate = quarterlyData.total > 0 ? (quarterlyData.completed / quarterlyData.total) * 100 : 0
        
        detailedData.push([
          indicator.title,
          'Trimestral',
          quarterlyData.total,
          quarterlyData.created,
          quarterlyData.updated,
          quarterlyData.completed,
          `${quarterlyCompletionRate.toFixed(1)}%`
        ])
      }
    })
    
    const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData)
    XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Dados Detalhados')
    
    // 3. Dados para Gráficos
    const chartData = [
      ['DADOS PARA GRÁFICOS'],
      [''],
      ['Página', 'Total', 'Concluídos', 'Pendentes', 'Taxa Conclusão (%)']
    ]
    
    indicators.forEach(indicator => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return
      
      const periodData = metrics[period]
      const pending = periodData.total - periodData.completed
      const completionRate = periodData.total > 0 ? (periodData.completed / periodData.total) * 100 : 0
      
      chartData.push([
        indicator.title,
        periodData.total,
        periodData.completed,
        pending,
        completionRate.toFixed(1)
      ])
    })
    
    const chartSheet = XLSX.utils.aoa_to_sheet(chartData)
    XLSX.utils.book_append_sheet(workbook, chartSheet, 'Dados para Gráficos')
    
    // 4. Comparação de Períodos
    const comparisonData = [
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
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    
    const fileName = `Dashboard_${period === 'daily' ? 'Diario' : period === 'monthly' ? 'Mensal' : 'Trimestral'}_${new Date().toISOString().split('T')[0]}.xlsx`
    saveAs(data, fileName)
  }, [])
  
  return { exportToExcel }
}
