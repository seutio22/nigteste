import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'
import type { DashboardIndicator, PageMetrics, PeriodType } from '../types/dashboardIndicators'
import type { ProjectStatsSummary } from '../components/dashboard/DashboardProjectIndicators'
import type { TempoExecucaoMetrics } from '../hooks/useAdvancedIndicators'
import {
  PDF_COLORS,
  PDF_FOOTER_LINE,
  defaultAutoTableStyles,
  defaultHeadStyles
} from './pdfBranding'

const emptyPeriodMetrics = (): PageMetrics['daily'] => ({
  total: 0,
  created: 0,
  updated: 0,
  completed: 0,
  canceled: 0,
  inProgress: 0
})

const taxaProducao = (p: { total: number; completed: number; canceled: number }) => {
  const denom = p.total - p.canceled
  return denom > 0 ? (p.completed / denom) * 100 : 0
}

const periodLabel = (p: PeriodType) =>
  p === 'daily' ? 'Diário' : p === 'monthly' ? 'Mensal' : 'Trimestral'

export interface DashboardPdfMeta {
  areaLabel?: string
  analistaLabel?: string
  fromDate?: string
  toDate?: string
}

export interface DashboardPdfSections {
  summary: boolean
  detailed: boolean
  charts: boolean
  comparison: boolean
  /** Gráficos vetoriais (barras / evolução / tempo) no PDF */
  vectorCharts: boolean
  /** Captura da área de indicadores + gráficos do dashboard (html2canvas) */
  screenCapture: boolean
}

const defaultSections: DashboardPdfSections = {
  summary: true,
  detailed: true,
  charts: true,
  comparison: true,
  vectorCharts: true,
  screenCapture: true
}

function getLastAutoTableFinalY(doc: jsPDF): number {
  const d = doc as unknown as { lastAutoTable?: { finalY: number } }
  return d.lastAutoTable?.finalY ?? 0
}

/** Recorte de canvas em páginas — mesmo padrão do ExportProjectModal */
export function addCanvasToPdfPages(
  doc: jsPDF,
  canvas: HTMLCanvasElement,
  margin: number,
  startY: number
): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const contentWidthMm = pageWidth - margin * 2
  const contentHeightMm = pageHeight - margin * 2
  const pxPerMm = canvas.width / contentWidthMm
  const sliceHeightPx = Math.floor(contentHeightMm * pxPerMm)
  let offsetY = 0
  let firstPage = true
  while (offsetY < canvas.height) {
    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = canvas.width
    sliceCanvas.height = Math.min(sliceHeightPx, canvas.height - offsetY)
    const ctx = sliceCanvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D indisponível')
    ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceCanvas.height, 0, 0, canvas.width, sliceCanvas.height)
    const imgData = sliceCanvas.toDataURL('image/png')
    const sliceHeightMm = sliceCanvas.height / pxPerMm
    if (!firstPage) doc.addPage()
    const y = firstPage ? startY : margin
    const availableHeightMm = pageHeight - margin - y
    const h = Math.min(sliceHeightMm, availableHeightMm)
    doc.addImage(imgData, 'PNG', margin, y, contentWidthMm, h)
    firstPage = false
    offsetY += sliceCanvas.height
  }
}

function drawInstitutionalHeader(
  doc: jsPDF,
  pageW: number,
  margin: number,
  period: PeriodType,
  meta?: DashboardPdfMeta
): number {
  const headerH = 30
  doc.setFillColor(...PDF_COLORS.primary)
  doc.rect(0, 0, pageW, headerH, 'F')
  doc.setTextColor(...PDF_COLORS.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('RELATÓRIO DO DASHBOARD', margin, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  const sub = `Período: ${periodLabel(period)} • ${new Date().toLocaleString('pt-BR')}`
  doc.text(sub, margin, 26)
  doc.setTextColor(...PDF_COLORS.textDark)
  let y = headerH + 10
  if (meta && (meta.areaLabel || meta.analistaLabel || meta.fromDate || meta.toDate)) {
    doc.setFontSize(9)
    doc.setTextColor(...PDF_COLORS.textMuted)
    const parts: string[] = []
    if (meta.areaLabel) parts.push(`Área: ${meta.areaLabel}`)
    if (meta.analistaLabel) parts.push(`Analista: ${meta.analistaLabel}`)
    if (meta.fromDate) parts.push(`De: ${meta.fromDate}`)
    if (meta.toDate) parts.push(`Até: ${meta.toDate}`)
    doc.text(parts.join('  •  '), margin, y)
    y += 6
  }
  doc.setTextColor(...PDF_COLORS.textDark)
  return y
}

function addBrandedSectionTitle(doc: jsPDF, title: string, y: number, margin: number, contentWidth: number): number {
  const pageH = doc.internal.pageSize.getHeight()
  if (y > pageH - 40) {
    doc.addPage()
    y = 16
  }
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...PDF_COLORS.secondary)
  doc.text(title, margin, y)
  doc.setDrawColor(...PDF_COLORS.cyan)
  doc.setLineWidth(0.55)
  doc.line(margin, y + 2, margin + Math.min(contentWidth, 95), y + 2)
  doc.setTextColor(...PDF_COLORS.textDark)
  return y + 12
}

function drawKpiStrip(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  generalStats: DashboardPdfExportInput['generalStats']
): number {
  const gap = 3
  const n = 5
  const boxW = (contentWidth - gap * (n - 1)) / n
  const boxH = 24
  const labels = ['Total', 'Itens criados', 'Concluídas', 'Canceladas', 'Em andamento']
  const values = [
    String(generalStats.total),
    String(generalStats.itemsCreated),
    String(generalStats.completed),
    String(generalStats.canceled),
    String(generalStats.inProgress)
  ]
  const accents = [PDF_COLORS.primary, PDF_COLORS.cyan, PDF_COLORS.green, PDF_COLORS.danger, PDF_COLORS.warning]
  for (let i = 0; i < n; i++) {
    const x = margin + i * (boxW + gap)
    doc.setFillColor(PDF_COLORS.rowAlt[0], PDF_COLORS.rowAlt[1], PDF_COLORS.rowAlt[2])
    doc.rect(x, y, boxW, boxH, 'F')
    const ac = accents[i]
    doc.setDrawColor(ac[0], ac[1], ac[2])
    doc.setLineWidth(1.2)
    doc.line(x, y, x, y + boxH)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...PDF_COLORS.textMuted)
    doc.text(labels[i], x + 4, y + 8)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...PDF_COLORS.textDark)
    doc.text(values[i], x + 4, y + 19)
  }
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...PDF_COLORS.textDark)
  y += boxH + 6
  doc.setFontSize(9)
  doc.setTextColor(...PDF_COLORS.textMuted)
  doc.text(`Taxa de conclusão (produção): ${generalStats.completionRate.toFixed(1)}%`, margin, y)
  doc.setTextColor(...PDF_COLORS.textDark)
  return y + 8
}

function drawComparisonBars(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  data: Array<{ page: string; current: number; previous: number }>,
  legendCurrent: string,
  legendPrevious: string
): number {
  if (!data.length) return y
  y = addBrandedSectionTitle(doc, 'COMPARAÇÃO DE PERÍODOS (GRÁFICO)', y, margin, contentWidth)
  doc.setFontSize(8)
  doc.setTextColor(...PDF_COLORS.textMuted)
  doc.setFillColor(...PDF_COLORS.cyan)
  doc.rect(margin, y, 3, 3, 'F')
  doc.text(legendCurrent, margin + 6, y + 2.5)
  doc.setFillColor(180, 186, 190)
  doc.rect(margin + 55, y, 3, 3, 'F')
  doc.text(legendPrevious, margin + 61, y + 2.5)
  y += 14
  const maxVal = Math.max(1, ...data.flatMap((d) => [d.current, d.previous]))
  const labelW = 42
  const barW = contentWidth - labelW - 6
  const rowH = 14
  for (const row of data) {
    const pageH = doc.internal.pageSize.getHeight()
    if (y + rowH > pageH - 20) {
      doc.addPage()
      y = 16
    }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_COLORS.textDark)
    const name = row.page.length > 22 ? `${row.page.slice(0, 20)}…` : row.page
    doc.text(name, margin, y + 5)
    const x0 = margin + labelW
    doc.setFillColor(...PDF_COLORS.cyan)
    doc.rect(x0, y, (row.current / maxVal) * barW * 0.48, 5, 'F')
    doc.setFillColor(180, 186, 190)
    doc.rect(x0 + (barW * 0.5), y, (row.previous / maxVal) * barW * 0.48, 5, 'F')
    doc.setFontSize(7)
    doc.text(String(row.current), x0 + (row.current / maxVal) * barW * 0.48 + 1, y + 4)
    doc.text(String(row.previous), x0 + (barW * 0.5) + (row.previous / maxVal) * barW * 0.48 + 1, y + 4)
    y += rowH
  }
  return y + 6
}

function drawEvolutionBars(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  evolution: Array<{ label: string; total: number }>
): number {
  const slice = evolution.slice(-24)
  if (!slice.length) return y
  y = addBrandedSectionTitle(doc, 'EVOLUÇÃO NO PERÍODO (DIAS ÚTEIS)', y, margin, contentWidth)
  const maxVal = Math.max(1, ...slice.map((d) => d.total))
  const n = slice.length
  const gap = 1.2
  const barW = contentWidth / n - gap
  const chartH = 28
  const baseY = y + 8
  slice.forEach((d, i) => {
    const x = margin + i * (barW + gap)
    const h = (d.total / maxVal) * chartH
    doc.setFillColor(...PDF_COLORS.cyan)
    doc.rect(x, baseY + chartH - h, Math.max(barW, 1.5), h, 'F')
  })
  y = baseY + chartH + 10
  doc.setFontSize(6)
  doc.setTextColor(...PDF_COLORS.textMuted)
  const step = Math.max(1, Math.ceil(n / 6))
  for (let i = 0; i < n; i += step) {
    const x = margin + i * (barW + gap)
    doc.text(slice[i].label.replace(/\s/g, ' '), x, y, { maxWidth: barW + 4 })
  }
  y += 8
  doc.setTextColor(...PDF_COLORS.textDark)
  return y
}

function drawTempoExecucaoBars(
  doc: jsPDF,
  y: number,
  margin: number,
  contentWidth: number,
  metrics: TempoExecucaoMetrics[]
): number {
  if (!metrics.length) return y
  y = addBrandedSectionTitle(doc, 'TEMPO MÉDIO DE EXECUÇÃO (DIAS ÚTEIS)', y, margin, contentWidth)
  const maxT = Math.max(1, ...metrics.map((m) => m.tempoMedio))
  const labelW = 38
  const barW = contentWidth - labelW - 20
  for (const m of metrics) {
    const pageH = doc.internal.pageSize.getHeight()
    if (y > pageH - 24) {
      doc.addPage()
      y = 16
    }
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...PDF_COLORS.textDark)
    doc.text(m.pagina, margin, y + 5)
    doc.setFillColor(...PDF_COLORS.green)
    doc.rect(margin + labelW, y, (m.tempoMedio / maxT) * barW, 6, 'F')
    doc.setFontSize(8)
    doc.text(`${m.tempoMedio} d • ${m.taxaConclusao}% concl.`, margin + labelW + (m.tempoMedio / maxT) * barW + 2, y + 5)
    y += 12
  }
  return y + 8
}

function applyBrandedFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const generatedAt = new Date().toLocaleDateString('pt-BR')
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...PDF_COLORS.textMuted)
    doc.text(PDF_FOOTER_LINE, pageWidth / 2, pageHeight - 14, { align: 'center' })
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.text(`Página ${i} de ${pageCount} - Gerado em ${generatedAt}`, pageWidth / 2, pageHeight - 8, {
      align: 'center'
    })
  }
}

export interface DashboardPdfExportInput {
  indicators: DashboardIndicator[]
  pageMetrics: { [key: string]: PageMetrics }
  generalStats: {
    total: number
    itemsCreated: number
    completed: number
    canceled: number
    inProgress: number
    completionRate: number
    period: PeriodType
  }
  period: PeriodType
  meta?: DashboardPdfMeta
  sections?: Partial<DashboardPdfSections>
  orientation?: 'landscape' | 'portrait'
  chartPeriodComparison?: Array<{ page: string; current: number; previous: number }>
  chartDailyEvolution?: Array<{ label: string; total: number }>
  tempoExecucaoMetrics?: TempoExecucaoMetrics[]
  captureElementId?: string
  /** Alinha estatísticas de projetos com o filtro de analista (admin/gerente). */
  analistaId?: string
}

export async function exportDashboardToPdfAsync(input: DashboardPdfExportInput): Promise<void> {
  const {
    indicators,
    pageMetrics,
    generalStats,
    period,
    meta,
    orientation = 'landscape',
    chartPeriodComparison = [],
    chartDailyEvolution = [],
    tempoExecucaoMetrics = [],
    captureElementId = 'dashboard-pdf-export-root',
    analistaId: analistaIdForProjectStats
  } = input
  const sections = { ...defaultSections, ...input.sections }

  let projectStats: ProjectStatsSummary | null = null
  try {
    const { api } = await import('../lib/api')
    const params = new URLSearchParams()
    if (analistaIdForProjectStats && String(analistaIdForProjectStats).trim()) {
      params.set('analistaId', String(analistaIdForProjectStats).trim())
    }
    const fd = meta?.fromDate && String(meta.fromDate).trim()
    const td = meta?.toDate && String(meta.toDate).trim()
    if (fd && td) {
      params.set('fromDate', fd)
      params.set('toDate', td)
    }
    const qs = params.toString() ? `?${params.toString()}` : ''
    projectStats = await api.get<ProjectStatsSummary>(`/projetos/stats/summary${qs}`)
  } catch {
    projectStats = null
  }

  let canvas: HTMLCanvasElement | null = null
  if (sections.screenCapture && typeof document !== 'undefined') {
    const el = document.getElementById(captureElementId)
    if (el) {
      try {
        await new Promise((r) => setTimeout(r, 150))
        canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          scrollX: 0,
          scrollY: -window.scrollY
        })
      } catch {
        canvas = null
      }
    }
  }

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  })

  const pageW = doc.internal.pageSize.getWidth()
  const margin = 14
  const contentWidth = pageW - margin * 2
  let y = drawInstitutionalHeader(doc, pageW, margin, period, meta)

  y = addBrandedSectionTitle(doc, 'INDICADORES GERAIS', y, margin, contentWidth)
  y = drawKpiStrip(doc, y, margin, contentWidth, generalStats)

  if (sections.vectorCharts) {
    if (chartPeriodComparison.length) {
      const legend =
        period === 'daily'
          ? { c: 'Dia selecionado', p: 'Dia anterior' }
          : period === 'monthly'
            ? { c: 'Mês atual', p: 'Mês anterior' }
            : { c: 'Trimestre atual', p: 'Trimestre anterior' }
      y = drawComparisonBars(doc, y, margin, contentWidth, chartPeriodComparison, legend.c, legend.p)
    }
    if (chartDailyEvolution.length) {
      y = drawEvolutionBars(doc, y, margin, contentWidth, chartDailyEvolution)
    }
    if (tempoExecucaoMetrics.length) {
      y = drawTempoExecucaoBars(doc, y, margin, contentWidth, tempoExecucaoMetrics)
    }
  }

  if (meta && (meta.areaLabel || meta.analistaLabel || meta.fromDate || meta.toDate)) {
    y = addBrandedSectionTitle(doc, 'FILTROS APLICADOS', y, margin, contentWidth)
    const filterRows: string[][] = []
    if (meta.areaLabel) filterRows.push(['Área', meta.areaLabel])
    if (meta.analistaLabel) filterRows.push(['Analista', meta.analistaLabel])
    if (meta.fromDate) filterRows.push(['Data inicial', meta.fromDate])
    if (meta.toDate) filterRows.push(['Data final', meta.toDate])
    autoTable(doc, {
      startY: y,
      head: [['Campo', 'Valor']],
      body: filterRows,
      margin: { left: margin, right: margin },
      styles: { ...defaultAutoTableStyles, fontSize: 9 },
      headStyles: defaultHeadStyles,
      alternateRowStyles: { fillColor: [245, 246, 247] }
    })
    y = getLastAutoTableFinalY(doc) + 10
  }

  if (sections.summary) {
    y = addBrandedSectionTitle(doc, 'RESUMO EXECUTIVO', y, margin, contentWidth)
    const summaryBody: (string | number)[][] = [
      ['Total de atividades', String(generalStats.total)],
      ['Concluídas (produção)', String(generalStats.completed)],
      ['Canceladas', String(generalStats.canceled)],
      ['Em andamento', String(generalStats.inProgress)],
      ['Taxa de conclusão (produção)', `${generalStats.completionRate.toFixed(1)}%`]
    ]
    const primary = indicators.filter((i) => i.category === 'primary')
    const tertiary = indicators.filter((i) => i.category === 'tertiary')
    const pushCategory = (cat: string, list: DashboardIndicator[]) => {
      list.forEach((indicator) => {
        const m = pageMetrics[indicator.page]
        const pd = m ? m[period] : emptyPeriodMetrics()
        const tx = taxaProducao(pd)
        summaryBody.push([
          `${cat} • ${indicator.title}`,
          `Total ${pd.total} • Criados ${pd.created} • Concl. ${pd.completed} • Canc. ${pd.canceled} • And. ${pd.inProgress} • Taxa ${tx.toFixed(1)}%`
        ])
      })
    }
    pushCategory('Principais', primary)
    pushCategory('Terciárias', tertiary)

    if (projectStats) {
      const p = projectStats.period
      const cancelled = projectStats.cancelledProjectCount ?? 0
      summaryBody.push(['—', '—'])
      summaryBody.push([
        'Projetos (cronograma) • Projetos acompanhados',
        `${projectStats.projectCount} (ativos ${projectStats.activeProjectCount}, concluídos ${projectStats.completedProjectCount}, pausados ${projectStats.pausedProjectCount}, cancelados ${cancelled})`
      ])
      if (p) {
        summaryBody.push([
          'Projetos • Criadas no período (etapas / tarefas / subtarefas)',
          `Etapas ${p.phasesCreated} (${p.phasesCompleted} concl. no perí.) • Tarefas ${p.tasksCreated} (${p.tasksCompleted} concl.) • Subtarefas ${p.subtasksCreated} (${p.subtasksCompleted} concl.)`
        ])
        const ra = projectStats.responsibleAsAnalyst
        if (ra) {
          summaryBody.push([
            'Projetos • Como responsável (estado atual)',
            `Tarefas ${ra.tasks.total} (${ra.tasks.completed} concl., ${ra.tasks.overdue} atraso) • Subtarefas ${ra.subtasks.total} (${ra.subtasks.completed} concl., ${ra.subtasks.overdue} atraso) • Nomes: ${ra.aliases.length ? ra.aliases.join(', ') : '—'}`
          ])
          if (
            typeof p.responsibleTasksCreated === 'number' &&
            typeof p.responsibleTasksCompleted === 'number'
          ) {
            summaryBody.push([
              'Projetos • Como responsável — no período',
              `Tarefas ${p.responsibleTasksCreated} criadas, ${p.responsibleTasksCompleted} concl. • Subtarefas ${p.responsibleSubtasksCreated ?? 0} criadas, ${p.responsibleSubtasksCompleted ?? 0} concl.`
            ])
          }
        }
        summaryBody.push([
          'Projetos • Estado atual do cronograma',
          `Etapas ${projectStats.totalPhases} • Tarefas ${projectStats.totalTasksInTimeline} • Subtarefas ${projectStats.totalSubtasksInTimeline}`
        ])
      } else {
        summaryBody.push([
          'Projetos • Etapas / tarefas / subtarefas (atual)',
          `Etapas ${projectStats.totalPhases} (${projectStats.phasesCompleted} concl., ${projectStats.phasesOverdue} atraso) • Tarefas ${projectStats.totalTasksInTimeline} • Subtarefas ${projectStats.totalSubtasksInTimeline}`
        ])
      }
      summaryBody.push([
        'Projetos • Prazos atendidos (tarefas + subtarefas)',
        String(projectStats.tasksDeadlineMet + projectStats.subtasksDeadlineMet)
      ])
      summaryBody.push([
        'Projetos • Projetos com fim em atraso',
        String(projectStats.projectEndOverdue)
      ])
      summaryBody.push([
        'Projetos • Logs de trabalho (cronograma)',
        `${projectStats.audit.totalEvents} no período / filtro • últimos 30 dias: ${projectStats.audit.last30Days}`
      ])
    }

    autoTable(doc, {
      startY: y,
      head: [['Indicador', 'Valores']],
      body: summaryBody.map((row) => [String(row[0]), String(row[1])]),
      margin: { left: margin, right: margin },
      styles: { ...defaultAutoTableStyles, fontSize: 8 },
      headStyles: defaultHeadStyles,
      alternateRowStyles: { fillColor: [245, 246, 247] },
      columnStyles: {
        0: { cellWidth: contentWidth * 0.34 },
        1: { cellWidth: contentWidth * 0.66 - 28 }
      }
    })
    y = getLastAutoTableFinalY(doc) + 10
  }

  if (sections.detailed) {
    y = addBrandedSectionTitle(doc, 'DADOS DETALHADOS POR PERÍODO', y, margin, contentWidth)
    const detailedBody: (string | number)[][] = []
    indicators.forEach((indicator) => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return
      const periodData = metrics[period]
      const cr = taxaProducao(periodData)
      detailedBody.push([
        indicator.title,
        periodLabel(period),
        periodData.total,
        periodData.created,
        periodData.updated,
        periodData.completed,
        periodData.canceled,
        periodData.inProgress,
        `${cr.toFixed(1)}%`
      ])
      if (period !== 'daily') {
        const d = metrics.daily
        detailedBody.push([
          indicator.title,
          'Diário',
          d.total,
          d.created,
          d.updated,
          d.completed,
          d.canceled,
          d.inProgress,
          `${taxaProducao(d).toFixed(1)}%`
        ])
      }
      if (period !== 'monthly') {
        const m = metrics.monthly
        detailedBody.push([
          indicator.title,
          'Mensal',
          m.total,
          m.created,
          m.updated,
          m.completed,
          m.canceled,
          m.inProgress,
          `${taxaProducao(m).toFixed(1)}%`
        ])
      }
      if (period !== 'quarterly') {
        const q = metrics.quarterly
        detailedBody.push([
          indicator.title,
          'Trimestral',
          q.total,
          q.created,
          q.updated,
          q.completed,
          q.canceled,
          q.inProgress,
          `${taxaProducao(q).toFixed(1)}%`
        ])
      }
    })
    autoTable(doc, {
      startY: y,
      head: [['Página', 'Período', 'Total', 'Criados', 'Atualiz.', 'Concl.', 'Canc.', 'And.', 'Taxa %']],
      body: detailedBody.map((r) => r.map((c) => String(c))),
      margin: { left: margin, right: margin },
      styles: { ...defaultAutoTableStyles, fontSize: 7 },
      headStyles: defaultHeadStyles,
      alternateRowStyles: { fillColor: [245, 246, 247] }
    })
    y = getLastAutoTableFinalY(doc) + 10
  }

  if (sections.charts) {
    y = addBrandedSectionTitle(doc, 'DADOS PARA GRÁFICOS', y, margin, contentWidth)
    const chartBody: (string | number)[][] = []
    indicators.forEach((indicator) => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return
      const periodData = metrics[period]
      const cr = taxaProducao(periodData)
      chartBody.push([
        indicator.title,
        periodData.total,
        periodData.completed,
        periodData.canceled,
        periodData.inProgress,
        cr.toFixed(1)
      ])
    })
    autoTable(doc, {
      startY: y,
      head: [['Página', 'Total', 'Concluídos', 'Cancelados', 'Em andamento', 'Taxa produção %']],
      body: chartBody.map((r) => r.map((c) => String(c))),
      margin: { left: margin, right: margin },
      styles: { ...defaultAutoTableStyles, fontSize: 9 },
      headStyles: defaultHeadStyles,
      alternateRowStyles: { fillColor: [245, 246, 247] }
    })
    y = getLastAutoTableFinalY(doc) + 10
  }

  if (sections.comparison) {
    y = addBrandedSectionTitle(doc, 'COMPARAÇÃO DE PERÍODOS (TOTAIS)', y, margin, contentWidth)
    const compBody: (string | number)[][] = []
    indicators.forEach((indicator) => {
      const metrics = pageMetrics[indicator.page]
      if (!metrics) return
      const daily = metrics.daily.total
      const monthly = metrics.monthly.total
      const quarterly = metrics.quarterly.total
      const dailyMonthlyVar = daily > 0 ? ((monthly - daily) / daily) * 100 : 0
      const monthlyQuarterlyVar = monthly > 0 ? ((quarterly - monthly) / monthly) * 100 : 0
      compBody.push([
        indicator.title,
        daily,
        monthly,
        quarterly,
        dailyMonthlyVar.toFixed(1),
        monthlyQuarterlyVar.toFixed(1)
      ])
    })
    autoTable(doc, {
      startY: y,
      head: [['Página', 'Diário', 'Mensal', 'Trimestral', 'Var. Diár.-Mens. %', 'Var. Mens.-Trim. %']],
      body: compBody.map((r) => r.map((c) => String(c))),
      margin: { left: margin, right: margin },
      styles: { ...defaultAutoTableStyles, fontSize: 8 },
      headStyles: defaultHeadStyles,
      alternateRowStyles: { fillColor: [245, 246, 247] }
    })
  }

  if (sections.screenCapture && canvas) {
    doc.addPage()
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...PDF_COLORS.secondary)
    doc.text('VISÃO DO DASHBOARD (INDICADORES, PROJETOS E GRÁFICOS)', margin, 18)
    doc.setDrawColor(...PDF_COLORS.cyan)
    doc.line(margin, 20, margin + 120, 20)
    doc.setTextColor(...PDF_COLORS.textDark)
    addCanvasToPdfPages(doc, canvas, margin, 24)
  }

  applyBrandedFooter(doc)

  const fileName = `Dashboard_${periodLabel(period).replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

