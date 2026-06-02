import React, { useMemo } from 'react'
import {
  Autocomplete,
  Box,
  Chip,
  TextField,
  Typography,
} from '@mui/material'
import type { Operadora } from '../../../types/masterData'

type Props = {
  operadoras: Operadora[]
  selectedIds: string[]
  disabled?: boolean
  onChange: (ids: string[]) => void
}

export function OperadorasSugestaoField({
  operadoras,
  selectedIds,
  disabled,
  onChange,
}: Props) {
  const ordenadas = useMemo(
    () => [...operadoras].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [operadoras]
  )

  const selected = useMemo(
    () => ordenadas.filter((o) => selectedIds.includes(o.id)),
    [ordenadas, selectedIds]
  )

  return (
    <Box>
      <Autocomplete
        multiple
        disableCloseOnSelect
        options={ordenadas}
        value={selected}
        disabled={disabled}
        getOptionLabel={(o) => o.nome}
        isOptionEqualToValue={(opt, val) => opt.id === val.id}
        onChange={(_, opts) => onChange(opts.map((o) => o.id))}
        filterSelectedOptions
        noOptionsText="Nenhuma operadora cadastrada. Cadastre em Dados → Operadoras."
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option.id}
              label={option.nome}
              size="small"
            />
          ))
        }
        renderInput={(params) => (
          <TextField
            {...params}
            label="Sugestão de Fornecedores a serem consultadas"
            placeholder={selected.length ? 'Adicionar outra operadora…' : 'Selecione uma ou mais operadoras'}
          />
        )}
      />
      {selected.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Selecionadas ({selected.length})
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {selected.map((o) => (
              <Chip key={o.id} label={o.nome} size="small" color="primary" variant="outlined" />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  )
}
