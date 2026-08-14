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
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined'
import type { ComparativoEstudoConfig } from './placementAguardandoOperadora'
import type { ColunaVisibilidadeItem } from './placementComparativoVisibilidade'

type Props = {
  colunas: ColunaVisibilidadeItem[]
  config: ComparativoEstudoConfig
  disabled?: boolean
  onChange?: (next: ComparativoEstudoConfig) => void
}

function groupByOperadora(itens: ColunaVisibilidadeItem[]) {
  const map = new Map<string, ColunaVisibilidadeItem[]>()
  for (const c of itens) {
    const key = c.operadora.trim() || '—'
    const list = map.get(key) ?? []
    list.push(c)
    map.set(key, list)
  }
  return Array.from(map.entries())
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

  function toggleFornecedor(itens: ColunaVisibilidadeItem[]) {
    if (!onChange) return
    const ids = itens.map((c) => c.id)
    const allHidden = ids.every((id) => ocultas.has(id))
    const next = new Set(config.colunasOcultas ?? [])
    if (allHidden) ids.forEach((id) => next.delete(id))
    else ids.forEach((id) => next.add(id))
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
            {visiveisCount} de {colunas.length} exibida(s) · fornecedor oculta a coluna inteira
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
            <Stack spacing={1}>
              {groupByOperadora(itens).map(([operadora, planos]) => {
                const allHidden = planos.every((c) => ocultas.has(c.id))
                const someHidden = planos.some((c) => ocultas.has(c.id))
                return (
                  <Box key={`${grupo}-${operadora}`}>
                    <Chip
                      label={operadora}
                      size="small"
                      clickable={!disabled && Boolean(onChange)}
                      onClick={() => !disabled && toggleFornecedor(planos)}
                      icon={allHidden ? <VisibilityOffOutlinedIcon /> : <BusinessOutlinedIcon />}
                      color={allHidden ? 'default' : 'secondary'}
                      variant={allHidden ? 'outlined' : someHidden ? 'outlined' : 'filled'}
                      sx={{ mb: 0.5, fontWeight: 800, opacity: allHidden ? 0.65 : 1, maxWidth: '100%' }}
                    />
                    <Stack direction="row" flexWrap="wrap" gap={0.5} useFlexGap sx={{ pl: 0.5 }}>
                      {planos.map((c) => {
                        const hidden = ocultas.has(c.id)
                        return (
                          <Chip
                            key={c.id}
                            label={c.planoLabel || c.label}
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
                )
              })}
            </Stack>
          </Box>
        ))}
      </Stack>
    </Paper>
  )
}
