import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
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

const ROLES = ['COLLABORATOR', 'REQUESTER_MANAGER', 'PORTAL_OPERATOR', 'PORTAL_ADMIN'] as const

type UserRow = {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  parentManagerId: string | null
}

type TypeRow = { id: string; slug: string; name: string; active: boolean; formSchema: unknown }
type AreaFull = { id: string; slug: string; name: string; active: boolean; sortOrder: number; types: TypeRow[] }

export default function AdminHubPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState(0)
  const [users, setUsers] = useState<UserRow[]>([])
  const [areas, setAreas] = useState<AreaFull[]>([])
  const [err, setErr] = useState<string | null>(null)

  const [uOpen, setUOpen] = useState(false)
  const [uEmail, setUEmail] = useState('')
  const [uPass, setUPass] = useState('')
  const [uName, setUName] = useState('')
  const [uRole, setURole] = useState<string>('COLLABORATOR')
  const [uMgr, setUMgr] = useState('')
  const [uBusy, setUBusy] = useState(false)

  const [aOpen, setAOpen] = useState(false)
  const [aSlug, setASlug] = useState('')
  const [aName, setAName] = useState('')

  const [tOpen, setTOpen] = useState(false)
  const [tAreaId, setTAreaId] = useState('')
  const [tSlug, setTSlug] = useState('')
  const [tName, setTName] = useState('')
  const [tSchema, setTSchema] = useState(`{\n  "fields": [\n    {\n      "key": "descricao",\n      "label": "Descrição",\n      "type": "textarea",\n      "required": true\n    }\n  ]\n}`)

  const [eOpen, setEOpen] = useState(false)
  const [eType, setEType] = useState<TypeRow | null>(null)
  const [eSchema, setESchema] = useState('')

  async function loadUsers() {
    const r = await api<{ users: UserRow[] }>('/admin/users')
    if (r.ok && r.data?.users) setUsers(r.data.users)
  }
  async function loadAreas() {
    const r = await api<{ areas: AreaFull[] }>('/admin/areas')
    if (r.ok && r.data?.areas) setAreas(r.data.areas)
  }

  useEffect(() => {
    if (user?.role === 'PORTAL_ADMIN') {
      void loadUsers()
      void loadAreas()
    }
  }, [user?.role])

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

  async function saveArea() {
    setErr(null)
    const r = await api('/admin/areas', {
      method: 'POST',
      body: JSON.stringify({ slug: aSlug, name: aName, sortOrder: 0, active: true }),
    })
    if (!r.ok) {
      setErr(r.error || 'Erro ao criar área')
      return
    }
    setAOpen(false)
    setASlug('')
    setAName('')
    void loadAreas()
  }

  async function saveType() {
    setErr(null)
    let formSchema: unknown
    try {
      formSchema = JSON.parse(tSchema) as unknown
    } catch {
      setErr('JSON do formulário inválido')
      return
    }
    const r = await api(`/admin/areas/${tAreaId}/types`, {
      method: 'POST',
      body: JSON.stringify({ slug: tSlug, name: tName, active: true, formSchema }),
    })
    if (!r.ok) {
      setErr(r.error || 'Erro ao criar tipo')
      return
    }
    setTOpen(false)
    setTSlug('')
    setTName('')
    void loadAreas()
  }

  async function saveEditType() {
    if (!eType) return
    setErr(null)
    let formSchema: unknown
    try {
      formSchema = JSON.parse(eSchema) as unknown
    } catch {
      setErr('JSON do formulário inválido')
      return
    }
    const r = await api(`/admin/types/${eType.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ formSchema }),
    })
    if (!r.ok) {
      setErr(r.error || 'Erro ao salvar')
      return
    }
    setEOpen(false)
    setEType(null)
    void loadAreas()
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Administração do portal
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Usuários, áreas e <strong>formulários por tipo de demanda</strong> (JSON <code>formSchema</code>).
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Usuários" />
        <Tab label="Áreas e formulários" />
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

      {tab === 1 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => setAOpen(true)}>
            Nova área
          </Button>
          {areas.map((ar) => (
            <Paper key={ar.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={700}>
                {ar.name} <Typography component="span" variant="caption" color="text.secondary">({ar.slug})</Typography>
              </Typography>
              <Button
                size="small"
                sx={{ mt: 1, mb: 1 }}
                onClick={() => {
                  setTAreaId(ar.id)
                  setTOpen(true)
                }}
              >
                Novo tipo / demanda nesta área
              </Button>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ar.types.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.name}</TableCell>
                      <TableCell>{t.slug}</TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => {
                            setEType(t)
                            setESchema(JSON.stringify(t.formSchema ?? { fields: [] }, null, 2))
                            setEOpen(true)
                          }}
                        >
                          Editar formulário (JSON)
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          ))}
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

      <Dialog open={aOpen} onClose={() => setAOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nova área</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Slug (ex.: rh)" value={aSlug} onChange={(e) => setASlug(e.target.value)} fullWidth />
          <TextField label="Nome exibido" value={aName} onChange={(e) => setAName(e.target.value)} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveArea()}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={tOpen} onClose={() => setTOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Novo tipo de demanda</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Slug" value={tSlug} onChange={(e) => setTSlug(e.target.value)} fullWidth />
          <TextField label="Nome" value={tName} onChange={(e) => setTName(e.target.value)} fullWidth />
          <TextField
            label="formSchema (JSON)"
            value={tSchema}
            onChange={(e) => setTSchema(e.target.value)}
            multiline
            minRows={12}
            fullWidth
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveType()}>
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={eOpen} onClose={() => setEOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Formulário — {eType?.name}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <TextField
            label="formSchema"
            value={eSchema}
            onChange={(e) => setESchema(e.target.value)}
            multiline
            minRows={16}
            fullWidth
            InputProps={{ sx: { fontFamily: 'monospace', fontSize: 13 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void saveEditType()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
