type AnyRecord = Record<string, any>

function newLocalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function resetTask(task: AnyRecord): AnyRecord {
  const subtasks = Array.isArray(task?.subtasks) ? task.subtasks : []
  return {
    ...task,
    id: newLocalId('task'),
    responsible: '',
    assignee: undefined,
    startDate: null,
    plannedEndDate: null,
    dueDate: null,
    actualEndDate: null,
    progress: 0,
    status: 'pending',
    subtasks: subtasks.map((s: AnyRecord) => ({
      ...s,
      id: newLocalId('sub'),
      assignee: undefined,
      startDate: null,
      dueDate: null,
      actualEndDate: null,
      progress: 0,
      status: 'pending',
    })),
  }
}

/**
 * Duplica cronograma (etapas/tarefas/subtarefas) zerando **datas e responsáveis**.
 * Mantém nomes/descrições/observações e prioridades.
 */
export function duplicateProjectTimelineReset(timeline: unknown): AnyRecord {
  const tl = (timeline && typeof timeline === 'object') ? (timeline as AnyRecord) : {}
  const phases = Array.isArray(tl.phases) ? tl.phases : []

  return {
    ...tl,
    phases: phases.map((p: AnyRecord) => {
      const tasks = Array.isArray(p?.tasks) ? p.tasks : []
      return {
        ...p,
        id: newLocalId('phase'),
        startDate: null,
        endDate: null,
        progress: 0,
        status: 'nao_iniciado',
        completed: false,
        tasks: tasks.map(resetTask),
      }
    }),
  }
}

