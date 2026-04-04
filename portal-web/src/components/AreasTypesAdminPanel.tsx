import { useCallback, useEffect, useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import CloseIcon from '@mui/icons-material/Close'
import { api } from '../lib/api'
import type { FormFieldDef } from '../lib/formSchema'
import { parseFormMeta, parseFormSchema } from '../lib/formSchema'
import type { NexusFieldRow } from '../lib/nexusCatalog'
import FormBuilder from './FormBuilder'
import type { SlaProfileRow } from './SlaAdminPanel'

type TypeRow = {
  id: string
  slug: string
  name: string
  active: boolean
  formSchema: unknown
  slaProfile: Pick<
    SlaProfileRow,
    'id' | 'name' | 'slug' | 'slaTriagemMinutos' | 'slaAtuacaoMinutos' | 'minutosAdicionalAposRetornoDemanda'
  > | null
}
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

const drawerPaperSx = {
  width: { xs: '100%', sm: 'min(440px, 100vw)' },
  maxWidth: '100%',
}

const typeDrawerPaperSx = {
  width: { xs: '100%', sm: 'min(960px, 100vw)' },
  maxWidth: '100%',
}

export default function AreasTypesAdminPanel() {
  const [areas, setAreas] = useState<AreaFull[]>([])
  const [nexusCatalog, setNexusCatalog] = useState<NexusFieldRow[]>([])
  const [slaProfiles, setSlaProfiles] = useState<SlaProfileRow[]>([])
  const [err, setErr] = useState<string | null>(null)

  const [aOpen, setAOpen] = useState(false)
  const [aSlug, setASlug] = useState('')
  const [aName, setAName] = useState('')

  const [aEditOpen, setAEditOpen] = useState(false)
  const [aEditId, setAEditId] = useState('')
  const [aEditSlug, setAEditSlug] = useState('')
  const [aEditName, setAEditName] = useState('')
  const [aEditSort, setAEditSort] = useState(0)
  const [aEditActive, setAEditActive] = useState(true)

  const [tOpen, setTOpen] = useState(false)
  const [tAreaId, setTAreaId] = useState('')
  const [tSlug, setTSlug] = useState('')
  const [tName, setTName] = useState('')
  const [tFields, setTFields] = useState<FormFieldDef[]>([])
  const [tShowTitle, setTShowTitle] = useState(false)
  const [tShowDesc, setTShowDesc] = useState(true)
  const [tSlaProfileId, setTSlaProfileId] = useState<string>('')

  const [eOpen, setEOpen] = useState(false)
  const [eType, setEType] = useState<TypeRow | null>(null)
  const [eSlug, setESlug] = useState('')
  const [eName, setEName] = useState('')
  const [eActive, setEActive] = useState(true)
  const [eFields, setEFields] = useState<FormFieldDef[]>([])
  const [eShowTitle, setEShowTitle] = useState(false)
  const [eShowDesc, setEShowDesc] = useState(true)
  const [eSlaProfileId, setESlaProfileId] = useState<string>('')

  const loadAreas = useCallback(async () => {
    const r = await api<{ areas: AreaFull[] }>('/admin/areas')
    if (r.ok && r.data?.areas) setAreas(r.data.areas)
  }, [])

  const loadNexusCatalog = useCallback(async () => {
    const r = await api<{ fields: NexusFieldRow[] }>('/admin/nexus-fields')
    if (r.ok && r.data?.fields) setNexusCatalog(r.data.fields)
  }, [])

  const loadSlaProfiles = useCallback(async () => {
    const r = await api<{ profiles: SlaProfileRow[] }>('/admin/sla-profiles')
    if (r.ok && r.data?.profiles) setSlaProfiles(r.data.profiles)
  }, [])

  useEffect(() => {
    void loadAreas()
    void loadNexusCatalog()
    void loadSlaProfiles()
  }, [loadAreas, loadNexusCatalog, loadSlaProfiles])

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

  async function saveEditArea() {
    setErr(null)
    const r = await api(`/admin/areas/${aEditId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        slug: aEditSlug,
        name: aEditName,
        sortOrder: aEditSort,
        active: aEditActive,
      }),
    })
    if (!r.ok) {
      setErr(r.error || 'Erro ao salvar área')
      return
    }
    setAEditOpen(false)
    void loadAreas()
  }

  async function deleteArea(id: string) {
    if (
      !window.confirm(
        'Excluir esta área e os tipos de demanda dela? As solicitações já criadas continuam no sistema; área e tipo deixam de aparecer nelas (referência removida).'
      )
    )
      return
    setErr(null)
    const r = await api(`/admin/areas/${id}/delete`, { method: 'POST' })
    if (!r.ok) {
      setErr(r.error || 'Não foi possível excluir')
      return
    }
    void loadAreas()
  }

  async function deleteType(id: string) {
    if (!window.confirm('Excluir este tipo de demanda?')) return
    setErr(null)
    const r = await api(`/admin/types/${id}`, { method: 'DELETE' })
    if (!r.ok) {
      setErr(r.error || 'Não foi possível excluir')
      return
    }
    void loadAreas()
    void loadNexusCatalog()
  }

  async function saveType() {
    setErr(null)
    const dups = duplicateKeys(tFields)
    if (dups.length) {
      setErr(`Chaves duplicadas nos campos: ${dups.join(', ')}`)
      return
    }
    const formSchema = { fields: tFields, showTitle: tShowTitle, showDescription: tShowDesc }
    const r = await api(`/admin/areas/${tAreaId}/types`, {
      method: 'POST',
      body: JSON.stringify({
        slug: tSlug,
        name: tName,
        active: true,
        formSchema,
        slaProfileId: tSlaProfileId || null,
      }),
    })
    if (!r.ok) {
      setErr(r.error || 'Erro ao criar tipo')
      return
    }
    setTOpen(false)
    setTSlug('')
    setTName('')
    setTFields([])
    setTShowTitle(false)
    setTShowDesc(true)
    setTSlaProfileId('')
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
    const formSchema = { fields: eFields, showTitle: eShowTitle, showDescription: eShowDesc }
    const r = await api(`/admin/types/${eType.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        slug: eSlug,
        name: eName,
        active: eActive,
        formSchema,
        slaProfileId: eSlaProfileId || null,
      }),
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

  const nexusActiveCount = nexusCatalog.filter((x) => x.active).length

  function slaTotalMin(p: Pick<SlaProfileRow, 'slaTriagemMinutos' | 'slaAtuacaoMinutos' | 'minutosAdicionalAposRetornoDemanda'>) {
    return p.slaTriagemMinutos + p.slaAtuacaoMinutos + p.minutosAdicionalAposRetornoDemanda
  }

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {err && (
        <Alert severity="error" onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>
              Áreas e tipos de demanda
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Organize por área; cada tipo tem o seu formulário. Use o painel lateral (largo) para montar campos e ligar ao
              Nexus.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" size="small" onClick={() => void loadNexusCatalog()}>
              Atualizar catálogo Nexus
            </Button>
            <Chip size="small" label={`${nexusActiveCount} campos Nexus ativos`} variant="outlined" color="primary" />
            <Button variant="contained" onClick={() => setAOpen(true)}>
              Nova área
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {areas.length === 0 ? (
          <Typography color="text.secondary">Nenhuma área ainda. Crie uma para começar.</Typography>
        ) : (
          <Stack spacing={1}>
            {areas.map((ar) => (
              <Accordion key={ar.id} defaultExpanded={areas.length <= 3} disableGutters elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 1 }} flexWrap="wrap">
                    <Typography fontWeight={700}>{ar.name}</Typography>
                    <Typography variant="caption" fontFamily="monospace" color="text.secondary">
                      {ar.slug}
                    </Typography>
                    <Chip size="small" label={ar.active ? 'Ativa' : 'Inativa'} color={ar.active ? 'success' : 'default'} />
                    <Box sx={{ flexGrow: 1 }} />
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation()
                        setAEditId(ar.id)
                        setAEditSlug(ar.slug)
                        setAEditName(ar.name)
                        setAEditSort(ar.sortOrder)
                        setAEditActive(ar.active)
                        setAEditOpen(true)
                      }}
                    >
                      Editar área
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation()
                        void deleteArea(ar.id)
                      }}
                    >
                      Excluir área
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTAreaId(ar.id)
                        setTSlug('')
                        setTName('')
                        setTFields([])
                        setTShowTitle(false)
                        setTShowDesc(true)
                        setTSlaProfileId('')
                        setTOpen(true)
                      }}
                    >
                      + Novo tipo
                    </Button>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'grey.50', pt: 0 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tipo</TableCell>
                        <TableCell width={220}>Perfil SLA</TableCell>
                        <TableCell width={100}>Ativo</TableCell>
                        <TableCell align="right" width={280}>
                          Ações
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {ar.types.map((t) => (
                        <TableRow key={t.id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{t.name}</Typography>
                            <Typography variant="caption" display="block" fontFamily="monospace" color="text.secondary">
                              {t.slug}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {t.slaProfile ? (
                              <Stack spacing={0.25}>
                                <Typography variant="body2" fontWeight={600}>
                                  {t.slaProfile.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Total ref.: {slaTotalMin(t.slaProfile)} min
                                </Typography>
                              </Stack>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                —
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>{t.active ? 'Sim' : 'Não'}</TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => {
                                setEType(t)
                                setESlug(t.slug)
                                setEName(t.name)
                                setEActive(t.active)
                                setEFields(parseFormSchema(t.formSchema))
                                const m = parseFormMeta(t.formSchema)
                                setEShowTitle(m.showTitle)
                                setEShowDesc(m.showDescription)
                                setESlaProfileId(t.slaProfile?.id ?? '')
                                setEOpen(true)
                              }}
                            >
                              Editar formulário
                            </Button>
                            <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => void deleteType(t.id)}>
                              Excluir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {ar.types.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary">
                              Nenhum tipo nesta área. Use &quot;+ Novo tipo&quot; acima.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </AccordionDetails>
              </Accordion>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Nova área */}
      <Drawer anchor="right" open={aOpen} onClose={() => setAOpen(false)} PaperProps={{ sx: drawerPaperSx }}>
        <Toolbar sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Nova área
          </Typography>
          <IconButton edge="end" onClick={() => setAOpen(false)} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Slug (ex.: rh)" value={aSlug} onChange={(e) => setASlug(e.target.value)} fullWidth helperText="Minúsculas, números e hífen. Identificador técnico." />
          <TextField label="Nome exibido" value={aName} onChange={(e) => setAName(e.target.value)} fullWidth />
          <Button variant="contained" onClick={() => void saveArea()} size="large">
            Criar área
          </Button>
        </Box>
      </Drawer>

      {/* Editar área */}
      <Drawer anchor="right" open={aEditOpen} onClose={() => setAEditOpen(false)} PaperProps={{ sx: drawerPaperSx }}>
        <Toolbar sx={{ gap: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            Editar área
          </Typography>
          <IconButton edge="end" onClick={() => setAEditOpen(false)} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Slug" value={aEditSlug} onChange={(e) => setAEditSlug(e.target.value)} fullWidth />
          <TextField label="Nome exibido" value={aEditName} onChange={(e) => setAEditName(e.target.value)} fullWidth />
          <TextField label="Ordem" type="number" value={aEditSort} onChange={(e) => setAEditSort(Number(e.target.value) || 0)} fullWidth />
          <FormControlLabel control={<Switch checked={aEditActive} onChange={(e) => setAEditActive(e.target.checked)} />} label="Área ativa" />
          <Button variant="contained" onClick={() => void saveEditArea()} size="large">
            Salvar
          </Button>
        </Box>
      </Drawer>

      {/* Novo tipo — drawer largo */}
      <Drawer anchor="right" open={tOpen} onClose={() => setTOpen(false)} PaperProps={{ sx: typeDrawerPaperSx }}>
        <Toolbar sx={{ gap: 1, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ flex: 1, minWidth: 200 }}>
            Novo tipo de demanda
          </Typography>
          <IconButton edge="end" onClick={() => setTOpen(false)} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Box sx={{ p: 3, pb: 6, overflow: 'auto', maxHeight: '100%' }}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Slug" value={tSlug} onChange={(e) => setTSlug(e.target.value)} fullWidth required />
              <TextField label="Nome do tipo" value={tName} onChange={(e) => setTName(e.target.value)} fullWidth required />
            </Stack>
            <FormControl fullWidth size="small">
              <InputLabel id="t-sla-label">Perfil de SLA</InputLabel>
              <Select
                labelId="t-sla-label"
                label="Perfil de SLA"
                value={tSlaProfileId}
                onChange={(e) => setTSlaProfileId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {slaProfiles
                  .filter((p) => p.active)
                  .map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name} (total ref. {slaTotalMin(p)} min)
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Campos fixos do pedido
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={2}>
                <FormControlLabel control={<Switch checked={tShowTitle} onChange={(e) => setTShowTitle(e.target.checked)} />} label="Pedir título da solicitação" />
                <FormControlLabel control={<Switch checked={tShowDesc} onChange={(e) => setTShowDesc(e.target.checked)} />} label="Pedir descrição / assunto (texto livre)" />
              </Stack>
            </Paper>
            <FormBuilder fields={tFields} onChange={setTFields} nexusCatalog={nexusCatalog} showNexusQuickPick />
            <Button variant="contained" size="large" onClick={() => void saveType()}>
              Criar tipo
            </Button>
          </Stack>
        </Box>
      </Drawer>

      {/* Editar tipo */}
      <Drawer anchor="right" open={eOpen} onClose={() => setEOpen(false)} PaperProps={{ sx: typeDrawerPaperSx }}>
        <Toolbar sx={{ gap: 1, borderBottom: 1, borderColor: 'divider', flexWrap: 'wrap' }}>
          <Typography variant="h6" sx={{ flex: 1, minWidth: 200 }}>
            Editar tipo: {eName || '…'}
          </Typography>
          <IconButton edge="end" onClick={() => setEOpen(false)} aria-label="Fechar">
            <CloseIcon />
          </IconButton>
        </Toolbar>
        <Box sx={{ p: 3, pb: 6, overflow: 'auto', maxHeight: '100%' }}>
          <Stack spacing={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Slug" value={eSlug} onChange={(e) => setESlug(e.target.value)} fullWidth size="small" />
              <TextField label="Nome" value={eName} onChange={(e) => setEName(e.target.value)} fullWidth size="small" />
            </Stack>
            <FormControl fullWidth size="small">
              <InputLabel id="e-sla-label">Perfil de SLA</InputLabel>
              <Select
                labelId="e-sla-label"
                label="Perfil de SLA"
                value={eSlaProfileId}
                onChange={(e) => setESlaProfileId(e.target.value)}
              >
                <MenuItem value="">
                  <em>Nenhum</em>
                </MenuItem>
                {slaProfiles.map((p) => (
                  <MenuItem key={p.id} value={p.id} disabled={!p.active && p.id !== eSlaProfileId}>
                    {p.name} (total ref. {slaTotalMin(p)} min){!p.active ? ' — inativo' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={eActive} onChange={(e) => setEActive(e.target.checked)} />} label="Tipo ativo (visível no catálogo para novas solicitações)" />
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                Campos fixos do pedido
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={2}>
                <FormControlLabel control={<Switch checked={eShowTitle} onChange={(e) => setEShowTitle(e.target.checked)} />} label="Pedir título da solicitação" />
                <FormControlLabel control={<Switch checked={eShowDesc} onChange={(e) => setEShowDesc(e.target.checked)} />} label="Pedir descrição / assunto (texto livre)" />
              </Stack>
            </Paper>
            <FormBuilder fields={eFields} onChange={setEFields} nexusCatalog={nexusCatalog} showNexusQuickPick />
            <Button variant="contained" size="large" onClick={() => void saveEditType()}>
              Salvar alterações
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </Stack>
  )
}
