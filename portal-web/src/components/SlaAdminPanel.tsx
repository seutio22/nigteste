import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
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

export type SlaTotalRef = { unit: 'dias_uteis' | 'minutos'; value: number }

export type SlaProfileRow = {
  id: string
  slug: string
  name: string
  description: string | null
  sortOrder: number
  active: boolean
  prazoEmDiasUteis: boolean
  triagemDiasUteis: number
  atuacaoDiasUteis: number
  adicionalDiasUteisAposRetorno: number
  slaTriagemMinutos: number
  slaAtuacaoMinutos: number
  minutosAdicionalAposRetornoDemanda: number
  pausarQuandoAguardandoDemanda: boolean
  slaTotalMinutos?: number
  slaTotalReferencia?: SlaTotalRef
}

type AreaRow = { id: string; name: string; slug: string; types: TypeRowLite[] }
type TypeRowLite = {
  id: string
  name: string
  slug: string
  slaProfile: Pick<SlaProfileRow, 'id' | 'name' | 'prazoEmDiasUteis' | 'triagemDiasUteis' | 'atuacaoDiasUteis'> | null
}

function formatMinutos(m: number): string {
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r} min` : `${h} h`
}

function totalDias(p: Pick<SlaProfileRow, 'triagemDiasUteis' | 'atuacaoDiasUteis' | 'adicionalDiasUteisAposRetorno'>) {
  return p.triagemDiasUteis + p.atuacaoDiasUteis + p.adicionalDiasUteisAposRetorno
}

function totalMin(p: Pick<SlaProfileRow, 'slaTriagemMinutos' | 'slaAtuacaoMinutos' | 'minutosAdicionalAposRetornoDemanda'>) {
  return p.slaTriagemMinutos + p.slaAtuacaoMinutos + p.minutosAdicionalAposRetornoDemanda
}

function displayTotal(p: SlaProfileRow): string {
  if (p.slaTotalReferencia) {
    if (p.slaTotalReferencia.unit === 'dias_uteis') return `${p.slaTotalReferencia.value} dia(s) útil(eis)`
    return formatMinutos(p.slaTotalReferencia.value)
  }
  if (p.prazoEmDiasUteis) return `${totalDias(p)} dia(s) útil(eis)`
  return formatMinutos(p.slaTotalMinutos ?? totalMin(p))
}

function cellTriagem(p: SlaProfileRow): string {
  return p.prazoEmDiasUteis ? `${p.triagemDiasUteis} du` : formatMinutos(p.slaTriagemMinutos)
}
function cellAtuacao(p: SlaProfileRow): string {
  return p.prazoEmDiasUteis ? `${p.atuacaoDiasUteis} du` : formatMinutos(p.slaAtuacaoMinutos)
}
function cellAdic(p: SlaProfileRow): string {
  return p.prazoEmDiasUteis ? `${p.adicionalDiasUteisAposRetorno} du` : formatMinutos(p.minutosAdicionalAposRetornoDemanda)
}

const MIN_PER_DAY = 480

export default function SlaAdminPanel() {
  const [profiles, setProfiles] = useState<SlaProfileRow[]>([])
  const [areas, setAreas] = useState<AreaRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [active, setActive] = useState(true)
  const [usarDiasUteis, setUsarDiasUteis] = useState(true)
  const [triD, setTriD] = useState(1)
  const [atuD, setAtuD] = useState(5)
  const [adicD, setAdicD] = useState(0)
  const [tri, setTri] = useState(240)
  const [atu, setAtu] = useState(2880)
  const [adicional, setAdicional] = useState(0)
  const [pausar, setPausar] = useState(true)
  const [busy, setBusy] = useState(false)
  const [linkBusy, setLinkBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const r = await api<{ profiles: SlaProfileRow[] }>('/admin/sla-profiles')
    if (r.ok && r.data?.profiles) setProfiles(r.data.profiles)
  }, [])

  const loadAreas = useCallback(async () => {
    const r = await api<{ areas: AreaRow[] }>('/admin/areas')
    if (r.ok && r.data?.areas) setAreas(r.data.areas)
  }, [])

  useEffect(() => {
    void load()
    void loadAreas()
  }, [load, loadAreas])

  const previewTotalLabel = useMemo(() => {
    if (usarDiasUteis) return `${triD + atuD + adicD} dia(s) útil(eis) (seg–sex)`
    const m = tri + atu + adicional
    return formatMinutos(m)
  }, [usarDiasUteis, triD, atuD, adicD, tri, atu, adicional])

  function openNew() {
    setErr(null)
    setEditId(null)
    setSlug('')
    setName('')
    setDescription('')
    setSortOrder(profiles.length)
    setActive(true)
    setUsarDiasUteis(true)
    setTriD(1)
    setAtuD(5)
    setAdicD(0)
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
    setUsarDiasUteis(row.prazoEmDiasUteis)
    setTriD(row.triagemDiasUteis)
    setAtuD(row.atuacaoDiasUteis)
    setAdicD(row.adicionalDiasUteisAposRetorno)
    setTri(row.slaTriagemMinutos)
    setAtu(row.slaAtuacaoMinutos)
    setAdicional(row.minutosAdicionalAposRetornoDemanda)
    setPausar(row.pausarQuandoAguardandoDemanda)
    setOpen(true)
  }

  async function save() {
    setErr(null)
    setBusy(true)
    const slugClean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    const body = {
      slug: slugClean,
      name: name.trim(),
      description: description.trim() || null,
      sortOrder,
      active,
      prazoEmDiasUteis: usarDiasUteis,
      triagemDiasUteis: triD,
      atuacaoDiasUteis: atuD,
      adicionalDiasUteisAposRetorno: adicD,
      slaTriagemMinutos: usarDiasUteis ? Math.max(0, triD * MIN_PER_DAY) : tri,
      slaAtuacaoMinutos: usarDiasUteis ? Math.max(0, atuD * MIN_PER_DAY) : atu,
      minutosAdicionalAposRetornoDemanda: usarDiasUteis ? Math.max(0, adicD * MIN_PER_DAY) : adicional,
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

  async function saveTypeLink(typeId: string, slaProfileId: string) {
    setErr(null)
    setLinkBusy(typeId)
    const r = await api(`/admin/types/${typeId}`, {
      method: 'PATCH',
      body: JSON.stringify({ slaProfileId: slaProfileId || null }),
    })
    setLinkBusy(null)
    if (!r.ok) {
      setErr(r.error || 'Erro ao vincular')
      return
    }
    void loadAreas()
  }

  const allTypes = useMemo(() => {
    const rows: { type: TypeRowLite; areaName: string }[] = []
    for (const ar of areas) {
      for (const t of ar.types) {
        rows.push({ type: t, areaName: ar.name })
      }
    }
    return rows.sort((a, b) => a.areaName.localeCompare(b.areaName) || a.type.name.localeCompare(b.type.name))
  }, [areas])

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
          Cada perfil pode usar <strong>dias úteis</strong> (segunda a sexta) ou <strong>minutos corridos</strong>. Vincule o
          perfil aos <strong>tipos de demanda</strong> (formulários) na tabela abaixo ou em Áreas e tipos. O solicitante
          vê os prazos e etapas na página da solicitação.
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
              <TableCell>Modo</TableCell>
              <TableCell>Triagem</TableCell>
              <TableCell>Atuação</TableCell>
              <TableCell>Adicional pós-retorno</TableCell>
              <TableCell>Total ref.</TableCell>
              <TableCell>Pausa</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Typography fontWeight={600}>{p.name}</Typography>
                  <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                    {p.slug}
                  </Typography>
                </TableCell>
                <TableCell>{p.prazoEmDiasUteis ? 'Dias úteis' : 'Minutos'}</TableCell>
                <TableCell>{cellTriagem(p)}</TableCell>
                <TableCell>{cellAtuacao(p)}</TableCell>
                <TableCell>{cellAdic(p)}</TableCell>
                <TableCell>
                  <Chip size="small" color="primary" label={displayTotal(p)} />
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
            ))}
            {profiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography color="text.secondary">Nenhum perfil. Crie um para associar a tipos de demanda.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          Vincular SLA aos formulários (tipos de demanda)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tipos já criados no sistema: escolha o perfil de SLA e clique em Aplicar. O mesmo tipo pode ser alterado também em
          &quot;Áreas e tipos&quot;.
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Área</TableCell>
              <TableCell>Tipo / formulário</TableCell>
              <TableCell width={280}>Perfil SLA</TableCell>
              <TableCell width={100} />
            </TableRow>
          </TableHead>
          <TableBody>
            {allTypes.map(({ type: t, areaName }) => (
              <TypeSlaLinkRow
                key={t.id}
                areaName={areaName}
                type={t}
                profiles={profiles}
                busy={linkBusy === t.id}
                onApply={(pid) => void saveTypeLink(t.id, pid)}
              />
            ))}
            {allTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography color="text.secondary">Nenhum tipo cadastrado. Crie áreas e tipos em &quot;Áreas e tipos&quot;.</Typography>
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
          <FormControlLabel
            control={<Switch checked={usarDiasUteis} onChange={(e) => setUsarDiasUteis(e.target.checked)} />}
            label="Prazos em dias úteis (segunda a sexta; recomendado)"
          />
          <Divider />
          {usarDiasUteis ? (
            <>
              <Typography variant="subtitle2" fontWeight={700}>
                Prazos em dias úteis
              </Typography>
              <TextField
                label="Triagem (dias úteis)"
                type="number"
                value={triD}
                onChange={(e) => setTriD(Math.max(0, Number(e.target.value) || 0))}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Atuação (dias úteis)"
                type="number"
                value={atuD}
                onChange={(e) => setAtuD(Math.max(0, Number(e.target.value) || 0))}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Dias úteis adicionais após retorno do demandante"
                type="number"
                value={adicD}
                onChange={(e) => setAdicD(Math.max(0, Number(e.target.value) || 0))}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </>
          ) : (
            <>
              <Typography variant="subtitle2" fontWeight={700}>
                Prazos em minutos (calendário)
              </Typography>
              <TextField
                label="SLA de triagem (minutos)"
                type="number"
                value={tri}
                onChange={(e) => setTri(Math.max(0, Number(e.target.value) || 0))}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="SLA de atuação (minutos)"
                type="number"
                value={atu}
                onChange={(e) => setAtu(Math.max(0, Number(e.target.value) || 0))}
                fullWidth
                inputProps={{ min: 0 }}
              />
              <TextField
                label="Minutos adicionais após retorno"
                type="number"
                value={adicional}
                onChange={(e) => setAdicional(Math.max(0, Number(e.target.value) || 0))}
                fullWidth
                inputProps={{ min: 0 }}
              />
            </>
          )}
          <FormControlLabel
            control={<Switch checked={pausar} onChange={(e) => setPausar(e.target.checked)} />}
            label="Pausar SLA enquanto aguarda o demandante"
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
            <Typography variant="h6">{previewTotalLabel}</Typography>
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

function TypeSlaLinkRow({
  areaName,
  type: t,
  profiles,
  busy,
  onApply,
}: {
  areaName: string
  type: TypeRowLite
  profiles: SlaProfileRow[]
  busy: boolean
  onApply: (slaProfileId: string) => void
}) {
  const [val, setVal] = useState(t.slaProfile?.id ?? '')
  useEffect(() => {
    setVal(t.slaProfile?.id ?? '')
  }, [t.slaProfile?.id])
  return (
    <TableRow hover>
      <TableCell>{areaName}</TableCell>
      <TableCell>
        <Typography fontWeight={600}>{t.name}</Typography>
        <Typography variant="caption" fontFamily="monospace" color="text.secondary">
          {t.slug}
        </Typography>
      </TableCell>
      <TableCell>
        <FormControl size="small" fullWidth>
          <InputLabel id={`sla-${t.id}`}>Perfil</InputLabel>
          <Select
            labelId={`sla-${t.id}`}
            label="Perfil"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          >
            <MenuItem value="">
              <em>Nenhum</em>
            </MenuItem>
            {profiles
              .filter((p) => p.active)
              .map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.name}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell>
        <Button size="small" variant="contained" disabled={busy} onClick={() => onApply(val)}>
          Aplicar
        </Button>
      </TableCell>
    </TableRow>
  )
}
