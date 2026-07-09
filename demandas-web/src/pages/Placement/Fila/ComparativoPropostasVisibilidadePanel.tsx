import React, { useMemo } from 'react'
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  Typography,
} from '@mui/material'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import type { ComparativoEstudoConfig } from './placementAguardandoOperadora'
import {
  COMPARATIVO_LINHA_CHAVES,
  COMPARATIVO_LINHA_LABELS,
  type ColunaVisibilidadeItem,
  type ComparativoLinhaChave,
} from './placementComparativoVisibilidade'

type Props = {
  colunas: ColunaVisibilidadeItem[]
  config: ComparativoEstudoConfig
  disabled?: boolean
  onChange: (next: ComparativoEstudoConfig) => void
}

export function ComparativoPropostasVisibilidadePanel({
  colunas,
  config,
  disabled,
  onChange,
}: Props) {
  const ocultas = useMemo(() => new Set(config.colunasOcultas ?? []), [config.colunasOcultas])
  const linhasOcultas = useMemo(() => new Set(config.linhasOcultas ?? []), [config.linhasOcultas])

  const porGrupo = useMemo(() => {
    const map = new Map<string, ColunaVisibilidadeItem[]>()
    for (const c of colunas) {
      const list = map.get(c.grupo) ?? []
      list.push(c)
      map.set(c.grupo, list)
    }
    return Array.from(map.entries())
  }, [colunas])

  const visiveisCount = colunas.filter((c) => !ocultas.has(c.id)).length

  function toggleColuna(id: string) {
    const next = new Set(config.colunasOcultas ?? [])
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onChange({ ...config, colunasOcultas: Array.from(next) })
  }

  function toggleLinha(chave: ComparativoLinhaChave) {
    const next = new Set(config.linhasOcultas ?? [])
    if (next.has(chave)) next.delete(chave)
    else next.add(chave)
    onChange({ ...config, linhasOcultas: Array.from(next) as ComparativoLinhaChave[] })
  }

  function mostrarTodasColunas() {
    onChange({ ...config, colunasOcultas: [] })
  }

  function ocultarMercado() {
    const ids = colunas.filter((c) => c.grupo !== 'Contrato atual').map((c) => c.id)
    onChange({ ...config, colunasOcultas: ids })
  }

  return (
    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Itens visíveis no comparativo
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {visiveisCount} de {colunas.length} coluna(s) exibida(s)
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="outlined" disabled={disabled} onClick={mostrarTodasColunas}>
            Mostrar todas
          </Button>
          <Button size="small" variant="outlined" disabled={disabled} onClick={ocultarMercado}>
            Só contrato atual
          </Button>
        </Stack>
      </Stack>

      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
        Colunas (operadora / plano)
      </Typography>
      <Stack spacing={1.5} sx={{ mt: 1, mb: 2 }}>
        {porGrupo.map(([grupo, itens]) => (
          <Box key={grupo}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.75, color: 'primary.main' }}>
              {grupo}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} useFlexGap>
              {itens.map((c) => {
                const hidden = ocultas.has(c.id)
                return (
                  <Chip
                    key={c.id}
                    label={c.label}
                    size="small"
                    clickable={!disabled}
                    onClick={() => !disabled && toggleColuna(c.id)}
                    icon={hidden ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                    color={hidden ? 'default' : 'primary'}
                    variant={hidden ? 'outlined' : 'filled'}
                    sx={{ opacity: hidden ? 0.65 : 1 }}
                  />
                )
              })}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
        Linhas do quadro
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 1 }}>
        {COMPARATIVO_LINHA_CHAVES.map((chave) => (
          <FormControlLabel
            key={chave}
            control={
              <Switch
                size="small"
                checked={!linhasOcultas.has(chave)}
                disabled={disabled}
                onChange={() => toggleLinha(chave)}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: linhasOcultas.has(chave) ? 400 : 600 }}>
                {COMPARATIVO_LINHA_LABELS[chave]}
              </Typography>
            }
          />
        ))}
      </Stack>
    </Paper>
  )
}
