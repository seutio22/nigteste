import React from 'react'
import { Autocomplete, Chip, TextField } from '@mui/material'
import {
  applyPlanosToCelula,
  celulaPlanosSelecionados,
  type DiferencialCelulaCotacao,
  type DiferencialPlanoOpcao,
} from './placementConsolidandoDados'

type Props = {
  celula: DiferencialCelulaCotacao
  options: DiferencialPlanoOpcao[]
  disabled?: boolean
  placeholder?: string
  helperText?: string
  onChange: (next: DiferencialCelulaCotacao) => void
}

function optionKey(opt: DiferencialPlanoOpcao | string): string {
  if (typeof opt === 'string') return `lb:${opt.trim().toLowerCase()}`
  if (opt.placementPlanoId) return `id:${opt.placementPlanoId}`
  return `lb:${opt.planoLabel.trim().toLowerCase()}`
}

export function DiferencialPlanoMultiSelect({
  celula,
  options,
  disabled,
  placeholder = 'Selecione um ou mais planos',
  helperText,
  onChange,
}: Props) {
  const value = celulaPlanosSelecionados(celula, options)

  return (
    <Autocomplete<DiferencialPlanoOpcao, true, false, true>
      multiple
      freeSolo
      filterSelectedOptions
      size="small"
      options={options}
      groupBy={(opt) => (typeof opt === 'string' ? 'Outro' : opt.grupo)}
      getOptionLabel={(opt) => (typeof opt === 'string' ? opt : opt.planoLabel)}
      isOptionEqualToValue={(a, b) => optionKey(a) === optionKey(b)}
      value={value}
      onChange={(_, selected) => onChange(applyPlanosToCelula(celula, selected))}
      disabled={disabled}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((opt, index) => {
          const label = typeof opt === 'string' ? opt : opt.planoLabel
          const { key, ...tagProps } = getTagProps({ index })
          return <Chip {...tagProps} key={key ?? `${label}-${index}`} size="small" label={label} />
        })
      }
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder={value.length ? '' : placeholder}
          helperText={helperText}
          FormHelperTextProps={{ sx: { mx: 0, mt: 0.5 } }}
        />
      )}
    />
  )
}
