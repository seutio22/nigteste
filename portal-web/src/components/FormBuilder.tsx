import { useCallback, useEffect, useState } from 'react'
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
import SubjectIcon from '@mui/icons-material/Subject'
import TitleIcon from '@mui/icons-material/Title'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { FormFieldDef, FormFieldType } from '../lib/formSchema'
import { slugifyFieldKey } from '../lib/formSchema'
import type { NexusFieldRow } from '../lib/nexusCatalog'
import { parseEnumOptions } from '../lib/nexusCatalog'
import { NEXUS_ENTITY_LIST } from '../lib/nexusEntities'
import NexusListSourcePicker from './NexusListSourcePicker'
import ManualSelectOptionsEditor from './ManualSelectOptionsEditor'
import { api } from '../lib/api'
import type { ConditionOp, ConditionRule, RuleAction } from '../lib/formSchema'

type LookupListOption = { id: string; key: string; label: string; active: boolean }

function inferListOrigin(f: FormFieldDef): 'manual' | 'portal' | 'nexus' {
  if (f.selectListSource) return f.selectListSource
  if (f.nexusOptions) return 'nexus'
  if (f.portalListId) return 'portal'
  return 'manual'
}

const TIPOS: { value: FormFieldType; label: string }[] = [
  { value: 'text', label: 'Texto curto' },
  { value: 'textarea', label: 'Texto longo' },
  { value: 'number', label: 'Número' },
  { value: 'date', label: 'Data' },
  { value: 'select', label: 'Lista (opções)' },
  { value: 'checkbox', label: 'Sim/Não (caixa)' },
  { value: 'file', label: 'Anexo de arquivo (upload)' },
  { value: 'section', label: 'Seção (título + texto)' },
  { value: 'subtitle', label: 'Subtítulo / separador' },
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

function emptySection(): FormFieldDef {
  return {
    key: `secao_${Date.now()}`,
    label: 'Seção',
    description: 'Texto / instruções (opcional)',
    type: 'section',
  }
}

function emptySubtitle(): FormFieldDef {
  return {
    key: `subtitulo_${Date.now()}`,
    label: 'Subtítulo',
    type: 'subtitle',
  }
}

type Props = {
  fields: FormFieldDef[]
  onChange: (fields: FormFieldDef[]) => void
  nexusCatalog: NexusFieldRow[]
  /** Painel com chips para inserir campos já mapeados ao catálogo de campos (recomendado no admin). */
  showNexusQuickPick?: boolean
  rules?: ConditionRule[]
  onRulesChange?: (rules: ConditionRule[]) => void
}

export default function FormBuilder({
  fields,
  onChange,
  nexusCatalog,
  showNexusQuickPick,
  rules,
  onRulesChange,
}: Props) {
  const activeNexus = nexusCatalog.filter((x) => x.active)
  const [lookupLists, setLookupLists] = useState<LookupListOption[]>([])
  const loadLookupLists = useCallback(async () => {
    const r = await api<{ lists: LookupListOption[] }>('/admin/lookup-lists')
    if (r.ok && r.data?.lists) setLookupLists(r.data.lists.filter((x) => x.active))
  }, [])
  useEffect(() => {
    void loadLookupLists()
  }, [loadLookupLists])

  function updateAt(i: number, patch: Partial<FormFieldDef>) {
    const next = fields.map((f, j) => (j === i ? { ...f, ...patch } : f))
    onChange(next)
  }

  function patchGroup(groupKey: string, patch: Partial<FormFieldDef>) {
    const g = (groupKey ?? '').trim()
    if (!g) return
    onChange(fields.map((f) => ((f.repeatGroupKey ?? '').trim() === g ? { ...f, ...patch } : f)))
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
      portalListId: null,
      selectListSource: formType === 'select' ? 'manual' : undefined,
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
        portalListId: null,
        selectListSource: formType === 'select' ? 'manual' : undefined,
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
        na API / Cloudflare R2). Use os atalhos abaixo ou o mapeamento em cada campo para ligar ao catálogo. Em listas, pode
        usar dados sincronizados (aba Banco de dados).
      </Typography>
      {showNexusQuickPick && (
        <Paper variant="outlined" sx={{ p: 2, borderLeft: 4, borderColor: 'primary.main', bgcolor: 'grey.50' }}>
          <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
            Inserir campo a partir do catálogo
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            Cada clique adiciona um campo já ligado ao catálogo (integração e envio de dados). Se a lista estiver vazia,
            configure os campos na aba &quot;Banco de dados&quot;.
          </Typography>
          {activeNexus.length === 0 ? (
            <Typography variant="body2" color="warning.main">
              Nenhum campo ativo no catálogo. Abra a aba &quot;Banco de dados&quot; e crie ou ative campos.
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
              {f.type === 'section' ? `Seção ${i + 1}` : f.type === 'subtitle' ? `Subtítulo ${i + 1}` : `Campo ${i + 1}`}
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
              label={f.type === 'section' ? 'Título da seção' : f.type === 'subtitle' ? 'Texto do subtítulo' : 'Rótulo (o que o usuário vê)'}
              value={f.label}
              onChange={(e) => updateAt(i, { label: e.target.value })}
              fullWidth
              size="small"
            />
            {f.type === 'section' && (
              <TextField
                label="Texto da seção (opcional)"
                value={f.description ?? ''}
                onChange={(e) => updateAt(i, { description: e.target.value || undefined })}
                fullWidth
                size="small"
                multiline
                minRows={2}
              />
            )}
            {f.type !== 'section' && f.type !== 'subtitle' && (
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
            )}
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
                    patch.portalListId = f.portalListId ?? null
                    patch.selectListSource =
                      f.selectListSource ??
                      (f.nexusOptions ? 'nexus' : f.portalListId ? 'portal' : 'manual')
                    if (!f.nexusOptions && !f.portalListId) {
                      patch.options = f.options ?? []
                    } else {
                      patch.options = undefined
                    }
                  } else {
                    patch.nexusOptions = null
                    patch.portalListId = null
                    patch.selectListSource = undefined
                    patch.options = undefined
                  }
                  if (t === 'file') {
                    patch.nexusFieldKey = null
                    patch.placeholder = undefined
                  }
                  if (t === 'section' || t === 'subtitle') {
                    patch.nexusFieldKey = null
                    patch.nexusOptions = null
                    patch.portalListId = null
                    patch.selectListSource = undefined
                    patch.options = undefined
                    patch.placeholder = undefined
                    patch.required = false
                    patch.multiple = false
                    patch.allowOther = false
                    patch.otherLabel = undefined
                    patch.otherPlaceholder = undefined
                    patch.repeatable = false
                    patch.repeatMax = undefined
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
            {f.type === 'subtitle' && (
              <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                Subtítulo é apenas layout (não grava resposta).
              </Alert>
            )}
            {f.type === 'section' && (
              <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                Seção é apenas layout (não grava resposta).
              </Alert>
            )}
            {f.type === 'file' && (
              <Alert severity="info" variant="outlined" sx={{ py: 0.5 }}>
                O arquivo é enviado pelo navegador para o armazenamento configurado na API (R2). O formulário guarda só a
                referência do ficheiro.
              </Alert>
            )}
            {f.type !== 'file' && f.type !== 'section' && f.type !== 'subtitle' && (
              <FormControl fullWidth size="small">
                <InputLabel>Mapeamento no catálogo (opcional)</InputLabel>
                <Select
                  label="Mapeamento no catálogo (opcional)"
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
                    value={inferListOrigin(f)}
                    onChange={(e) => {
                      const mode = e.target.value as 'manual' | 'portal' | 'nexus'
                      if (mode === 'nexus') {
                        updateAt(i, {
                          nexusOptions: {
                            entity: 'clientes',
                            valueField: 'id',
                            labelField: 'nome',
                          },
                          portalListId: null,
                          options: undefined,
                          selectListSource: 'nexus',
                        })
                      } else if (mode === 'portal') {
                        updateAt(i, {
                          nexusOptions: null,
                          portalListId: lookupLists[0]?.id ?? null,
                          options: undefined,
                          selectListSource: 'portal',
                        })
                      } else {
                        updateAt(i, {
                          nexusOptions: null,
                          portalListId: null,
                          options: [],
                          selectListSource: 'manual',
                        })
                      }
                    }}
                  >
                    <MenuItem value="manual">Texto fixo (edição direta)</MenuItem>
                    <MenuItem value="portal">Lista do portal (tabela no admin)</MenuItem>
                    <MenuItem value="nexus">Dados sincronizados (integração)</MenuItem>
                  </Select>
                </FormControl>
                {inferListOrigin(f) === 'portal' && (
                  <>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <FormControl fullWidth size="small">
                        <InputLabel>Qual lista</InputLabel>
                        <Select
                          label="Qual lista"
                          value={f.portalListId || ''}
                          onChange={(e) =>
                            updateAt(i, { portalListId: e.target.value || null })
                          }
                        >
                          {lookupLists.map((l) => (
                            <MenuItem key={l.id} value={l.id}>
                              {l.label} ({l.key})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <Tooltip title="Recarregar listas criadas no Banco de dados">
                        <IconButton
                          size="small"
                          sx={{ mt: 1 }}
                          onClick={() => void loadLookupLists()}
                          aria-label="Atualizar listas do portal"
                        >
                          <RefreshIcon />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    {lookupLists.length === 0 && (
                      <Alert severity="warning" variant="outlined" sx={{ py: 0.5 }}>
                        Ainda não há listas. Em <strong>Banco de dados</strong> → <strong>Listas do portal</strong>, crie
                        uma (ex.: Filiais) e adicione os itens.
                      </Alert>
                    )}
                  </>
                )}
                {inferListOrigin(f) === 'nexus' && f.nexusOptions ? (
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
                              valueField: f.nexusOptions?.valueField ?? 'id',
                              labelField: f.nexusOptions?.labelField ?? 'nome',
                              filterByField: f.nexusOptions?.filterByField,
                              filterByParentKey: f.nexusOptions?.filterByParentKey,
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
                      <Alert severity="info" variant="outlined" sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                          Lista dependente (opcional)
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          Para mostrar só linhas relacionadas (ex.: contratos do cliente escolhido), indique o campo do
                          formulário que vem primeiro e a coluna no snapshot desta entidade que guarda o mesmo ID (ex.{' '}
                          <code>id_cliente</code>). Ordem dos campos no formulário: o pai deve aparecer antes do filho.
                        </Typography>
                        <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                          <InputLabel>Filtrar pelo valor de outro campo</InputLabel>
                          <Select
                            label="Filtrar pelo valor de outro campo"
                            value={f.nexusOptions.filterByParentKey ?? ''}
                            onChange={(e) => {
                              const pk = (e.target.value as string) || undefined
                              updateAt(i, {
                                nexusOptions: {
                                  ...f.nexusOptions!,
                                  filterByParentKey: pk,
                                  filterByField: pk ? f.nexusOptions!.filterByField : undefined,
                                },
                              })
                            }}
                          >
                            <MenuItem value="">
                              <em>Nenhum — lista completa (sem filtro)</em>
                            </MenuItem>
                            {fields
                              .filter((_, j) => j !== i)
                              .map((opt) => (
                                <MenuItem
                                  key={opt.key}
                                  value={opt.key}
                                  disabled={!!opt.repeatable || !!opt.repeatGroupKey}
                                >
                                  {opt.label} ({opt.key})
                                  {opt.repeatable ? ' — não pode ser repetível' : ''}
                                  {opt.repeatGroupKey ? ' — está em grupo' : ''}
                                </MenuItem>
                              ))}
                          </Select>
                        </FormControl>
                        {!!f.nexusOptions.filterByParentKey && (
                          <TextField
                            label="Coluna no snapshot para filtrar (ex. id_cliente)"
                            value={f.nexusOptions.filterByField ?? ''}
                            onChange={(e) =>
                              updateAt(i, {
                                nexusOptions: {
                                  ...f.nexusOptions!,
                                  filterByField: e.target.value.trim() || undefined,
                                },
                              })
                            }
                            fullWidth
                            size="small"
                            helperText="Tem de existir em cada linha sincronizada desta entidade; o valor é comparado ao ID escolhido no campo pai."
                          />
                        )}
                        {!!f.nexusOptions.filterByParentKey &&
                          !!fields.find((x) => x.key === f.nexusOptions!.filterByParentKey)?.repeatable && (
                            <Alert severity="warning" variant="outlined" sx={{ mt: 1 }}>
                              O campo pai selecionado está marcado como repetível. Listas dependentes não suportam campo pai
                              repetível nesta versão.
                            </Alert>
                          )}
                      </Alert>
                    </Paper>
                  </>
                ) : null}
                {inferListOrigin(f) === 'manual' && (
                  <ManualSelectOptionsEditor
                    options={f.options ?? []}
                    onChange={(next) => updateAt(i, { options: next })}
                  />
                )}
              </>
            )}
            {f.type !== 'file' && f.type !== 'section' && f.type !== 'subtitle' && (
              <Alert severity="info" variant="outlined" sx={{ py: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Replicar campo (para preencher várias vezes)
                </Typography>
                <TextField
                  label="Grupo (opcional)"
                  value={f.repeatGroupKey ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase()
                    const g = raw.trim()
                    updateAt(i, {
                      repeatGroupKey: g || undefined,
                      repeatGroupMax: g ? 25 : undefined,
                      repeatable: g ? false : f.repeatable,
                      repeatMax: g ? undefined : f.repeatMax,
                    })
                  }}
                  fullWidth
                  size="small"
                  helperText="Use para vincular várias colunas (ex.: pessoas). Campos com o mesmo grupo repetem juntos em linhas."
                  sx={{ mb: 1 }}
                />
                {!!f.repeatGroupKey && (
                  <Alert severity="warning" variant="outlined" sx={{ mb: 1 }}>
                    Este campo faz parte do grupo <strong>{f.repeatGroupKey}</strong>. No formulário, o usuário adiciona linhas
                    do grupo (Grupo 1, 2, 3…). As respostas serão salvas apenas em <code>answers.{f.repeatGroupKey}</code>.
                  </Alert>
                )}
                {!!f.repeatGroupKey && (
                  <Paper variant="outlined" sx={{ p: 1.5, mb: 1, bgcolor: 'grey.50' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Auto-criar linhas (ex.: Quantos usuários)
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Campo que define a quantidade</InputLabel>
                        <Select
                          label="Campo que define a quantidade"
                          value={f.repeatGroupSource?.countFromKey ?? ''}
                          onChange={(e) => {
                            const k = String(e.target.value || '').trim() || undefined
                            patchGroup(f.repeatGroupKey!, {
                              repeatGroupSource: {
                                ...(f.repeatGroupSource ?? {}),
                                countFromKey: k,
                                minRows: f.repeatGroupSource?.minRows ?? 1,
                              },
                            })
                          }}
                        >
                          <MenuItem value="">
                            <em>— Nenhum (usa mínimo)</em>
                          </MenuItem>
                          {fields
                            .filter(
                              (x) =>
                                x.type !== 'section' &&
                                x.type !== 'subtitle' &&
                                !(x.repeatGroupKey ?? '').trim()
                            )
                            .map((x) => (
                              <MenuItem key={x.key} value={x.key}>
                                {x.label} ({x.key})
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Mínimo de linhas"
                        type="number"
                        size="small"
                        value={String(f.repeatGroupSource?.minRows ?? 1)}
                        onChange={(e) => {
                          const n = Math.max(1, Math.min(25, Number(e.target.value) || 1))
                          patchGroup(f.repeatGroupKey!, {
                            repeatGroupSource: {
                              ...(f.repeatGroupSource ?? {}),
                              minRows: n,
                              countFromKey: f.repeatGroupSource?.countFromKey,
                            },
                          })
                        }}
                        sx={{ width: { xs: '100%', sm: 200 } }}
                      />
                    </Stack>
                  </Paper>
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!f.repeatable}
                      disabled={!!f.repeatGroupKey}
                      onChange={(_, c) =>
                        updateAt(i, {
                          repeatable: c,
                          repeatMax: c ? 25 : undefined,
                        })
                      }
                    />
                  }
                  label="Campo duplicável (máx. 25 entradas)"
                />
                {f.repeatable && fields.some((x) => x.nexusOptions?.filterByParentKey === f.key) && (
                  <Typography variant="caption" color="warning.main">
                    Atenção: este campo é usado como \"pai\" de uma lista dependente; deixe-o não repetível para o filtro
                    funcionar.
                  </Typography>
                )}
                {!!f.repeatGroupKey && fields.some((x) => x.nexusOptions?.filterByParentKey === f.key) && (
                  <Typography variant="caption" color="warning.main">
                    Atenção: este campo é usado como \"pai\" de uma lista dependente; grupos repetíveis não suportam campo pai
                    nesta versão.
                  </Typography>
                )}
              </Alert>
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
            {f.type === 'select' && (
              <Alert severity="info" variant="outlined" sx={{ py: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Lista: várias escolhas ou «Outro»
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                  Pode ativar os dois: várias opções da lista e texto livre «Outro» no mesmo campo.
                </Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!f.multiple}
                        onChange={(_, c) =>
                          updateAt(i, {
                            multiple: c,
                          })
                        }
                      />
                    }
                    label="Permitir várias escolhas"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={!!f.allowOther}
                        onChange={(_, c) =>
                          updateAt(i, {
                            allowOther: c,
                            ...(!c ? { otherLabel: undefined, otherPlaceholder: undefined } : {}),
                          })
                        }
                      />
                    }
                    label="Permitir «Outro» / cadastro manual (texto livre)"
                  />
                  {f.allowOther && (
                    <>
                      <TextField
                        label="Texto da opção «Outro»"
                        value={f.otherLabel ?? ''}
                        onChange={(e) => updateAt(i, { otherLabel: e.target.value.trim() || undefined })}
                        fullWidth
                        size="small"
                        helperText="Aparece na lista junto às opções fixas ou aos dados sincronizados."
                      />
                      <TextField
                        label="Placeholder do texto (opcional)"
                        value={f.otherPlaceholder ?? ''}
                        onChange={(e) => updateAt(i, { otherPlaceholder: e.target.value || undefined })}
                        fullWidth
                        size="small"
                      />
                    </>
                  )}
                </Stack>
              </Alert>
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
        <Button variant="outlined" startIcon={<TitleIcon />} onClick={() => onChange([...fields, emptySection()])}>
          Adicionar seção
        </Button>
        <Button variant="outlined" startIcon={<SubjectIcon />} onClick={() => onChange([...fields, emptySubtitle()])}>
          Adicionar subtítulo
        </Button>
      </Stack>
      {onRulesChange && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" fontWeight={800} gutterBottom>
            Regras do formulário (condicionais)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mostre/oculte campos e mude se são obrigatórios com base em outro campo. Use com moderação para não confundir o
            solicitante.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Dicas: checkbox usa valor <code>true</code> / <code>false</code>. Para \"está em (multi)\", informe o ID/valor
            guardado da opção. Para grupos repetíveis, você pode ocultar o grupo (chave do grupo) ou colunas individuais
            (chave do campo dentro do grupo).
          </Typography>

          {(rules ?? []).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Nenhuma regra ainda.
            </Typography>
          ) : null}

          <Stack spacing={2}>
            {(rules ?? []).map((r) => (
              <Paper key={r.id} variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 1 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Se (campo)</InputLabel>
                    <Select
                      label="Se (campo)"
                      value={r.when.whenKey}
                      onChange={(e) => {
                        const next = (rules ?? []).map((x) =>
                          x.id === r.id ? { ...x, when: { ...x.when, whenKey: String(e.target.value) } } : x
                        )
                        onRulesChange(next)
                      }}
                    >
                      {fields
                        .filter((f) => f.type !== 'section' && f.type !== 'subtitle')
                        .map((f) => (
                          <MenuItem key={f.key} value={f.key}>
                            {f.label} ({f.key})
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <FormControl sx={{ minWidth: 140 }} size="small">
                    <InputLabel>Operador</InputLabel>
                    <Select
                      label="Operador"
                      value={r.when.op}
                      onChange={(e) => {
                        const op = e.target.value as ConditionOp
                        const next = (rules ?? []).map((x) => (x.id === r.id ? { ...x, when: { ...x.when, op } } : x))
                        onRulesChange(next)
                      }}
                    >
                      <MenuItem value="eq">=</MenuItem>
                      <MenuItem value="neq">≠</MenuItem>
                      <MenuItem value="containsText">contém</MenuItem>
                      <MenuItem value="in">está em (multi)</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField
                    label="Valor"
                    value={r.when.value ?? ''}
                    onChange={(e) => {
                      const v = e.target.value
                      const next = (rules ?? []).map((x) => (x.id === r.id ? { ...x, when: { ...x.when, value: v } } : x))
                      onRulesChange(next)
                    }}
                    fullWidth
                    size="small"
                  />
                  <Button
                    color="error"
                    variant="outlined"
                    onClick={() => onRulesChange((rules ?? []).filter((x) => x.id !== r.id))}
                  >
                    Remover
                  </Button>
                </Stack>

                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Ações
                </Typography>
                <Stack spacing={1}>
                  {(r.actions ?? []).map((a, idx) => (
                    <Stack key={`${r.id}__a_${idx}`} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Alvo</InputLabel>
                        <Select
                          label="Alvo"
                          value={a.targetKey}
                          onChange={(e) => {
                            const targetKey = String(e.target.value)
                            const nextRules = (rules ?? []).map((x) => {
                              if (x.id !== r.id) return x
                              const nextActions = x.actions.map((aa, j) => (j === idx ? { ...aa, targetKey } : aa))
                              return { ...x, actions: nextActions }
                            })
                            onRulesChange(nextRules)
                          }}
                        >
                          {fields.map((f) => (
                            <MenuItem key={f.key} value={f.key}>
                              {f.label} ({f.key})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <FormControl sx={{ minWidth: 160 }} size="small">
                        <InputLabel>Visibilidade</InputLabel>
                        <Select
                          label="Visibilidade"
                          value={a.setVisible === undefined ? '' : a.setVisible ? 'show' : 'hide'}
                          onChange={(e) => {
                            const v = String(e.target.value)
                            const setVisible = v === '' ? undefined : v === 'show'
                            const nextRules = (rules ?? []).map((x) => {
                              if (x.id !== r.id) return x
                              const nextActions = x.actions.map((aa, j) => (j === idx ? { ...aa, setVisible } : aa))
                              return { ...x, actions: nextActions }
                            })
                            onRulesChange(nextRules)
                          }}
                        >
                          <MenuItem value="">
                            <em>—</em>
                          </MenuItem>
                          <MenuItem value="show">Mostrar</MenuItem>
                          <MenuItem value="hide">Ocultar</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl sx={{ minWidth: 160 }} size="small">
                        <InputLabel>Obrigatório</InputLabel>
                        <Select
                          label="Obrigatório"
                          value={a.setRequired === undefined ? '' : a.setRequired ? 'req' : 'opt'}
                          onChange={(e) => {
                            const v = String(e.target.value)
                            const setRequired = v === '' ? undefined : v === 'req'
                            const nextRules = (rules ?? []).map((x) => {
                              if (x.id !== r.id) return x
                              const nextActions = x.actions.map((aa, j) => (j === idx ? { ...aa, setRequired } : aa))
                              return { ...x, actions: nextActions }
                            })
                            onRulesChange(nextRules)
                          }}
                        >
                          <MenuItem value="">
                            <em>—</em>
                          </MenuItem>
                          <MenuItem value="req">Tornar obrigatório</MenuItem>
                          <MenuItem value="opt">Tornar opcional</MenuItem>
                        </Select>
                      </FormControl>
                      <Button
                        color="error"
                        variant="text"
                        onClick={() => {
                          const nextRules = (rules ?? []).map((x) => {
                            if (x.id !== r.id) return x
                            const nextActions = x.actions.filter((_, j) => j !== idx)
                            return { ...x, actions: nextActions.length ? nextActions : ([] as RuleAction[]) }
                          })
                          onRulesChange(nextRules)
                        }}
                      >
                        Remover ação
                      </Button>
                    </Stack>
                  ))}
                </Stack>
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                  onClick={() => {
                    const nextRules = (rules ?? []).map((x) => {
                      if (x.id !== r.id) return x
                      return {
                        ...x,
                        actions: [
                          ...x.actions,
                          { targetKey: fields[0]?.key ?? 'campo', setVisible: true } as RuleAction,
                        ],
                      }
                    })
                    onRulesChange(nextRules)
                  }}
                >
                  Adicionar ação
                </Button>
              </Paper>
            ))}
          </Stack>

          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => {
              const id = `rule_${Date.now()}`
              const whenKey = fields.find((f) => f.type !== 'section' && f.type !== 'subtitle')?.key ?? 'campo'
              const targetKey = fields[0]?.key ?? 'campo'
              const next: ConditionRule[] = [
                ...(rules ?? []),
                {
                  id,
                  when: { whenKey, op: 'eq', value: 'true' },
                  actions: [{ targetKey, setVisible: true } as RuleAction],
                },
              ]
              onRulesChange(next)
            }}
          >
            Nova regra
          </Button>
        </Paper>
      )}
      {fields.length === 0 && (
        <Typography color="text.secondary" variant="body2">
          Nenhum campo ainda. Use &quot;Adicionar campo&quot; ou &quot;Adicionar anexo de arquivo&quot;, ou escolha um
          mapeamento após criar o catálogo na aba &quot;Banco de dados&quot;.
        </Typography>
      )}
    </Stack>
  )
}
