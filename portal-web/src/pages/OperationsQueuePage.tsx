import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
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
  TextField,
  Typography,
} from '@mui/material'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { CASE_STATUS_LABEL } from '../constants/caseStatus'
import { PRIORITY_LABEL } from '../constants/priority'

type OpUser = { id: string; name: string; email: string; role: string }

type QueueCase = {
  id: string
  protocol: string
  status: string
  priority: string
  queueLabel: string | null
  title: string | null
  user: { name: string; email: string }
  assignee: { id: string; name: string } | null
}

const STATUSES = [
  'SUBMITTED',
  'IN_TRIAGE',
  'IN_ANALYSIS',
  'AWAITING_REQUESTER',
  'AWAITING_THIRD_PARTY',
] as const

const PRIOS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const

export default function OperationsQueuePage() {
  const { user } = useAuth()
  const [cases, setCases] = useState<QueueCase[]>([])
  const [operators, setOperators] = useState<OpUser[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<QueueCase | null>(null)
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<string>('MEDIUM')
  const [queueLabel, setQueueLabel] = useState('')
  const [status, setStatus] = useState<string>('IN_TRIAGE')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const canOps = user?.role === 'PORTAL_OPERATOR' || user?.role === 'PORTAL_ADMIN'

  async function load() {
    setLoading(true)
    const [q, o] = await Promise.all([
      api<{ cases: QueueCase[] }>('/operations/queue'),
      api<{ operators: OpUser[] }>('/operations/operators'),
    ])
    if (q.ok && q.data?.cases) setCases(q.data.cases)
    if (o.ok && o.data?.operators) setOperators(o.data.operators)
    setLoading(false)
  }

  useEffect(() => {
    if (canOps) void load()
  }, [canOps])

  if (!canOps) return <Navigate to="/" replace />

  function openEdit(c: QueueCase) {
    setEdit(c)
    setAssigneeId(c.assignee?.id || '')
    setPriority(c.priority || 'MEDIUM')
    setQueueLabel(c.queueLabel || '')
    setStatus(c.status)
    setErr(null)
    setOpen(true)
  }

  async function save() {
    if (!edit) return
    setSaving(true)
    setErr(null)
    const res = await api(`/operations/cases/${edit.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        assignedToUserId: assigneeId || null,
        priority,
        queueLabel: queueLabel.trim() || null,
        status,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      setErr(res.error || 'Falha ao salvar')
      return
    }
    setOpen(false)
    void load()
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Operação — fila e atribuição
        </Typography>
        <Button onClick={() => void load()} disabled={loading}>
          Atualizar
        </Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Classifique por <strong>fila</strong> (campo livre), <strong>prioridade</strong> e <strong>responsável</strong>{' '}
        (operador/admin).
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Protocolo</TableCell>
              <TableCell>Solicitante</TableCell>
              <TableCell>Fila</TableCell>
              <TableCell>Prioridade</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Status</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7}>Carregando…</TableCell>
              </TableRow>
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">Fila vazia.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <RouterLink to={`/solicitacoes/${c.id}`}>{c.protocol}</RouterLink>
                  </TableCell>
                  <TableCell>{c.user.name}</TableCell>
                  <TableCell>{c.queueLabel || '—'}</TableCell>
                  <TableCell>{PRIORITY_LABEL[c.priority] || c.priority}</TableCell>
                  <TableCell>{c.assignee?.name || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={CASE_STATUS_LABEL[c.status] || c.status} />
                  </TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => openEdit(c)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Triagem — {edit?.protocol}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {err && (
            <Typography color="error" variant="body2">
              {err}
            </Typography>
          )}
          <FormControl fullWidth size="small">
            <InputLabel>Responsável</InputLabel>
            <Select
              label="Responsável"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value as string)}
            >
              <MenuItem value="">
                <em>Nenhum</em>
              </MenuItem>
              {operators.map((o) => (
                <MenuItem key={o.id} value={o.id}>
                  {o.name} ({o.role === 'PORTAL_ADMIN' ? 'Admin' : 'Operador'})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>Prioridade</InputLabel>
            <Select label="Prioridade" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIOS.map((p) => (
                <MenuItem key={p} value={p}>
                  {PRIORITY_LABEL[p]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Fila / classificação (livre)"
            value={queueLabel}
            onChange={(e) => setQueueLabel(e.target.value)}
            placeholder="Ex.: N1, Jurídico, Compras"
            fullWidth
            size="small"
          />
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {CASE_STATUS_LABEL[s] || s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}
