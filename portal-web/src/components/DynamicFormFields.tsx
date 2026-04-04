import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import { createFilterOptions } from '@mui/material/Autocomplete'
import type { FormFieldDef, NexusOptionsSource } from '../lib/formSchema'
import {
  PORTAL_SELECT_OTHER_VALUE,
  parseMultiIds,
  parseSelectWithOther,
  primaryIdForDependentFilter,
  serializeMultiIds,
  serializeSelectWithOther,
} from '../lib/formSchema'
import { api } from '../lib/api'
import { parseAttachmentRefString, uploadAttachment } from '../lib/uploadAttachment'

type Props = {
  fields: FormFieldDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  disabled?: boolean
  onFileUploadError?: (msg: string) => void
  onFileUploadSuccess?: () => void
}

const filterNexusOptions = createFilterOptions<{ value: string; label: string }>({
  stringify: (o) => `${o.label} ${o.value}`,
})

const filterStringOptions = createFilterOptions<string>()

function collectDescendantKeys(fields: FormFieldDef[], rootKey: string): string[] {
  const out: string[] = []
  const queue = [rootKey]
  const seen = new Set<string>()
  while (queue.length) {
    const k = queue.shift()!
    for (const f of fields) {
      if (f.nexusOptions?.filterByParentKey !== k) continue
      if (seen.has(f.key)) continue
      seen.add(f.key)
      out.push(f.key)
      queue.push(f.key)
    }
  }
  return out
}

const NEXUS_FETCH_MS = 30_000

type Opt = { value: string; label: string }

function useNexusOptions(
  n: NexusOptionsSource | null | undefined,
  allFields: FormFieldDef[],
  values: Record<string, string>
) {
  const parentKey = n?.filterByParentKey
  const filterCol = n?.filterByField?.trim()
  const parentFieldDef = parentKey ? allFields.find((x) => x.key === parentKey) : undefined
  const parentVal = parentKey ? primaryIdForDependentFilter(values[parentKey] ?? '', parentFieldDef) : ''
  const parentLabel = parentKey ? allFields.find((x) => x.key === parentKey)?.label ?? parentKey : ''

  const [opts, setOpts] = useState<Opt[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [misconfigured, setMisconfigured] = useState(false)

  useEffect(() => {
    setMisconfigured(false)
    setBlocked(false)
    if (!n?.entity || !n.valueField || !n.labelField) return

    if (parentKey && !filterCol) {
      setMisconfigured(true)
      setOpts([])
      setErr(null)
      return
    }
    if (parentKey && filterCol && !parentVal) {
      setBlocked(true)
      setOpts([])
      setErr(null)
      return
    }

    let cancelled = false
    const ac = new AbortController()
    const timer = window.setTimeout(() => ac.abort(), NEXUS_FETCH_MS)
    setOpts(null)
    setErr(null)

    void (async () => {
      try {
        const params = new URLSearchParams({
          entity: n.entity,
          value: n.valueField,
          label: n.labelField,
        })
        if (parentKey && filterCol && parentVal) {
          params.set('filterField', filterCol)
          params.set('filterValue', parentVal)
        }
        const r = await api<{ options: Opt[] }>(`/nexus/options?${params.toString()}`, { signal: ac.signal })
        if (cancelled) return
        if (!r.ok) {
          setErr(r.error || 'Erro ao carregar dados do Nexus')
          setOpts([])
          return
        }
        setErr(null)
        setOpts(r.data?.options ?? [])
      } catch (e) {
        if (cancelled) return
        if (e instanceof DOMException && e.name === 'AbortError') {
          setErr('Tempo esgotado ao carregar o Nexus. Verifique a rede ou tente de novo.')
          setOpts([])
          return
        }
        setErr(e instanceof Error ? e.message : 'Erro de rede')
        setOpts([])
      } finally {
        window.clearTimeout(timer)
      }
    })()

    return () => {
      cancelled = true
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [n?.entity, n?.valueField, n?.labelField, n?.filterByField, parentKey, filterCol, parentVal])

  return { opts, err, blocked, misconfigured, parentLabel }
}

function NexusSelectControl({
  field,
  value,
  values,
  allFields,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  values: Record<string, string>
  allFields: FormFieldDef[]
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const n = field.nexusOptions
  const { opts, err, blocked, misconfigured, parentLabel } = useNexusOptions(n, allFields, values)

  const selectedNexus = useMemo(() => {
    if (opts === null || err) return null
    const found = opts.find((o) => o.value === value)
    if (found) return found
    if (value) return { value, label: `${value} (valor guardado)` }
    return null
  }, [opts, value, err])

  if (misconfigured) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value="Configuração incompleta"
        error
        helperText={`Defina a coluna de filtro no tipo de solicitação (admin), ou remova o campo pai em «Lista dependente». Campo pai: ${n?.filterByParentKey || '—'}.`}
      />
    )
  }

  if (blocked) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder={`Selecione «${parentLabel}» antes`}
        helperText={`Este campo depende de «${parentLabel}». Escolha o valor acima para carregar a lista filtrada do Nexus.`}
      />
    )
  }

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder="A carregar…"
        InputProps={{
          endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} />,
        }}
        helperText="A carregar dados sincronizados do Nexus (até 30 s)…"
      />
    )
  }

  if (err) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label}
        value={err}
        error
        helperText="Confirme NEXUS_API_*, sincronização na aba Banco de dados Nexus e rede. Recarregue a página se o erro persistir."
      />
    )
  }

  return (
    <Autocomplete
      disabled={disabled}
      options={opts}
      loading={false}
      filterOptions={filterNexusOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      value={selectedNexus}
      onChange={(_, newVal) => onChange(field.key, newVal?.value ?? '')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label + (field.required ? ' *' : '')}
          required={field.required}
          placeholder="Escreva para filtrar ou escolha na lista"
          helperText={
            opts.length === 0
              ? 'Nenhum registo no Nexus para este filtro. Ajuste a seleção ou peça sincronização dos dados.'
              : 'Digite para procurar; os dados vêm do Nexus sincronizado.'
          }
        />
      )}
    />
  )
}

function NexusMultiSelectControl({
  field,
  value,
  values,
  allFields,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  values: Record<string, string>
  allFields: FormFieldDef[]
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const n = field.nexusOptions
  const { opts, err, blocked, misconfigured, parentLabel } = useNexusOptions(n, allFields, values)

  const ids = useMemo(() => parseMultiIds(value), [value])

  const selectedOpts = useMemo(() => {
    if (!opts || err) return []
    return ids.map((id) => opts.find((o) => o.value === id) ?? { value: id, label: `${id} (guardado)` })
  }, [opts, ids, err])

  if (misconfigured) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value="Configuração incompleta"
        error
        helperText={`Defina a coluna de filtro no tipo de solicitação (admin). Campo pai: ${n?.filterByParentKey || '—'}.`}
      />
    )
  }

  if (blocked) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder={`Selecione «${parentLabel}» antes`}
        helperText={`Este campo depende de «${parentLabel}». Escolha o valor acima para carregar a lista filtrada do Nexus.`}
      />
    )
  }

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder="A carregar…"
        InputProps={{
          endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} />,
        }}
        helperText="A carregar dados do Nexus (várias escolhas)…"
      />
    )
  }

  if (err) {
    return (
      <TextField fullWidth disabled label={field.label} value={err} error helperText={err} />
    )
  }

  return (
    <Autocomplete
      multiple
      disabled={disabled}
      options={opts}
      filterOptions={filterNexusOptions}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(a, b) => a.value === b.value}
      value={selectedOpts}
      onChange={(_, newVal) => onChange(field.key, serializeMultiIds(newVal.map((o) => o.value)))}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label + (field.required ? ' *' : '')}
          required={field.required}
          placeholder="Escolha um ou mais itens"
          helperText="Várias escolhas; dados do Nexus sincronizado."
        />
      )}
    />
  )
}

function NexusSelectWithOtherControl({
  field,
  value,
  values,
  allFields,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  values: Record<string, string>
  allFields: FormFieldDef[]
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const n = field.nexusOptions
  const { opts, err, blocked, misconfigured, parentLabel } = useNexusOptions(n, allFields, values)

  const otherLabel = field.otherLabel?.trim() || 'Outro (cadastro manual)'
  const otherOption: Opt = { value: PORTAL_SELECT_OTHER_VALUE, label: otherLabel }

  const parsed = useMemo(() => parseSelectWithOther(value), [value])

  const allOpts = useMemo(() => {
    if (!opts || err) return []
    return [...opts, otherOption]
  }, [opts, err, otherLabel])

  const selected = useMemo(() => {
    if (!opts || err) return null
    if (parsed.id) {
      const hit = opts.find((o) => o.value === parsed.id)
      if (hit) return hit
      return { value: parsed.id, label: `${parsed.id} (valor guardado)` }
    }
    if (parsed.other !== null) return otherOption
    return null
  }, [opts, err, parsed, otherOption])

  const showOtherText = parsed.id === null && parsed.other !== null
  const otherText = showOtherText ? parsed.other ?? '' : ''

  if (misconfigured) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value="Configuração incompleta"
        error
        helperText={`Campo pai: ${n?.filterByParentKey || '—'}.`}
      />
    )
  }

  if (blocked) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        placeholder={`Selecione «${parentLabel}» antes`}
        helperText={`Depende de «${parentLabel}».`}
      />
    )
  }

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value=""
        InputProps={{ endAdornment: <CircularProgress color="inherit" size={22} sx={{ mr: 0.5 }} /> }}
        helperText="A carregar dados do Nexus…"
      />
    )
  }

  if (err) {
    return <TextField fullWidth disabled label={field.label} value={err} error />
  }

  return (
    <Box>
      <Autocomplete
        disabled={disabled}
        options={allOpts}
        filterOptions={filterNexusOptions}
        getOptionLabel={(o) => o.label}
        isOptionEqualToValue={(a, b) => a.value === b.value}
        value={selected}
        onChange={(_, newVal) => {
          if (!newVal) {
            onChange(field.key, '')
            return
          }
          if (newVal.value === PORTAL_SELECT_OTHER_VALUE) {
            onChange(field.key, serializeSelectWithOther({ id: null, other: '' }))
            return
          }
          onChange(field.key, serializeSelectWithOther({ id: newVal.value, other: null }))
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label + (field.required ? ' *' : '')}
            required={field.required}
            placeholder="Lista ou outro"
            helperText="Pode escolher um registo do Nexus ou «Outro» para informar um valor novo."
          />
        )}
      />
      {showOtherText && (
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          label="Descrever (cadastro manual)"
          value={otherText}
          disabled={disabled}
          required={field.required}
          placeholder={field.otherPlaceholder || 'Nome ou identificação do novo registo'}
          onChange={(e) =>
            onChange(field.key, serializeSelectWithOther({ id: null, other: e.target.value }))
          }
          helperText="Este texto é guardado na solicitação; o cadastro no Nexus pode ser feito depois pela equipa."
        />
      )}
    </Box>
  )
}

function ManualMultiSelectControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const opts = field.options ?? []
  const ids = useMemo(() => parseMultiIds(value), [value])
  const selected = useMemo(() => ids.filter((id) => opts.includes(id)), [ids, opts])

  return (
    <Autocomplete
      multiple
      disabled={disabled}
      options={opts}
      filterOptions={filterStringOptions}
      value={selected}
      onChange={(_, newVal) => onChange(field.key, serializeMultiIds(newVal))}
      renderInput={(params) => (
        <TextField
          {...params}
          label={field.label + (field.required ? ' *' : '')}
          required={field.required}
          helperText="Várias escolhas a partir da lista fixa definida no tipo."
        />
      )}
    />
  )
}

function ManualSelectWithOtherControl({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FormFieldDef
  value: string
  onChange: (key: string, value: string) => void
  disabled?: boolean
}) {
  const opts = field.options ?? []
  const otherLabel = field.otherLabel?.trim() || 'Outro (especificar)'
  const otherOption = otherLabel
  const allOpts = [...opts, otherOption]

  const parsed = useMemo(() => parseSelectWithOther(value), [value])

  const selected = useMemo(() => {
    if (parsed.id && opts.includes(parsed.id)) return parsed.id
    if (parsed.other !== null) return otherOption
    return null
  }, [parsed, opts, otherOption])

  const showOtherText = parsed.id === null && parsed.other !== null
  const otherText = showOtherText ? parsed.other ?? '' : ''

  return (
    <Box>
      <Autocomplete
        disabled={disabled}
        options={allOpts}
        filterOptions={filterStringOptions}
        value={selected}
        onChange={(_, newVal) => {
          if (newVal == null) {
            onChange(field.key, '')
            return
          }
          if (newVal === otherOption) {
            onChange(field.key, serializeSelectWithOther({ id: null, other: '' }))
            return
          }
          onChange(field.key, serializeSelectWithOther({ id: newVal, other: null }))
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={field.label + (field.required ? ' *' : '')}
            required={field.required}
            helperText="Lista fixa ou «Outro» para texto livre."
          />
        )}
      />
      {showOtherText && (
        <TextField
          fullWidth
          sx={{ mt: 1.5 }}
          label="Especificar"
          value={otherText}
          disabled={disabled}
          placeholder={field.otherPlaceholder || ''}
          onChange={(e) =>
            onChange(field.key, serializeSelectWithOther({ id: null, other: e.target.value }))
          }
        />
      )}
    </Box>
  )
}

export default function DynamicFormFields({
  fields,
  values,
  onChange,
  disabled,
  onFileUploadError,
  onFileUploadSuccess,
}: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleFieldChange = useCallback(
    (key: string, value: string) => {
      onChange(key, value)
      for (const d of collectDescendantKeys(fields, key)) {
        onChange(d, '')
      }
    },
    [fields, onChange]
  )

  if (fields.length === 0) return null
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Campos do tipo de solicitação
      </Typography>
      {fields.map((f) => {
        const v = values[f.key] ?? ''
        if (f.type === 'file') {
          const attachment = parseAttachmentRefString(v)
          const busy = uploadingKey === f.key
          return (
            <Box key={f.key}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>
                {f.label}
                {f.required ? ' *' : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                O arquivo é enviado para o Cloudflare R2 (não fica na base de dados).
              </Typography>
              <input
                type="file"
                hidden
                ref={(el) => {
                  fileInputRefs.current[f.key] = el
                }}
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setUploadingKey(f.key)
                  const result = await uploadAttachment(file)
                  setUploadingKey(null)
                  if (!result.ok) {
                    onFileUploadError?.(result.error)
                    return
                  }
                  handleFieldChange(f.key, JSON.stringify(result.ref))
                  onFileUploadSuccess?.()
                }}
              />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={busy ? <CircularProgress size={16} /> : <AttachFileIcon />}
                  disabled={disabled || busy}
                  onClick={() => fileInputRefs.current[f.key]?.click()}
                >
                  {attachment ? 'Substituir arquivo' : 'Escolher arquivo'}
                </Button>
                {attachment && (
                  <Typography variant="body2" color="text.secondary">
                    {attachment.fileName}
                  </Typography>
                )}
              </Box>
            </Box>
          )
        }
        if (f.type === 'textarea') {
          return (
            <TextField
              key={f.key}
              fullWidth
              multiline
              minRows={3}
              label={f.label + (f.required ? ' *' : '')}
              value={v}
              onChange={(e) => handleFieldChange(f.key, e.target.value)}
              required={f.required}
              disabled={disabled}
              placeholder={f.placeholder}
            />
          )
        }
        if (f.type === 'number') {
          return (
            <TextField
              key={f.key}
              fullWidth
              type="number"
              label={f.label + (f.required ? ' *' : '')}
              value={v}
              onChange={(e) => handleFieldChange(f.key, e.target.value)}
              required={f.required}
              disabled={disabled}
            />
          )
        }
        if (f.type === 'date') {
          return (
            <TextField
              key={f.key}
              fullWidth
              type="date"
              label={f.label + (f.required ? ' *' : '')}
              value={v}
              onChange={(e) => handleFieldChange(f.key, e.target.value)}
              required={f.required}
              disabled={disabled}
              InputLabelProps={{ shrink: true }}
            />
          )
        }
        if (f.type === 'checkbox') {
          return (
            <FormControlLabel
              key={f.key}
              control={
                <Checkbox
                  checked={v === 'true'}
                  onChange={(_, checked) => handleFieldChange(f.key, checked ? 'true' : 'false')}
                  disabled={disabled}
                />
              }
              label={f.label + (f.required ? ' *' : '')}
            />
          )
        }
        if (f.type === 'select' && f.nexusOptions) {
          if (f.multiple) {
            return (
              <NexusMultiSelectControl
                key={f.key}
                field={f}
                value={v}
                values={values}
                allFields={fields}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            )
          }
          if (f.allowOther) {
            return (
              <NexusSelectWithOtherControl
                key={f.key}
                field={f}
                value={v}
                values={values}
                allFields={fields}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            )
          }
          return (
            <NexusSelectControl
              key={f.key}
              field={f}
              value={v}
              values={values}
              allFields={fields}
              onChange={handleFieldChange}
              disabled={disabled}
            />
          )
        }
        if (f.type === 'select' && f.options?.length) {
          if (f.multiple) {
            return (
              <ManualMultiSelectControl
                key={f.key}
                field={f}
                value={v}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            )
          }
          if (f.allowOther) {
            return (
              <ManualSelectWithOtherControl
                key={f.key}
                field={f}
                value={v}
                onChange={handleFieldChange}
                disabled={disabled}
              />
            )
          }
          const selectedManual = v && f.options.includes(v) ? v : null
          return (
            <Autocomplete
              key={f.key}
              disabled={disabled}
              options={f.options}
              filterOptions={filterStringOptions}
              value={selectedManual}
              onChange={(_, newVal) => handleFieldChange(f.key, newVal ?? '')}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={f.label + (f.required ? ' *' : '')}
                  required={f.required}
                  placeholder="Escreva para filtrar ou escolha na lista"
                  helperText="Digite para procurar nas opções definidas no tipo de demanda."
                />
              )}
            />
          )
        }
        if (f.type === 'select') {
          return (
            <TextField
              key={f.key}
              fullWidth
              disabled
              label={f.label}
              value="Configure opções (manual) ou origem Nexus no formulário."
            />
          )
        }
        return (
          <TextField
            key={f.key}
            fullWidth
            label={f.label + (f.required ? ' *' : '')}
            value={v}
            onChange={(e) => handleFieldChange(f.key, e.target.value)}
            required={f.required}
            disabled={disabled}
            placeholder={f.placeholder}
          />
        )
      })}
    </Box>
  )
}
