import React, { useMemo } from 'react'
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import DownloadIcon from '@mui/icons-material/Download'
import type { PlacementBeneficiario } from './placementBeneficiarios'
import {
  CAMPO_VALIDACAO_LABEL,
  type BeneficiarioValidacaoCampo,
  type BeneficiariosValidacaoResumo,
} from './placementBeneficiariosValidacao'
import {
  downloadBaseComCriticasPreferindoOriginal,
  downloadCriticasValidacaoCsv,
  downloadCriticasValidacaoXlsx,
  flattenCriticasParaExport,
  resumoCriticasPorCampo,
} from './placementBeneficiariosValidacaoExport'

export type FiltroVidasValidacao = 'todas' | 'criticas' | 'ok'

type Props = {
  cotacaoId: string
  beneficiarios: PlacementBeneficiario[]
  validacao: BeneficiariosValidacaoResumo
  filtroVidas: FiltroVidasValidacao
  onFiltroVidasChange: (v: FiltroVidasValidacao) => void
  filtroCampo: '' | BeneficiarioValidacaoCampo
  onFiltroCampoChange: (v: '' | BeneficiarioValidacaoCampo) => void
  filtroSeveridade: '' | 'erro' | 'aviso'
  onFiltroSeveridadeChange: (v: '' | 'erro' | 'aviso') => void
  disabled?: boolean
}

export function BeneficiariosValidacaoCriticasPanel({
  cotacaoId,
  beneficiarios,
  validacao,
  filtroVidas,
  onFiltroVidasChange,
  filtroCampo,
  onFiltroCampoChange,
  filtroSeveridade,
  onFiltroSeveridadeChange,
  disabled,
}: Props) {
  const resumoCampos = useMemo(() => resumoCriticasPorCampo(validacao), [validacao])

  const criticasRows = useMemo(() => {
    let list = flattenCriticasParaExport(beneficiarios, validacao)
    if (filtroCampo) {
      const label = CAMPO_VALIDACAO_LABEL[filtroCampo]
      list = list.filter((r) => r.campo === label)
    }
    if (filtroSeveridade === 'erro') list = list.filter((r) => r.severidade === 'Erro')
    if (filtroSeveridade === 'aviso') list = list.filter((r) => r.severidade === 'Aviso')
    return list
  }, [beneficiarios, validacao, filtroCampo, filtroSeveridade])

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'ordem', headerName: 'Ordem', width: 70 },
      { field: 'matricula', headerName: 'Matrícula', width: 100 },
      { field: 'nome', headerName: 'Nome', width: 180, flex: 1 },
      { field: 'cnpj', headerName: 'CNPJ', width: 130 },
      { field: 'operadora', headerName: 'Operadora', width: 110 },
      { field: 'planoAtual', headerName: 'Plano', width: 120 },
      { field: 'campo', headerName: 'Campo', width: 120 },
      {
        field: 'severidade',
        headerName: 'Tipo',
        width: 80,
        renderCell: ({ value }) => (
          <Chip
            label={String(value)}
            size="small"
            color={value === 'Erro' ? 'error' : 'warning'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'critica',
        headerName: 'Crítica',
        width: 320,
        flex: 1,
      },
    ],
    []
  )

  if (validacao.linhasComApontamento === 0) return null

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Críticas da validação
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {validacao.linhasComApontamento} vida(s) · {validacao.totalApontamentos} apontamento(s). O download
            devolve o arquivo original do upload com a coluna CRITICA.
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
            {resumoCampos.map((r) => (
              <Chip
                key={r.campo}
                size="small"
                label={`${r.label}: ${r.total}`}
                color={filtroCampo === r.campo ? 'primary' : 'default'}
                variant={filtroCampo === r.campo ? 'filled' : 'outlined'}
                onClick={() =>
                  onFiltroCampoChange(filtroCampo === r.campo ? '' : r.campo)
                }
                sx={{ cursor: 'pointer' }}
              />
            ))}
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={disabled || beneficiarios.length === 0}
            onClick={() => void downloadBaseComCriticasPreferindoOriginal(cotacaoId, beneficiarios, validacao)}
          >
            Original + críticas
          </Button>
          <Button
            variant="text"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={disabled || criticasRows.length === 0}
            onClick={() => void downloadCriticasValidacaoXlsx(cotacaoId, beneficiarios, validacao)}
          >
            Detalhado
          </Button>
          <Button
            variant="text"
            size="small"
            disabled={disabled || criticasRows.length === 0}
            onClick={() => downloadCriticasValidacaoCsv(cotacaoId, beneficiarios, validacao)}
          >
            Detalhado CSV
          </Button>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 1 }} alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Filtro da base de beneficiários:
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={filtroVidas}
          onChange={(_, v: FiltroVidasValidacao | null) => {
            if (v) onFiltroVidasChange(v)
          }}
        >
          <ToggleButton value="todas">Todas as vidas</ToggleButton>
          <ToggleButton value="criticas">Só com críticas</ToggleButton>
          <ToggleButton value="ok">Só OK</ToggleButton>
        </ToggleButtonGroup>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel id="filtro-severidade-label">Severidade</InputLabel>
          <Select
            labelId="filtro-severidade-label"
            label="Severidade"
            value={filtroSeveridade}
            onChange={(e) => onFiltroSeveridadeChange(e.target.value as '' | 'erro' | 'aviso')}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="erro">Erros</MenuItem>
            <MenuItem value="aviso">Avisos</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Box sx={{ height: Math.min(360, 80 + criticasRows.length * 40), minHeight: 160, mb: 2 }}>
        <DataGrid
          rows={criticasRows}
          columns={columns}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          density="compact"
          getRowClassName={(params) =>
            params.row.severidade === 'Erro' ? 'beneficiario-critica-erro' : 'beneficiario-critica-aviso'
          }
          sx={{
            '& .beneficiario-critica-erro': {
              bgcolor: 'error.50',
            },
            '& .beneficiario-critica-aviso': {
              bgcolor: 'warning.50',
            },
          }}
        />
      </Box>
    </Paper>
  )
}

/** Filtra vidas da base principal conforme filtros de validação. */
export function filtrarBeneficiariosPorValidacao(
  rows: PlacementBeneficiario[],
  validacao: BeneficiariosValidacaoResumo | null,
  apontamentosPorId: Map<string, BeneficiariosValidacaoResumo['linhas'][number]>,
  filtroVidas: FiltroVidasValidacao,
  filtroCampo: '' | BeneficiarioValidacaoCampo,
  filtroSeveridade: '' | 'erro' | 'aviso'
): PlacementBeneficiario[] {
  if (!validacao) return rows

  let list = rows
  if (filtroVidas === 'criticas') {
    list = list.filter((r) => apontamentosPorId.has(r.id))
  } else if (filtroVidas === 'ok') {
    list = list.filter((r) => !apontamentosPorId.has(r.id))
  }

  if (filtroCampo || filtroSeveridade) {
    list = list.filter((r) => {
      const hit = apontamentosPorId.get(r.id)
      if (!hit) return false
      return hit.apontamentos.some((a) => {
        if (filtroCampo && a.campo !== filtroCampo) return false
        if (filtroSeveridade && a.severidade !== filtroSeveridade) return false
        return true
      })
    })
  }

  return list
}
