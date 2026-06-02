import { Autocomplete, Box, TextField, Typography } from '@mui/material'

export type ContratoLocalOption = {
  id: string
  numero?: string | null
  codigo?: string | null
  grupoEconomico?: string | null
}

type Props = {
  valueId?: string
  onChangeId: (id: string) => void
  contratos: ContratoLocalOption[]
  label?: string
  error?: boolean
  helperText?: string
  disabled?: boolean
}

function labelFor(opt: ContratoLocalOption) {
  return opt.codigo || opt.numero || ''
}

/** Seleção de um contrato a partir da lista local (masterData) — exige clique na opção. */
export function ContratoLocalAutocomplete({
  valueId,
  onChangeId,
  contratos,
  label = 'Contrato',
  error,
  helperText,
  disabled,
}: Props) {
  const selected =
    contratos.find((c) => c.id === valueId) ||
    (valueId ? null : null)

  return (
    <Autocomplete
      options={contratos}
      disabled={disabled}
      getOptionLabel={labelFor}
      isOptionEqualToValue={(a, b) => a.id === b?.id}
      value={selected}
      onChange={(_, opt) => onChangeId(opt?.id || '')}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          error={error}
          helperText={
            helperText ||
            (disabled
              ? 'Selecione um cliente primeiro'
              : contratos.length
                ? `${contratos.length} contrato(s) disponível(is)`
                : 'Nenhum contrato para este cliente')
          }
          placeholder={disabled ? undefined : 'Digite para buscar...'}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {labelFor(option)}
            </Typography>
            {option.grupoEconomico && (
              <Typography variant="caption" color="text.secondary">
                Grupo: {option.grupoEconomico}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      noOptionsText={disabled ? 'Selecione um cliente primeiro' : 'Nenhum contrato encontrado'}
      filterOptions={(options, { inputValue }) => {
        const term = inputValue.toLowerCase()
        return options.filter(
          (o) =>
            labelFor(o).toLowerCase().includes(term) ||
            (o.grupoEconomico && o.grupoEconomico.toLowerCase().includes(term))
        )
      }}
    />
  )
}
