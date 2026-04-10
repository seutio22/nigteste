import type { PrismaClient } from '@prisma/client'

const MAX_ALTERACOES = 120
const MAX_CAMPOS_POR_ITEM = 24

/** Campos comparados (chaves como no JSON do cronograma). */
const PHASE_KEYS = ['name', 'status', 'progress', 'startDate', 'endDate', 'description'] as const
const TASK_KEYS = [
  'name',
  'description',
  'status',
  'priority',
  'progress',
  'responsible',
  'startDate',
  'plannedEndDate',
  'actualEndDate',
  'estimatedHours',
  'actualHours',
  'observations'
] as const
const SUBTASK_KEYS = [
  'name',
  'title',
  'description',
  'status',
  'progress',
  'responsible',
  'startDate',
  'plannedEndDate',
  'actualEndDate',
  'observations'
] as const

export type CronogramaCampoDiff = {
  campo: string
  anterior: string | null
  novo: string | null
}

export type CronogramaAlteracao = {
  tipo: 'fase' | 'tarefa' | 'subtarefa'
  acao: 'criada' | 'removida' | 'alterada'
  caminho: string
  nome: string
  id?: string | null
  campos?: CronogramaCampoDiff[]
}

function parsePhasesFromDbString(raw: string | null | undefined): any[] {
  try {
    const o = raw && String(raw).trim() ? JSON.parse(String(raw)) : {}
    return Array.isArray(o?.phases) ? o.phases : []
  } catch {
    return []
  }
}

function parsePhasesFromBody(bodyTimeline: unknown): any[] {
  if (!bodyTimeline || typeof bodyTimeline !== 'object') return []
  const o = bodyTimeline as { phases?: unknown }
  return Array.isArray(o.phases) ? o.phases : []
}

function fmtVal(v: unknown): string | null {
  if (v === undefined || v === null) return null
  if (typeof v === 'boolean') return v ? 'sim' : 'não'
  if (typeof v === 'number' && Number.isFinite(v)) return String(v)
  const s = typeof v === 'string' ? v.trim() : String(v).trim()
  if (!s || s === 'null') return null
  if (/^\d{4}-\d{2}-\d{2}/.test(s) || s.includes('T')) {
    try {
      const d = new Date(s)
      if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR')
    } catch {
      /* fallthrough */
    }
  }
  if (typeof v === 'object') {
    try {
      const j = JSON.stringify(v)
      return j.length > 200 ? `${j.slice(0, 197)}…` : j
    } catch {
      return '[objeto]'
    }
  }
  return s.length > 500 ? `${s.slice(0, 497)}…` : s
}

function fieldDiff(
  before: Record<string, any> | undefined,
  after: Record<string, any> | undefined,
  keys: readonly string[]
): CronogramaCampoDiff[] {
  const out: CronogramaCampoDiff[] = []
  for (const k of keys) {
    const fa = fmtVal(before?.[k])
    const fb = fmtVal(after?.[k])
    if (fa !== fb) out.push({ campo: k, anterior: fa, novo: fb })
    if (out.length >= MAX_CAMPOS_POR_ITEM) break
  }
  return out
}

function phaseLabel(p: any): string {
  return String(p?.name || p?.id || 'Etapa sem nome')
}

function taskLabel(t: any): string {
  return String(t?.name || t?.id || 'Tarefa sem nome')
}

function subLabel(s: any): string {
  return String(s?.title || s?.name || s?.id || 'Subtarefa sem nome')
}

/** Emparelha por id; o que sobrar emparelha por posição (itens sem id). */
function pairByIdThenPosition<T extends Record<string, any>>(
  beforeArr: T[] | undefined,
  afterArr: T[] | undefined
): Array<{ b?: T; a?: T }> {
  const b = Array.isArray(beforeArr) ? beforeArr : []
  const a = Array.isArray(afterArr) ? afterArr : []
  const pairs: Array<{ b?: T; a?: T }> = []
  const usedB = new Set<number>()
  const usedA = new Set<number>()
  const mapB = new Map<string, { item: T; idx: number }>()
  const mapA = new Map<string, { item: T; idx: number }>()
  b.forEach((it, idx) => {
    if (it?.id != null && String(it.id).trim()) mapB.set(String(it.id), { item: it, idx })
  })
  a.forEach((it, idx) => {
    if (it?.id != null && String(it.id).trim()) mapA.set(String(it.id), { item: it, idx })
  })
  const allIds = new Set([...mapB.keys(), ...mapA.keys()])
  for (const id of allIds) {
    const ib = mapB.get(id)
    const ia = mapA.get(id)
    pairs.push({ b: ib?.item, a: ia?.item })
    if (ib) usedB.add(ib.idx)
    if (ia) usedA.add(ia.idx)
  }
  const bLeft = b.map((item, idx) => ({ item, idx })).filter((x) => !usedB.has(x.idx))
  const aLeft = a.map((item, idx) => ({ item, idx })).filter((x) => !usedA.has(x.idx))
  const nMin = Math.min(bLeft.length, aLeft.length)
  for (let i = 0; i < nMin; i++) pairs.push({ b: bLeft[i].item, a: aLeft[i].item })
  for (let i = nMin; i < bLeft.length; i++) pairs.push({ b: bLeft[i].item, a: undefined })
  for (let i = nMin; i < aLeft.length; i++) pairs.push({ b: undefined, a: aLeft[i].item })
  return pairs
}

function pushAlteracao(
  list: CronogramaAlteracao[],
  item: CronogramaAlteracao,
  truncado: { value: boolean }
) {
  if (list.length >= MAX_ALTERACOES) {
    truncado.value = true
    return
  }
  list.push(item)
}

function diffSubtasks(
  phaseName: string,
  taskName: string,
  beforeTask: any,
  afterTask: any,
  list: CronogramaAlteracao[],
  truncado: { value: boolean }
) {
  const pairs = pairByIdThenPosition(beforeTask?.subtasks, afterTask?.subtasks)
  const basePath = `${phaseName} › ${taskName}`
  for (const { b, a } of pairs) {
    if (truncado.value) return
    if (!b && a) {
      pushAlteracao(
        list,
        {
          tipo: 'subtarefa',
          acao: 'criada',
          caminho: `${basePath} › ${subLabel(a)}`,
          nome: subLabel(a),
          id: a?.id ?? null
        },
        truncado
      )
      continue
    }
    if (b && !a) {
      pushAlteracao(
        list,
        {
          tipo: 'subtarefa',
          acao: 'removida',
          caminho: `${basePath} › ${subLabel(b)}`,
          nome: subLabel(b),
          id: b?.id ?? null
        },
        truncado
      )
      continue
    }
    if (b && a) {
      const campos = fieldDiff(b, a, SUBTASK_KEYS)
      if (campos.length > 0) {
        pushAlteracao(
          list,
          {
            tipo: 'subtarefa',
            acao: 'alterada',
            caminho: `${basePath} › ${subLabel(a)}`,
            nome: subLabel(a),
            id: a?.id ?? b?.id ?? null,
            campos
          },
          truncado
        )
      }
    }
  }
}

function diffTasks(phaseName: string, beforePhase: any, afterPhase: any, list: CronogramaAlteracao[], truncado: { value: boolean }) {
  const pairs = pairByIdThenPosition(beforePhase?.tasks, afterPhase?.tasks)
  for (const { b, a } of pairs) {
    if (truncado.value) return
    if (!b && a) {
      pushAlteracao(
        list,
        {
          tipo: 'tarefa',
          acao: 'criada',
          caminho: `${phaseName} › ${taskLabel(a)}`,
          nome: taskLabel(a),
          id: a?.id ?? null
        },
        truncado
      )
      diffSubtasks(phaseName, taskLabel(a), { subtasks: [] }, a, list, truncado)
      continue
    }
    if (b && !a) {
      pushAlteracao(
        list,
        {
          tipo: 'tarefa',
          acao: 'removida',
          caminho: `${phaseName} › ${taskLabel(b)}`,
          nome: taskLabel(b),
          id: b?.id ?? null
        },
        truncado
      )
      continue
    }
    if (b && a) {
      const tn = taskLabel(a)
      const campos = fieldDiff(b, a, TASK_KEYS)
      if (campos.length > 0) {
        pushAlteracao(
          list,
          {
            tipo: 'tarefa',
            acao: 'alterada',
            caminho: `${phaseName} › ${tn}`,
            nome: tn,
            id: a?.id ?? b?.id ?? null,
            campos
          },
          truncado
        )
      }
      diffSubtasks(phaseName, tn, b, a, list, truncado)
    }
  }
}

/** Compara dois cronogramas e devolve alterações campo a campo (para auditoria). */
export function buildCronogramaDiff(
  timelineBefore: string | null | undefined,
  bodyTimeline: unknown
): { alteracoes: CronogramaAlteracao[]; truncado: boolean } {
  const beforePhases = parsePhasesFromDbString(timelineBefore)
  const afterPhases = parsePhasesFromBody(bodyTimeline)
  const list: CronogramaAlteracao[] = []
  const truncado = { value: false }

  const pairs = pairByIdThenPosition(beforePhases, afterPhases)
  for (const { b, a } of pairs) {
    if (truncado.value) break
    const pn = a ? phaseLabel(a) : b ? phaseLabel(b) : 'Etapa'
    if (!b && a) {
      pushAlteracao(
        list,
        {
          tipo: 'fase',
          acao: 'criada',
          caminho: pn,
          nome: phaseLabel(a),
          id: a?.id ?? null
        },
        truncado
      )
      diffTasks(phaseLabel(a), { tasks: [] }, a, list, truncado)
      continue
    }
    if (b && !a) {
      pushAlteracao(
        list,
        {
          tipo: 'fase',
          acao: 'removida',
          caminho: phaseLabel(b),
          nome: phaseLabel(b),
          id: b?.id ?? null
        },
        truncado
      )
      continue
    }
    if (b && a) {
      const campos = fieldDiff(b, a, PHASE_KEYS)
      if (campos.length > 0) {
        pushAlteracao(
          list,
          {
            tipo: 'fase',
            acao: 'alterada',
            caminho: phaseLabel(a),
            nome: phaseLabel(a),
            id: a?.id ?? b?.id ?? null,
            campos
          },
          truncado
        )
      }
      diffTasks(phaseLabel(a), b, a, list, truncado)
    }
  }

  return { alteracoes: list, truncado: truncado.value }
}

/** Normaliza timeline do banco (string JSON) para comparação estável. */
export function normalizeTimelineFromDb(raw: string | null | undefined): string {
  try {
    const o = raw && String(raw).trim() ? JSON.parse(String(raw)) : {}
    const phases = Array.isArray(o?.phases) ? o.phases : []
    return JSON.stringify({ phases })
  } catch {
    return '{"phases":[]}'
  }
}

/** Normaliza objeto timeline enviado no body. */
export function normalizeTimelineFromBody(bodyTimeline: unknown): string {
  try {
    if (!bodyTimeline || typeof bodyTimeline !== 'object') return '{"phases":[]}'
    const phases = Array.isArray((bodyTimeline as { phases?: unknown }).phases)
      ? (bodyTimeline as { phases: unknown[] }).phases
      : []
    return JSON.stringify({ phases })
  } catch {
    return '{"phases":[]}'
  }
}

export type TimelineSummary = {
  phaseCount: number
  taskCount: number
  subtaskCount: number
}

export function summarizeTimelineJson(raw: string | null | undefined): TimelineSummary {
  try {
    const o = raw && String(raw).trim() ? JSON.parse(String(raw)) : {}
    return summarizeTimelineObject(o)
  } catch {
    return { phaseCount: 0, taskCount: 0, subtaskCount: 0 }
  }
}

export function summarizeTimelineObject(bodyTimeline: unknown): TimelineSummary {
  const phases =
    bodyTimeline && typeof bodyTimeline === 'object' && Array.isArray((bodyTimeline as { phases?: unknown }).phases)
      ? (bodyTimeline as { phases: any[] }).phases
      : []
  let taskCount = 0
  let subtaskCount = 0
  for (const p of phases) {
    const tasks = Array.isArray(p?.tasks) ? p.tasks : []
    taskCount += tasks.length
    for (const task of tasks) {
      const subs = Array.isArray(task?.subtasks) ? task.subtasks : []
      subtaskCount += subs.length
    }
  }
  return { phaseCount: phases.length, taskCount, subtaskCount }
}

export async function logCronogramaAudit(
  prisma: PrismaClient,
  opts: {
    projectId: string
    actorUserId: string | null
    timelineBefore: string | null | undefined
    bodyTimeline: unknown
  }
): Promise<void> {
  const { projectId, actorUserId, timelineBefore, bodyTimeline } = opts
  if (bodyTimeline == null || typeof bodyTimeline !== 'object') return

  const beforeNorm = normalizeTimelineFromDb(timelineBefore)
  const afterNorm = normalizeTimelineFromBody(bodyTimeline)
  if (beforeNorm === afterNorm) return

  const antes = summarizeTimelineJson(timelineBefore)
  const depois = summarizeTimelineObject(bodyTimeline)
  const diff = buildCronogramaDiff(timelineBefore, bodyTimeline)

  try {
    await prisma.projectWorkAuditLog.create({
      data: {
        projectId,
        entityType: 'cronograma',
        entityId: null,
        action: 'update',
        actorUserId: actorUserId || null,
        targetLabel: 'Cronograma (etapas, tarefas e subtarefas)',
        metadata: JSON.stringify({
          antes,
          depois,
          alteracoes: diff.alteracoes,
          truncado: diff.truncado
        })
      }
    })
  } catch (e) {
    console.warn('⚠️ logCronogramaAudit: falha ao gravar (não bloqueia o PUT):', e)
  }
}
