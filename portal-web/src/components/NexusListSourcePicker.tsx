import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'

type EntityFieldsResponse = {
  entityKey: string
  rowCount: number
  syncedAt: string | null
  lastError: string | null
  columns: string[]
}

type OptionsResponse = { options: { value: string; label: string }[]; syncedAt?: string | null }

type Props = {
  entity: string
  valueField: string
  labelField: string
  onPatch: (patch: { entity?: string; valueField?: string; labelField?: string }) => void
}

function pickDefaults(columns: string[]): { value: string; label: string } {
  const v =
    columns.find((c) => c === 'id') ||
    columns.find((c) => /_?id$/i.test(c)) ||
    columns[0] ||
    'id'
  const labelCandidates = ['nome', 'name', 'titulo', 'title', 'descricao', 'email', 'label']
  const l =
    labelCandidates.map((x) => columns.find((c) => c.toLowerCase() === x)).find(Boolean) ||
    columns.find((c) => c !== v) ||
    columns[0] ||
    'nome'
  return { value: v, label: l }
}

export default function NexusListSourcePicker({ entity, valueField, labelField, onPatch }: Props) {
  const onPatchRef = useRef(onPatch)
  onPatchRef.current = onPatch

  const [loading, setLoading] = useState(true)
  const [meta, setMeta] = useState<EntityFieldsResponse | null>(null)
  const [fetchErr, setFetchErr] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preview, setPreview] = useState<OptionsResponse | null>(null)
  const [previewErr, setPreviewErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setFetchErr(null)
    setMeta(null)
    setPreview(null)
    setPreviewErr(null)

    void (async () => {
      const r = await api<EntityFieldsResponse & { error?: string; needsSync?: boolean }>(
        `/admin/nexus-sync/entity-fields?entity=${encodeURIComponent(entity)}`
      )
      if (cancelled) return
      setLoading(false)
      if (!r.ok || !r.data) {
        setFetchErr(r.error || 'Não foi possível carregar o snapshot.')
        return
      }
      const d = r.data as EntityFieldsResponse
      setMeta(d)
      if (d.columns.length > 0) {
        const { value, label } = pickDefaults(d.columns)
        const needValue = !d.columns.includes(valueField)
        const needLabel = !d.columns.includes(labelField)
        if (needValue || needLabel) {
          onPatchRef.current({
            valueField: needValue ? value : valueField,
            labelField: needLabel ? label : labelField,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // Apenas `entity` — evita novo fetch ao aplicar sugestões de colunas.
  }, [entity])

  async function loadPreview() {
    setPreviewErr(null)
    setPreview(null)
    setPreviewLoading(true)
    const params = new URLSearchParams({
      entity,
      value: valueField || 'id',
      label: labelField || 'nome',
    })
    const r = await api<OptionsResponse>(`/nexus/options?${params.toString()}`)
    setPreviewLoading(false)
    if (!r.ok) {
      setPreviewErr(r.error || 'Erro ao carregar opções')
      return
    }
    setPreview(r.data ?? { options: [] })
  }

  if (loading) {
    return (
      <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 1 }}>
        <CircularProgress size={22} />
        <Typography variant="body2" color="text.secondary">
          A carregar dados sincronizados do Nexus…
        </Typography>
      </Stack>
    )
  }

  if (fetchErr || !meta) {
    return (
      <Alert severity="warning">
        {fetchErr || 'Sem dados.'} Sincronize na aba <strong>Banco de dados</strong> e confirme NEXUS_API_* no
        servidor.
      </Alert>
    )
  }

  if (meta.lastError) {
    return (
      <Alert severity="error" sx={{ mb: 1 }}>
        Último erro de sincronização desta entidade: {meta.lastError}
      </Alert>
    )
  }

  if (meta.rowCount === 0 || meta.columns.length === 0) {
    return (
      <Alert severity="info">
        Snapshot sem linhas ou sem colunas detetadas. Execute a sincronização na aba Banco de dados para a entidade{' '}
        <strong>{entity}</strong>.
      </Alert>
    )
  }

  const syncedLabel = meta.syncedAt
    ? new Date(meta.syncedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

  return (
    <Stack spacing={2}>
      <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
        <Chip color="success" size="small" label={`${meta.rowCount} registo(s) no portal`} />
        <Typography variant="caption" color="text.secondary">
          Sincronizado: {syncedLabel}
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Escolha qual coluna guarda o <strong>valor</strong> (gravado na solicitação) e qual mostra o <strong>texto</strong>{' '}
        no dropdown. As opções vêm do snapshot já sincronizado.
      </Typography>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <FormControl fullWidth size="small">
          <InputLabel>Coluna do valor (gravada)</InputLabel>
          <Select
            label="Coluna do valor (gravada)"
            value={meta.columns.includes(valueField) ? valueField : meta.columns[0]!}
            onChange={(e) => onPatch({ valueField: e.target.value as string })}
          >
            {meta.columns.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <InputLabel>Coluna do rótulo (ecrã)</InputLabel>
          <Select
            label="Coluna do rótulo (ecrã)"
            value={meta.columns.includes(labelField) ? labelField : meta.columns[0]!}
            onChange={(e) => onPatch({ labelField: e.target.value as string })}
          >
            {meta.columns.map((c) => (
              <MenuItem key={`l-${c}`} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <Box>
        <Button variant="outlined" size="small" onClick={() => void loadPreview()} disabled={previewLoading}>
          {previewLoading ? 'A carregar…' : 'Pré-visualizar primeiras opções'}
        </Button>
        {previewErr && (
          <Typography variant="caption" color="error" display="block" sx={{ mt: 1 }}>
            {previewErr}
          </Typography>
        )}
        {preview && preview.options.length > 0 && (
          <List dense sx={{ mt: 1, maxHeight: 220, overflow: 'auto', bgcolor: 'action.hover', borderRadius: 1 }}>
            {preview.options.slice(0, 15).map((o, i) => (
              <ListItem key={`${o.value}-${i}`} disablePadding sx={{ px: 1 }}>
                <ListItemText primary={o.label} secondary={`valor: ${o.value}`} />
              </ListItem>
            ))}
            {preview.options.length > 15 && (
              <Typography variant="caption" sx={{ px: 2, py: 1, display: 'block' }}>
                … e mais {preview.options.length - 15}
              </Typography>
            )}
          </List>
        )}
        {preview && preview.options.length === 0 && !previewErr && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Lista vazia com estes campos — experimente outras colunas valor/rótulo.
          </Typography>
        )}
      </Box>
    </Stack>
  )
}
