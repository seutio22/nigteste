import React, { useState, useEffect, useMemo } from 'react'
import { useMasterDataStore } from '../store/masterDataStore'
import { getUserDepartmentDisplay } from '../utils/userDepartmentDisplay'
import type { Area } from '../types/masterData'
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  Avatar,
  Divider,
  Alert,
  Grid,
  Card,
  CardContent,
  CardActions
} from '@mui/material'
import { api } from '../lib/api.local'
import {
  Add,
  Edit,
  Delete,
  Person,
  Business,
  Email,
  Phone,
  Work,
  Security,
  CalendarToday,
  Notes
} from '@mui/icons-material'

interface ProjectMember {
  id: string
  userId: string
  role: string
  permissions: string[]
  isActive: boolean
  notes?: string
  user: {
    id: string
    name: string
    email: string
    role: string
    departmentId?: string | null
    department?: { id: string; nome: string } | null
  }
}

interface ProjectExternalMember {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  role: string
  accessLevel: string
  isActive: boolean
  notes?: string
}

interface ProjectTeamManagerProps {
  projectId: string
  readOnly?: boolean
}

function areasListToById(list: Area[]): Record<string, Area> {
  const m: Record<string, Area> = {}
  for (const a of list) {
    if (a?.id) m[a.id] = a
  }
  return m
}

export default function ProjectTeamManager({ projectId, readOnly = false }: ProjectTeamManagerProps) {
  const storeAreasById = useMasterDataStore((s) => s.areasById)
  /** Lista /areas da API: o masterDataStore pode ainda não ter áreas ao abrir só Projetos. */
  const [areasByIdFromApi, setAreasByIdFromApi] = useState<Record<string, Area>>({})
  const areasById = useMemo(
    () => ({ ...storeAreasById, ...areasByIdFromApi }) as Record<string, Area | undefined>,
    [storeAreasById, areasByIdFromApi]
  )

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await api.getAreas()
        if (cancelled || !Array.isArray(list)) return
        setAreasByIdFromApi(areasListToById(list as Area[]))
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const [activeTab, setActiveTab] = useState(0)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [externalMembers, setExternalMembers] = useState<ProjectExternalMember[]>([])
  const [availableUsers, setAvailableUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  
  // Estados para diálogos
  const [showAddInternalDialog, setShowAddInternalDialog] = useState(false)
  const [showAddExternalDialog, setShowAddExternalDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  
  // Estados para formulários
  const [newInternalMember, setNewInternalMember] = useState({
    userId: '',
    role: '',
    permissions: [] as string[],
    notes: ''
  })
  
  const [newExternalMember, setNewExternalMember] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: '',
    accessLevel: 'view',
    notes: ''
  })

  // Carregar dados da equipe
  useEffect(() => {
    loadTeamMembers()
    loadAvailableUsers()
  }, [projectId])

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      const data = await api.get(`/projetos/${projectId}/members`)
      setMembers(data.internal || [])
      setExternalMembers(data.external || [])
    } catch (error) {
      console.error('❌ Erro ao carregar membros:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableUsers = async () => {
    try {
      const data = await api.get(`/projetos/${projectId}/available-users`)
      setAvailableUsers(data || [])
    } catch (error) {
      console.error('❌ Erro ao carregar usuários disponíveis:', error)
    }
  }

  // Adicionar membro interno
  const handleAddInternalMember = async () => {
    try {
      const response = await api.post(`/projetos/${projectId}/members`, newInternalMember)
      
      await loadTeamMembers()
      await loadAvailableUsers()
      setShowAddInternalDialog(false)
      setNewInternalMember({
        userId: '',
        role: '',
        permissions: [],
        notes: ''
      })
      alert('Membro interno adicionado com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao adicionar membro:', error)
      alert('Erro ao adicionar membro: ' + (error as any)?.message || 'Erro desconhecido')
    }
  }

  // Adicionar membro externo
  const handleAddExternalMember = async () => {
    try {
      await api.post(`/projetos/${projectId}/external-members`, newExternalMember)
      await loadTeamMembers()
      setShowAddExternalDialog(false)
      setNewExternalMember({
        name: '',
        email: '',
        phone: '',
        company: '',
        role: '',
        accessLevel: 'view',
        notes: ''
      })
    } catch (error) {
      console.error('Erro ao adicionar membro externo:', error)
    }
  }

  // Remover membro
  const handleRemoveMember = async (memberId: string, isExternal: boolean) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return
    
    try {
      const endpoint = isExternal 
        ? `/projetos/${projectId}/external-members/${memberId}`
        : `/projetos/${projectId}/members/${memberId}`
      
      await api.delete(endpoint)
      await loadTeamMembers()
      if (!isExternal) await loadAvailableUsers()
    } catch (error) {
      console.error('Erro ao remover membro:', error)
    }
  }

  const renderInternalMembersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">Membros Internos</Typography>
          <Typography variant="caption" color="text.secondary">
            Usuários cadastrados no sistema que fazem parte da equipe do projeto
          </Typography>
        </Box>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddInternalDialog(true)}
            disabled={availableUsers.length === 0}
          >
            Adicionar Membro
          </Button>
        )}
      </Box>
      
      {!readOnly && availableUsers.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Nenhum usuário disponível para adicionar:</strong>
            <br />
            • Todos os usuários ativos do sistema já são membros desta equipe, ou
            <br />
            • Não há usuários cadastrados no sistema
          </Typography>
        </Alert>
      )}

      {members.length === 0 ? (
        <Alert severity="info">
          Nenhum membro interno adicionado ainda.
        </Alert>
      ) : (
        <List>
          {members.map((member) => (
            <ListItem key={member.id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      {member.user.name}
                    </Typography>
                    <Chip label={member.role} size="small" color="primary" />
                    <Chip
                      label={getUserDepartmentDisplay(member.user, areasById)}
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {member.user.email}
                    </Typography>
                    {member.notes && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {member.notes}
                      </Typography>
                    )}
                  </Box>
                }
              />
              {!readOnly && (
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveMember(member.id, false)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )

  const renderExternalMembersTab = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6">Membros Externos</Typography>
          <Typography variant="caption" color="text.secondary">
            Clientes, fornecedores, consultores e outras pessoas que não são usuários do sistema
          </Typography>
        </Box>
        {!readOnly && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowAddExternalDialog(true)}
          >
            Adicionar Membro Externo
          </Button>
        )}
      </Box>
      
      {externalMembers.length === 0 ? (
        <Alert severity="info">
          Nenhum membro externo adicionado ainda.
        </Alert>
      ) : (
        <List>
          {externalMembers.map((member) => (
            <ListItem key={member.id} divider>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      {member.name}
                    </Typography>
                    <Chip label={member.role} size="small" color="primary" />
                    <Chip 
                      label={member.accessLevel} 
                      size="small" 
                      variant="outlined" 
                      color="secondary"
                    />
                  </Box>
                }
                secondary={
                  <Box>
                    {member.email && (
                      <Typography variant="body2" color="text.secondary">
                        {member.email}
                      </Typography>
                    )}
                    {member.company && (
                      <Typography variant="body2" color="text.secondary">
                        {member.company}
                      </Typography>
                    )}
                    {member.notes && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {member.notes}
                      </Typography>
                    )}
                  </Box>
                }
              />
              {!readOnly && (
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    onClick={() => handleRemoveMember(member.id, true)}
                    color="error"
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 'bold' }}>
        Gerenciar Equipe do Projeto
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          <strong>Membros Internos:</strong> Apenas usuários cadastrados no sistema podem ser membros internos da equipe.
          <br />
          <strong>Membros Externos:</strong> Para clientes, fornecedores, consultores ou outras pessoas que não são usuários do sistema.
        </Typography>
      </Alert>
      


      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Membros Internos" />
        <Tab label="Membros Externos" />
      </Tabs>

      {activeTab === 0 && renderInternalMembersTab()}
      {activeTab === 1 && renderExternalMembersTab()}

      {/* Diálogo para adicionar membro interno */}
              <Dialog open={showAddInternalDialog} onClose={() => setShowAddInternalDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box>
              <Typography variant="h6">Adicionar Membro Interno</Typography>
              <Typography variant="caption" color="text.secondary">
                Adicionar usuário cadastrado no sistema à equipe do projeto
              </Typography>
            </Box>
          </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth required error={!newInternalMember.userId}>
                <InputLabel>Usuário do Sistema *</InputLabel>
                <Select
                  value={newInternalMember.userId}
                  onChange={(e) => setNewInternalMember({ ...newInternalMember, userId: e.target.value })}
                  label="Usuário do Sistema *"
                >
                  {availableUsers.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email} • {getUserDepartmentDisplay(user, areasById)}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  Selecione um usuário cadastrado no sistema para adicionar à equipe
                </Typography>
                {!newInternalMember.userId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                    Usuário é obrigatório
                  </Typography>
                )}
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Função no Projeto *"
                value={newInternalMember.role}
                onChange={(e) => setNewInternalMember({ ...newInternalMember, role: e.target.value })}
                placeholder="Ex: Desenvolvedor, Analista, Testador"
                required
                error={!newInternalMember.role}
                helperText={!newInternalMember.role ? 'Função no projeto é obrigatória' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={newInternalMember.notes}
                onChange={(e) => setNewInternalMember({ ...newInternalMember, notes: e.target.value })}
                placeholder="Informações adicionais sobre o membro"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddInternalDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleAddInternalMember} 
            variant="contained"
            disabled={!newInternalMember.userId || !newInternalMember.role}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo para adicionar membro externo */}
              <Dialog open={showAddExternalDialog} onClose={() => setShowAddExternalDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Box>
              <Typography variant="h6">Adicionar Membro Externo</Typography>
              <Typography variant="caption" color="text.secondary">
                Adicionar pessoa que não é usuário do sistema (cliente, fornecedor, consultor, etc.)
              </Typography>
            </Box>
          </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome"
                value={newExternalMember.name}
                onChange={(e) => setNewExternalMember({ ...newExternalMember, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={newExternalMember.email}
                onChange={(e) => setNewExternalMember({ ...newExternalMember, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={newExternalMember.phone}
                onChange={(e) => setNewExternalMember({ ...newExternalMember, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Empresa/Organização"
                value={newExternalMember.company}
                onChange={(e) => setNewExternalMember({ ...newExternalMember, company: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Função"
                value={newExternalMember.role}
                onChange={(e) => setNewExternalMember({ ...newExternalMember, role: e.target.value })}
                placeholder="Ex: Cliente, Fornecedor, Consultor"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Nível de Acesso</InputLabel>
                <Select
                  value={newExternalMember.accessLevel}
                  onChange={(e) => setNewExternalMember({ ...newExternalMember, accessLevel: e.target.value })}
                  label="Nível de Acesso"
                >
                  <MenuItem value="view">Visualizar</MenuItem>
                  <MenuItem value="comment">Comentar</MenuItem>
                  <MenuItem value="edit">Editar</MenuItem>
                  <MenuItem value="admin">Administrador</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={newExternalMember.notes}
                onChange={(e) => setNewExternalMember({ ...newExternalMember, notes: e.target.value })}
                placeholder="Informações adicionais sobre o membro externo"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddExternalDialog(false)}>Cancelar</Button>
          <Button 
            onClick={handleAddExternalMember} 
            variant="contained"
            disabled={!newExternalMember.name || !newExternalMember.role}
          >
            Adicionar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
