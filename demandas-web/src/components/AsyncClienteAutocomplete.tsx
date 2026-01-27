import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { api, API_CONFIG } from '../lib/api.local'

export type ClienteOption = {
  id: string
  nome: string
  grupoEconomico?: string | null
}

type Props = {
  valueId?: string
  onChangeId: (id: string) => void
  label: string
  placeholder?: string
  helperText?: string
  error?: boolean
  disabled?: boolean
  limit?: number
  onSelectOption?: (option: ClienteOption | null) => void
}

export function AsyncClienteAutocomplete({
  valueId,
  onChangeId,
  label,
  placeholder,
  helperText,
  error,
  disabled,
  limit = 20,
  onSelectOption
}: Props) {
  const [options, setOptions] = useState<ClienteOption[]>([])
  const [allOptions, setAllOptions] = useState<ClienteOption[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchSupported, setSearchSupported] = useState(false)
  const debounceRef = useRef<number | undefined>(undefined)

  const selected = options.find((opt) => opt.id === valueId) || null

  useEffect(() => {
    if (!valueId) return
    if (options.find((opt) => opt.id === valueId)) return
    api.get(`${API_CONFIG.ENDPOINTS.CLIENTES}/${valueId}`)
      .then((data) => {
        if (data?.id) {
          setOptions((prev) => {
            if (prev.some((opt) => opt.id === data.id)) return prev
            return [data, ...prev]
          })
        }
      })
      .catch(() => {})
  }, [valueId, options])

  const filterLocal = (term: string, list: ClienteOption[]) => {
    const lowered = term.toLowerCase()
    return list.filter((option) =>
      option.nome.toLowerCase().includes(lowered) ||
      (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(lowered))
    ).slice(0, limit)
  }

  const fetchAll = async () => {
    if (allOptions.length > 0) return allOptions
    const result = await api.get(`${API_CONFIG.ENDPOINTS.CLIENTES}`)
    if (Array.isArray(result)) {
      setAllOptions(result as ClienteOption[])
      return result as ClienteOption[]
    }
    return []
  }

  useEffect(() => {
    if (disabled) return
    const term = inputValue.trim()
    if (term.length < 2) {
      if (!searchSupported) {
        setOptions([])
      }
      return
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(async () => {
      try {
        setLoading(true)
        if (!searchSupported) {
          const list = await fetchAll()
          setOptions(filterLocal(term, list))
          return
        }
        const result = await api.get(
          `${API_CONFIG.ENDPOINTS.CLIENTES}?search=${encodeURIComponent(term)}&limit=${limit}`
        )
        if (Array.isArray(result)) {
          setOptions(result as ClienteOption[])
        }
      } catch {
        setSearchSupported(false)
        try {
          const list = await fetchAll()
          setOptions(filterLocal(term, list))
        } catch {
          // Ignorar: mantém opções atuais
        }
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [inputValue, limit, disabled, searchSupported])

  return (
    <Autocomplete
      options={options}
      getOptionLabel={(option) => option?.nome || ''}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      value={selected}
      inputValue={inputValue}
      onInputChange={(_, value) => setInputValue(value)}
      onChange={(_, newValue) => {
        const nextId = newValue?.id || ''
        onChangeId(nextId)
        onSelectOption?.(newValue || null)
      }}
      loading={loading}
      filterOptions={(opts) => opts}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          placeholder={placeholder || 'Digite para buscar...'}
          error={error}
          helperText={helperText}
          disabled={disabled}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {option.nome}
            </Typography>
            {option.grupoEconomico && (
              <Typography variant="caption" color="text.secondary">
                Grupo: {option.grupoEconomico}
              </Typography>
            )}
          </Box>
        </Box>
      )}
      noOptionsText={disabled ? 'Selecione um cliente primeiro' : 'Nenhum cliente encontrado'}
    />
  )
}
