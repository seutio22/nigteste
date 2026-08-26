import { InputAdornment, TextField, Typography, type TextFieldProps } from '@mui/material'
import {
  hoursToDurationDisplay,
  parseDurationInputToHours,
  PROJECT_DURATION_FORMAT,
} from '../utils/projectDuration'

type ProjectDurationFieldProps = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
  /** Normaliza para HH:MM:SS ao sair do campo quando o valor for válido. */
  normalizeOnBlur?: boolean
  /** Exibe sufixo (HH:MM:SS) no rótulo e marca d'água no campo. */
  showFormatHint?: boolean
}

function labelWithFormat(label: TextFieldProps['label'], showFormatHint: boolean) {
  if (!showFormatHint || label == null || label === '') return label
  const text = String(label)
  if (text.includes(PROJECT_DURATION_FORMAT)) return label
  return `${text} (${PROJECT_DURATION_FORMAT})`
}

export function ProjectDurationField({
  value,
  onChange,
  normalizeOnBlur = true,
  helperText,
  placeholder = '02:00:00',
  showFormatHint = true,
  label,
  InputProps,
  ...rest
}: ProjectDurationFieldProps) {
  return (
    <TextField
      {...rest}
      label={labelWithFormat(label, showFormatHint)}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => {
        rest.onBlur?.(e)
        if (!normalizeOnBlur) return
        const hours = parseDurationInputToHours(value)
        if (hours != null) onChange(hoursToDurationDisplay(hours))
      }}
      placeholder={placeholder}
      helperText={helperText}
      inputProps={{
        ...rest.inputProps,
        style: {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          letterSpacing: '0.02em',
          ...(rest.inputProps?.style as object | undefined),
        },
      }}
      InputProps={{
        ...InputProps,
        endAdornment: showFormatHint ? (
          <InputAdornment position="end">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                fontSize: '0.68rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                userSelect: 'none',
              }}
            >
              {PROJECT_DURATION_FORMAT}
            </Typography>
          </InputAdornment>
        ) : (
          InputProps?.endAdornment
        ),
      }}
    />
  )
}
