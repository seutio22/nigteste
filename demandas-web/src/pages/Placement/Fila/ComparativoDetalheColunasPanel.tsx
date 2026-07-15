import React, { useMemo } from 'react'
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import type { ComparativoEstudoConfig } from './placementAguardandoOperadora'
import type { ColunaVisibilidadeItem } from './placementComparativoVisibilidade'

type Props = {
  colunas: ColunaVisibilidadeItem[]
  config: ComparativoEstudoConfig
  disabled?: boolean
  onChange?: (next: ComparativoEstudoConfig) => void
}

export function ComparativoDetalheColunasPanel({ colunas, config, disabled, onChange }: Props) {
  const ocultas = useMemo(() => new Set(config.colunasOcultas ?? []), [config.colunasOcultas])
  const visiveisCount = colunas.filter((c) => !ocultas.has(c.id)).length

  const porGrupo = useMemo(() => {
    const map = new Map<string, ColunaVisibilidadeItem[]>()
    for (const c of colunas) {
      const list = map.get(c.grupo) ?? []
      list.push(c)
      map.set(c.grupo, list)
    }
    return Array.from(map.entries())
  }, [colunas])

  function toggleColuna(id: string) {
    if (!onChange) return
    const next = new Set(config.colunasOcultas ?? [])
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ ...config, colunasOcultas: Array.from(next) })
  }

  return (
    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
            Colunas visíveis
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {visiveisCount} de {colunas.length} exibida(s)
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Button
            size="small"
            variant="outlined"
            disabled={disabled || !onChange}
            onClick={() => onChange?.({ ...config, colunasOcultas: [] })}
          >
            Todas
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={disabled || !onChange}
            onClick={() =>
              onChange?.({
                ...config,
                colunasOcultas: colunas.filter((c) => c.grupo !== 'Contrato atual').map((c) => c.id),
              })
            }
          >
            Só atual
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={1.25}>
        {porGrupo.map(([grupo, itens]) => (
          <Box key={grupo}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.main', display: 'block', mb: 0.5 }}>
              {grupo}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap>
              {itens.map((c) => {
                const hidden = ocultas.has(c.id)
                return (
                  <Chip
                    key={c.id}
                    label={c.label}
                    size="small"
                    clickable={!disabled && Boolean(onChange)}
                    onClick={() => !disabled && toggleColuna(c.id)}
                    icon={hidden ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    color={hidden ? 'default' : 'primary'}
                    variant={hidden ? 'outlined' : 'filled'}
                    sx={{ opacity: hidden ? 0.65 : 1, maxWidth: '100%' }}
                  />
                )
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}
