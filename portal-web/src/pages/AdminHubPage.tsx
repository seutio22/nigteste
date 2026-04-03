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
import type { FormFieldDef } from '../lib/formSchema'
import { parseFormSchema } from '../lib/formSchema'
import type { NexusFieldRow } from '../lib/nexusCatalog'
import FormBuilder from '../components/FormBuilder'
import NexusFieldsPanel from '../components/NexusFieldsPanel'

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

function duplicateKeys(fields: FormFieldDef[]): string[] {
  const seen = new Set<string>()
  const dup = new Set<string>()
  for (const f of fields) {
    if (seen.has(f.key)) dup.add(f.key)
    seen.add(f.key)
  }
  return [...dup]
}

export default function AdminHubPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(0)
  const [users, setUsers] = useState<UserRow[]>([])
  const [areas, setAreas] = useState<AreaFull[]>([])
  const [nexusCatalog, setNexusCatalog] = useState<NexusFieldRow[]>([])
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
  const [tFields, setTFields] = useState<FormFieldDef[]>([])

  const [eOpen, setEOpen] = useState(false)
  const [eType, setEType] = useState<TypeRow | null>(null)
  const [eFields, setEFields] = useState<FormFieldDef[]>([])

  async function loadUsers() {
    const r = await api<{ users: UserRow[] }>('/admin/users')
    if (r.ok && r.data?.users) setUsers(r.data.users)
  }
  async function loadAreas() {
    const r = await api<{ areas: AreaFull[] }>('/admin/areas')
    if (r.ok && r.data?.areas) setAreas(r.data.areas)
  }
  async function loadNexusCatalog() {
    const r = await api<{ fields: NexusFieldRow[] }>('/admin/nexus-fields')
    if (r.ok && r.data?.fields) setNexusCatalog(r.data.fields)
  }

  useEffect(() => {
    if (user?.role === 'PORTAL_ADMIN') {
      void loadUsers()
      void loadAreas()
      void loadNexusCatalog()
    }
  }, [user?.role])

  useEffect(() => {
    if (user?.role === 'PORTAL_ADMIN' && tab === 2) void loadNexusCatalog()
  }, [tab, user?.role])

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'nexus') setTab(1)
    else if (t === 'areas') setTab(2)
    else if (t === 'users') setTab(0)
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
    const dups = duplicateKeys(tFields)
    if (dups.length) {
      setErr(`Chaves duplicadas nos campos: ${dups.join(', ')}`)
      return
    }
    const formSchema = { fields: tFields }
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
    setTFields([])
    void loadAreas()
    void loadNexusCatalog()
  }

  async function saveEditType() {
    if (!eType) return
    setErr(null)
    const dups = duplicateKeys(eFields)
    if (dups.length) {
      setErr(`Chaves duplicadas nos campos: ${dups.join(', ')}`)
      return
    }
    const formSchema = { fields: eFields }
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
    void loadNexusCatalog()
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Administração do portal
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Usuários, <strong>catálogo Nexus</strong> (campos do banco / integração) e <strong>formulários visuais</strong> por
        tipo de demanda — sem editar JSON.
      </Typography>
      {err && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Usuários" />
        <Tab label="Banco de dados Nexus" />
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

      {tab === 1 && <NexusFieldsPanel onChanged={() => void loadNexusCatalog()} />}

      {tab === 2 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button variant="outlined" sx={{ alignSelf: 'flex-start' }} onClick={() => setAOpen(true)}>
            Nova área
          </Button>
          {areas.map((ar) => (
            <Paper key={ar.id} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={700}>
                {ar.name}{' '}
                <Typography component="span" variant="caption" color="text.secondary">
                  ({ar.slug})
                </Typography>
              </Typography>
              <Button
                size="small"
                sx={{ mt: 1, mb: 1 }}
                onClick={() => {
                  setTAreaId(ar.id)
                  setTSlug('')
                  setTName('')
                  setTFields([])
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
                            setEFields(parseFormSchema(t.formSchema))
                            setEOpen(true)
                          }}
                        >
                          Editar formulário
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
          <FormBuilder fields={tFields} onChange={setTFields} nexusCatalog={nexusCatalog} />
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
          <FormBuilder fields={eFields} onChange={setEFields} nexusCatalog={nexusCatalog} />
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
