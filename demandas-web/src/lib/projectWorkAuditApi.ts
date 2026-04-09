import { api } from './api'

export type ProjectWorkAuditAction = 'create' | 'update' | 'delete'

/** Evento único para POST em lote (chamar após salvar alterações na timeline). */
export interface ProjectWorkAuditEntryInput {
  entityType: 'phase' | 'task' | 'subtask' | 'milestone' | string
  entityId?: string | null
  action: ProjectWorkAuditAction
  targetLabel?: string | null
  metadata?: Record<string, unknown> | null
}

export interface ProjectWorkAuditLogRow {
  id: string
  projectId: string
  entityType: string
  entityId: string | null
  action: string
  actorUserId: string | null
  actor: { id: string; name: string; email: string } | null
  targetLabel: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export async function postProjectWorkAuditLogs(
  projectId: string,
  entries: ProjectWorkAuditEntryInput[]
): Promise<{ success: boolean; count: number }> {
  return api.post(`/projetos/${encodeURIComponent(projectId)}/work-audit-logs`, { entries })
}

export async function getProjectWorkAuditLogs(
  projectId: string,
  params?: { from?: string; to?: string; entityType?: string; action?: string; limit?: number }
): Promise<{ logs: ProjectWorkAuditLogRow[] }> {
  const sp = new URLSearchParams()
  if (params?.from) sp.set('from', params.from)
  if (params?.to) sp.set('to', params.to)
  if (params?.entityType) sp.set('entityType', params.entityType)
  if (params?.action) sp.set('action', params.action)
  if (params?.limit != null) sp.set('limit', String(params.limit))
  const q = sp.toString()
  const path = `/projetos/${encodeURIComponent(projectId)}/work-audit-logs${q ? `?${q}` : ''}`
  return api.get(path)
}
