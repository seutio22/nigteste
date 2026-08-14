import React from 'react'
import { TextField, type TextFieldProps } from '@mui/material'
import { usePlacementFieldDraft } from './usePlacementFieldDraft'

type Props = Omit<TextFieldProps, 'value' | 'onChange'> & {
  value: string
  onCommit: (value: string) => void
  commitDelayMs?: number
  /** Normaliza o valor a cada tecla (ex.: só dígitos) sem subir ao form pai. */
  transform?: (raw: string) => string
  /** Após flush no blur (ex.: formatar moeda). */
  formatOnBlur?: (value: string) => string
}

/** TextField com draft local — não propaga cada tecla ao form pai. */
export function PlacementDraftTextField({
  value,
  onCommit,
  commitDelayMs,
  transform,
  formatOnBlur,
  onFocus,
  onBlur,
  ...textFieldProps
}: Props) {
  const draft = usePlacementFieldDraft(value, onCommit, { commitDelayMs })

  return (
    <TextField
      {...textFieldProps}
      value={draft.value}
      onChange={(e) => {
        const next = transform ? transform(e.target.value) : e.target.value
        draft.onChange(next)
      }}
      onFocus={(e) => {
        draft.onFocus()
        onFocus?.(e)
      }}
      onBlur={(e) => {
        if (formatOnBlur) {
          const formatted = formatOnBlur(draft.value)
          if (formatted !== draft.value) draft.onChange(formatted)
        }
        draft.onBlur()
        onBlur?.(e)
      }}
    />
  )
}
