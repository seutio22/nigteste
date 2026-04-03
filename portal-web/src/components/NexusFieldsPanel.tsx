import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'
import type { NexusFieldRow } from '../lib/nexusCatalog'
import { parseEnumOptions } from '../lib/nexusCatalog'
import NexusSyncCard from './NexusSyncCard'

const VALUE_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'SELECT',
  'BOOLEAN',
] as const

type NexusFieldsPanelProps = {
  /** Chamado após criar/editar campo (para atualizar o catálogo no construtor de formulários). */
  onChanged?: () => void
}

export default function NexusFieldsPanel({ onChanged }: NexusFieldsPanelProps) {
  const [fields, setFields] = useState<NexusFieldRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [description, setDescription] = useState('')
  const [valueType, setValueType] = useState<string>('TEXT')
  const [enumLines, setEnumLines] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [active, setActive] = useState(true)
  const [busy, setBusy] = useState(false)

  async function load() {
    const r = await api<{ fields: NexusFieldRow[] }>('/admin/nexus-fields')
    if (r.ok && r.data?.fields) setFields(r.data.fields)
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  function openNew() {
    setErr(null)
    setEditId(null)
    setKey('')
    setLabel('')
    setDescription('')
    setValueType('TEXT')
    setEnumLines('')
    setSortOrder(fields.length)
    setActive(true)
    setOpen(true)
  }

  function openEdit(row: NexusFieldRow) {
    setErr(null)
    setEditId(row.id)
    setKey(row.key)
    setLabel(row.label)
    setDescription(row.description ?? '')
    setValueType(row.valueType)
    setEnumLines(parseEnumOptions(row.enumOptions).join('\n'))
    setSortOrder(row.sortOrder)
    setActive(row.active)
    setOpen(true)
  }

  async function save() {
    setErr(null)
    setBusy(true)
    const enumOptions =
      valueType === 'SELECT'
        ? enumLines
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined
    const body: Record<string, unknown> = {
      key: key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: label.trim(),
      description: description.trim() || null,
      valueType,
      sortOrder,
      active,
    }
    if (valueType === 'SELECT' && enumOptions) body.enumOptions = enumOptions

    const r = editId
      ? await api(`/admin/nexus-fields/${editId}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await api('/admin/nexus-fields', { method: 'POST', body: JSON.stringify(body) })
    setBusy(false)
    if (!r.ok) {
      setErr(r.error || 'Erro ao salvar')
      return
    }
    setOpen(false)
    void load()
    onChanged?.()
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <NexusSyncCard onSynced={() => void load()} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Abaixo: <strong>campos de referência</strong> (rótulos e chaves para integração). As <strong>listas</strong> que
        vêm das tabelas da página Dados do Nexus são atualizadas pela sincronização acima e escolhidas no formulário em
        &quot;Origem da lista&quot; → Nexus.
      </Typography>
      {err && !open && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={openNew}>
          Novo campo Nexus
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Chave</TableCell>
            <TableCell>Rótulo</TableCell>
            <TableCell>Tipo (Nexus)</TableCell>
            <TableCell>Ativo</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5}>Carregando…</TableCell>
            </TableRow>
          ) : fields.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                <Typography color="text.secondary">Nenhum campo. Crie os que espelham o Nexus.</Typography>
              </TableCell>
            </TableRow>
          ) : (
            fields.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {row.key}
                  </Typography>
                </TableCell>
                <TableCell>{row.label}</TableCell>
                <TableCell>{row.valueType}</TableCell>
                <TableCell>{row.active ? 'Sim' : 'Não'}</TableCell>
                <TableCell>
                  <Button size="small" onClick={() => openEdit(row)}>
                    Editar
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Editar campo Nexus' : 'Novo campo Nexus'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {err && (
            <Alert severity="error" onClose={() => setErr(null)}>
              {err}
            </Alert>
          )}
          <TextField
            label="Chave técnica (única)"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            fullWidth
            disabled={!!editId}
            helperText="ex.: titulo_demanda, id_cliente — minúsculas e _"
          />
          <TextField label="Rótulo" value={label} onChange={(e) => setLabel(e.target.value)} fullWidth />
          <TextField
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <FormControl fullWidth>
            <InputLabel>Tipo de dado (Nexus)</InputLabel>
            <Select label="Tipo de dado (Nexus)" value={valueType} onChange={(e) => setValueType(e.target.value)}>
              {VALUE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {valueType === 'SELECT' && (
            <TextField
              label="Opções (uma por linha)"
              value={enumLines}
              onChange={(e) => setEnumLines(e.target.value)}
              multiline
              minRows={4}
              fullWidth
            />
          )}
          <TextField
            label="Ordem"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            fullWidth
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch checked={active} onChange={(_, v) => setActive(v)} />
            <Typography variant="body2">Ativo</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void save()} disabled={busy || !key.trim() || !label.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
