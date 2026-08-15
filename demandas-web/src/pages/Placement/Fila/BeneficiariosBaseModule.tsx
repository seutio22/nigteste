import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import * as XLSX from 'xlsx'
import { api } from '../../../lib/api.local'
import {
  BENEFICIARIO_COLUMN_LABELS,
  auditBeneficiariosSpreadsheetHeaders,
  downloadBeneficiariosTemplateXlsx,
  fieldHeaderMapFromAudit,
  getSpreadsheetRawHeaders,
  mapSpreadsheetRowsToBeneficiarios,
  type BeneficiariosFieldHeaderMap,
  type BeneficiarioUploadRow,
  type BeneficiariosSpreadsheetAudit,
  type PlacementBeneficiario,
} from './placementBeneficiarios'
import {
  countBeneficiariosValidados,
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
import { downloadBaseComCriticasPreferindoOriginal } from './placementBeneficiariosValidacaoExport'
import {
  clearBeneficiariosOriginalFile,
  saveBeneficiariosOriginalFile,
} from './placementBeneficiariosOriginalStore'
import { BeneficiariosTemplateMappingPanel } from './BeneficiariosTemplateMappingPanel'
import {
  clearBeneficiariosMappingSnapshot,
  headersFromFieldHeaderMap,
  loadBeneficiariosMappingSnapshot,
  mergeFieldHeaderMaps,
  saveBeneficiariosMappingSnapshot,
  sheetRowsFromHeaders,
  type BeneficiariosMappingSnapshot,
} from './placementBeneficiariosMappingStore'
import { formatGridDatePtBR, gridCellToDate } from '../../../utils/gridDate'
import { formatBeneficiarioCustoDisplay } from './placementBeneficiariosParse'

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
  const lastUploadedFileNameRef = useRef<string | null>(null)
  const [rows, setRows] = useState<PlacementBeneficiario[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [sheetRows, setSheetRows] = useState<Record<string, unknown>[]>([])
  const [fieldHeaderMap, setFieldHeaderMap] = useState<BeneficiariosFieldHeaderMap>({})
  const [pendingImport, setPendingImport] = useState(false)
  const [validacao, setValidacao] = useState<BeneficiariosValidacaoResumo | null>(null)
  const [filtroVidas, setFiltroVidas] = useState<FiltroVidasValidacao>('todas')
  const [filtroCampo, setFiltroCampo] = useState<'' | BeneficiarioValidacaoCampo>('')
  const [filtroSeveridade, setFiltroSeveridade] = useState<'' | 'erro' | 'aviso'>('')
  const [savedSnapshot, setSavedSnapshot] = useState<BeneficiariosMappingSnapshot | null>(() =>
    loadBeneficiariosMappingSnapshot(cotacaoId)
  )

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

  useEffect(() => {
    const saved = loadBeneficiariosMappingSnapshot(cotacaoId)
    setSavedSnapshot(saved)
    setFieldHeaderMap(saved?.fieldHeaderMap ?? {})
    setSheetRows([])
    setPendingImport(false)
  }, [cotacaoId])

  const aplicarValidacao = useCallback(
    (resultado: BeneficiariosValidacaoResumo, focarCriticas = false) => {
      setValidacao(resultado)
      setFiltroVidas(focarCriticas && resultado.linhasComApontamento > 0 ? 'criticas' : 'todas')
      setFiltroCampo('')
      setFiltroSeveridade('')
    },
    []
  )

  /** Valida automaticamente quando a base e o contexto da abertura/Kick off estão prontos. */
  useEffect(() => {
    if (!rows.length || !validationContext || validationContextLoading) return
    aplicarValidacao(validarBeneficiariosImportados(rows, validationContext))
  }, [rows, validationContext, validationContextLoading, aplicarValidacao])

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
    aplicarValidacao(validarBeneficiariosImportados(rows, validationContext), true)
  }

  function resetValidacaoFiltros() {
    setValidacao(null)
    setFiltroVidas('todas')
    setFiltroCampo('')
    setFiltroSeveridade('')
  }

  function resetActiveUploadSession() {
    setSheetRows([])
    setPendingImport(false)
  }

  function resetTemplateMapping() {
    resetActiveUploadSession()
    const saved = loadBeneficiariosMappingSnapshot(cotacaoId)
    setFieldHeaderMap(saved?.fieldHeaderMap ?? {})
  }

  function handleClearSavedMapping() {
    clearBeneficiariosMappingSnapshot(cotacaoId)
    setSavedSnapshot(null)
    if (!sheetRows.length) {
      setFieldHeaderMap({})
    }
  }

  const sheetHeaders = useMemo(() => getSpreadsheetRawHeaders(sheetRows), [sheetRows])

  const mappingHeadersForPanel = useMemo(() => {
    if (sheetHeaders.length) return sheetHeaders
    if (savedSnapshot?.sheetHeaders?.length) return savedSnapshot.sheetHeaders
    return headersFromFieldHeaderMap(fieldHeaderMap)
  }, [sheetHeaders, savedSnapshot?.sheetHeaders, fieldHeaderMap])

  const auditSourceRows = useMemo(() => {
    if (sheetRows.length) return sheetRows
    return sheetRowsFromHeaders(mappingHeadersForPanel)
  }, [sheetRows, mappingHeadersForPanel])

  const mappingAudit = useMemo<BeneficiariosSpreadsheetAudit | null>(() => {
    if (!auditSourceRows.length) return null
    if (!sheetRows.length && !savedSnapshot) return null
    return auditBeneficiariosSpreadsheetHeaders(auditSourceRows, fieldHeaderMap)
  }, [auditSourceRows, fieldHeaderMap, sheetRows.length, savedSnapshot])

  function handleFieldHeaderChange(field: keyof BeneficiarioUploadRow, header: string | null) {
    setFieldHeaderMap((prev) => {
      const next = { ...prev, [field]: header }
      return next
    })
  }

  async function importMappedRows(
    mapped: BeneficiarioUploadRow[],
    options?: {
      fieldHeaderMap?: BeneficiariosFieldHeaderMap
      sheetHeaders?: string[]
      fileName?: string | null
    }
  ) {
    const CHUNK = 800
    let lastResp: { imported?: number; total?: number } = {}
    for (let i = 0; i < mapped.length; i += CHUNK) {
      const chunk = mapped.slice(i, i + CHUNK)
      const done = Math.min(i + chunk.length, mapped.length)
      setUploadProgress(`Enviando ${done} de ${mapped.length}…`)
      lastResp = (await api.post(`/placement/cotacoes/${cotacaoId}/beneficiarios/bulk`, {
        rows: chunk,
        replace: i === 0,
      })) as { imported?: number; total?: number }
    }
    setUploadProgress(null)
    const resp = lastResp

    const mapToSave = options?.fieldHeaderMap ?? fieldHeaderMap
    const headersToSave =
      options?.sheetHeaders ??
      (sheetRows.length ? getSpreadsheetRawHeaders(sheetRows) : savedSnapshot?.sheetHeaders ?? [])

    const snapshot: BeneficiariosMappingSnapshot = {
      fieldHeaderMap: mapToSave,
      savedAt: new Date().toISOString(),
      lastFileName: options?.fileName ?? lastUploadedFileNameRef.current,
      lastImportedCount: resp?.imported ?? mapped.length,
      sheetHeaders: headersToSave.length ? headersToSave : headersFromFieldHeaderMap(mapToSave),
    }
    saveBeneficiariosMappingSnapshot(cotacaoId, snapshot)
    setSavedSnapshot(snapshot)

    setSuccessMsg(
      `Importados ${resp?.imported ?? mapped.length} beneficiário(s). Total na base: ${resp?.total ?? mapped.length}.`
    )
    setPendingImport(false)
    resetValidacaoFiltros()
    await load()
  }

  async function handleApplyMapping() {
    if (!sheetRows.length) return
    setUploading(true)
    setErrorMsg(null)
    try {
      const audit = auditBeneficiariosSpreadsheetHeaders(sheetRows, fieldHeaderMap)
      const mapped = mapSpreadsheetRowsToBeneficiarios(sheetRows, fieldHeaderMap)
      if (!mapped.length) {
        throw new Error(
          'Nenhuma linha válida encontrada. Verifique o mapeamento das colunas e se há dados além do cabeçalho.'
        )
      }
      if (audit.missingRequiredHeaders.length > 0) {
        throw new Error(
          `Mapeie as colunas essenciais antes de importar: ${audit.missingRequiredHeaders.join(', ')}.`
        )
      }
      await importMappedRows(mapped, {
        fieldHeaderMap,
        sheetHeaders,
        fileName: lastUploadedFileNameRef.current,
      })
    } catch (err: any) {
      console.error('❌ mapeamento beneficiarios:', err)
      setErrorMsg(err?.message ?? 'Erro ao aplicar mapeamento.')
    } finally {
      setUploading(false)
      setUploadProgress(null)
    }
  }

  const vidasValidadas = validacao ? countBeneficiariosValidados(validacao) : 0

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: 'apontamentos',
        headerName: 'Validação',
        width: 130,
        sortable: false,
        filterable: false,
        renderCell: ({ row }) => {
          const hit = apontamentosPorId.get(row.id)
          if (!hit) {
            return validacao ? (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <CheckCircleOutlineIcon fontSize="small" color="success" />
                <Chip label="Validado" size="small" color="success" variant="outlined" />
              </Stack>
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
      {
        field: 'custoPerCapita',
        headerName: 'Custo per capita',
        width: 130,
        valueFormatter: (value) => formatBeneficiarioCustoDisplay(value != null ? String(value) : ''),
      },
    ],
    [apontamentosPorId, validacao]
  )

  async function handleFile(file: File) {
    setUploading(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    resetActiveUploadSession()
    lastUploadedFileNameRef.current = file.name
    try {
      const buf = await file.arrayBuffer()
      // Guarda o arquivo original para devolver com coluna CRITICA após a validação.
      await saveBeneficiariosOriginalFile(cotacaoId, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        buffer: buf.slice(0),
      })
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) throw new Error('Planilha vazia.')
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
      const rawHeaders = getSpreadsheetRawHeaders(json)
      if (!rawHeaders.length) {
        throw new Error('Nenhum cabeçalho encontrado na planilha.')
      }

      const autoAudit = auditBeneficiariosSpreadsheetHeaders(json)
      const autoMap = fieldHeaderMapFromAudit(autoAudit)
      const saved = loadBeneficiariosMappingSnapshot(cotacaoId)
      const initialMap = mergeFieldHeaderMaps(saved?.fieldHeaderMap, autoMap, rawHeaders)
      setSheetRows(json)
      setFieldHeaderMap(initialMap)

      const audit = auditBeneficiariosSpreadsheetHeaders(json, initialMap)
      const mapped = mapSpreadsheetRowsToBeneficiarios(json, initialMap)

      if (audit.missingRequiredHeaders.length === 0 && mapped.length) {
        await importMappedRows(mapped, {
          fieldHeaderMap: initialMap,
          sheetHeaders: rawHeaders,
          fileName: file.name,
        })
      } else {
        setPendingImport(true)
        const reusedFromSaved =
          saved?.fieldHeaderMap &&
          Object.entries(saved.fieldHeaderMap).some(
            ([field, header]) => header && initialMap[field as keyof BeneficiarioUploadRow] === header
          )
        if (mapped.length && audit.missingRequiredHeaders.length > 0) {
          setSuccessMsg(
            reusedFromSaved
              ? 'Planilha carregada. Mapeamento anterior aplicado onde os cabeçalhos coincidem. Ajuste as colunas essenciais e clique em «Importar com este mapeamento».'
              : 'Planilha carregada. Ajuste o mapeamento das colunas essenciais e clique em «Importar com este mapeamento».'
          )
        } else if (!mapped.length) {
          setSuccessMsg(
            reusedFromSaved
              ? 'Planilha carregada. Mapeamento anterior aplicado onde possível. Revise as colunas e clique em «Importar com este mapeamento».'
              : 'Planilha carregada. Selecione as colunas correspondentes ao modelo e clique em «Importar com este mapeamento».'
          )
        } else {
          setSuccessMsg(
            reusedFromSaved
              ? 'Planilha carregada. Mapeamento anterior reaplicado — revise se necessário e clique em «Aplicar mapeamento».'
              : 'Planilha carregada. Revise o mapeamento e clique em «Aplicar mapeamento» se precisar corrigir.'
          )
        }
      }
    } catch (err: any) {
      console.error('❌ upload beneficiarios:', err)
      setErrorMsg(err?.message ?? 'Erro ao importar planilha.')
    } finally {
      setUploading(false)
      setUploadProgress(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDownloadBaseComCriticas() {
    if (!validacao) return
    try {
      const modo = await downloadBaseComCriticasPreferindoOriginal(
        cotacaoId,
        rows,
        validacao,
        fieldHeaderMap
      )
      if (modo === 'reconstruido') {
        setSuccessMsg(
          'Arquivo original desta sessão não encontrado — baixamos a base reconstruída com a coluna CRITICA. Para obter o arquivo original, importe a planilha novamente e baixe as críticas.'
        )
      } else {
        setSuccessMsg('Download do arquivo original com a coluna CRITICA.')
      }
    } catch (err: any) {
      console.error('❌ download base com críticas:', err)
      setErrorMsg(err?.message ?? 'Erro ao baixar planilha com críticas.')
    }
  }

  async function handleClear() {
    if (!window.confirm('Remover todos os beneficiários desta cotação?')) return
    setUploading(true)
    setErrorMsg(null)
    try {
      await api.delete(`/placement/cotacoes/${cotacaoId}/beneficiarios`)
      await clearBeneficiariosOriginalFile(cotacaoId)
      setSuccessMsg(null)
      resetValidacaoFiltros()
      resetTemplateMapping()
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
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip label={`${rows.length} vidas`} color="primary" variant="outlined" size="small" />
          {validacao && (
            <>
              <Chip
                label={`${vidasValidadas} validada(s)`}
                color="success"
                variant={filtroVidas === 'ok' ? 'filled' : 'outlined'}
                size="small"
                onClick={() => setFiltroVidas(filtroVidas === 'ok' ? 'todas' : 'ok')}
                sx={{ cursor: 'pointer' }}
              />
              {validacao.linhasComApontamento > 0 && (
                <Chip
                  label={`${validacao.linhasComApontamento} com crítica(s)`}
                  color="warning"
                  variant={filtroVidas === 'criticas' ? 'filled' : 'outlined'}
                  size="small"
                  onClick={() => setFiltroVidas(filtroVidas === 'criticas' ? 'todas' : 'criticas')}
                  sx={{ cursor: 'pointer' }}
                />
              )}
            </>
          )}
        </Stack>
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
          {uploading ? uploadProgress || 'Importando…' : 'Importar planilha'}
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
            onClick={() => void handleDownloadBaseComCriticas()}
          >
            Baixar base com críticas
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
            ? `${vidasValidadas} vida(s) validada(s) · ${validacao.linhasComApontamento} com ${validacao.totalApontamentos} crítica(s) em ${validacao.totalLinhas} vidas. Linhas validadas aparecem em verde; baixe o arquivo original com a coluna CRITICA.`
            : `Todas as ${validacao.totalLinhas} vidas foram validadas em relação à abertura e ao Kick off.`}
        </Alert>
      )}

      {validacao && (
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            Exibir na grade:
          </Typography>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={filtroVidas}
            onChange={(_, v: FiltroVidasValidacao | null) => {
              if (v) setFiltroVidas(v)
            }}
          >
            <ToggleButton value="todas">Todas</ToggleButton>
            <ToggleButton value="ok">Só validadas</ToggleButton>
            {validacao.linhasComApontamento > 0 && (
              <ToggleButton value="criticas">Só com críticas</ToggleButton>
            )}
          </ToggleButtonGroup>
          <Typography variant="caption" color="text.secondary">
            Verde = validado · Amarelo = aviso · Vermelho = erro
          </Typography>
        </Stack>
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
      {mappingAudit && (
        <BeneficiariosTemplateMappingPanel
          audit={mappingAudit}
          sheetHeaders={mappingHeadersForPanel}
          fieldHeaderMap={fieldHeaderMap}
          onFieldHeaderChange={handleFieldHeaderChange}
          onApplyMapping={() => void handleApplyMapping()}
          applying={uploading}
          disabled={disabled}
          pendingImport={pendingImport}
          savedSnapshot={savedSnapshot}
          hasActiveSheet={sheetRows.length > 0}
          onClearSavedMapping={handleClearSavedMapping}
        />
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
            if (!validacao) return ''
            const hit = apontamentosPorId.get(String(params.id))
            if (!hit) return 'beneficiario-validado'
            return hit.apontamentos.some((a) => a.severidade === 'erro')
              ? 'beneficiario-critica-erro'
              : 'beneficiario-critica-aviso'
          }}
          sx={{
            '& .beneficiario-validado': {
              bgcolor: 'success.50',
              borderLeft: '3px solid',
              borderLeftColor: 'success.main',
            },
            '& .beneficiario-critica-erro': {
              bgcolor: 'error.50',
              borderLeft: '3px solid',
              borderLeftColor: 'error.main',
            },
            '& .beneficiario-critica-aviso': {
              bgcolor: 'warning.50',
              borderLeft: '3px solid',
              borderLeftColor: 'warning.main',
            },
          }}
        />
      </Box>
    </Paper>
  )
}
