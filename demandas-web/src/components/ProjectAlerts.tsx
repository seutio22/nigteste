import React, { useState, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Alert,
  Chip
} from '@mui/material'
import { api } from '../lib/api.local'
import { Add, Delete, Notifications } from '@mui/icons-material'

interface ProjectAlert {
  id: string
  projectId: string
  userId: string
  responsavelNome: string
  targetType?: string
  targetId?: string
  diasAntes: number
  enabled: boolean
  user: {
    id: string
    name: string
    email: string
  }
}

interface ProjectAlertsProps {
  projectId: string
  project?: {
    managerId?: string
    ownerId?: string
    manager?: { id: string; name: string; email?: string }
    owner?: { id: string; name: string; email?: string }
    timeline?: {
      phases?: Array<{
        id: string
        name: string
        tasks?: Array<{
          id: string
          name?: string
          title?: string
          responsible?: string
          assignee?: string
          subtasks?: Array<{ id: string; name?: string; title?: string }>
        }>
      }>
    }
  }
  readOnly?: boolean
}

export default function ProjectAlerts({ projectId, project, readOnly = false }: ProjectAlertsProps) {
  const [alerts, setAlerts] = useState<ProjectAlert[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newAlert, setNewAlert] = useState({
    userId: '',
    targetType: 'project' as 'project' | 'responsible' | 'task' | 'subtask',
    responsavelNome: '',
    targetId: '',
    diasAntes: 1
  })
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [alertsRes, membersRes] = await Promise.all([
        api.get(`/projetos/${projectId}/alerts`),
        api.get(`/projetos/${projectId}/members`)
      ])
      const alertsData = Array.isArray(alertsRes) ? alertsRes : (alertsRes as any)?.value ?? (alertsRes as any) ?? []
      setAlerts(alertsData)
      const memData = membersRes as any
      setMembers(memData?.internal || [])
    } catch (err: any) {
      console.error('Erro ao carregar alertas:', err)
      setError(err?.message || 'Erro ao carregar dados')
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [projectId])

  const handleAddAlert = async () => {
    if (!newAlert.userId) {
      setError('Selecione um usuário')
      return
    }
    if (newAlert.targetType === 'responsible' && !newAlert.responsavelNome) {
      setError('Selecione um responsável')
      return
    }
    if (newAlert.targetType === 'task' && !newAlert.targetId) {
      setError('Selecione uma tarefa')
      return
    }
    if (newAlert.targetType === 'subtask' && !newAlert.targetId) {
      setError('Selecione uma subtarefa')
      return
    }
    try {
      setError(null)
      await api.post(`/projetos/${projectId}/alerts`, {
        userId: newAlert.userId,
        targetType: newAlert.targetType,
        targetId: newAlert.targetType === 'task' || newAlert.targetType === 'subtask' ? newAlert.targetId : undefined,
        responsavelNome: newAlert.targetType === 'responsible' ? newAlert.responsavelNome : undefined,
        diasAntes: newAlert.diasAntes
      })
      setShowAddDialog(false)
      setNewAlert({ userId: '', targetType: 'project', responsavelNome: '', targetId: '', diasAntes: 1 })
      loadData()
    } catch (err: any) {
      setError(err?.message || err?.data?.error || 'Erro ao criar alerta')
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await api.delete(`/projetos/${projectId}/alerts/${alertId}`)
      loadData()
    } catch (err) {
      console.error('Erro ao remover alerta:', err)
    }
  }

  const membersWithUser = members.map((m) => ({ id: m.userId, name: m.user?.name || 'Sem nome', email: m.user?.email }))
  const managerUser = project?.managerId && project?.manager
    ? { id: project.managerId, name: project.manager.name || 'Sem nome', email: project.manager.email }
    : null
  const ownerUser = project?.ownerId && project?.owner
    ? { id: project.ownerId, name: project.owner.name || 'Sem nome', email: project.owner.email }
    : null
  const allUsersForSelect = [
    ...membersWithUser,
    ...(managerUser && !membersWithUser.some((u) => u.id === managerUser.id) ? [managerUser] : []),
    ...(ownerUser && !membersWithUser.some((u) => u.id === ownerUser.id) && (!managerUser || ownerUser.id !== managerUser.id) ? [ownerUser] : [])
  ].filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)

  const responsaveisUnicos = new Set<string>()
  const tasksFlat: { id: string; phaseName: string; taskName: string }[] = []
  const subtasksFlat: { id: string; phaseName: string; taskName: string; subtaskName: string }[] = []
  project?.timeline?.phases?.forEach((phase: any) => {
    phase.tasks?.forEach((task: any) => {
      const r = task.responsible || task.assignee
      const nome = typeof r === 'object' ? (r?.nome || r?.name || '') : String(r || '')
      if (nome.trim()) responsaveisUnicos.add(nome.trim())
      tasksFlat.push({
        id: task.id,
        phaseName: phase.name || 'Fase',
        taskName: task.name || task.title || 'Tarefa'
      })
      ;(task.subtasks || []).forEach((st: any) => {
        subtasksFlat.push({
          id: st.id,
          phaseName: phase.name || 'Fase',
          taskName: task.name || task.title || 'Tarefa',
          subtaskName: st.name || st.title || 'Subtarefa'
        })
      })
    })
  })
  const responsaveisList = Array.from(responsaveisUnicos).sort()

  const getAlertTargetLabel = (alert: ProjectAlert) => {
    if (alert.targetType === 'task' && alert.targetId) {
      const t = tasksFlat.find((x) => x.id === alert.targetId)
      return t ? `Tarefa: ${t.taskName} (${t.phaseName})` : `Tarefa #${alert.targetId}`
    }
    if (alert.targetType === 'subtask' && alert.targetId) {
      const s = subtasksFlat.find((x) => x.id === alert.targetId)
      return s ? `Subtarefa: ${s.subtaskName} (${s.taskName})` : `Subtarefa #${alert.targetId}`
    }
    if (alert.targetType === 'responsible' || alert.responsavelNome) {
      return `Responsável: ${alert.responsavelNome}`
    }
    return 'Projeto inteiro'
  }

  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Notifications color="primary" />
            <Typography variant="h6">Alertas de Previsão de Entrega</Typography>
          </Box>
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowAddDialog(true)}
            >
              Criar Alerta
            </Button>
          )}
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Configure alertas para notificar usuários quando a data de entrega estiver próxima. Você pode selecionar o
          projeto inteiro, um responsável, uma tarefa ou uma subtarefa específica.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Typography color="text.secondary">Carregando...</Typography>
        ) : alerts.length === 0 ? (
          <Alert severity="info">
            Nenhum alerta configurado. Clique em &quot;Criar Alerta&quot; para vincular um usuário e receber
            notificações conforme a previsão de entrega.
          </Alert>
        ) : (
          <List>
            {alerts.map((alert) => (
              <ListItem key={alert.id}>
                <ListItemText
                  primary={alert.user?.name || 'Usuário'}
                  secondary={
                    <>
                      <strong>{getAlertTargetLabel(alert)}</strong> · Alerta {alert.diasAntes} dia(s) antes
                      {!alert.enabled && <Chip label="Desativado" size="small" color="default" sx={{ ml: 1 }} />}
                    </>
                  }
                />
                {!readOnly && (
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => handleDeleteAlert(alert.id)} color="error" size="small">
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                )}
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Alerta</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Usuário que receberá o alerta</InputLabel>
              <Select
                value={newAlert.userId}
                label="Usuário que receberá o alerta"
                onChange={(e) => setNewAlert({ ...newAlert, userId: e.target.value })}
              >
                {allUsersForSelect.length === 0 ? (
                  <MenuItem value="" disabled>
                    Adicione membros à equipe na aba Equipe primeiro
                  </MenuItem>
                ) : (
                  allUsersForSelect.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      {u.name} {u.email ? `(${u.email})` : ''}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Escopo do alerta</InputLabel>
              <Select
                value={newAlert.targetType}
                label="Escopo do alerta"
                onChange={(e) =>
                  setNewAlert({
                    ...newAlert,
                    targetType: e.target.value as any,
                    responsavelNome: '',
                    targetId: ''
                  })
                }
              >
                <MenuItem value="project">Projeto inteiro (data de fim)</MenuItem>
                <MenuItem value="responsible">Responsável (todas as tarefas)</MenuItem>
                <MenuItem value="task">Tarefa específica</MenuItem>
                <MenuItem value="subtask">Subtarefa específica</MenuItem>
              </Select>
            </FormControl>

            {newAlert.targetType === 'responsible' && (
              <FormControl fullWidth>
                <InputLabel>Responsável</InputLabel>
                <Select
                  value={newAlert.responsavelNome}
                  label="Responsável"
                  onChange={(e) => setNewAlert({ ...newAlert, responsavelNome: e.target.value })}
                >
                  {responsaveisList.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {newAlert.targetType === 'task' && (
              <FormControl fullWidth>
                <InputLabel>Tarefa</InputLabel>
                <Select
                  value={newAlert.targetId}
                  label="Tarefa"
                  onChange={(e) => setNewAlert({ ...newAlert, targetId: e.target.value })}
                >
                  {tasksFlat.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.taskName} ({t.phaseName})
                    </MenuItem>
                  ))}
                  {tasksFlat.length === 0 && (
                    <MenuItem value="" disabled>
                      Nenhuma tarefa no cronograma
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            )}

            {newAlert.targetType === 'subtask' && (
              <FormControl fullWidth>
                <InputLabel>Subtarefa</InputLabel>
                <Select
                  value={newAlert.targetId}
                  label="Subtarefa"
                  onChange={(e) => setNewAlert({ ...newAlert, targetId: e.target.value })}
                >
                  {subtasksFlat.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.subtaskName} → {s.taskName} ({s.phaseName})
                    </MenuItem>
                  ))}
                  {subtasksFlat.length === 0 && (
                    <MenuItem value="" disabled>
                      Nenhuma subtarefa no cronograma
                    </MenuItem>
                  )}
                </Select>
              </FormControl>
            )}

            <FormControl fullWidth>
              <InputLabel>Dias antes da previsão</InputLabel>
              <Select
                value={newAlert.diasAntes}
                label="Dias antes da previsão"
                onChange={(e) => setNewAlert({ ...newAlert, diasAntes: Number(e.target.value) })}
              >
                <MenuItem value={1}>1 dia antes</MenuItem>
                <MenuItem value={3}>3 dias antes</MenuItem>
                <MenuItem value={7}>7 dias antes</MenuItem>
                <MenuItem value={15}>15 dias antes</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddDialog(false)}>Cancelar</Button>
          <Button onClick={handleAddAlert} variant="contained">
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
