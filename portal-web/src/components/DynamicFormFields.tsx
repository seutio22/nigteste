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

type Props = {
  fields: FormFieldDef[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  disabled?: boolean
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
