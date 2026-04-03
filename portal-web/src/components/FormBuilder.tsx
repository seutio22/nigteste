import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import type { FormFieldDef, FormFieldType } from '../lib/formSchema'
import { slugifyFieldKey } from '../lib/formSchema'
import type { NexusFieldRow } from '../lib/nexusCatalog'
import { parseEnumOptions } from '../lib/nexusCatalog'

const TIPOS: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Lista (opções)' },
  { value: 'checkbox', label: 'Sim/Não (caixa)' },
]

function nexusValueTypeToFormType(vt: string): FormFieldType {
  switch (vt) {
    case 'TEXTAREA':
      return 'textarea'
    case 'NUMBER':
      return 'number'
    case 'DATE':
      return 'date'
    case 'SELECT':
      return 'select'
    case 'BOOLEAN':
      return 'checkbox'
    default:
      return 'text'
  }
}

function emptyField(): FormFieldDef {
  return {
    key: `campo_${Date.now()}`,
    label: 'Novo campo',
    type: 'text',
    required: false,
  }
}

type Props = {
  fields: FormFieldDef[]
  onChange: (fields: FormFieldDef[]) => void
  nexusCatalog: NexusFieldRow[]
}

export default function FormBuilder({ fields, onChange, nexusCatalog }: Props) {
  const activeNexus = nexusCatalog.filter((x) => x.active)

  function updateAt(i: number, patch: Partial<FormFieldDef>) {
    const next = fields.map((f, j) => (j === i ? { ...f, ...patch } : f))
    onChange(next)
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= fields.length) return
    const next = [...fields]
    const t = next[i]
    next[i] = next[j]!
    next[j] = t!
    onChange(next)
  }

  function remove(i: number) {
    onChange(fields.filter((_, j) => j !== i))
  }

  function applyNexusMapping(i: number, nexusKey: string) {
    const row = activeNexus.find((x) => x.key === nexusKey)
    if (!row) {
      updateAt(i, { nexusFieldKey: null })
      return
    }
    const formType = nexusValueTypeToFormType(row.valueType)
    const opts =
      formType === 'select' ? parseEnumOptions(row.enumOptions) : undefined
    updateAt(i, {
      nexusFieldKey: row.key,
      type: formType,
      options: opts && opts.length ? opts : formType === 'select' ? [] : undefined,
    })
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Monte os campos que o colaborador preencherá. Opcionalmente ligue cada um a um campo do catálogo Nexus
        (integração com o banco / demandas).
      </Typography>
      {fields.map((f, i) => (
        <Paper key={`${f.key}-${i}`} variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
              Campo {i + 1}
            </Typography>
            <IconButton size="small" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Descer"
              disabled={i === fields.length - 1}
              onClick={() => move(i, 1)}
            >
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" aria-label="Remover" onClick={() => remove(i)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Stack>
          <Stack spacing={2}>
            <TextField
              label="Rótulo (o que o usuário vê)"
              value={f.label}
              onChange={(e) => updateAt(i, { label: e.target.value })}
              fullWidth
              size="small"
            />
            <Stack direction="row" spacing={1} alignItems="flex-start">
              <TextField
                label="Chave interna (salva nas respostas)"
                value={f.key}
                onChange={(e) =>
                  updateAt(i, {
                    key: e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase(),
                  })
                }
                fullWidth
                size="small"
                helperText="apenas minúsculas, números e _"
              />
              <IconButton
                sx={{ mt: 0.5 }}
                aria-label="Gerar chave a partir do rótulo"
                onClick={() => updateAt(i, { key: slugifyFieldKey(f.label) })}
              >
                <AutoFixHighIcon />
              </IconButton>
            </Stack>
            <FormControl fullWidth size="small">
              <InputLabel>Tipo de campo</InputLabel>
              <Select
                label="Tipo de campo"
                value={f.type}
                onChange={(e) => {
                  const t = e.target.value as FormFieldType
                  updateAt(i, {
                    type: t,
                    options: t === 'select' ? f.options ?? [] : undefined,
                  })
                }}
              >
                {TIPOS.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Mapeamento Nexus (opcional)</InputLabel>
              <Select
                label="Mapeamento Nexus (opcional)"
                value={f.nexusFieldKey ?? ''}
                onChange={(e) => applyNexusMapping(i, e.target.value as string)}
              >
                <MenuItem value="">
                  <em>— Nenhum —</em>
                </MenuItem>
                {activeNexus.map((n) => (
                  <MenuItem key={n.id} value={n.key}>
                    {n.label} ({n.key})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {f.type === 'select' && (
              <TextField
                label="Opções (uma por linha)"
                value={(f.options ?? []).join('\n')}
                onChange={(e) =>
                  updateAt(i, {
                    options: e.target.value
                      .split('\n')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                multiline
                minRows={3}
                fullWidth
                size="small"
              />
            )}
            {(f.type === 'text' || f.type === 'textarea') && (
              <TextField
                label="Placeholder (opcional)"
                value={f.placeholder ?? ''}
                onChange={(e) => updateAt(i, { placeholder: e.target.value || undefined })}
                fullWidth
                size="small"
              />
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={!!f.required}
                  onChange={(_, c) => updateAt(i, { required: c })}
                />
              }
              label="Obrigatório"
            />
          </Stack>
        </Paper>
      ))}
      <Button variant="outlined" onClick={() => onChange([...fields, emptyField()])} sx={{ alignSelf: 'flex-start' }}>
        Adicionar campo
      </Button>
      {fields.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          Nenhum campo ainda. Use &quot;Adicionar campo&quot; ou escolha um mapeamento Nexus após criar o catálogo na
          aba &quot;Banco de dados Nexus&quot;.
        </Typography>
      )}
    </Stack>
  )
}
