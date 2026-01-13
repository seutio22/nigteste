import React, { useState, useMemo } from 'react'
import {
  Box,
  Paper,
  Typography,
  Chip,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
  Divider,
  useTheme
} from '@mui/material'
import {
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Schedule,
  Warning,
  PlayArrow,
  Pause,
  Stop,
  Assignment,
  Timeline
} from '@mui/icons-material'

interface Subtask {
  id: string
  title: string
  description: string
  status: 'pending' | 'in-progress' | 'completed' | 'paused' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  assignee: string
  startDate: string
  dueDate: string
  actualEndDate?: string
  estimatedHours: number
  actualHours?: number
  progress: number
  dependencies: string[]
  order: number
  code: string
  observations?: string
}

interface Task {
  id: string
  name: string
  description: string
  responsible: string
  startDate: string
  plannedEndDate: string
  actualEndDate?: string
  status: 'pending' | 'in-progress' | 'completed' | 'paused' | 'cancelled'
  progress: number
  priority: 'low' | 'medium' | 'high'
  estimatedHours: number
  actualHours?: number
  dependencies: string[]
  observations?: string
  subtasks: Subtask[]
}

interface Phase {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  status: 'pending' | 'in-progress' | 'completed' | 'paused' | 'cancelled'
  tasks: Task[]
}

interface ProjectGanttProps {
  phases: Phase[]
  projectStartDate: string
  projectEndDate: string
}

const ProjectGantt: React.FC<ProjectGanttProps> = ({ phases, projectStartDate, projectEndDate }) => {
  const theme = useTheme()
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set())
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())

  // Função auxiliar para normalizar data (extrair apenas YYYY-MM-DD para evitar timezone)
  const normalizeDate = (dateString: string): string => {
    if (!dateString) return ''
    // Se já está no formato YYYY-MM-DD, retornar diretamente
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    // Se tem hora (formato ISO), extrair apenas a parte da data
    if (dateString.includes('T')) {
      return dateString.split('T')[0]
    }
    return dateString
  }

  // Calcular a duração total do projeto em dias
  const projectDuration = useMemo(() => {
    const startStr = normalizeDate(projectStartDate)
    const endStr = normalizeDate(projectEndDate)
    const start = new Date(startStr + 'T00:00:00')
    const end = new Date(endStr + 'T00:00:00')
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }, [projectStartDate, projectEndDate])

  // Calcular a posição horizontal de uma data
  const getDatePosition = (date: string) => {
    const startStr = normalizeDate(projectStartDate)
    const currentStr = normalizeDate(date)
    const start = new Date(startStr + 'T00:00:00')
    const current = new Date(currentStr + 'T00:00:00')
    const daysDiff = Math.ceil((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, (daysDiff / projectDuration) * 100)
  }

  // Calcular a largura de uma tarefa/fase
  const getDurationWidth = (startDate: string, endDate: string) => {
    const startStr = normalizeDate(startDate)
    const endStr = normalizeDate(endDate)
    const start = new Date(startStr + 'T00:00:00')
    const end = new Date(endStr + 'T00:00:00')
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, (daysDiff / projectDuration) * 100)
  }

  // Obter cor baseada no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main
      case 'in-progress':
        return theme.palette.primary.main
      case 'paused':
        return theme.palette.warning.main
      case 'cancelled':
        return theme.palette.error.main
      default:
        return theme.palette.grey[400]
    }
  }

  // Obter ícone baseado no status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle fontSize="small" />
      case 'in-progress':
        return <PlayArrow fontSize="small" />
      case 'paused':
        return <Pause fontSize="small" />
      case 'cancelled':
        return <Stop fontSize="small" />
      default:
        return <Schedule fontSize="small" />
    }
  }

  // Obter cor da prioridade
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return theme.palette.error.main
      case 'medium':
        return theme.palette.warning.main
      case 'low':
        return theme.palette.success.main
      default:
        return theme.palette.grey[500]
    }
  }

  const togglePhaseExpansion = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId)
    } else {
      newExpanded.add(phaseId)
    }
    setExpandedPhases(newExpanded)
  }

  const toggleTaskExpansion = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  // CORRIGIDA: Evita problemas de timezone ao exibir datas
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === '') return '-'
    try {
      // Se já está no formato YYYY-MM-DD, formata diretamente
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      
      // Se tem hora (formato ISO), extrai apenas a parte da data
      if (typeof dateString === 'string' && dateString.includes('T')) {
        const datePart = dateString.split('T')[0]
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          const [year, month, day] = datePart.split('-')
          return `${day}/${month}/${year}`
        }
      }
      
      // Para outros formatos, usa Date mas com métodos locais para evitar timezone
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      // Usa métodos locais para evitar conversão de timezone
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch (error) {
      console.error('❌ Erro ao formatar data:', dateString, error)
      return '-'
    }
  }

  const formatDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return `${days} dia${days !== 1 ? 's' : ''}`
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Cronograma Gantt
      </Typography>
      
      {/* Timeline Header */}
      <Paper sx={{ p: 2, mb: 3, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Timeline sx={{ mr: 1 }} />
          <Typography variant="h6">
            Linha do Tempo do Projeto
          </Typography>
        </Box>
        
        {/* Timeline Scale */}
        <Box sx={{ 
          display: 'flex', 
          borderBottom: `2px solid ${theme.palette.divider}`,
          mb: 2,
          minWidth: '800px'
        }}>
          <Box sx={{ width: '200px', flexShrink: 0 }} />
          <Box sx={{ 
            display: 'flex', 
            flex: 1, 
            position: 'relative',
            borderLeft: `1px solid ${theme.palette.divider}`
          }}>
            {Array.from({ length: Math.ceil(projectDuration / 7) + 1 }, (_, i) => {
              const startStr = normalizeDate(projectStartDate)
              const weekStart = new Date(startStr + 'T00:00:00')
              weekStart.setDate(weekStart.getDate() + (i * 7))
              return (
                <Box
                  key={i}
                  sx={{
                    flex: 1,
                    minWidth: '60px',
                    borderRight: `1px solid ${theme.palette.divider}`,
                    p: 1,
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    color: theme.palette.text.secondary
                  }}
                >
                  Sem {i + 1}
                  <br />
                  {formatDate(weekStart.toISOString().split('T')[0])}
                </Box>
              )
            })}
          </Box>
        </Box>

        {/* Phases */}
        {phases.map((phase, phaseIndex) => (
          <Box key={phase.id} sx={{ mb: 2 }}>
            {/* Phase Header */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              p: 1,
              bgcolor: theme.palette.grey[50],
              borderRadius: 1,
              border: `1px solid ${theme.palette.divider}`
            }}>
              <IconButton
                size="small"
                onClick={() => togglePhaseExpansion(phase.id)}
                sx={{ mr: 1 }}
              >
                {expandedPhases.has(phase.id) ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
              
              <Box sx={{ width: '200px', flexShrink: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  {phase.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                </Typography>
              </Box>

              {/* Phase Bar */}
              <Box sx={{ 
                flex: 1, 
                position: 'relative',
                height: '40px',
                borderLeft: `1px solid ${theme.palette.divider}`
              }}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${getDatePosition(phase.startDate)}%`,
                    width: `${getDurationWidth(phase.startDate, phase.endDate)}%`,
                    height: '100%',
                    bgcolor: getStatusColor(phase.status),
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    minWidth: '60px'
                  }}
                >
                  {formatDuration(phase.startDate, phase.endDate)}
                </Box>
              </Box>

              <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Chip
                  icon={getStatusIcon(phase.status)}
                  label={phase.status === 'in-progress' ? 'Em Andamento' : 
                         phase.status === 'completed' ? 'Concluída' :
                         phase.status === 'paused' ? 'Pausada' :
                         phase.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                  size="small"
                  color={phase.status === 'completed' ? 'success' : 
                         phase.status === 'in-progress' ? 'primary' :
                         phase.status === 'paused' ? 'warning' :
                         phase.status === 'cancelled' ? 'error' : 'default'}
                />
                <Typography variant="body2" sx={{ minWidth: '60px', textAlign: 'center' }}>
                  {phase.progress}%
                </Typography>
              </Box>
            </Box>

            {/* Phase Progress */}
            <Box sx={{ ml: 4, mb: 1 }}>
              <LinearProgress
                variant="determinate"
                value={phase.progress}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* Tasks */}
            <Collapse in={expandedPhases.has(phase.id)}>
              <Box sx={{ ml: 4 }}>
                {phase.tasks.map((task, taskIndex) => (
                  <Box key={task.id} sx={{ mb: 1 }}>
                    {/* Task Header */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      p: 1,
                      bgcolor: theme.palette.grey[100],
                      borderRadius: 1,
                      border: `1px solid ${theme.palette.divider}`,
                      borderStyle: 'dashed'
                    }}>
                      <IconButton
                        size="small"
                        onClick={() => toggleTaskExpansion(task.id)}
                        sx={{ mr: 1 }}
                      >
                        {expandedTasks.has(task.id) ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                      
                      <Box sx={{ width: '200px', flexShrink: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {task.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {task.responsible}
                        </Typography>
                      </Box>

                      {/* Task Bar */}
                      <Box sx={{ 
                        flex: 1, 
                        position: 'relative',
                        height: '30px',
                        borderLeft: `1px solid ${theme.palette.divider}`
                      }}>
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${getDatePosition(task.startDate)}%`,
                            width: `${getDurationWidth(task.startDate, task.plannedEndDate)}%`,
                            height: '100%',
                            bgcolor: getStatusColor(task.status),
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            minWidth: '50px',
                            opacity: 0.8
                          }}
                        >
                          {formatDuration(task.startDate, task.plannedEndDate)}
                        </Box>
                      </Box>

                      <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={getStatusIcon(task.status)}
                          label={task.status === 'in-progress' ? 'Em Andamento' : 
                                 task.status === 'completed' ? 'Concluída' :
                                 task.status === 'paused' ? 'Pausada' :
                                 task.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                          size="small"
                          color={task.status === 'completed' ? 'success' : 
                                 task.status === 'in-progress' ? 'primary' :
                                 task.status === 'paused' ? 'warning' :
                                 task.status === 'cancelled' ? 'error' : 'default'}
                        />
                        <Chip
                          label={task.priority}
                          size="small"
                          sx={{ 
                            bgcolor: getPriorityColor(task.priority),
                            color: 'white',
                            fontSize: '0.6rem'
                          }}
                        />
                        <Typography variant="body2" sx={{ minWidth: '50px', textAlign: 'center' }}>
                          {task.progress}%
                        </Typography>
                      </Box>
                    </Box>

                    {/* Task Progress */}
                    <Box sx={{ ml: 4, mb: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={task.progress}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>

                    {/* Subtasks */}
                    <Collapse in={expandedTasks.has(task.id)}>
                      <Box sx={{ ml: 4 }}>
                        {task.subtasks.map((subtask, subtaskIndex) => (
                          <Box key={subtask.id} sx={{ mb: 1 }}>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              p: 0.5,
                              bgcolor: 'white',
                              borderRadius: 1,
                              border: `1px solid ${theme.palette.divider}`,
                              borderStyle: 'dotted'
                            }}>
                              <Assignment sx={{ fontSize: '1rem', mr: 1, color: theme.palette.text.secondary }} />
                              
                              <Box sx={{ width: '200px', flexShrink: 0 }}>
                                <Typography variant="caption" sx={{ fontWeight: 'medium' }}>
                                  {subtask.code} - {subtask.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  {subtask.assignee}
                                </Typography>
                              </Box>

                              {/* Subtask Bar */}
                              <Box sx={{ 
                                flex: 1, 
                                position: 'relative',
                                height: '20px',
                                borderLeft: `1px solid ${theme.palette.divider}`
                              }}>
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    left: `${getDatePosition(subtask.startDate)}%`,
                                    width: `${getDurationWidth(subtask.startDate, subtask.dueDate)}%`,
                                    height: '100%',
                                    bgcolor: getStatusColor(subtask.status),
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold',
                                    minWidth: '40px',
                                    opacity: 0.6
                                  }}
                                >
                                  {formatDuration(subtask.startDate, subtask.dueDate)}
                                </Box>
                              </Box>

                              <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  icon={getStatusIcon(subtask.status)}
                                  label={subtask.status === 'in-progress' ? 'Em Andamento' : 
                                         subtask.status === 'completed' ? 'Concluída' :
                                         subtask.status === 'paused' ? 'Pausada' :
                                         subtask.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                                  size="small"
                                  color={subtask.status === 'completed' ? 'success' : 
                                         subtask.status === 'in-progress' ? 'primary' :
                                         subtask.status === 'paused' ? 'warning' :
                                         subtask.status === 'cancelled' ? 'error' : 'default'}
                                />
                                <Chip
                                  label={subtask.priority}
                                  size="small"
                                  sx={{ 
                                    bgcolor: getPriorityColor(subtask.priority),
                                    color: 'white',
                                    fontSize: '0.5rem'
                                  }}
                                />
                                <Typography variant="caption" sx={{ minWidth: '40px', textAlign: 'center' }}>
                                  {subtask.progress}%
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        ))}
      </Paper>

      {/* Legend */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Legenda
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: theme.palette.success.main, borderRadius: 1 }} />
            <Typography variant="body2">Concluído</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: theme.palette.primary.main, borderRadius: 1 }} />
            <Typography variant="body2">Em Andamento</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: theme.palette.warning.main, borderRadius: 1 }} />
            <Typography variant="body2">Pausado</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: theme.palette.error.main, borderRadius: 1 }} />
            <Typography variant="body2">Cancelado</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: theme.palette.grey[400], borderRadius: 1 }} />
            <Typography variant="body2">Pendente</Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  )
}

export default ProjectGantt
