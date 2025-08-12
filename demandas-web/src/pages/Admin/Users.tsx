import { useEffect, useMemo, useState } from 'react'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { DataGrid, GridColDef } from '@mui/x-data-grid'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { useNavigate } from 'react-router-dom'

type Role = 'admin' | 'analista' | 'solicitante' | 'viewer'
type User = { id: string; name: string; email: string; role: Role }

export default function AdminUsersPage() {
  const auth = useAuthStore()
  const navigate = useNavigate()
  const [rows, setRows] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState<{ name: string; email: string; password?: string; role: Role }>({ name: '', email: '', password: '', role: 'analista' })

  useEffect(() => {
    if (!auth.token) {
      navigate('/login')
      return
    }
    if (auth.user?.role !== 'admin') {
      navigate('/')
      return
    }
    load()
  }, [auth.token])

  async function load() {
    try {
      setLoading(true)
      const data = (await api.get('/users')) as User[]
      setRows(data)
    } finally {
      setLoading(false)
    }
  }

  function handleNew() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', role: 'analista' })
    setOpen(true)
  }

  function handleEdit(u: User) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, role: u.role })
    setOpen(true)
  }

  async function handleSave() {
    if (editing) {
      await api.put(`/users/${editing.id}`, form)
    } else {
      await api.post('/users', form)
    }
    setOpen(false)
    await load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este usuário?')) return
    await api.delete(`/users/${id}`)
    await load()
  }

  const columns = useMemo<GridColDef[]>(() => [
    { field: 'name', headerName: 'Nome', flex: 1 },
    { field: 'email', headerName: 'E-mail', flex: 1 },
    { field: 'role', headerName: 'Perfil', width: 160 },
    {
      field: 'actions', headerName: 'Ações', width: 180, sortable: false, filterable: false,
      renderCell: (params) => (
        <Stack direction="row" gap={1}>
          <Button size="small" onClick={() => handleEdit(params.row as User)}>Editar</Button>
          <Button size="small" color="error" onClick={() => handleDelete((params.row as User).id)}>Excluir</Button>
        </Stack>
      )
    }
  ], [])

  return (
    <Paper sx={{ p: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Usuários</Typography>
        <Button variant="contained" onClick={handleNew}>Novo usuário</Button>
      </Stack>
      <Box sx={{ height: 520 }}>
        <DataGrid rows={rows} columns={columns} loading={loading} getRowId={(r) => (r as any).id} disableRowSelectionOnClick />
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Editar usuário' : 'Novo usuário'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField label="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <TextField label="E-mail" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {!editing && (
              <TextField label="Senha" type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            )}
            <TextField select label="Perfil" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <MenuItem value="admin">Administrador</MenuItem>
              <MenuItem value="analista">Analista</MenuItem>
              <MenuItem value="solicitante">Solicitante</MenuItem>
              <MenuItem value="viewer">Visualizador</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}


