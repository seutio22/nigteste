import { useEffect, useMemo, useRef, useState } from 'react'
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
import type { FormFieldDef } from '../lib/formSchema'
import { api } from '../lib/api'
import { parseAttachmentRefString, uploadAttachment } from '../lib/uploadAttachment'

type Props = {
  fields: FormFieldDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  disabled?: boolean
  /** Erros de upload R2 (ex.: API sem R2 configurado) */
  onFileUploadError?: (msg: string) => void
  onFileUploadSuccess?: () => void
}

const filterNexusOptions = createFilterOptions<{ value: string; label: string }>({
  stringify: (o) => `${o.label} ${o.value}`,
})

const filterStringOptions = createFilterOptions<string>()

function NexusSelectControl({
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
  const n = field.nexusOptions
  const [opts, setOpts] = useState<{ value: string; label: string }[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!n?.entity || !n.valueField || !n.labelField) return
    let cancelled = false
    void (async () => {
      const params = new URLSearchParams({
        entity: n.entity,
        value: n.valueField,
        label: n.labelField,
      })
      const r = await api<{ options: { value: string; label: string }[] }>(`/nexus/options?${params.toString()}`)
      if (cancelled) return
      if (!r.ok) {
        setErr(r.error || 'Erro ao carregar')
        setOpts([])
        return
      }
      setErr(null)
      setOpts(r.data?.options ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [n?.entity, n?.valueField, n?.labelField])

  const selectedNexus = useMemo(() => {
    if (opts === null || err) return null
    const found = opts.find((o) => o.value === value)
    if (found) return found
    if (value) return { value, label: `${value} (valor guardado)` }
    return null
  }, [opts, value, err])

  if (opts === null) {
    return (
      <TextField
        fullWidth
        disabled
        label={field.label + (field.required ? ' *' : '')}
        value="Carregando dados do Nexus…"
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
        helperText="Peça ao administrador para configurar NEXUS_API_* e sincronizar na aba Banco de dados Nexus."
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
          helperText="Digite para procurar; os dados vêm do Nexus sincronizado."
        />
      )}
    />
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
                  onChange(f.key, JSON.stringify(result.ref))
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
              onChange={(e) => onChange(f.key, e.target.value)}
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
              onChange={(e) => onChange(f.key, e.target.value)}
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
              onChange={(e) => onChange(f.key, e.target.value)}
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
                  onChange={(_, checked) => onChange(f.key, checked ? 'true' : 'false')}
                  disabled={disabled}
                />
              }
              label={f.label + (f.required ? ' *' : '')}
            />
          )
        }
        if (f.type === 'select' && f.nexusOptions) {
          return (
            <NexusSelectControl
              key={f.key}
              field={f}
              value={v}
              onChange={onChange}
              disabled={disabled}
            />
          )
        }
        if (f.type === 'select' && f.options?.length) {
          const selectedManual = v && f.options.includes(v) ? v : null
          return (
            <Autocomplete
              key={f.key}
              disabled={disabled}
              options={f.options}
              filterOptions={filterStringOptions}
              value={selectedManual}
              onChange={(_, newVal) => onChange(f.key, newVal ?? '')}
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
            onChange={(e) => onChange(f.key, e.target.value)}
            required={f.required}
            disabled={disabled}
            placeholder={f.placeholder}
          />
        )
      })}
    </Box>
  )
}
