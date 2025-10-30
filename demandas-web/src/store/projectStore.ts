import { create } from 'zustand'
import type { Project } from '../types/project'
import type { ProjectTask, ProjectSubtask, ProjectMilestone, ProjectTimeline } from '../types/project'
import { getApi } from '../lib/apiConfig'
import { useAuthStore } from './authStore'

type ProjectId = string

// Função para gerar UUID compatível com todos os navegadores
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback para navegadores mais antigos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface ProjectState {
  projects: Project[]
  tasks: ProjectTask[]
  subtasks: ProjectSubtask[]
  milestones: ProjectMilestone[]
  timelines: ProjectTimeline[]
  loading: boolean
  error: string | null
  
  // Projetos
  add: (p: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Project>
  upsert: (p: Project) => Promise<void>
  remove: (id: ProjectId) => Promise<void>
  get: (id: ProjectId) => Project | undefined
  getProjectsByManager: (managerId: string) => Project[]
  
  // Tarefas
  addTask: (task: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ProjectTask>
  updateTask: (id: string, updates: Partial<ProjectTask>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  getTask: (id: string) => ProjectTask | undefined
  getTasksByProject: (projectId: string) => ProjectTask[]
  getTasksByAssignee: (assigneeId: string) => ProjectTask[]
  getTasksByStatus: (status: string) => ProjectTask[]
  
  // Subtarefas
  addSubtask: (subtask: Omit<ProjectSubtask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<ProjectSubtask>
  updateSubtask: (id: string, updates: Partial<ProjectSubtask>) => Promise<void>
  deleteSubtask: (id: string) => Promise<void>
  getSubtask: (id: string) => ProjectSubtask | undefined
  getSubtasksByTask: (taskId: string) => ProjectSubtask[]
  getSubtasksByAssignee: (assigneeId: string) => ProjectSubtask[]
  getSubtasksByStatus: (status: string) => ProjectSubtask[]
  
  // Marcos
  addMilestone: (milestone: Omit<ProjectMilestone, 'id'>) => ProjectMilestone
  updateMilestone: (id: string, updates: Partial<ProjectMilestone>) => void
  deleteMilestone: (id: string) => void
  getMilestone: (id: string) => ProjectMilestone | undefined
  getMilestonesByProject: (projectId: string) => ProjectMilestone[]
  
  // Timeline
  addTimeline: (timeline: Omit<ProjectTimeline, 'id'>) => ProjectTimeline
  updateTimeline: (id: string, updates: Partial<ProjectTimeline>) => void
  deleteTimeline: (id: string) => void
  getTimeline: (id: string) => ProjectTimeline | undefined
  getTimelineByProject: (projectId: string) => ProjectTimeline | undefined
  
  // Sincronização com API
  syncFromApi: () => Promise<void>
  clearError: () => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  tasks: [],
  subtasks: [],
  milestones: [],
  timelines: [],
  loading: false,
  error: null,
  
  // Projetos
  add: async (payload) => {
    try {
      
      // Preparar dados no formato correto para a API
      const user = useAuthStore.getState().user
      const apiData: any = {
        name: payload.name,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        startDate: payload.startDate || new Date().toISOString(),
        endDate: payload.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias no futuro
        progress: payload.progress || 0,
        budget: payload.budget || null,
        team: JSON.stringify([]), // Array vazio como string
        tags: JSON.stringify([]), // Array vazio como string
        color: '#3b82f6', // Cor padrão
        isPrivate: (payload as any).isPrivate ?? false,
        ownerId: user?.id || undefined
      }
      
      // Não enviar managerId - campo opcional
      if ((payload as any).managerId) {
        apiData.managerId = (payload as any).managerId
      }
      
      
      // Criar projeto na API
      const api = getApi()
      const response = await api.post('/projetos', apiData)
      
      // Adicionar ao store local
      const project: Project = {
        id: response.id,
        createdAt: response.createdAt || new Date().toISOString(),
        updatedAt: response.updatedAt || new Date().toISOString(),
        ...response
      }
      
      set((s) => ({ projects: [project, ...s.projects] }))
      return project
    } catch (error) {
      console.error('❌ ProjectStore: Erro ao criar projeto na API:', error)
      
      // Fallback: criar apenas localmente se a API falhar
      const project: Project = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...payload
      }
      set((s) => ({ projects: [project, ...s.projects] }))
      return project
    }
  },
  
  upsert: async (project) => {
    try {
      console.log('🔍 ProjectStore.upsert: Iniciando atualização de projeto:', project.id)
      console.log('🔍 ProjectStore.upsert: Campo progress ANTES de enviar:', project.progress)
      console.log('🔍 ProjectStore.upsert: Tipo do progress:', typeof project.progress)
      console.log('🔍 ProjectStore.upsert: Projeto completo:', {
        id: project.id,
        name: project.name,
        progress: project.progress,
        status: project.status
      })
      
      // Normalizar payload apenas com campos suportados pela API
      const payload: any = {
        name: project.name,
        description: (project as any).description ?? undefined,
        status: project.status,
        priority: (project as any).priority ?? undefined,
        progress: typeof project.progress === 'number' ? project.progress : Number(project.progress) || 0,
        startDate: (project as any).startDate ? new Date((project as any).startDate).toISOString() : undefined,
        endDate: (project as any).endDate ? new Date((project as any).endDate).toISOString() : undefined,
        color: (project as any).color ?? undefined,
        isPrivate: (project as any).isPrivate ?? undefined
      }
      
      // Campos de array/JSON
      const team = (project as any).team
      if (Array.isArray(team)) payload.team = team
      const tags = (project as any).tags
      if (Array.isArray(tags)) payload.tags = tags
      const timeline = (project as any).timeline
      if (timeline && typeof timeline === 'object') payload.timeline = timeline
      const activities = (project as any).activities
      if (Array.isArray(activities)) payload.activities = activities
      
      // Enviar atualização
      const api = getApi()
      const response = await api.put(`/projetos/${project.id}`, payload)
      console.log('✅ ProjectStore.upsert: Projeto atualizado no banco de dados')
      console.log('✅ ProjectStore.upsert: Resposta da API:', response)
      console.log('✅ ProjectStore.upsert: Progress na resposta:', response?.progress)
      
      // Atualizar no estado local
      set((s) => ({
        projects: s.projects.map(p =>
          p.id === project.id ? { ...p, ...project, updatedAt: new Date().toISOString() } : p
        )
      }))
      
      console.log('✅ ProjectStore: Projeto atualizado no estado local')
    } catch (error) {
      console.error('❌ ProjectStore: Erro ao atualizar projeto:', error)
      throw error
    }
  },
  
  remove: async (id) => {
    try {
      console.log('🔍 ProjectStore: Iniciando exclusão de projeto:', id)
      
      // Excluir do banco de dados via API
      const api = getApi()
      await api.delete(`/projetos/${id}`)
      console.log('✅ ProjectStore: Projeto excluído do banco de dados')
      
      // Remover do estado local
      set((s) => ({
        projects: s.projects.filter(p => p.id !== id)
      }))
      
      console.log('✅ ProjectStore: Projeto removido do estado local')
    } catch (error) {
      console.error('❌ ProjectStore: Erro ao excluir projeto:', error)
      throw error
    }
  },
  
  get: (id) => {
    return get().projects.find(p => p.id === id)
  },
  
  getProjectsByManager: (managerId) => {
    return get().projects.filter(p => p.manager === managerId)
  },
  
  // Tarefas
  addTask: async (payload) => {
    const task: ProjectTask = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...payload
    }
    set((s) => ({ tasks: [task, ...s.tasks] }))
    return task
  },
  
  updateTask: async (id, updates) => {
    set((s) => ({
      tasks: s.tasks.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    }))
  },
  
  deleteTask: async (id) => {
    set((s) => ({
      tasks: s.tasks.filter(t => t.id !== id)
    }))
  },
  
  getTask: (id) => {
    return get().tasks.find(t => t.id === id)
  },
  
  getTasksByProject: (projectId) => {
    return get().tasks.filter(t => t.projectId === projectId)
  },
  
  getTasksByAssignee: (assigneeId) => {
    return get().tasks.filter(t => t.assignee === assigneeId)
  },
  
  getTasksByStatus: (status) => {
    return get().tasks.filter(t => t.status === status)
  },
  
  // Subtarefas
  addSubtask: async (payload) => {
    const subtask: ProjectSubtask = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...payload
    }
    set((s) => ({ subtasks: [subtask, ...s.subtasks] }))
    return subtask
  },
  
  updateSubtask: async (id, updates) => {
    set((s) => ({
      subtasks: s.subtasks.map(s =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      )
    }))
  },
  
  deleteSubtask: async (id) => {
    set((s) => ({
      subtasks: s.subtasks.filter(s => s.id !== id)
    }))
  },
  
  getSubtask: (id) => {
    return get().subtasks.find(s => s.id === id)
  },
  
  getSubtasksByTask: (taskId) => {
    return get().subtasks.filter(s => s.projectTaskId === taskId)
  },
  
  getSubtasksByAssignee: (assigneeId) => {
    return get().subtasks.filter(s => s.assignee === assigneeId)
  },
  
  getSubtasksByStatus: (status) => {
    return get().subtasks.filter(s => s.status === status)
  },
  
  // Marcos
  addMilestone: (payload) => {
    const milestone: ProjectMilestone = {
      id: generateId(),
      ...payload
    }
    set((s) => ({ milestones: [milestone, ...s.milestones] }))
    return milestone
  },
  
  updateMilestone: (id, updates) => {
    set((s) => ({
      milestones: s.milestones.map(m =>
        m.id === id ? { ...m, ...updates } : m
      )
    }))
  },
  
  deleteMilestone: (id) => {
    set((s) => ({
      milestones: s.milestones.filter(m => m.id !== id)
    }))
  },
  
  getMilestone: (id) => {
    return get().milestones.find(m => m.id === id)
  },
  
  getMilestonesByProject: (projectId) => {
    return get().milestones.filter(m => m.projectId === projectId)
  },
  
  // Timeline
  addTimeline: (payload) => {
    const timeline: ProjectTimeline = {
      id: generateId(),
      ...payload
    }
    set((s) => ({ timelines: [timeline, ...s.timelines] }))
    return timeline
  },
  
  updateTimeline: (id, updates) => {
    set((s) => ({
      timelines: s.timelines.map(t =>
        t.id === id ? { ...t, ...updates } : t
      )
    }))
  },
  
  deleteTimeline: (id) => {
    set((s) => ({
      timelines: s.timelines.filter(t => t.id !== id)
    }))
  },
  
  getTimeline: (id) => {
    return get().timelines.find(t => t.id === id)
  },
  
  getTimelineByProject: (projectId) => {
    return get().timelines.find(t => t.projectId === projectId)
  },
  
  // Utilitários
  calculateProjectProgress: (projectId) => {
    const projectTasks = get().tasks.filter(t => t.projectId === projectId)
    if (projectTasks.length === 0) return 0
    
    const completedTasks = projectTasks.filter(t => t.status === 'done').length
    return Math.round((completedTasks / projectTasks.length) * 100)
  },
  
  getProjectStats: (projectId) => {
    const projectTasks = get().tasks.filter(t => t.projectId === projectId)
    const totalTasks = projectTasks.length
    const completedTasks = projectTasks.filter(t => t.status === 'done').length
    const overdueTasks = projectTasks.filter(t => 
      t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
    ).length
    const totalHours = projectTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0)
    const actualHours = projectTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0)
    
    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      totalHours,
      actualHours
    }
  },
  
  // Sincronização com API
  syncFromApi: async () => {
    set({ loading: true, error: null })
    try {
      // Importar API dinamicamente baseado no ambiente
      const api = getApi()
      
      // Carregar apenas projetos da API por enquanto
      const response = await api.get('/projetos')
      
      // A API retorna um objeto com propriedade 'value' contendo o array
      const projects = response.value || response || []

      // Aplicar dados ao store
      set({ 
        projects: Array.isArray(projects) ? projects : [], 
        loading: false 
      })
      
      console.log('✅ ProjectStore: Dados sincronizados com sucesso:', projects.length, 'projetos')
      
    } catch (error) {
      console.error('ProjectStore: erro durante syncFromApi:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        loading: false 
      })
    }
  },
  
  clearError: () => set({ error: null }),
  clear: () => set({ 
    projects: [], 
    tasks: [], 
    subtasks: [],
    milestones: [], 
    timelines: [],
    loading: false,
    error: null
  })
}))
