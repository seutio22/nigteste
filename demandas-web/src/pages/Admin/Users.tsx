import React, { useState, useEffect, useCallback } from 'react'
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
import { getInitialPermissions } from '../../utils/defaultPermissions'
import { formatIntegerPtBR } from '../../utils/formatNumber'

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
    active: true
  })

  const { token } = useAuthStore()

  // Carregar usuários da API
  const loadUsers = useCallback(async () => {
    try {
      console.log('🔍 Carregando usuários...')
      
      if (!token) {
        console.warn('❌ Sem token para carregar usuários - usuário deve estar autenticado.')
        setSnackbar({ open: true, message: 'Sessão expirada. Faça login novamente.', severity: 'error' })
        setLoading(false)
        return
      }

      const response = await fetch(`https://nigteste-production.up.railway.app/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ Usuários carregados:', data.length)
        setUsers(data)
      } else {
        console.error('❌ Erro ao carregar usuários:', response.status)
        setSnackbar({ open: true, message: 'Erro ao carregar usuários', severity: 'error' })
      }
    } catch (error) {
      console.error('❌ Erro ao carregar usuários:', error)
      setSnackbar({ open: true, message: 'Erro ao carregar usuários', severity: 'error' })
    } finally {
      setLoading(false)
    }
  }, [token])

  // Carregar usuários ao montar componente
  useEffect(() => {
    console.log('🔍 useEffect: Componente montado, carregando usuários...')
    // Só carregar se não tiver usuários carregados
    if (users.length === 0) {
      loadUsers()
    }
  }, []) // Remover loadUsers das dependências para evitar loops

  // Abrir dialog para criar/editar usuário
  const handleOpenDialog = useCallback((user?: User) => {
    if (user) {
      setEditingUser(user)
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        active: user.active
      })
    } else {
      setEditingUser(null)
      setForm({
        name: '',
        email: '',
        password: '',
        role: 'analista',
        active: true
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
      active: true
    })
  }, [])

  // Salvar usuário
  const handleSave = useCallback(async () => {
    try {
      if (!form.name || !form.email || (!editingUser && !form.password)) {
        setSnackbar({ open: true, message: 'Preencha todos os campos obrigatórios', severity: 'error' })
        return
      }

      const userData: any = { ...form }
      if (editingUser && !form.password) {
        delete userData.password
      }

      // 🎯 CRIAR PERMISSÕES INICIAIS baseadas no role (apenas para novos usuários)
      if (!editingUser) {
        userData.permissions = getInitialPermissions(form.role)
        console.log(`✅ Criando usuário com permissões iniciais do role: ${form.role}`)
      }

      const baseUrl = 'https://nigteste-production.up.railway.app'
      const url = editingUser 
        ? `${baseUrl}/users/${editingUser.id}`
        : `${baseUrl}/users`
      
      const method = editingUser ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      if (response.ok) {
        setSnackbar({ 
          open: true, 
          message: `Usuário ${editingUser ? 'atualizado' : 'criado'} com sucesso!`, 
          severity: 'success' 
        })
        handleCloseDialog()
        loadUsers()
      } else {
        throw new Error('Erro na operação')
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao salvar usuário', severity: 'error' })
    }
  }, [form, editingUser, token, handleCloseDialog, loadUsers])

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
      
      console.log('📤 Payload que será enviado:', payload)
      console.log('📤 Payload stringified:', JSON.stringify(payload, null, 2))

      const response = await fetch(`https://nigteste-production.up.railway.app/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        setSnackbar({ open: true, message: 'Permissões atualizadas com sucesso!', severity: 'success' })
        setPermissionDialogOpen(false)
        loadUsers()
      } else {
        throw new Error('Erro ao atualizar permissões')
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao salvar permissões', severity: 'error' })
    }
  }, [selectedUser, token, loadUsers])

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
      const response = await fetch(`https://nigteste-production.up.railway.app/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setSnackbar({ 
          open: true, 
          message: `Usuário "${userToDelete.name}" excluído com sucesso!`, 
          severity: 'success' 
        })
        handleCloseDeleteDialog()
        loadUsers()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao excluir usuário')
      }
    } catch (error) {
      setSnackbar({ 
        open: true, 
        message: `Erro ao excluir usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, 
        severity: 'error' 
      })
    }
  }, [userToDelete, token, handleCloseDeleteDialog, loadUsers])

  // Obter permissões do usuário
  const getUserPermissions = (user: User): SystemPermissions | null => {
    if (!user.permissions) return null
    try {
      return JSON.parse(user.permissions) as SystemPermissions
    } catch {
      return null
    }
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

  // Obter label do role
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador'
      case 'gerente': return 'Gerente'
      case 'analista': return 'Analista'
      case 'solicitante': return 'Solicitante'
      default: return role
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
                    label={getRoleLabel(user.role)}
                    color={getRoleColor(user.role) as any}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  
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
              userPermissions={getUserPermissions(selectedUser)}
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


