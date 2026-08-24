import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Chip,
  IconButton,
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
  Switch,
  FormControlLabel,
  Stack,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Settings,
  Person,
  AdminPanelSettings,
  SupervisorAccount,
  Engineering,
  Assignment,
  Visibility,
  QueryStats,
  People,
  History
} from '@mui/icons-material'
import { useAuthStore } from '../../store/authStore'
import PermissionManager from '../../components/PermissionManager'
import UserMonitoring from '../../components/UserMonitoring'
import DeletionHistoryTab from '../../components/DeletionHistoryTab'
import { SystemPermissions } from '../../types/permissions'
import { getInitialPermissions, getUserPermissions as resolveUserPermissions } from '../../utils/defaultPermissions'
import { formatIntegerPtBR } from '../../utils/formatNumber'
import { getUserDepartmentDisplay, getUserRoleCaption } from '../../utils/userDepartmentDisplay'

interface User {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  permissions?: string
  createdAt: string
  passwordUpdatedAt?: string | null
  /** Último login bem-sucedido (API) */
  lastLogin?: string | null
  departmentId?: string | null
  department?: { id: string; nome: string } | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' })
  const [tabValue, setTabValue] = useState(0)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'analista',
    active: true,
    departmentId: '' as string
  })
  const [areas, setAreas] = useState<{ id: string; nome: string }[]>([])

  /** Mapa das áreas carregadas nesta página — o chip não usa masterDataStore (pode estar vazio). */
  const areasById = useMemo(() => {
    const m: Record<string, { id: string; nome: string }> = {}
    for (const a of areas) m[a.id] = a
    return m
  }, [areas])

  const { token } = useAuthStore()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { api } = await import('../../lib/api.local')
        const list = await api.getAreas()
        if (!cancelled && Array.isArray(list)) setAreas(list)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Carregar usuários da API
  const loadUsers = useCallback(async () => {
    try {
      if (!token) {
        setSnackbar({ open: true, message: 'Sessão expirada. Faça login novamente.', severity: 'error' })
        setLoading(false)
        return
      }

      setLoading(true)
      const { api } = await import('../../lib/api.local')
      const data = await api.getUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      const status = (error as { status?: number })?.status
      if (status !== 401) {
        setSnackbar({ open: true, message: 'Erro ao carregar usuários', severity: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }, [token])

  // Recarregar quando o token existir (persist do Zustand pode hidratar depois do 1.º render)
  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    loadUsers()
  }, [token, loadUsers])

  // Abrir dialog para criar/editar usuário
  const handleOpenDialog = useCallback((user?: User) => {
    if (user) {
      setEditingUser(user)
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        active: user.active,
        departmentId: user.departmentId || ''
      })
    } else {
      setEditingUser(null)
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'analista',
        active: true,
        departmentId: ''
      })
    }
    setOpenDialog(true)
  }, [])

  // Fechar dialog
  const handleCloseDialog = useCallback(() => {
    setOpenDialog(false)
    setEditingUser(null)
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'analista',
      active: true,
      departmentId: ''
    })
  }, [])

  // Salvar usuário
  const handleSave = useCallback(async () => {
    try {
      if (!form.name || !form.email || (!editingUser && !form.password)) {
        setSnackbar({ open: true, message: 'Preencha todos os campos obrigatórios', severity: 'error' })
        return
      }

      const departmentId = form.departmentId?.trim() ? form.departmentId.trim() : null
      const userData: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
        departmentId,
        // Analistas e viewers enxergam só os próprios dados por padrão
        viewOwnDataOnly: form.role === 'analista' || form.role === 'viewer',
      }
      if (form.password) userData.password = form.password

      // 🎯 CRIAR PERMISSÕES INICIAIS baseadas no role (apenas para novos usuários)
      if (!editingUser) {
        userData.permissions = getInitialPermissions(form.role)
        console.log(`✅ Criando usuário com permissões iniciais do role: ${form.role}`)
      }

      const { api } = await import('../../lib/api.local')
      if (editingUser) {
        await api.updateUser(editingUser.id, userData)
      } else {
        await api.createUser(userData)
      }

      setSnackbar({ 
        open: true, 
        message: `Usuário ${editingUser ? 'atualizado' : 'criado'} com sucesso!`, 
        severity: 'success' 
      })
      handleCloseDialog()
      loadUsers()
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao salvar usuário', severity: 'error' })
    }
  }, [form, editingUser, handleCloseDialog, loadUsers])

  // Abrir gerenciador de permissões
  const handleOpenPermissions = useCallback((user: User) => {
    setSelectedUser(user)
    setPermissionDialogOpen(true)
  }, [])

  // Salvar permissões
  const handleSavePermissions = useCallback(async (permissions: SystemPermissions) => {
    if (!selectedUser) return

    console.log('🔄 handleSavePermissions: Salvando permissões para', selectedUser.name)
    console.log('🔄 Permissões recebidas:', permissions)
    console.log('🔄 Permissão de DELETE para CADASTRO:', permissions.cadastro?.delete)

    try {
      const payload = {
        permissions: JSON.stringify(permissions)
      }

      const { api } = await import('../../lib/api.local')
      await api.updateUser(selectedUser.id, {
        permissions: JSON.stringify(permissions)
      })

      setSnackbar({ open: true, message: 'Permissões atualizadas com sucesso!', severity: 'success' })
      setPermissionDialogOpen(false)
      loadUsers()
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao salvar permissões', severity: 'error' })
    }
  }, [selectedUser, loadUsers])

  // Abrir diálogo de confirmação de exclusão
  const handleOpenDeleteDialog = useCallback((user: User) => {
    setUserToDelete(user)
    setDeleteDialogOpen(true)
  }, [])

  // Fechar diálogo de exclusão
  const handleCloseDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false)
    setUserToDelete(null)
  }, [])

  // Excluir usuário
  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return

    try {
      const { api } = await import('../../lib/api.local')
      await api.deleteUser(userToDelete.id)

      setSnackbar({ 
        open: true, 
        message: `Usuário "${userToDelete.name}" excluído com sucesso!`, 
        severity: 'success' 
      })
      handleCloseDeleteDialog()
      loadUsers()
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Erro ao excluir usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 
        severity: 'error' 
      })
    }
  }, [userToDelete, handleCloseDeleteDialog, loadUsers])

  // Permissões efetivas (customizadas + defaults do role + submódulos de Dados)
  const getUserPermissionsForEditor = (user: User): SystemPermissions => {
    return resolveUserPermissions(user.permissions, user.role)
  }

  // Obter ícone do role
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <AdminPanelSettings />
      case 'gerente': return <SupervisorAccount />
      case 'analista': return <Engineering />
      case 'solicitante': return <Assignment />
      default: return <Person />
    }
  }

  // Obter cor do role
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error'
      case 'gerente': return 'warning'
      case 'analista': return 'info'
      case 'solicitante': return 'success'
      default: return 'default'
    }
  }

  // Controlar mudança de abas
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Carregando usuários...
        </Typography>
      </Box>
    )
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              Gerenciamento de Usuários
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {formatIntegerPtBR(users.length)} usuário{users.length !== 1 ? 's' : ''} no sistema
            </Typography>
          </Box>
          {tabValue === 0 && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              size="large"
            >
              Novo Usuário
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Tabs de Navegação */}
      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab 
            label="Lista de Usuários" 
            icon={<People />} 
            iconPosition="start"
          />
          <Tab 
            label="Monitoramento" 
            icon={<QueryStats />} 
            iconPosition="start"
          />
          <Tab 
            label="Histórico" 
            icon={<History />} 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Conteúdo das Abas */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          {users.map((user) => (
            <Grid item xs={12} md={6} lg={4} key={user.id}>
              <Card sx={{ 
                height: '100%',
                border: user.active ? '2px solid transparent' : '2px solid #f44336',
                opacity: user.active ? 1 : 0.7
              }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Avatar sx={{ bgcolor: `${getRoleColor(user.role)}.main`, width: 56, height: 56 }}>
                      {getRoleIcon(user.role)}
                    </Avatar>
                    <Chip
                      label={user.active ? 'Ativo' : 'Inativo'}
                      color={user.active ? 'success' : 'error'}
                      size="small"
                    />
                  </Stack>
                  
                  <Typography variant="h6" gutterBottom>
                    {user.name}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {user.email}
                  </Typography>
                  
                  <Chip
                    label={getUserDepartmentDisplay(user, areasById)}
                    color={getRoleColor(user.role) as any}
                    size="small"
                    sx={{ mb: 0.5 }}
                  />
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                    Perfil de acesso: {getUserRoleCaption(user)}
                  </Typography>
                  
                  <Typography variant="caption" color="text.secondary" display="block">
                    Criado em: {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Último login:{' '}
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleString('pt-BR')
                      : 'Nunca registrado'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Última troca de senha:{' '}
                    {user.passwordUpdatedAt
                      ? new Date(user.passwordUpdatedAt).toLocaleDateString('pt-BR')
                      : 'Não informado'}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Tooltip title="Editar usuário">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(user)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Gerenciar permissões">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenPermissions(user)}
                        color="info"
                      >
                        <Settings />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir usuário">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDeleteDialog(user)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {tabValue === 1 && (
        <UserMonitoring />
      )}

      {tabValue === 2 && (
        <DeletionHistoryTab />
      )}

      {/* Dialog para Criar/Editar Usuário */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        </DialogTitle>
        
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Nome"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            
            <TextField
              fullWidth
              label="E-mail"
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            
            <TextField
              fullWidth
              label="Senha"
              type="password"
              value={form.password}
              onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
              required={!editingUser}
              helperText={editingUser ? 'Deixe em branco para manter a senha atual' : ''}
            />
            
            <FormControl fullWidth>
              <InputLabel>Perfil</InputLabel>
              <Select
                value={form.role}
                onChange={(e) => setForm(prev => ({ ...prev, role: e.target.value }))}
                label="Perfil"
              >
                <MenuItem value="admin">Administrador</MenuItem>
                <MenuItem value="gerente">Gerente</MenuItem>
                <MenuItem value="analista">Analista</MenuItem>
                <MenuItem value="solicitante">Solicitante</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Departamento (área)</InputLabel>
              <Select
                value={form.departmentId}
                label="Departamento (área)"
                onChange={(e) => setForm((prev) => ({ ...prev, departmentId: e.target.value }))}
              >
                <MenuItem value="">
                  <em>Nenhum — usar só o perfil acima</em>
                </MenuItem>
                {areas.map((a) => (
                  <MenuItem key={a.id} value={a.id}>
                    {a.nome}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={form.active}
                  onChange={(e) => setForm(prev => ({ ...prev, active: e.target.checked }))}
                />
              }
              label="Usuário Ativo"
            />
          </Stack>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            Cancelar
          </Button>
          <Button onClick={handleSave} variant="contained">
            {editingUser ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Gerenciar Permissões */}
      <Dialog
        open={permissionDialogOpen}
        onClose={() => setPermissionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Gerenciar Permissões para {selectedUser?.name}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <PermissionManager
              open={permissionDialogOpen}
              onClose={() => setPermissionDialogOpen(false)}
              userPermissions={getUserPermissionsForEditor(selectedUser)}
              onSave={handleSavePermissions}
              userRole={selectedUser.role}
              userName={selectedUser.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Tem certeza que deseja excluir o usuário <strong>"{userToDelete?.name}"</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Esta ação não pode ser desfeita. O usuário será removido permanentemente.
          </Typography>
          <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'medium' }}>
            ⚠️ Dados relacionados (demandas, manutenções, atendimentos, etc.) criados por este usuário 
            serão mantidos no sistema, mas a referência ao usuário será removida.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            variant="contained" 
            color="error"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}


