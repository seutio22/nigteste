import React from 'react'
import { Switch, TextField } from '@mui/material'

type Props = {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
  label?: string
}

export function CoparticipacaoSimNaoField({
  value,
  disabled,
  onChange,
  label = 'Coparticipação',
}: Props) {
  const temCopay = value === 'Sim'

  return (
    <TextField
      label={label}
      fullWidth
      size="small"
      disabled={disabled}
      value={value === 'Sim' || value === 'Não' ? value : ''}
      placeholder="Selecione"
      onClick={() => {
        if (disabled || value) return
        onChange('Não')
      }}
      InputProps={{
        readOnly: true,
        endAdornment: (
          <Switch
            edge="end"
            size="small"
            checked={temCopay}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked ? 'Sim' : 'Não')}
            inputProps={{ 'aria-label': label }}
          />
        ),
      }}
      sx={{
        '& .MuiInputBase-root': { pr: 0.5 },
        '& .MuiInputBase-input': {
          cursor: disabled ? 'default' : 'pointer',
          fontWeight: value ? 600 : 500,
          color: value === 'Sim' ? 'success.main' : 'text.primary',
        },
      }}
    />
  )
}
