import type { PrismaClient } from '@prisma/client'

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
          depois
        })
      }
    })
  } catch (e) {
    console.warn('⚠️ logCronogramaAudit: falha ao gravar (não bloqueia o PUT):', e)
  }
}
