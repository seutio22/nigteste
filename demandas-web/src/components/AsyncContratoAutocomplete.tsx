import { Autocomplete, Box, TextField, Typography } from '@mui/material'
import { useEffect, useRef, useState } from 'react'
import { api, API_CONFIG } from '../lib/api.local'

export type ContratoOption = {
  id: string
  numero?: string | null
  codigo?: string | null
  grupoEconomico?: string | null
  clienteId?: string | null
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
  clienteId?: string
  grupoEconomico?: string | null
}

export function AsyncContratoAutocomplete({
  valueId,
  onChangeId,
  label,
  placeholder,
  helperText,
  error,
  disabled,
  limit = 20,
  clienteId,
  grupoEconomico
}: Props) {
  const [options, setOptions] = useState<ContratoOption[]>([])
  const [allOptions, setAllOptions] = useState<ContratoOption[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchSupported, setSearchSupported] = useState(false)
  const debounceRef = useRef<number | undefined>(undefined)

  const selected = options.find((opt) => opt.id === valueId) || null

  useEffect(() => {
    if (!valueId) return
    if (options.find((opt) => opt.id === valueId)) return
    api.get(`${API_CONFIG.ENDPOINTS.CONTRATOS}/${valueId}`)
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

  const filterByClient = (list: ContratoOption[]) => {
    return list.filter((option) => {
      const matchCliente = clienteId ? option.clienteId === clienteId : false
      const matchGrupo = grupoEconomico ? option.grupoEconomico === grupoEconomico : false
      if (!clienteId && !grupoEconomico) return true
      return matchCliente || matchGrupo
    })
  }

  const filterLocal = (term: string, list: ContratoOption[]) => {
    const lowered = term.toLowerCase()
    return filterByClient(list).filter((option) =>
      (option.codigo && option.codigo.toLowerCase().includes(lowered)) ||
      (option.numero && option.numero.toLowerCase().includes(lowered)) ||
      (option.grupoEconomico && option.grupoEconomico.toLowerCase().includes(lowered))
    ).slice(0, limit)
  }

  const fetchAll = async () => {
    if (allOptions.length > 0) return allOptions
    const result = await api.get(`${API_CONFIG.ENDPOINTS.CONTRATOS}`)
    if (Array.isArray(result)) {
      setAllOptions(result as ContratoOption[])
      return result as ContratoOption[]
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
        const params = new URLSearchParams({
          search: term,
          limit: String(limit)
        })
        if (clienteId) params.set('clienteId', clienteId)
        if (grupoEconomico) params.set('grupoEconomico', grupoEconomico)
        const result = await api.get(`${API_CONFIG.ENDPOINTS.CONTRATOS}?${params.toString()}`)
        if (Array.isArray(result)) {
          setOptions(result as ContratoOption[])
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
  }, [inputValue, limit, disabled, clienteId, grupoEconomico, searchSupported])

  useEffect(() => {
    if (disabled) return
    if (!clienteId && !grupoEconomico) {
      setOptions([])
      return
    }
    fetchAll()
      .then((list) => {
        const filtered = filterByClient(list)
        setOptions(filtered.slice(0, limit))
      })
      .catch(() => {})
  }, [clienteId, grupoEconomico, disabled, limit])

  const labelForOption = (opt: ContratoOption) => opt.codigo || opt.numero || ''

  return (
    <Autocomplete
      options={options}
      getOptionLabel={labelForOption}
      isOptionEqualToValue={(option, value) => option.id === value?.id}
      value={selected}
      inputValue={inputValue}
      onInputChange={(_, value) => setInputValue(value)}
      onChange={(_, newValue) => onChangeId(newValue?.id || '')}
      loading={loading}
      filterOptions={(opts) => opts}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          fullWidth
          placeholder={placeholder || (disabled ? 'Selecione um cliente primeiro' : 'Digite para buscar...')}
          error={error}
          helperText={helperText}
          disabled={disabled}
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Box>
            <Typography variant="body1" fontWeight="medium">
              {labelForOption(option)}
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
    />
  )
}
