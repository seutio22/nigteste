import { getApi } from './apiConfig'

export type ProjectTemplate = {
  id: string
  name: string
  description: string
  timeline: { phases: unknown[] }
  ownerId?: string | null
  isGlobal: boolean
  createdAt: string
  updatedAt: string
}

export async function listProjectTemplates(): Promise<ProjectTemplate[]> {
  const api = getApi()
  const res = await api.get('/project-templates')
  return Array.isArray(res) ? res : res?.data || []
}

export async function createProjectTemplate(payload: {
  name: string
  description?: string
  timeline: unknown
  isGlobal?: boolean
}): Promise<ProjectTemplate> {
  const api = getApi()
  const res = await api.post('/project-templates', payload)
  return res?.data || res
}

export async function updateProjectTemplate(
  id: string,
  payload: Partial<{ name: string; description: string; timeline: unknown; isGlobal: boolean }>
): Promise<ProjectTemplate> {
  const api = getApi()
  const res = await api.put(`/project-templates/${id}`, payload)
  return res?.data || res
}

export async function deleteProjectTemplate(id: string): Promise<void> {
  const api = getApi()
  await api.delete(`/project-templates/${id}`)
}
