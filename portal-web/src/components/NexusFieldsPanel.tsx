import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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
import { slugifyFieldKey } from '../lib/formSchema'
import { parseEnumOptions, parseSelectableOptionsInput, type NexusFieldRow } from '../lib/nexusCatalog'
import NexusSyncCard from './NexusSyncCard'

const VALUE_TYPES = [
  'TEXT',
  'TEXTAREA',
  'NUMBER',
  'DATE',
  'SELECT',
  'BOOLEAN',
] as const

const VALUE_TYPE_LABELS: Record<(typeof VALUE_TYPES)[number], string> = {
  TEXT: 'Texto curto',
  TEXTAREA: 'Texto longo',
  NUMBER: 'Número',
  DATE: 'Data',
  SELECT: 'Lista (opções fixas)',
  BOOLEAN: 'Sim / Não',
}

type NexusFieldsPanelProps = {
  /** Chamado após criar/editar campo (para atualizar o catálogo no construtor de formulários). */
  onChanged?: () => void
  /** Quando true, omitido o cartão de sincronização (ex.: dentro do hub Banco de dados). */
  embedInHub?: boolean
}

export default function NexusFieldsPanel({ onChanged, embedInHub }: NexusFieldsPanelProps) {
  const [fields, setFields] = useState<NexusFieldRow[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [key, setKey] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)
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
    setKeyTouched(false)
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
    setKeyTouched(true)
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
    const normalizedKey = slugifyFieldKey(key.trim() || label.trim())
    if (!normalizedKey || !label.trim()) {
      setErr('Preencha o rótulo e confirme a chave técnica.')
      return
    }

    const enumOptionsParsed =
      valueType === 'SELECT' ? parseSelectableOptionsInput(enumLines) : undefined
    if (valueType === 'SELECT' && (!enumOptionsParsed || enumOptionsParsed.length === 0)) {
      setErr('Para lista, informe ao menos uma opção (vírgulas ou uma por linha).')
      return
    }

    setBusy(true)
    const body: Record<string, unknown> = {
      key: normalizedKey,
      label: label.trim(),
      description: description.trim() || null,
      valueType,
      sortOrder,
      active,
    }
    if (valueType === 'SELECT' && enumOptionsParsed) body.enumOptions = enumOptionsParsed
    else if (editId && valueType !== 'SELECT') body.enumOptions = null

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

  async function removeField(row: { id: string; key: string; label: string }) {
    if (
      !window.confirm(
        `Excluir o campo de referência "${row.label}" (${row.key})? Formulários que ainda mapeiam esta chave deixam de ter correspondência no catálogo até você ajustar o tipo de demanda.`
      )
    )
      return
    setErr(null)
    const r = await api(`/admin/nexus-fields/${row.id}`, { method: 'DELETE' })
    if (!r.ok) {
      setErr(r.error || 'Não foi possível excluir')
      return
    }
    void load()
    onChanged?.()
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      {!embedInHub && <NexusSyncCard onSynced={() => void load()} />}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {embedInHub ? (
          <>
            <strong>Catálogo de campos</strong>: nomes e chaves para integração e mapeamento nos formulários. Para listas
            simples criadas por você, use a aba <strong>Listas do portal</strong>.
          </>
        ) : (
          <>
            Aqui você define o <strong>catálogo de campos</strong> do portal: nomes e chaves usados nos formulários e na
            integração. Use o hub <strong>Banco de dados</strong> no admin para sincronização e listas reutilizáveis.
          </>
        )}
      </Typography>
      {err && !open && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr(null)}>
          {err}
        </Alert>
      )}
      <Box sx={{ mb: 2 }}>
        <Button variant="contained" onClick={openNew}>
          Novo campo
        </Button>
      </Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: 'action.hover' }}>
            <TableCell>Chave</TableCell>
            <TableCell>Rótulo</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Ativo</TableCell>
            <TableCell align="right">Ações</TableCell>
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
                <Typography color="text.secondary">Nenhum campo no catálogo. Use &quot;Novo campo&quot; para começar.</Typography>
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
                <TableCell>{VALUE_TYPE_LABELS[row.valueType as (typeof VALUE_TYPES)[number]] ?? row.valueType}</TableCell>
                <TableCell>{row.active ? 'Sim' : 'Não'}</TableCell>
                <TableCell align="right">
                  <Button size="small" onClick={() => openEdit(row)}>
                    Editar
                  </Button>
                  <Button size="small" color="error" sx={{ ml: 1 }} onClick={() => void removeField(row)}>
                    Excluir
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editId ? 'Editar campo' : 'Novo campo'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {err && (
            <Alert severity="error" onClose={() => setErr(null)}>
              {err}
            </Alert>
          )}
          <TextField
            label="Rótulo"
            value={label}
            onChange={(e) => {
              const v = e.target.value
              setLabel(v)
              if (!editId && !keyTouched) setKey(slugifyFieldKey(v))
            }}
            fullWidth
            autoFocus
            required
          />
          <TextField
            label="Chave técnica"
            value={key}
            onChange={(e) => {
              setKeyTouched(true)
              setKey(e.target.value)
            }}
            fullWidth
            disabled={!!editId}
            required
            helperText={
              editId
                ? 'A chave não pode ser alterada depois de criada.'
                : 'Gerada a partir do rótulo — pode editar. Só letras minúsculas, números e _'
            }
          />
          <FormControl fullWidth>
            <InputLabel>Tipo de dado</InputLabel>
            <Select
              label="Tipo de dado"
              value={valueType}
              onChange={(e) => setValueType(e.target.value)}
            >
              {VALUE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {VALUE_TYPE_LABELS[t]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {valueType === 'SELECT' && (
            <>
              <Divider flexItem sx={{ my: 0.5 }} />
              <Typography variant="subtitle2" fontWeight={700}>
                Opções da lista
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Digite as opções separadas por vírgula ou uma em cada linha.
              </Typography>
              <TextField
                label="Opções"
                value={enumLines}
                onChange={(e) => setEnumLines(e.target.value)}
                multiline
                minRows={4}
                fullWidth
                placeholder="Ex.: Baixa, Média, Alta"
                helperText={`${parseSelectableOptionsInput(enumLines).length} opção(ões)`}
              />
            </>
          )}
          <TextField
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={2}
          />
          <TextField
            label="Ordem na lista"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            fullWidth
          />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Switch checked={active} onChange={(_, v) => setActive(v)} />
            <Typography variant="body2">Campo ativo no catálogo</Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={() => void save()} disabled={busy || !label.trim()}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  )
}
