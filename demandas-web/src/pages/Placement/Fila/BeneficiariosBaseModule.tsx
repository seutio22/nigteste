import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import * as XLSX from 'xlsx'
import { api } from '../../../lib/api.local'
import {
  BENEFICIARIO_COLUMN_LABELS,
  downloadBeneficiariosTemplateXlsx,
  mapSpreadsheetRowsToBeneficiarios,
  type PlacementBeneficiario,
} from './placementBeneficiarios'
import {
  validarBeneficiariosImportados,
  type BeneficiarioValidacaoCampo,
  type BeneficiariosValidacaoContext,
  type BeneficiariosValidacaoResumo,
} from './placementBeneficiariosValidacao'
import {
  BeneficiariosValidacaoCriticasPanel,
  filtrarBeneficiariosPorValidacao,
  type FiltroVidasValidacao,
} from './BeneficiariosValidacaoCriticasPanel'
import { downloadCriticasValidacaoXlsx } from './placementBeneficiariosValidacaoExport'
import { formatGridDatePtBR, gridCellToDate } from '../../../utils/gridDate'

type Props = {
  cotacaoId: string
  disabled?: boolean
  onTotalChange?: (total: number) => void
  validationContext?: BeneficiariosValidacaoContext | null
  validationContextLoading?: boolean
}

export function BeneficiariosBaseModule({
  cotacaoId,
  disabled,
  onTotalChange,
  validationContext,
  validationContextLoading,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<PlacementBeneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [validacao, setValidacao] = useState<BeneficiariosValidacaoResumo | null>(null)
  const [filtroVidas, setFiltroVidas] = useState<FiltroVidasValidacao>('todas')
  const [filtroCampo, setFiltroCampo] = useState<'' | BeneficiarioValidacaoCampo>('')
  const [filtroSeveridade, setFiltroSeveridade] = useState<'' | 'erro' | 'aviso'>('')

  const apontamentosPorId = useMemo(() => {
    const map = new Map<string, BeneficiariosValidacaoResumo['linhas'][number]>()
    for (const linha of validacao?.linhas ?? []) {
      map.set(linha.beneficiarioId, linha)
    }
    return map
  }, [validacao])

  const rowsExibidas = useMemo(
    () =>
      filtrarBeneficiariosPorValidacao(
        rows,
        validacao,
        apontamentosPorId,
        filtroVidas,
        filtroCampo,
        filtroSeveridade
      ),
    [rows, validacao, apontamentosPorId, filtroVidas, filtroCampo, filtroSeveridade]
  )

  const load = useCallback(async () => {
    if (!cotacaoId) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const resp = (await api.get(`/placement/cotacoes/${cotacaoId}/beneficiarios`)) as {
        beneficiarios?: PlacementBeneficiario[]
        total?: number
      }
      const list = resp?.beneficiarios ?? []
      setRows(list)
      onTotalChange?.(resp?.total ?? list.length)
    } catch (err: any) {
      console.error('❌ beneficiarios:', err)
      setErrorMsg(err?.message ?? 'Erro ao carregar beneficiários.')
    } finally {
      setLoading(false)
    }
  }, [cotacaoId, onTotalChange])

  useEffect(() => {
    load()
  }, [load])

  function handleValidarDados() {
    if (!rows.length) {
      setErrorMsg('Importe a planilha antes de validar os dados.')
      return
    }
    if (!validationContext) {
      setErrorMsg('Dados da abertura ainda não disponíveis para validação.')
      return
    }
    setErrorMsg(null)
    const resultado = validarBeneficiariosImportados(rows, validationContext)
    setValidacao(resultado)
    setFiltroVidas(resultado.linhasComApontamento > 0 ? 'criticas' : 'todas')
    setFiltroCampo('')
    setFiltroSeveridade('')
  }

  function resetValidacaoFiltros() {
    setValidacao(null)
    setFiltroVidas('todas')
    setFiltroCampo('')
    setFiltroSeveridade('')
  }

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'apontamentos',
        headerName: 'Validação',
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const hit = apontamentosPorId.get(row.id)
          if (!hit) {
            return validacao ? (
              <Chip label="OK" size="small" color="success" variant="outlined" />
            ) : (
              <Typography variant="caption" color="text.secondary">
                —
              </Typography>
            )
          }
          const erros = hit.apontamentos.filter((a) => a.severidade === 'erro').length
          const avisos = hit.apontamentos.length - erros
          const label = erros > 0 ? `${erros} erro(s)` : `${avisos} aviso(s)`
          const tooltip = hit.apontamentos.map((a) => `• ${a.mensagem}`).join('\n')
          return (
            <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>}>
              <Chip
                label={label}
                size="small"
                color={erros > 0 ? 'error' : 'warning'}
                variant="outlined"
              />
            </Tooltip>
          )
        },
      },
      { field: 'ordem', headerName: 'Ordem', width: 70 },
      { field: 'empresa', headerName: 'Empresa', width: 140 },
      { field: 'sub', headerName: 'Sub', width: 80 },
      { field: 'cnpj', headerName: 'CNPJ', width: 130 },
      { field: 'matricula', headerName: 'Matrícula', width: 110 },
      { field: 'sexo', headerName: 'Sexo', width: 70 },
      { field: 'nome', headerName: 'Nome', width: 200, flex: 1 },
      {
        field: 'dataNascimento',
        headerName: 'Data nasc.',
        width: 110,
        valueGetter: (_, row) => gridCellToDate(row.dataNascimento),
        valueFormatter: (v) => formatGridDatePtBR(v),
      },
      { field: 'grauParentesco', headerName: 'Parentesco', width: 160 },
      { field: 'statusBeneficiario', headerName: 'Status', width: 130 },
      { field: 'cid10', headerName: 'CID 10', width: 120 },
      { field: 'motivoAfastamento', headerName: 'Motivo afast.', width: 140 },
      {
        field: 'dataInicioBeneficio',
        headerName: 'Início benef.',
        width: 110,
        valueGetter: (_, row) => gridCellToDate(row.dataInicioBeneficio),
        valueFormatter: (v) => formatGridDatePtBR(v),
      },
      {
        field: 'dataFinalBeneficio',
        headerName: 'Fim benef.',
        width: 110,
        valueGetter: (_, row) => gridCellToDate(row.dataFinalBeneficio),
        valueFormatter: (v) => formatGridDatePtBR(v),
      },
      { field: 'cargo', headerName: 'Cargo', width: 120 },
      { field: 'cidade', headerName: 'Cidade', width: 110 },
      { field: 'uf', headerName: 'UF', width: 60 },
      { field: 'operadora', headerName: 'Operadora', width: 120 },
      { field: 'planoAtual', headerName: 'Plano atual', width: 140 },
      { field: 'acomodacao', headerName: 'Acomodação', width: 110 },
      { field: 'custoPerCapita', headerName: 'Custo per capita', width: 120 },
    ],
    [apontamentosPorId, validacao]
  )

  async function handleFile(file: File) {
    setUploading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) throw new Error('Planilha vazia.')
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const mapped = mapSpreadsheetRowsToBeneficiarios(json)
      if (!mapped.length) {
        throw new Error(
          'Nenhuma linha válida encontrada. Use o modelo com os cabeçalhos indicados (ORDEM, EMPRESA, NOME, etc.).'
        )
      }
      const resp = (await api.post(`/placement/cotacoes/${cotacaoId}/beneficiarios/bulk`, {
        rows: mapped,
        replace: true,
      })) as { imported?: number; total?: number }
      setSuccessMsg(
        `Importados ${resp?.imported ?? mapped.length} beneficiário(s). Total na base: ${resp?.total ?? mapped.length}.`
      )
      resetValidacaoFiltros()
      await load()
    } catch (err: any) {
      console.error('❌ upload beneficiarios:', err)
      setErrorMsg(err?.message ?? 'Erro ao importar planilha.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleClear() {
    if (!window.confirm('Remover todos os beneficiários desta cotação?')) return
    setUploading(true)
    setErrorMsg(null)
    try {
      await api.delete(`/placement/cotacoes/${cotacaoId}/beneficiarios`)
      setSuccessMsg(null)
      resetValidacaoFiltros()
      await load()
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Erro ao limpar base.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Base de beneficiários
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 720 }}>
            Faça upload de Excel (.xlsx, .xls) ou CSV com as colunas do modelo. Depois use{' '}
            <strong>Validar dados</strong> para conferir CNPJ (subfaturas/estipulante), operadora,
            plano e custo per capita com o formulário da abertura.
          </Typography>
        </Box>
        <Chip
          label={
            validacao
              ? `${rowsExibidas.length}/${rows.length} vidas exibidas`
              : `${rows.length} vidas`
          }
          color="primary"
          variant="outlined"
        />
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2, mb: 2 }}>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          disabled={disabled || uploading}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
        />
        <Button
          variant="contained"
          startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadFileIcon />}
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? 'Importando…' : 'Importar planilha'}
        </Button>
        <Button
          variant="outlined"
          startIcon={<FactCheckIcon />}
          disabled={disabled || uploading || loading || validationContextLoading || rows.length === 0}
          onClick={handleValidarDados}
        >
          Validar dados
        </Button>
        {validacao && validacao.linhasComApontamento > 0 && (
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            disabled={disabled || uploading}
            onClick={() => void downloadCriticasValidacaoXlsx(cotacaoId, rows, validacao)}
          >
            Baixar críticas
          </Button>
        )}
        <Button
          variant="outlined"
          startIcon={<DownloadIcon />}
          disabled={disabled || uploading}
          onClick={() => downloadBeneficiariosTemplateXlsx()}
        >
          Baixar modelo
        </Button>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlineIcon />}
          disabled={disabled || uploading || rows.length === 0}
          onClick={() => void handleClear()}
        >
          Limpar base
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
        Colunas esperadas: {BENEFICIARIO_COLUMN_LABELS.join(' · ')}
      </Typography>

      {validacao && (
        <Alert severity={validacao.linhasComApontamento > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
          {validacao.linhasComApontamento > 0
            ? `${validacao.linhasComApontamento} linha(s) com ${validacao.totalApontamentos} crítica(s) em ${validacao.totalLinhas} vidas. Use os filtros abaixo ou baixe o relatório.`
            : `Nenhuma divergência encontrada em ${validacao.totalLinhas} vidas.`}
        </Alert>
      )}

      {validacao && validacao.linhasComApontamento > 0 && (
        <BeneficiariosValidacaoCriticasPanel
          cotacaoId={cotacaoId}
          beneficiarios={rows}
          validacao={validacao}
          filtroVidas={filtroVidas}
          onFiltroVidasChange={setFiltroVidas}
          filtroCampo={filtroCampo}
          onFiltroCampoChange={setFiltroCampo}
          filtroSeveridade={filtroSeveridade}
          onFiltroSeveridadeChange={setFiltroSeveridade}
          disabled={disabled || uploading}
        />
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ height: Math.min(480, 120 + rowsExibidas.length * 36), minHeight: 200 }}>
        <DataGrid
          rows={rowsExibidas}
          columns={columns}
          loading={loading}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
          density="compact"
          getRowClassName={(params) => {
            const hit = apontamentosPorId.get(String(params.id))
            if (!hit) return ''
            return hit.apontamentos.some((a) => a.severidade === 'erro')
              ? 'beneficiario-critica-erro'
              : 'beneficiario-critica-aviso'
          }}
          sx={{
            '& .beneficiario-critica-erro': { bgcolor: 'error.50' },
            '& .beneficiario-critica-aviso': { bgcolor: 'warning.50' },
          }}
        />
      </Box>
    </Paper>
  )
}
