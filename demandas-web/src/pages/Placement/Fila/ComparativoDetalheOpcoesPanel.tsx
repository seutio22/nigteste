import React from 'react'
import {
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import TableChartIcon from '@mui/icons-material/TableChart'
import ViewAgendaOutlinedIcon from '@mui/icons-material/ViewAgendaOutlined'
import type { ComparativoEstudoConfig } from './placementAguardandoOperadora'
import { ComparativoDetalheColunasPanel } from './ComparativoDetalheColunasPanel'
import type { ColunaVisibilidadeItem } from './placementComparativoVisibilidade'

export type ModoVisualizacaoDetalhe = 'infografico' | 'tabela'

type Props = {
  colunas: ColunaVisibilidadeItem[]
  config: ComparativoEstudoConfig
  disabled?: boolean
  onConfigChange?: (next: ComparativoEstudoConfig) => void
  modoVisualizacao: ModoVisualizacaoDetalhe
  onModoVisualizacaoChange: (v: ModoVisualizacaoDetalhe) => void
  exibirTodasPaginas: boolean
  onExibirTodasPaginasChange: (v: boolean) => void
  /** Opções de paginação/slide (ocultar em coparticipação e reembolso). */
  showSlideOptions?: boolean
}

export function ComparativoDetalheOpcoesPanel({
  colunas,
  config,
  disabled,
  onConfigChange,
  modoVisualizacao,
  onModoVisualizacaoChange,
  exibirTodasPaginas,
  onExibirTodasPaginasChange,
  showSlideOptions = true,
}: Props) {
  return (
    <Stack spacing={1.5}>
      <ComparativoDetalheColunasPanel
        colunas={colunas}
        config={config}
        disabled={disabled}
        onChange={onConfigChange}
      />

      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.85rem', mb: 1 }}>
          Exibição
        </Typography>
        <Stack spacing={1.25}>
          <ToggleButtonGroup
            size="small"
            exclusive
            fullWidth
            value={modoVisualizacao}
            onChange={(_, v: ModoVisualizacaoDetalhe | null) => v && onModoVisualizacaoChange(v)}
          >
            <ToggleButton value="infografico">
              <ViewAgendaOutlinedIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Infográfico
            </ToggleButton>
            <ToggleButton value="tabela">
              <TableChartIcon sx={{ fontSize: 16, mr: 0.5 }} />
              Tabela
            </ToggleButton>
          </ToggleButtonGroup>

          {showSlideOptions && (
            <>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={exibirTodasPaginas}
                    onChange={(e) => onExibirTodasPaginasChange(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                    Mostrar todas as páginas na tela
                  </Typography>
                }
              />

              <FormControl size="small" fullWidth disabled={disabled || !onConfigChange}>
                <InputLabel>Colunas por slide</InputLabel>
                <Select
                  label="Colunas por slide"
                  value={config.colunasPorSlide}
                  onChange={(e) =>
                    onConfigChange?.({
                      ...config,
                      colunasPorSlide: Number(e.target.value) as ComparativoEstudoConfig['colunasPorSlide'],
                    })
                  }
                >
                  {[3, 4, 5, 6, 7].map((n) => (
                    <MenuItem key={n} value={n}>
                      {n} colunas
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={config.incluirColunaAtual}
                disabled={disabled || !onConfigChange}
                onChange={(e) => onConfigChange?.({ ...config, incluirColunaAtual: e.target.checked })}
              />
            }
            label={
              <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                Incluir coluna ATUAL
              </Typography>
            }
          />
        </Stack>
      </Paper>
    </Stack>
  )
}
