export interface Project {
  id: string
  name: string
  description: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  startDate: string
  endDate: string
  progress: number // 0-100
  budget?: number
  client?: string
  manager: string // ID do gerente
  team: string[] // IDs dos membros da equipe
  tags: string[]
  color: string // Cor do projeto
  createdAt: string
  updatedAt: string
}

export interface ProjectTask {
  id: string
  projectId: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: string // ID do responsável
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
  dependencies: string[] // IDs das tarefas dependentes
  subtasks: ProjectSubtask[]
  attachments: string[]
  comments: ProjectComment[]
  createdAt: string
  updatedAt: string
}

export interface ProjectSubtask {
  id: string
  projectTaskId: string
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignee?: string // ID do responsável
  dueDate?: string
  estimatedHours?: number
  actualHours?: number
  dependencies: string[] // IDs das subtarefas dependentes
  order: number // Para manter a ordem hierárquica
  code: string // Código hierárquico (1.1.1, 1.1.2, etc.)
  attachments: string[] // URLs dos anexos
  comments: ProjectComment[] // Comentários estruturados
  createdAt: string
  updatedAt: string
}

export interface ProjectComment {
  id: string
  author: string
  content: string
  timestamp: string
}

export interface ProjectMilestone {
  id: string
  projectId: string
  title: string
  description: string
  dueDate: string
  completed: boolean
  tasks: string[] // IDs das tarefas relacionadas
}

export interface ProjectTimeline {
  id: string
  projectId: string
  startDate: string
  endDate: string
  phases: ProjectPhase[]
}

export interface ProjectPhase {
  id: string
  name: string
  startDate: string
  endDate: string
  tasks: string[]
  completed: boolean
}
