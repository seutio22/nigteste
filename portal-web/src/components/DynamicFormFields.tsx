import { useEffect, useState } from 'react'
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material'
import type { FormFieldDef } from '../lib/formSchema'
import { api } from '../lib/api'

type Props = {
  fields: FormFieldDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  disabled?: boolean
}

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
    <FormControl fullWidth required={field.required} disabled={disabled}>
      <InputLabel id={`dyn-${field.key}`}>{field.label}</InputLabel>
      <Select
        labelId={`dyn-${field.key}`}
        label={field.label}
        value={value}
        onChange={(e) => onChange(field.key, e.target.value as string)}
      >
        <MenuItem value="">
          <em>Selecione</em>
        </MenuItem>
        {opts.map((opt) => (
          <MenuItem key={`${opt.value}-${opt.label}`} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export default function DynamicFormFields({ fields, values, onChange, disabled }: Props) {
  if (fields.length === 0) return null
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" color="text.secondary">
        Campos do tipo de solicitação
      </Typography>
      {fields.map((f) => {
        const v = values[f.key] ?? ''
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
          return (
            <FormControl key={f.key} fullWidth required={f.required} disabled={disabled}>
              <InputLabel id={`dyn-${f.key}`}>{f.label}</InputLabel>
              <Select
                labelId={`dyn-${f.key}`}
                label={f.label}
                value={v}
                onChange={(e) => onChange(f.key, e.target.value as string)}
              >
                <MenuItem value="">
                  <em>Selecione</em>
                </MenuItem>
                {f.options.map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
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
