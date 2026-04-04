import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import EngineeringIcon from '@mui/icons-material/Engineering'
import PersonIcon from '@mui/icons-material/Person'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount'
import EditIcon from '@mui/icons-material/Edit'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import {
  PORTAL_ROLE_CHIP_COLOR,
  PORTAL_ROLE_LABEL,
  PORTAL_ROLE_ORDER,
  portalRoleLabel,
} from '../constants/portalRoles'

const ROLES = ['COLLABORATOR', 'REQUESTER_MANAGER', 'PORTAL_OPERATOR', 'PORTAL_ADMIN'] as const

type UserRow = {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  parentManagerId: string | null
  createdAt: string
  lastLogin?: string | null
  lastSeenAt?: string | null
  passwordUpdatedAt?: string
  parentManager: { id: string; name: string; email: string } | null
}

function formatMonitorDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Considera “online” quem teve atividade nos últimos 5 minutos (último /auth/me ou login). */
function isOnlineRecently(lastSeenAt: string | null | undefined) {
  if (!lastSeenAt) return false
  const ms = Date.now() - new Date(lastSeenAt).getTime()
  return ms >= 0 && ms < 5 * 60 * 1000
}

function roleIcon(role: string) {
  switch (role) {
    case 'PORTAL_ADMIN':
      return <AdminPanelSettingsIcon fontSize="small" />
    case 'PORTAL_OPERATOR':
      return <EngineeringIcon fontSize="small" />
    case 'REQUESTER_MANAGER':
      return <SupervisorAccountIcon fontSize="small" />
    default:
      return <PersonIcon fontSize="small" />
  }
}

const emailLooksValid = (s: string) => {
  const t = s.trim().toLowerCase()
  return t.length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)
}

export default function PortalUsersAdminPanel() {
  const { user: me, refreshMe } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  const [createOpen, setCreateOpen] = useState(false)
  const [uEmail, setUEmail] = useState('')
  const [uPass, setUPass] = useState('')
  const [uName, setUName] = useState('')
  const [uRole, setURole] = useState<string>('COLLABORATOR')
  const [uMgr, setUMgr] = useState('')
  const [uBusy, setUBusy] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editRow, setEditRow] = useState<UserRow | null>(null)
  const [eEmail, setEEmail] = useState('')
  const [eName, setEName] = useState('')
  const [eRole, setERole] = useState('')
  const [eActive, setEActive] = useState(true)
  const [eMgr, setEMgr] = useState('')
  const [ePass, setEPass] = useState('')
  const [eBusy, setEBusy] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const r = await api<{ users: UserRow[] }>('/admin/users')
    setLoading(false)
    if (r.ok && r.data?.users) setUsers(r.data.users)
    else setSnack({ open: true, message: r.error || 'Erro ao carregar usuários', severity: 'error' })
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const managers = useMemo(() => users.filter((x) => x.role === 'REQUESTER_MANAGER' && x.active), [users])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (!q) return true
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        portalRoleLabel(u.role).toLowerCase().includes(q)
      )
    })
  }, [users, search, roleFilter])

  async function saveCreate() {
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
      setSnack({ open: true, message: r.error || 'Erro ao criar', severity: 'error' })
      return
    }
    setCreateOpen(false)
    setUEmail('')
    setUPass('')
    setUName('')
    setURole('COLLABORATOR')
    setUMgr('')
    setSnack({ open: true, message: 'Usuário criado.', severity: 'success' })
    void loadUsers()
  }

  function openEdit(u: UserRow) {
    setEditRow(u)
    setEEmail(u.email)
    setEName(u.name)
    setERole(u.role)
    setEActive(u.active)
    setEMgr(u.parentManagerId ?? '')
    setEPass('')
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editRow) return
    const nextEmail = eEmail.trim().toLowerCase()
    if (!emailLooksValid(nextEmail)) {
      setSnack({ open: true, message: 'Informe um e-mail válido.', severity: 'error' })
      return
    }
    setEBusy(true)
    const body: Record<string, unknown> = {
      email: nextEmail,
      name: eName,
      role: eRole,
      active: eActive,
      parentManagerId: eRole === 'COLLABORATOR' ? (eMgr || null) : null,
    }
    if (ePass.trim().length >= 8) body.password = ePass.trim()

    const r = await api(`/admin/users/${editRow.id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    setEBusy(false)
    if (!r.ok) {
      setSnack({ open: true, message: r.error || 'Erro ao atualizar', severity: 'error' })
      return
    }
    setEditOpen(false)
    const editedId = editRow.id
    setEditRow(null)
    setSnack({ open: true, message: 'Usuário atualizado.', severity: 'success' })
    if (me?.id === editedId) void refreshMe()
    void loadUsers()
  }

  async function patchActive(u: UserRow, active: boolean) {
    if (!active && me?.id === u.id) {
      setSnack({
        open: true,
        message: 'Não é possível desativar a própria conta enquanto estiver logado.',
        severity: 'error',
      })
      return
    }
    const r = await api(`/admin/users/${u.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    })
    if (!r.ok) {
      setSnack({ open: true, message: r.error || 'Erro ao alterar status', severity: 'error' })
      void loadUsers()
      return
    }
    setSnack({ open: true, message: active ? 'Usuário ativado.' : 'Usuário desativado.', severity: 'success' })
    void loadUsers()
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Toolbar
        variant="dense"
        sx={{
          flexWrap: 'wrap',
          gap: 1,
          py: 1.5,
          px: 2,
          bgcolor: 'grey.50',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1, minWidth: 200 }}>
          <MonitorHeartIcon color="action" fontSize="small" aria-hidden />
          <Typography variant="subtitle1" fontWeight={700}>
            Usuários do portal
          </Typography>
        </Stack>
        <TextField
          size="small"
          placeholder="Buscar nome, e-mail ou papel…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 220 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Papel</InputLabel>
          <Select
            label="Papel"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as string)}
          >
            <MenuItem value="">Todos</MenuItem>
            {PORTAL_ROLE_ORDER.map((r) => (
              <MenuItem key={r} value={r}>
                {PORTAL_ROLE_LABEL[r]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title="Recarregar lista">
          <IconButton onClick={() => void loadUsers()} disabled={loading} size="small" aria-label="Atualizar">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button variant="contained" startIcon={<PersonAddIcon />} onClick={() => setCreateOpen(true)}>
          Novo usuário
        </Button>
      </Toolbar>

      <Box sx={{ px: 2, py: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          {loading ? 'Carregando…' : `${filtered.length} de ${users.length} usuário(s) — filtros aplicados sobre a lista.`}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Monitoramento: último login ao entrar no portal; última atividade ao carregar a sessão (ex.: abrir o app). Chip
          &quot;Online&quot; = atividade nos últimos 5 minutos.
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer sx={{ maxHeight: { xs: '70vh', md: 'calc(100vh - 280px)' } }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Usuário</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Papel</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Gestor</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Criado em</TableCell>
                <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Último login</TableCell>
                <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Última atividade</TableCell>
                <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>Senha alterada</TableCell>
                <TableCell align="center">Ativo</TableCell>
                <TableCell align="right" width={100}>
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                      Nenhum usuário corresponde aos filtros.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => (
                  <TableRow key={u.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Avatar
                          sx={{
                            width: 36,
                            height: 36,
                            bgcolor: `${PORTAL_ROLE_CHIP_COLOR[u.role] || 'primary'}.main`,
                          }}
                        >
                          {roleIcon(u.role)}
                        </Avatar>
                        <Box>
                          <Typography fontWeight={600}>{u.name}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: { md: 'none' } }}>
                            {u.parentManager ? `Gestor: ${u.parentManager.name}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{u.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={portalRoleLabel(u.role)}
                        color={PORTAL_ROLE_CHIP_COLOR[u.role] ?? 'default'}
                        variant={u.role === 'COLLABORATOR' ? 'outlined' : 'filled'}
                      />
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      {u.parentManager ? (
                        <Typography variant="body2">{u.parentManager.name}</Typography>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography variant="body2">
                        {new Date(u.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                      <Typography variant="body2">{formatMonitorDate(u.lastLogin)}</Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                      <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" gap={0.5}>
                        <Typography variant="body2">{formatMonitorDate(u.lastSeenAt)}</Typography>
                        {isOnlineRecently(u.lastSeenAt) && (
                          <Chip size="small" label="Online" color="success" variant="outlined" sx={{ height: 22 }} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', xl: 'table-cell' } }}>
                      <Typography variant="body2">
                        {u.passwordUpdatedAt
                          ? new Date(u.passwordUpdatedAt).toLocaleDateString('pt-BR')
                          : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={u.active}
                        onChange={(_, v) => void patchActive(u, v)}
                        inputProps={{ 'aria-label': `Ativo ${u.name}` }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary" onClick={() => openEdit(u)} aria-label="Editar">
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Criar */}
      <Dialog open={createOpen} onClose={() => !uBusy && setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Novo usuário</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="E-mail"
            value={uEmail}
            onChange={(e) => setUEmail(e.target.value)}
            fullWidth
            autoComplete="off"
          />
          <TextField
            label="Senha"
            type="password"
            value={uPass}
            onChange={(e) => setUPass(e.target.value)}
            fullWidth
            helperText="Mínimo 8 caracteres"
          />
          <TextField label="Nome completo" value={uName} onChange={(e) => setUName(e.target.value)} fullWidth />
          <FormControl fullWidth>
            <InputLabel>Papel</InputLabel>
            <Select label="Papel" value={uRole} onChange={(e) => setURole(e.target.value)}>
              {ROLES.map((r) => (
                <MenuItem key={r} value={r}>
                  {PORTAL_ROLE_LABEL[r] ?? r}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {uRole === 'COLLABORATOR' && (
            <FormControl fullWidth>
              <InputLabel>Gestor solicitante (opcional)</InputLabel>
              <Select label="Gestor solicitante (opcional)" value={uMgr} onChange={(e) => setUMgr(e.target.value)}>
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {managers.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={uBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveCreate()}
            disabled={uBusy || !uEmail.trim() || uPass.length < 8 || uName.trim().length < 2}
          >
            {uBusy ? 'Salvando…' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Editar */}
      <Dialog open={editOpen} onClose={() => !eBusy && setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar usuário</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {editRow && (
            <>
              <TextField
                label="E-mail"
                type="email"
                value={eEmail}
                onChange={(e) => setEEmail(e.target.value)}
                fullWidth
                autoComplete="off"
                helperText="Pode alterar o e-mail de qualquer usuário, inclusive administradores."
              />
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'grey.50',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" gutterBottom>
                  Monitoramento
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Último login: {formatMonitorDate(editRow.lastLogin)}
                </Typography>
                <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.25 }}>
                  <Typography variant="caption" color="text.secondary" component="span">
                    Última atividade: {formatMonitorDate(editRow.lastSeenAt)}
                  </Typography>
                  {isOnlineRecently(editRow.lastSeenAt) && (
                    <Chip size="small" label="Online" color="success" variant="outlined" sx={{ height: 20 }} />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary" display="block">
                  Senha alterada:{' '}
                  {editRow.passwordUpdatedAt
                    ? new Date(editRow.passwordUpdatedAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </Typography>
              </Box>
              <TextField label="Nome completo" value={eName} onChange={(e) => setEName(e.target.value)} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Papel</InputLabel>
                <Select label="Papel" value={eRole} onChange={(e) => setERole(e.target.value)}>
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {PORTAL_ROLE_LABEL[r] ?? r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControlLabel
                control={<Switch checked={eActive} onChange={(_, v) => setEActive(v)} />}
                label="Conta ativa"
              />
              {eRole === 'COLLABORATOR' && (
                <FormControl fullWidth>
                  <InputLabel>Gestor solicitante</InputLabel>
                  <Select label="Gestor solicitante" value={eMgr} onChange={(e) => setEMgr(e.target.value)}>
                    <MenuItem value="">
                      <em>Nenhum</em>
                    </MenuItem>
                    {managers.map((m) => (
                      <MenuItem key={m.id} value={m.id} disabled={m.id === editRow.id}>
                        {m.name} ({m.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                label="Nova senha (opcional)"
                type="password"
                value={ePass}
                onChange={(e) => setEPass(e.target.value)}
                fullWidth
                helperText="Deixe em branco para manter a senha atual. Mínimo 8 caracteres se preenchido."
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={eBusy}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={() => void saveEdit()}
            disabled={
              eBusy || !eName.trim() || !emailLooksValid(eEmail) || (ePass.length > 0 && ePass.length < 8)
            }
          >
            {eBusy ? 'Salvando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} variant="filled">
          {snack.message}
        </Alert>
      </Snackbar>
    </Paper>
  )
}
