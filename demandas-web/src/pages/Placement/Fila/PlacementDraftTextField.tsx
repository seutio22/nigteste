import React from 'react'
import { TextField, type TextFieldProps } from '@mui/material'
import { usePlacementFieldDraft } from './usePlacementFieldDraft'

type Props = Omit<TextFieldProps, 'value' | 'onChange' | 'onBlur'> & {
  value: string
  onCommit: (value: string) => void
  commitDelayMs?: number
}

/** TextField com draft local — não propaga cada tecla ao form pai. */
export function PlacementDraftTextField({
  value,
  onCommit,
  commitDelayMs,
  ...textFieldProps
}: Props) {
  const draft = usePlacementFieldDraft(value, onCommit, { commitDelayMs })

  return (
    <TextField
      {...textFieldProps}
      value={draft.value}
      onChange={(e) => draft.onChange(e.target.value)}
      onFocus={(e) => {
        draft.onFocus()
        textFieldProps.onFocus?.(e)
      }}
      onBlur={(e) => {
        draft.onBlur()
        textFieldProps.onBlur?.(e)
      }}
    />
  )
}
