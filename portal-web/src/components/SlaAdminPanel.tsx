import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { alpha } from '@mui/material/styles'
import { api } from '../lib/api'

export type SlaProfileRow = {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  active: boolean
  slaTriagemMinutos: number
  slaAtuacaoMinutos: number
  minutosAdicionalAposRetornoDemanda: number
  pausarQuandoAguardandoDemanda: boolean
  slaTotalMinutos?: number
}

function formatMinutos(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

function totalLocal(p: Pick<SlaProfileRow, 'slaTriagemMinutos' | 'slaAtuacaoMinutos' | 'minutosAdicionalAposRetornoDemanda'>) {
  return p.slaTriagemMinutos + p.slaAtuacaoMinutos + p.minutosAdicionalAposRetornoDemanda
}

export default function SlaAdminPanel() {
  const [profiles, setProfiles] = useState<SlaProfileRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [active, setActive] = useState(true)
  const [tri, setTri] = useState(240)
  const [atu, setAtu] = useState(2880)
  const [adicional, setAdicional] = useState(0)
  const [pausar, setPausar] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const r = await api<{ profiles: SlaProfileRow[] }>('/admin/sla-profiles')
    if (r.ok && r.data?.profiles) setProfiles(r.data.profiles)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const previewTotal = useMemo(
    () => totalLocal({ slaTriagemMinutos: tri, slaAtuacaoMinutos: atu, minutosAdicionalAposRetornoDemanda: adicional }),
    [tri, atu, adicional]
  )

  function openNew() {
    setErr(null)
    setEditId(null)
    setSlug('')
    setName('')
    setDescription('')
    setSortOrder(profiles.length)
    setActive(true)
    setTri(240)
    setAtu(2880)
    setAdicional(0)
    setPausar(true)
    setOpen(true)
  }

  function openEdit(row: SlaProfileRow) {
    setErr(null)
    setEditId(row.id)
    setSlug(row.slug)
    setName(row.name)
    setDescription(row.description ?? '')
    setSortOrder(row.sortOrder)
    setActive(row.active)
    setTri(row.slaTriagemMinutos)
    setAtu(row.slaAtuacaoMinutos)
    setAdicional(row.minutosAdicionalAposRetornoDemanda)
    setPausar(row.pausarQuandoAguardandoDemanda)
    setOpen(true)
  }

  async function save() {
    setErr(null)
    setBusy(true)
    const body = {
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      name: name.trim(),
      description: description.trim() || null,
      sortOrder,
      active,
      slaTriagemMinutos: tri,
      slaAtuacaoMinutos: atu,
      minutosAdicionalAposRetornoDemanda: adicional,
      pausarQuandoAguardandoDemanda: pausar,
    }
    const r = editId
      ? await api(`/admin/sla-profiles/${editId}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await api('/admin/sla-profiles', { method: 'POST', body: JSON.stringify(body) })
    setBusy(false)
    if (!r.ok) {
      setErr(r.error || 'Erro ao salvar')
      return
    }
    setOpen(false)
    void load()
  }

  async function remove(row: SlaProfileRow) {
    if (!window.confirm(`Excluir o perfil "${row.name}"? Tipos de demanda que o usam ficam sem SLA até escolher outro.`)) return
    setErr(null)
    const r = await api(`/admin/sla-profiles/${row.id}`, { method: 'DELETE' })
    if (!r.ok) {
      setErr(r.error || 'Não foi possível excluir')
      return
    }
    void load()
  }

  return (
    <Stack spacing={2}>
      {err && (
        <Alert severity="error" onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Perfis de SLA
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Defina prazos de <strong>triagem</strong> e de <strong>atuação</strong> (em minutos). O tempo pode ser
          pausado enquanto o demandante responde a um pedido adicional; ao retornar, volta a contar e pode somar-se um
          <strong> adicional parametrizável</strong>. A <strong>SLA total</strong> mostrada é a soma: triagem + atuação
          + adicional pós-retorno.
        </Typography>
        <Button variant="contained" onClick={openNew}>
          Novo perfil de SLA
        </Button>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Nome</TableCell>
              <TableCell>Triagem</TableCell>
              <TableCell>Atuação</TableCell>
              <TableCell>Adicional pós-retorno</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Pausa c/ demandante</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map((p) => {
              const tot = p.slaTotalMinutos ?? totalLocal(p)
              return (
                <TableRow key={p.id} hover>
                  <TableCell>
                    <Typography fontWeight={600}>{p.name}</Typography>
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                      {p.slug}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatMinutos(p.slaTriagemMinutos)}</TableCell>
                  <TableCell>{formatMinutos(p.slaAtuacaoMinutos)}</TableCell>
                  <TableCell>{formatMinutos(p.minutosAdicionalAposRetornoDemanda)}</TableCell>
                  <TableCell>
                    <Chip size="small" color="primary" label={formatMinutos(tot)} />
                  </TableCell>
                  <TableCell>{p.pausarQuandoAguardandoDemanda ? 'Sim' : 'Não'}</TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => openEdit(p)}>
                      Editar
                    </Button>
                    <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => void remove(p)}>
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">Nenhum perfil. Crie um para associar a tipos de demanda.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Drawer anchor="right" open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, maxWidth: '100%' } }}>
        <Toolbar sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {editId ? 'Editar perfil SLA' : 'Novo perfil SLA'}
          </Typography>
          <IconButton onClick={() => setOpen(false)} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Slug (identificador)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={!!editId}
            fullWidth
            helperText="minúsculas, números e hífen"
          />
          <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} fullWidth required />
          <TextField
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <Divider />
          <Typography variant="subtitle2" fontWeight={700}>
            Prazos (minutos)
          </Typography>
          <TextField
            label="SLA de triagem"
            type="number"
            value={tri}
            onChange={(e) => setTri(Math.max(0, Number(e.target.value) || 0))}
            fullWidth
            inputProps={{ min: 0 }}
            helperText="Tempo máximo para a fase de triagem do chamado."
          />
          <TextField
            label="SLA de atuação"
            type="number"
            value={atu}
            onChange={(e) => setAtu(Math.max(0, Number(e.target.value) || 0))}
            fullWidth
            inputProps={{ min: 0 }}
            helperText="Tempo máximo para a fase de análise / atuação (após triagem)."
          />
          <TextField
            label="Minutos adicionais após retorno do demandante"
            type="number"
            value={adicional}
            onChange={(e) => setAdicional(Math.max(0, Number(e.target.value) || 0))}
            fullWidth
            inputProps={{ min: 0 }}
            helperText="Somados ao retomar o relógio quando o demandante responde a um pedido adicional (opcional)."
          />
          <FormControlLabel
            control={<Switch checked={pausar} onChange={(e) => setPausar(e.target.checked)} />}
            label="Pausar SLA enquanto aguarda o demandante (itens adicionais / resposta)"
          />
          <Paper
            variant="outlined"
            sx={(theme) => ({
              p: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              borderColor: 'primary.light',
            })}
          >
            <Typography variant="subtitle2" color="primary.dark" fontWeight={700}>
              SLA total (referência)
            </Typography>
            <Typography variant="h6">{formatMinutos(previewTotal)}</Typography>
            <Typography variant="caption" color="text.secondary">
              = triagem + atuação + adicional pós-retorno (o controlo de pausa no tempo em curso será na tela de operações
              do chamado).
            </Typography>
          </Paper>
          <TextField label="Ordem na lista" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value) || 0)} fullWidth />
          <FormControlLabel control={<Switch checked={active} onChange={(e) => setActive(e.target.checked)} />} label="Perfil ativo" />
          <Button variant="contained" size="large" onClick={() => void save()} disabled={busy || !name.trim() || slug.trim().length < 2}>
            Salvar
          </Button>
        </Box>
      </Drawer>
    </Stack>
  )
}
