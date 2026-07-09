import * as XLSX from 'xlsx'
import { normHeaderKey, pickCell } from '../lib/dadosSpreadsheet'

export const TIMELINE_FLAT_HEADERS = [
  'Fase',
  'Tarefa',
  'Subtarefa',
  'Descrição',
  'Responsável',
  'Status',
  'Prioridade',
  'Observações',
] as const

export const TIMELINE_LEVEL_HEADERS = [
  'Nível',
  'Descrição',
  'Status',
  'Início',
  'Fim prev.',
  'Responsável',
  'Progresso %',
  'Prioridade',
  'Observações',
] as const

export type ProjectTimelineShape = { phases: Record<string, unknown>[] }

export type TimelineParseResult = {
  timeline: ProjectTimelineShape
  errors: string[]
  warnings: string[]
  format: 'flat' | 'level' | 'unknown'
  rowCount: number
}

function newLocalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function normalizeLevel(raw: string): 'fase' | 'tarefa' | 'subtarefa' | null {
  const s = normHeaderKey(raw)
  if (s === 'fase' || s === 'etapa') return 'fase'
  if (s === 'tarefa' || s === 'task') return 'tarefa'
  if (s === 'subtarefa' || s === 'sub') return 'subtarefa'
  return null
}

function emptyPhase(name: string) {
  return {
    id: newLocalId('phase'),
    name,
    status: 'nao_iniciado',
    progress: 0,
    completed: false,
    startDate: null,
    endDate: null,
    tasks: [] as Record<string, unknown>[],
  }
}

function emptyTask(name: string, extra: Record<string, unknown> = {}) {
  return {
    id: newLocalId('task'),
    name,
    status: 'pending',
    progress: 0,
    responsible: '',
    startDate: null,
    plannedEndDate: null,
    actualEndDate: null,
    subtasks: [] as Record<string, unknown>[],
    ...extra,
  }
}

function emptySubtask(title: string, extra: Record<string, unknown> = {}) {
  return {
    id: newLocalId('sub'),
    title,
    status: 'pending',
    progress: 0,
    startDate: null,
    dueDate: null,
    actualEndDate: null,
    ...extra,
  }
}

/** Formato simples: uma linha por subtarefa (ou tarefa/fase). */
export function buildTimelineFromFlatRows(rows: Record<string, unknown>[]): ProjectTimelineShape {
  const phaseMap = new Map<string, ReturnType<typeof emptyPhase>>()
  const taskMap = new Map<string, Record<string, unknown>>()

  for (const row of rows) {
    const faseName = pickCell(row, ['Fase', 'Etapa', 'Phase'])
    const tarefaName = pickCell(row, ['Tarefa', 'Task'])
    const subName = pickCell(row, ['Subtarefa', 'Sub-tarefa', 'Subtask'])
    const desc = pickCell(row, ['Descrição', 'Descricao', 'Description'])
    const resp = pickCell(row, ['Responsável', 'Responsavel', 'Responsavel'])
    const status = pickCell(row, ['Status']) || undefined
    const priority = pickCell(row, ['Prioridade', 'Priority']) || undefined
    const obs = pickCell(row, ['Observações', 'Observacoes', 'Observacao'])

    if (!faseName && !tarefaName && !subName) continue

    const phaseKey = faseName || tarefaName || subName || 'Geral'
    let phase = phaseMap.get(phaseKey)
    if (!phase) {
      phase = emptyPhase(phaseKey)
      phaseMap.set(phaseKey, phase)
    }

    if (subName) {
      const taskKey = `${phaseKey}::${tarefaName || 'Tarefas'}`
      let task = taskMap.get(taskKey)
      if (!task) {
        task = emptyTask(tarefaName || 'Tarefas', { responsible: resp || '' })
        phase.tasks.push(task)
        taskMap.set(taskKey, task)
      }
      const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
      subtasks.push(
        emptySubtask(subName, {
          description: desc || undefined,
          status: status || 'pending',
          priority: priority || undefined,
          observations: obs || undefined,
          responsible: resp || undefined,
        })
      )
      task.subtasks = subtasks
      continue
    }

    if (tarefaName) {
      const taskKey = `${phaseKey}::${tarefaName}`
      if (!taskMap.has(taskKey)) {
        const task = emptyTask(tarefaName, {
          description: desc || undefined,
          status: status || 'pending',
          priority: priority || undefined,
          observations: obs || undefined,
          responsible: resp || '',
        })
        phase.tasks.push(task)
        taskMap.set(taskKey, task)
      }
    }
  }

  return { phases: [...phaseMap.values()] }
}

function taskDisplayName(task: Record<string, unknown>): string {
  return String(task?.name || task?.title || '').trim()
}

function subtaskDisplayName(sub: Record<string, unknown>): string {
  return String(sub?.title || sub?.name || '').trim()
}

/** Linhas no formato Fase/Tarefa/Subtarefa (cabeçalho + dados) — pronto para exportar e reimportar. */
export function timelineToFlatRows(timeline: unknown): (string | number)[][] {
  const phases = Array.isArray((timeline as ProjectTimelineShape)?.phases)
    ? (timeline as ProjectTimelineShape).phases
    : []

  const rows: (string | number)[][] = [[...TIMELINE_FLAT_HEADERS]]

  for (const phase of phases) {
    const phaseName = String(phase?.name || '').trim() || 'Geral'
    const tasks = Array.isArray(phase?.tasks) ? phase.tasks : []

    if (!tasks.length) {
      rows.push([phaseName, '', '', '', '', String(phase?.status || 'nao_iniciado'), '', ''])
      continue
    }

    for (const task of tasks) {
      const tName = taskDisplayName(task as Record<string, unknown>)
      const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : []

      if (!subtasks.length) {
        rows.push([
          phaseName,
          tName,
          '',
          String(task?.description || ''),
          String(task?.responsible || task?.assignee || ''),
          String(task?.status || 'pending'),
          String(task?.priority || ''),
          String(task?.observations || ''),
        ])
        continue
      }

      for (const sub of subtasks) {
        rows.push([
          phaseName,
          tName,
          subtaskDisplayName(sub as Record<string, unknown>),
          String(sub?.description || ''),
          String(sub?.responsible || sub?.assignee || task?.responsible || ''),
          String(sub?.status || 'pending'),
          String(sub?.priority || ''),
          String(sub?.observations || ''),
        ])
      }
    }
  }

  return rows
}

/** Planilha Cronograma com instrução curta + dados no formato de importação. */
export function timelineToFlatSheetAoa(timeline: unknown): (string | number)[][] {
  return [
    ['CRONOGRAMA DO PROJETO — formato para importação'],
    ['Reimporte em Projetos → Cronograma → Importar Excel ou Templates'],
    [''],
    ...timelineToFlatRows(timeline),
  ]
}

/** Formato hierárquico Nível/Descrição (exportações antigas e relatórios). */
export function timelineToLevelRows(
  timeline: unknown,
  formatters?: {
    formatDate?: (v: unknown) => string
    phaseStatus?: (v: unknown) => string
    taskStatus?: (v: unknown) => string
  }
): (string | number)[][] {
  const fmtDate = formatters?.formatDate ?? ((v: unknown) => (v ? String(v) : ''))
  const fmtPhaseStatus = formatters?.phaseStatus ?? ((v: unknown) => String(v || ''))
  const fmtTaskStatus = formatters?.taskStatus ?? ((v: unknown) => String(v || 'pending'))

  const phases = Array.isArray((timeline as ProjectTimelineShape)?.phases)
    ? (timeline as ProjectTimelineShape).phases
    : []

  const rows: (string | number)[][] = [
    ['CRONOGRAMA DO PROJETO (Nível + Descrição)'],
    [''],
    [...TIMELINE_LEVEL_HEADERS],
  ]

  for (const phase of phases) {
    rows.push([
      'Fase',
      String(phase?.name || '—'),
      fmtPhaseStatus(phase?.status),
      fmtDate(phase?.startDate),
      fmtDate(phase?.endDate),
      '',
      typeof phase?.progress === 'number' ? phase.progress : '',
      '',
      '',
    ])

    for (const task of Array.isArray(phase?.tasks) ? phase.tasks : []) {
      rows.push([
        'Tarefa',
        taskDisplayName(task as Record<string, unknown>) || '—',
        fmtTaskStatus(task?.status),
        fmtDate(task?.startDate),
        fmtDate(task?.plannedEndDate || task?.dueDate),
        String(task?.responsible || task?.assignee || ''),
        typeof task?.progress === 'number' ? task.progress : '',
        String(task?.priority || ''),
        String(task?.observations || ''),
      ])

      for (const sub of Array.isArray(task?.subtasks) ? task.subtasks : []) {
        rows.push([
          'Subtarefa',
          subtaskDisplayName(sub as Record<string, unknown>) || '—',
          fmtTaskStatus(sub?.status),
          fmtDate(sub?.startDate),
          fmtDate(sub?.dueDate || sub?.plannedEndDate),
          String(sub?.responsible || sub?.assignee || ''),
          typeof sub?.progress === 'number' ? sub.progress : '',
          String(sub?.priority || ''),
          String(sub?.observations || ''),
        ])
      }
    }
  }

  return rows
}

function findFlatHeaderRowIndex(matrix: unknown[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 50); i++) {
    const cells = (matrix[i] || []).map((c) => normHeaderKey(c))
    if (cells.includes('fase') && (cells.includes('tarefa') || cells.includes('subtarefa'))) return i
  }
  return -1
}

function matrixToFlatRows(matrix: unknown[][]): Record<string, unknown>[] {
  const headerIdx = findFlatHeaderRowIndex(matrix)
  if (headerIdx < 0) return []

  const header = (matrix[headerIdx] || []).map((h) => String(h ?? '').trim())
  const rows: Record<string, unknown>[] = []

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const line = matrix[r] || []
    const obj: Record<string, unknown> = {}
    let hasValue = false
    header.forEach((key, col) => {
      if (!key) return
      const val = line[col]
      const text = String(val ?? '').trim()
      if (text) hasValue = true
      obj[key] = val ?? ''
    })
    if (hasValue) rows.push(obj)
  }

  return rows
}

function sheetToRows(sheet: XLSX.WorkSheet): Record<string, unknown>[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  return rows.filter((r) => Object.values(r).some((v) => String(v ?? '').trim() !== ''))
}

function sheetToMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' })
}

function detectFlatFormat(rows: Record<string, unknown>[]): boolean {
  if (!rows.length) return false
  const keys = Object.keys(rows[0]).map(normHeaderKey)
  return keys.includes('fase') || keys.includes('etapa')
}

function detectLevelFormat(matrix: unknown[][]): number {
  for (let i = 0; i < Math.min(matrix.length, 50); i++) {
    const row = matrix[i] || []
    const cells = row.map((c) => normHeaderKey(c))
    const hasNivel = cells.includes('nivel')
    const hasDesc = cells.includes('descricao')
    if (hasNivel && hasDesc) return i
  }
  return -1
}

/** Formato hierárquico (Nível + Descrição), igual à exportação do projeto. */
export function buildTimelineFromLevelMatrix(matrix: unknown[][]): ProjectTimelineShape {
  const headerIdx = detectLevelFormat(matrix)
  if (headerIdx < 0) return { phases: [] }

  const header = (matrix[headerIdx] || []).map((c) => normHeaderKey(c))
  const col = (name: string) => header.indexOf(normHeaderKey(name))

  const idxNivel = col('nivel')
  const idxDesc = col('descricao')
  const idxStatus = col('status')
  const idxResp = col('responsavel')
  const idxPriority = col('prioridade')
  const idxObs = col('observacoes')
  const idxProgress = header.findIndex((h) => h === 'progresso' || h.startsWith('progresso'))

  const phases: Record<string, unknown>[] = []
  let currentPhase: Record<string, unknown> | null = null
  let currentTask: Record<string, unknown> | null = null

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r] || []
    const nivel = normalizeLevel(String(row[idxNivel] ?? ''))
    const desc = String(row[idxDesc] ?? '').trim()
    if (!nivel || !desc || desc === '—') continue

    const status = idxStatus >= 0 ? String(row[idxStatus] ?? '').trim() : ''
    const resp = idxResp >= 0 ? String(row[idxResp] ?? '').trim() : ''
    const priority = idxPriority >= 0 ? String(row[idxPriority] ?? '').trim() : ''
    const obs = idxObs >= 0 ? String(row[idxObs] ?? '').trim() : ''
    const progressRaw = idxProgress >= 0 ? row[idxProgress] : undefined
    const progress =
      typeof progressRaw === 'number'
        ? progressRaw
        : String(progressRaw ?? '').replace('%', '').trim()
          ? Number(String(progressRaw).replace('%', '').trim())
          : undefined

    if (nivel === 'fase') {
      currentPhase = emptyPhase(desc)
      if (status) currentPhase.status = status
      if (typeof progress === 'number' && !Number.isNaN(progress)) currentPhase.progress = progress
      currentTask = null
      phases.push(currentPhase)
      continue
    }

    if (!currentPhase) {
      currentPhase = emptyPhase('Geral')
      phases.push(currentPhase)
    }

    if (nivel === 'tarefa') {
      currentTask = emptyTask(desc, {
        status: status || 'pending',
        responsible: resp && resp !== '—' ? resp : '',
        priority: priority || undefined,
        observations: obs || undefined,
      })
      currentPhase.tasks.push(currentTask)
      continue
    }

    if (nivel === 'subtarefa') {
      if (!currentTask) {
        currentTask = emptyTask('Tarefas')
        currentPhase.tasks.push(currentTask)
      }
      const subtasks = Array.isArray(currentTask.subtasks) ? currentTask.subtasks : []
      subtasks.push(
        emptySubtask(desc, {
          status: status || 'pending',
          responsible: resp && resp !== '—' ? resp : undefined,
          priority: priority || undefined,
          observations: obs || undefined,
        })
      )
      currentTask.subtasks = subtasks
    }
  }

  return { phases }
}

export function parseTimelineWorkbook(wb: XLSX.WorkBook): TimelineParseResult {
  const errors: string[] = []
  const warnings: string[] = []
  const sheetName =
    wb.SheetNames.find((n) => normHeaderKey(n) === 'cronograma') || wb.SheetNames[0]
  if (!sheetName) {
    return { timeline: { phases: [] }, errors: ['Arquivo sem planilhas.'], warnings, format: 'unknown', rowCount: 0 }
  }

  const sheet = wb.Sheets[sheetName]
  const matrix = sheetToMatrix(sheet)

  // 1) Formato plano Fase/Tarefa/Subtarefa (exportação atual e modelo de upload)
  const flatRowsFromMatrix = matrixToFlatRows(matrix)
  if (flatRowsFromMatrix.length) {
    const timeline = buildTimelineFromFlatRows(flatRowsFromMatrix)
    if (timeline.phases.length) {
      return { timeline, errors, warnings, format: 'flat', rowCount: flatRowsFromMatrix.length }
    }
    errors.push('Linhas encontradas, mas nenhuma etapa válida no formato Fase/Tarefa/Subtarefa.')
  }

  // 2) Formato hierárquico Nível/Descrição (exportações antigas)
  const levelTimeline = buildTimelineFromLevelMatrix(matrix)
  if (levelTimeline.phases.length) {
    return {
      timeline: levelTimeline,
      errors,
      warnings,
      format: 'level',
      rowCount: matrix.length,
    }
  }

  // 3) Fallback: primeira linha já é cabeçalho (planilha simples)
  const flatRows = sheetToRows(sheet)
  if (detectFlatFormat(flatRows)) {
    const timeline = buildTimelineFromFlatRows(flatRows)
    if (timeline.phases.length) {
      return { timeline, errors, warnings, format: 'flat', rowCount: flatRows.length }
    }
  }

  if (!errors.length) {
    errors.push(
      'Formato não reconhecido. Use o modelo/exportação com colunas Fase/Tarefa/Subtarefa ou Nível/Descrição.'
    )
  }
  return { timeline: { phases: [] }, errors, warnings, format: 'unknown', rowCount: flatRows.length }
}

export async function parseProjectTimelineFile(file: File): Promise<TimelineParseResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  return parseTimelineWorkbook(wb)
}

export function downloadProjectTimelineTemplateXlsx(filename = 'modelo-cronograma-projeto.xlsx'): void {
  const exampleTimeline = {
    phases: [
      {
        name: 'Planejamento',
        tasks: [
          {
            name: 'Levantamento',
            subtasks: [
              { title: 'Entrevistas', description: 'Mapear stakeholders' },
              { title: 'Documentação', description: 'Consolidar requisitos' },
            ],
          },
        ],
      },
      {
        name: 'Execução',
        tasks: [
          {
            name: 'Implantação',
            subtasks: [{ title: 'Configuração', description: 'Parametrizar ambiente' }],
          },
        ],
      },
    ],
  }

  const sheet = XLSX.utils.aoa_to_sheet(timelineToFlatSheetAoa(exampleTimeline))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Cronograma')
  XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`)
}

export function summarizeTimeline(timeline: ProjectTimelineShape): {
  phases: number
  tasks: number
  subtasks: number
} {
  const phases = timeline.phases?.length || 0
  let tasks = 0
  let subtasks = 0
  for (const p of timeline.phases || []) {
    const tlist = Array.isArray(p.tasks) ? p.tasks : []
    tasks += tlist.length
    for (const t of tlist) {
      subtasks += Array.isArray(t.subtasks) ? t.subtasks.length : 0
    }
  }
  return { phases, tasks, subtasks }
}
