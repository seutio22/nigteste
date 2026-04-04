import {
  Alert,
  Box,
  Button,
  Chip,
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
  Tooltip,
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
import { NEXUS_ENTITY_LIST } from '../lib/nexusEntities'
import NexusListSourcePicker from './NexusListSourcePicker'

const TIPOS: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Lista (opções)' },
  { value: 'checkbox', label: 'Sim/Não (caixa)' },
  { value: 'file', label: 'Anexo de arquivo (upload)' },
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

function emptyAttachmentField(): FormFieldDef {
  return {
    key: `anexo_${Date.now()}`,
    label: 'Anexo',
    type: 'file',
    required: false,
  }
}

type Props = {
  fields: FormFieldDef[]
  onChange: (fields: FormFieldDef[]) => void
  nexusCatalog: NexusFieldRow[]
  /** Painel com chips para inserir campos já mapeados ao catálogo Nexus (recomendado no admin). */
  showNexusQuickPick?: boolean
}

export default function FormBuilder({ fields, onChange, nexusCatalog, showNexusQuickPick }: Props) {
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
      nexusOptions: null,
      options: opts && opts.length ? opts : formType === 'select' ? [] : undefined,
    })
  }

  function uniqueKey(base: string): string {
    let k = base.replace(/[^a-z0-9_]/gi, '_').toLowerCase() || `campo_${Date.now()}`
    const keys = new Set(fields.map((f) => f.key))
    if (!keys.has(k)) return k
    let n = 2
    while (keys.has(`${k}_${n}`)) n += 1
    return `${k}_${n}`
  }

  function appendFieldFromNexus(row: NexusFieldRow) {
    const formType = nexusValueTypeToFormType(row.valueType)
    const opts = formType === 'select' ? parseEnumOptions(row.enumOptions) : undefined
    const key = uniqueKey(row.key)
    onChange([
      ...fields,
      {
        key,
        label: row.label,
        type: formType,
        required: false,
        nexusFieldKey: row.key,
        nexusOptions: null,
        options: opts && opts.length ? opts : formType === 'select' ? [] : undefined,
      },
    ])
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle1" fontWeight={700}>
        Campos dinâmicos do formulário
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Adicione campos à medida. Use <strong>Anexo de arquivo</strong> para o solicitante enviar PDF ou imagens (armazenamento
        na API / Cloudflare R2). Para integrar com o Nexus, use os atalhos abaixo ou o mapeamento em cada campo. Em selects,
        pode usar dados sincronizados (aba Banco de dados Nexus).
      </Typography>
      {showNexusQuickPick && (
        <Paper variant="outlined" sx={{ p: 2, borderLeft: 4, borderColor: 'primary.main', bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
            Inserir campo a partir do catálogo Nexus
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Cada clique adiciona um novo campo já ligado ao identificador Nexus (envio para o banco / demandas). Configure
            o catálogo na aba &quot;Banco de dados Nexus&quot; se a lista estiver vazia.
          </Typography>
          {activeNexus.length === 0 ? (
            <Typography variant="body2" color="warning.main">
              Nenhum campo Nexus ativo. Abra a aba &quot;Banco de dados Nexus&quot; e crie ou ative campos.
            </Typography>
          ) : (
            <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap>
              {activeNexus.map((n) => (
                <Tooltip key={n.id} title={n.description || `${n.key} · ${n.valueType}`} arrow>
                  <Chip
                    label={`${n.label}`}
                    onClick={() => appendFieldFromNexus(n)}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                </Tooltip>
              ))}
            </Stack>
          )}
        </Paper>
      )}
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
                  const patch: Partial<FormFieldDef> = { type: t }
                  if (t === 'select') {
                    patch.nexusOptions = f.nexusOptions ?? null
                    patch.options = !f.nexusOptions ? f.options ?? [] : undefined
                  } else {
                    patch.nexusOptions = null
                    patch.options = undefined
                  }
                  if (t === 'file') {
                    patch.nexusFieldKey = null
                    patch.placeholder = undefined
                  }
                  updateAt(i, patch)
                }}
              >
                {TIPOS.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    {t.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {f.type === 'file' && (
              <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                O arquivo é enviado pelo navegador para o armazenamento configurado na API (R2). O formulário guarda só a
                referência do ficheiro.
              </Alert>
            )}
            {f.type !== 'file' && (
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
            )}
            {f.type === 'select' && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Origem da lista</InputLabel>
                  <Select
                    label="Origem da lista"
                    value={f.nexusOptions ? 'nexus' : 'manual'}
                    onChange={(e) => {
                      const mode = e.target.value as string
                      if (mode === 'nexus') {
                        updateAt(i, {
                          nexusOptions: {
                            entity: 'clientes',
                            valueField: 'id',
                            labelField: 'nome',
                          },
                          options: undefined,
                        })
                      } else {
                        updateAt(i, { nexusOptions: null, options: [] })
                      }
                    }}
                  >
                    <MenuItem value="manual">Texto fixo (uma opção por linha)</MenuItem>
                    <MenuItem value="nexus">Tabela do Nexus (após sincronizar na aba Banco de dados Nexus)</MenuItem>
                  </Select>
                </FormControl>
                {f.nexusOptions ? (
                  <>
                    <FormControl fullWidth size="small">
                      <InputLabel>Tabela / entidade Nexus</InputLabel>
                      <Select
                        label="Tabela / entidade Nexus"
                        value={f.nexusOptions.entity}
                        onChange={(e) =>
                          updateAt(i, {
                            nexusOptions: {
                              entity: e.target.value as string,
                              valueField: 'id',
                              labelField: 'nome',
                            },
                          })
                        }
                      >
                        {NEXUS_ENTITY_LIST.map((ent) => (
                          <MenuItem key={ent.key} value={ent.key}>
                            {ent.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        Colunas dos dados já sincronizados
                      </Typography>
                      <NexusListSourcePicker
                        key={f.nexusOptions.entity}
                        entity={f.nexusOptions.entity}
                        valueField={f.nexusOptions.valueField}
                        labelField={f.nexusOptions.labelField}
                        onPatch={(patch) =>
                          updateAt(i, {
                            nexusOptions: { ...f.nexusOptions!, ...patch },
                          })
                        }
                      />
                    </Paper>
                  </>
                ) : (
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
              </>
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
      <Stack direction="row" flexWrap="wrap" gap={1} useFlexGap sx={{ alignSelf: 'flex-start' }}>
        <Button variant="outlined" onClick={() => onChange([...fields, emptyField()])}>
          Adicionar campo
        </Button>
        <Button variant="outlined" color="secondary" onClick={() => onChange([...fields, emptyAttachmentField()])}>
          Adicionar anexo de arquivo
        </Button>
      </Stack>
      {fields.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          Nenhum campo ainda. Use &quot;Adicionar campo&quot; ou &quot;Adicionar anexo de arquivo&quot;, ou escolha um
          mapeamento Nexus após criar o catálogo na aba &quot;Banco de dados Nexus&quot;.
        </Typography>
      )}
    </Stack>
  )
}
