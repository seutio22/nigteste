import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import NexusFieldsPanel from '../components/NexusFieldsPanel'
import AreasTypesAdminPanel from '../components/AreasTypesAdminPanel'
import SlaAdminPanel from '../components/SlaAdminPanel'

const TAB_KEYS = ['users', 'nexus', 'areas', 'sla'] as const

const ROLES = ['COLLABORATOR', 'REQUESTER_MANAGER', 'PORTAL_OPERATOR', 'PORTAL_ADMIN'] as const

type UserRow = {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  parentManagerId: string | null
}

export default function AdminHubPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(0)
  const [users, setUsers] = useState<UserRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const [uOpen, setUOpen] = useState(false)
  const [uEmail, setUEmail] = useState('')
  const [uPass, setUPass] = useState('')
  const [uName, setUName] = useState('')
  const [uRole, setURole] = useState<string>('COLLABORATOR')
  const [uMgr, setUMgr] = useState('')
  const [uBusy, setUBusy] = useState(false)

  async function loadUsers() {
    const r = await api<{ users: UserRow[] }>('/admin/users')
    if (r.ok && r.data?.users) setUsers(r.data.users)
  }

  useEffect(() => {
    if (user?.role === 'PORTAL_ADMIN') void loadUsers()
  }, [user?.role])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'nexus') setTab(1)
    else if (t === 'areas') setTab(2)
    else if (t === 'sla') setTab(3)
    else if (t === 'users') setTab(0)
    else setTab(0)
  }, [searchParams])

  if (user?.role !== 'PORTAL_ADMIN') return <Navigate to="/" replace />

  const managers = users.filter((x) => x.role === 'REQUESTER_MANAGER' && x.active)

  async function saveUser() {
    setErr(null)
    setUBusy(true)
    const r = await api('/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email: uEmail,
        password: uPass,
        name: uName,
        role: uRole,
        parentManagerId: uRole === 'COLLABORATOR' && uMgr ? uMgr : null,
        active: true,
      }),
    })
    setUBusy(false)
    if (!r.ok) {
      setErr(r.error || 'Erro ao criar usuário')
      return
    }
    setUOpen(false)
    setUEmail('')
    setUPass('')
    setUName('')
    setURole('COLLABORATOR')
    setUMgr('')
    void loadUsers()
  }

  return (
    <Container
      maxWidth={tab === 2 || tab === 3 ? false : 'lg'}
      sx={{ py: 3, px: tab === 2 || tab === 3 ? { xs: 2, md: 3 } : undefined }}
    >
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Administração do portal
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Usuários, <strong>catálogo Nexus</strong>, <strong>perfis de SLA</strong> (triagem, atuação, pausa e adicional) e{' '}
        <strong>áreas e tipos</strong> com formulários amplos — sem editar JSON.
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => {
          setTab(v)
          setSearchParams({ tab: TAB_KEYS[v] })
        }}
        sx={{ mb: 2 }}
      >
        <Tab label="Usuários" />
        <Tab label="Banco de dados Nexus" />
        <Tab label="Áreas e tipos (gestão)" />
        <Tab label="SLA" />
      </Tabs>

      {tab === 0 && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Button variant="contained" onClick={() => setUOpen(true)}>
              Novo usuário
            </Button>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Papel</TableCell>
                <TableCell>Ativo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>{u.active ? 'Sim' : 'Não'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {tab === 1 && <NexusFieldsPanel onChanged={() => {}} />}

      {tab === 2 && (
        <Box sx={{ maxWidth: 1400, mx: 'auto' }}>
          <AreasTypesAdminPanel />
        </Box>
      )}

      {tab === 3 && (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <SlaAdminPanel />
        </Box>
      )}

      <Dialog open={uOpen} onClose={() => setUOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo usuário</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="E-mail" value={uEmail} onChange={(e) => setUEmail(e.target.value)} fullWidth />
          <TextField label="Senha" type="password" value={uPass} onChange={(e) => setUPass(e.target.value)} fullWidth />
          <TextField label="Nome" value={uName} onChange={(e) => setUName(e.target.value)} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Papel</InputLabel>
            <Select label="Papel" value={uRole} onChange={(e) => setURole(e.target.value)}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {uRole === 'COLLABORATOR' && (
            <FormControl fullWidth>
              <InputLabel>Gestor (opcional)</InputLabel>
              <Select label="Gestor (opcional)" value={uMgr} onChange={(e) => setUMgr(e.target.value)}>
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {managers.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveUser()} disabled={uBusy}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
