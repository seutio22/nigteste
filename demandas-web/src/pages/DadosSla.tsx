import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import SyncIcon from '@mui/icons-material/Sync'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import * as XLSX from 'xlsx'
import { getApi } from '../lib/apiConfig'
import { useMasterDataStore } from '../store/masterDataStore'
import {
  diasUteisToHorasCorridas,
  diasUteisToSeconds,
  formatDiasUteis,
  formatSecondsToHms,
  horasUteisToSeconds,
  secondsToDiasUteis,
  secondsToHorasUteis,
} from './produtividadeJornada'
import { usePermissions } from '../hooks/usePermissions'
import {
  getPageConfig,
  SLA_PAGES,
  type CatalogKey,
  type PageSlaConfig,
  type QuantityKey,
  type TipoFieldConfig,
} from './slaPageConfig'
import { SlaImpactLegend } from '../components/SlaImpactLegend'
import { SmartImporter } from '../components/SmartImporter'
import { smartImporterConfigs } from '../config/smartImporterConfigs'
import {
  buildSlaExportRows,
  runSlaSmartImport,
  syncSlaFromProdutividade,
  type SlaRuleRow,
} from '../lib/slaImportExport'
import type { ImportResult } from '../types/smartImporter'
import {
  getSlaImpactoColor,
  getSlaImpactoShortLabel,
  isSlaImpacto,
  SLA_IMPACTO_LEGEND,
  type SlaImpacto,
} from './slaImpact'
import {
  applyFaixaFromDias,
  applyFaixaFromHoras,
  draftsToFaixas,
  faixaPrazoSeconds,
  faixasToDrafts,
  formatFaixaRangeLabel,
  formatFaixasSummary,
  formatSlaNumberPtBr,
  isSlaFaixaModo,
  maxQtdFaixas,
  newSlaFaixaDraft,
  parseFaixasPrazo,
  parsePtBrNumber,
  previewSlaPrazoForQuantity,
  SLA_FAIXA_MODO_OPTIONS,
  SLA_PRAZO_DIAS_PRESETS,
  type SlaFaixaDraft,
  type SlaFaixaModo,
  type SlaFaixaPrazo,
} from './slaFaixas'

type SlaRule = {
  id: string
  pageKey: string
  impacto: SlaImpacto
  tipo1Id?: string | null
  tipo2Id?: string | null
  faixasPrazo?: SlaFaixaPrazo[] | unknown | null
  faixaModo?: SlaFaixaModo | string | null
  faixaAdicionalSeconds?: number | null
  tempoPrevistoSeconds?: number | null
  pesoPontos?: number | null
  ativo: boolean
}

const endpoint = '/sla-regras'

function formatDec2PtBr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function catalogItems(
  store: ReturnType<typeof useMasterDataStore.getState>,
  catalog: CatalogKey
): { id: string; nome: string }[] {
  const list = (store as any)[catalog] as { id: string; nome?: string }[] | undefined
  if (!Array.isArray(list)) return []
  return list.map((x) => ({ id: x.id, nome: x.nome ?? x.id }))
}

function resolveTipoLabel(
  store: ReturnType<typeof useMasterDataStore.getState>,
  cfg: TipoFieldConfig | null | undefined,
  value: string | null | undefined
): string {
  if (!value) return '—'
  if (!cfg) return value
  if (cfg.source === 'enum') {
    return cfg.options.find((o) => o.value === value)?.label ?? value
  }
  return catalogItems(store, cfg.catalog).find((c) => c.id === value)?.nome ?? value
}

function metricLabel(pageKey: string, metric: QuantityKey | null): string {
  if (!metric) return 'Prazo único'
  const cfg = getPageConfig(pageKey)
  return cfg.quantities.find((q) => q.key === metric)?.label ?? metric
}

function resolveRuleFaixas(rule: Partial<SlaRule>): SlaFaixaPrazo[] {
  const fromJson = parseFaixasPrazo(rule.faixasPrazo)
  if (fromJson.length) return fromJson
  if (rule.tempoPrevistoSeconds != null && rule.tempoPrevistoSeconds > 0) {
    return [{ metric: null, min: null, max: null, prazoSeconds: rule.tempoPrevistoSeconds }]
  }
  return []
}

export default function DadosSlaPage() {
  const store = useMasterDataStore()
  const { canCreate, canEdit, canDelete, canImport, canExport } = usePermissions('dadosSla')
  const [rows, setRows] = useState<SlaRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'warning' | 'info'
  }>({ open: false, message: '', severity: 'success' })

  const importerMasterData = useMemo(
    () => ({ ...store, slaRegras: rows }),
    [store, rows]
  )

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<SlaRule>>({
    pageKey: 'demandas',
    impacto: 'media',
    ativo: true,
  })
  const [faixasDraft, setFaixasDraft] = useState<SlaFaixaDraft[]>([newSlaFaixaDraft()])
  const [faixaModo, setFaixaModo] = useState<SlaFaixaModo>('correspondente')
  const [adicDiasDraft, setAdicDiasDraft] = useState('')
  const [adicHorasDraft, setAdicHorasDraft] = useState('')
  const [previewQtdDraft, setPreviewQtdDraft] = useState('15')
  const [pesoDraft, setPesoDraft] = useState('')

  const pageCfg = useMemo(() => getPageConfig(form.pageKey ?? 'demandas'), [form.pageKey])

  const faixasPreview = useMemo(() => draftsToFaixas(faixasDraft), [faixasDraft])

  const adicionalSeconds = useMemo(() => {
    const fromHoras = horasUteisToSeconds(parsePtBrNumber(adicHorasDraft))
    if (fromHoras != null && fromHoras > 0) return fromHoras
    const fromDias = diasUteisToSeconds(parsePtBrNumber(adicDiasDraft))
    if (fromDias != null && fromDias > 0) return fromDias
    return null
  }, [adicDiasDraft, adicHorasDraft])

  const previewMetric = useMemo(() => {
    const withMetric = faixasPreview.find((f) => f.metric)
    return withMetric?.metric ?? (pageCfg.quantities[0]?.key as QuantityKey | undefined) ?? null
  }, [faixasPreview, pageCfg.quantities])

  const previewResult = useMemo(() => {
    const qtd = parsePtBrNumber(previewQtdDraft)
    if (qtd == null || qtd <= 0 || !faixasPreview.length) return null
    return previewSlaPrazoForQuantity(
      faixasPreview,
      previewMetric,
      Math.round(qtd),
      faixaModo,
      adicionalSeconds
    )
  }, [faixasPreview, previewMetric, previewQtdDraft, faixaModo, adicionalSeconds])

  const applyAdicionalFromDias = (raw: string) => {
    setAdicDiasDraft(raw)
    const dias = parsePtBrNumber(raw)
    if (dias == null) {
      if (!raw.trim()) setAdicHorasDraft('')
      return
    }
    setAdicHorasDraft(formatSlaNumberPtBr(secondsToHorasUteis(diasUteisToSeconds(dias))))
  }

  const applyAdicionalFromHoras = (raw: string) => {
    setAdicHorasDraft(raw)
    const horas = parsePtBrNumber(raw)
    if (horas == null) {
      if (!raw.trim()) setAdicDiasDraft('')
      return
    }
    setAdicDiasDraft(formatSlaNumberPtBr(secondsToDiasUteis(horasUteisToSeconds(horas))))
  }

  useEffect(() => {
    void store.syncFromApi?.({
      entities: [
        'tiposServico',
        'tiposDemanda',
        'tiposCadastro',
        'padrao',
        'relatorios',
        'modelos',
        'sistemas',
      ] as any,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'pageKey',
        headerName: 'Página',
        width: 120,
        valueGetter: (_, row) => getPageConfig(row.pageKey).label,
      },
      {
        field: 'tipo1Id',
        headerName: 'Tipo 1',
        width: 160,
        valueGetter: (_, row) => {
          const cfg = getPageConfig(row.pageKey)
          return resolveTipoLabel(store, cfg.tipo1, row.tipo1Id)
        },
      },
      {
        field: 'tipo2Id',
        headerName: 'Tipo 2',
        width: 160,
        valueGetter: (_, row) => {
          const cfg = getPageConfig(row.pageKey)
          return resolveTipoLabel(store, cfg.tipo2, row.tipo2Id)
        },
      },
      {
        field: 'impacto',
        headerName: 'Impacto',
        width: 140,
        renderCell: (params) => (
          <Chip
            size="small"
            label={getSlaImpactoShortLabel(String(params.value))}
            color={getSlaImpactoColor(String(params.value))}
            variant="outlined"
          />
        ),
      },
      {
        field: 'faixasPrazo',
        headerName: 'Faixas de prazo',
        flex: 1,
        minWidth: 280,
        sortable: false,
        valueGetter: (_, row) => {
          const r = row as SlaRule
          return formatFaixasSummary(
            resolveRuleFaixas(r),
            (m) => metricLabel(r.pageKey, m),
            isSlaFaixaModo(r.faixaModo) ? r.faixaModo : 'correspondente',
            r.faixaAdicionalSeconds
          )
        },
      },
      {
        field: 'faixaModo',
        headerName: 'Modo',
        width: 130,
        valueGetter: (_, row) =>
          (row as SlaRule).faixaModo === 'somar' ? 'Somar' : 'Correspondente',
      },
      {
        field: 'tempoPrevistoSeconds',
        headerName: 'Horas úteis',
        width: 110,
        valueGetter: (_, row) => {
          const faixas = resolveRuleFaixas(row as SlaRule)
          const sec = faixas[0]?.prazoSeconds ?? row.tempoPrevistoSeconds
          return formatSecondsToHms(sec) || '—'
        },
      },
      {
        field: 'diasUteis',
        headerName: 'Dias úteis',
        width: 110,
        valueGetter: (_, row) => {
          const faixas = resolveRuleFaixas(row as SlaRule)
          const sec = faixas[0]?.prazoSeconds ?? row.tempoPrevistoSeconds
          const dias = secondsToDiasUteis(sec)
          if (dias == null) return '—'
          return formatSlaNumberPtBr(dias)
        },
      },
      {
        field: 'ativo',
        headerName: 'Ativo',
        width: 100,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value ? 'Ativo' : 'Inativo'}
            color={params.value ? 'success' : 'default'}
            variant={params.value ? 'filled' : 'outlined'}
          />
        ),
      },
      {
        field: 'acoes',
        headerName: 'Ações',
        width: 160,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={1}>
            {canEdit ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() => openEdit(params.row as SlaRule)}
              >
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                size="small"
                color="error"
                variant="outlined"
                onClick={() => handleDelete(String((params.row as SlaRule).id))}
              >
                Excluir
              </Button>
            ) : null}
          </Stack>
        ),
      },
    ].filter((col) => col.field !== 'acoes' || canEdit || canDelete),
    [store, canEdit, canDelete]
  )

  const hydrateFromRule = (rule: Partial<SlaRule>) => {
    const faixas = resolveRuleFaixas(rule)
    setFaixasDraft(faixasToDrafts(faixas))
    setFaixaModo(isSlaFaixaModo(rule.faixaModo) ? rule.faixaModo : 'correspondente')
    const adic = rule.faixaAdicionalSeconds
    if (adic != null && adic > 0) {
      setAdicDiasDraft(formatSlaNumberPtBr(secondsToDiasUteis(adic)))
      setAdicHorasDraft(formatSlaNumberPtBr(secondsToHorasUteis(adic)))
    } else {
      setAdicDiasDraft('')
      setAdicHorasDraft('')
    }
    setPreviewQtdDraft('15')
    setPesoDraft(formatDec2PtBr(rule.pesoPontos ?? null))
  }

  const openEdit = (row: SlaRule) => {
    setForm(row)
    hydrateFromRule(row)
    setOpen(true)
  }

  const openNew = () => {
    setForm({ pageKey: 'demandas', impacto: 'media', ativo: true })
    setFaixasDraft([newSlaFaixaDraft()])
    setFaixaModo('correspondente')
    setAdicDiasDraft('')
    setAdicHorasDraft('')
    setPreviewQtdDraft('15')
    setPesoDraft('')
    setOpen(true)
  }

  const fetchRows = async () => {
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      const data = await api.get<SlaRule[]>(endpoint)
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar regras')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const handleSyncFromProdutividade = async () => {
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      const sync = await syncSlaFromProdutividade(api)
      await fetchRows()
      const parts = [
        sync.created ? `${sync.created} linha(s) criada(s) (página + tipos, sem prazos)` : null,
        sync.skipped ? `${sync.skipped} já existente(s)` : null,
        `${sync.totalProdutividade} regra(s) na Produtividade`,
      ].filter(Boolean)
      setSnack({
        open: true,
        message: `Estrutura replicada: ${parts.join(' · ')}`,
        severity: sync.created > 0 ? 'success' : 'info',
      })
    } catch (e: any) {
      setSnack({
        open: true,
        message: e?.message ?? 'Erro ao replicar páginas e tipos da Produtividade',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    try {
      if (!rows.length) {
        setSnack({
          open: true,
          message: 'Nenhuma regra de SLA para exportar',
          severity: 'warning',
        })
        return
      }
      const exportRows = buildSlaExportRows(rows as SlaRuleRow[], store)
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportRows)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'SLA')
      const fileName = `dados_sla_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      setSnack({
        open: true,
        message: `${exportRows.length} regra(s) exportada(s) com sucesso`,
        severity: 'success',
      })
    } catch (e: any) {
      setSnack({
        open: true,
        message: e?.message ?? 'Erro ao exportar SLA',
        severity: 'error',
      })
    }
  }

  const handleSmartImport = async (result: ImportResult) => {
    try {
      if (!result.valid?.length) {
        setSnack({
          open: true,
          message: 'Nenhuma linha válida para importar',
          severity: 'warning',
        })
        return
      }
      setLoading(true)
      const api = getApi()
      const run = await runSlaSmartImport(api, result, store)
      await fetchRows()
      const parts = [
        `${run.totalImported} gravada(s)`,
        run.totalInserted ? `${run.totalInserted} nova(s)` : null,
        run.totalUpdated ? `${run.totalUpdated} atualizada(s)` : null,
        run.errors.length ? `${run.errors.length} erro(s)` : null,
      ].filter(Boolean)
      setSnack({
        open: true,
        message: parts.join(' · '),
        severity: run.errors.length && run.totalImported === 0 ? 'error' : 'success',
      })
      if (run.errors.length) {
        console.warn('Import SLA — erros:', run.errors)
      }
    } catch (e: any) {
      setSnack({
        open: true,
        message: e?.message ?? 'Erro durante a importação de SLA',
        severity: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateFaixa = (key: string, updater: (f: SlaFaixaDraft) => SlaFaixaDraft) => {
    setFaixasDraft((rows) => rows.map((f) => (f.key === key ? updater(f) : f)))
  }

  const handleSave = async () => {
    if (!isSlaImpacto(form.impacto)) {
      setError('Selecione o impacto (Alta, Média ou Baixa prioridade).')
      return
    }

    for (const f of faixasDraft) {
      if ((f.dias.trim() || f.horas.trim()) && faixaPrazoSeconds(f) == null) {
        setError('Há faixa com prazo inválido. Informe dias ou horas úteis.')
        return
      }
      const min = parsePtBrNumber(f.min)
      const max = parsePtBrNumber(f.max)
      if (f.min.trim() && min == null) {
        setError('Quantidade mínima inválida em uma das faixas.')
        return
      }
      if (f.max.trim() && max == null) {
        setError('Quantidade máxima inválida em uma das faixas.')
        return
      }
      if (min != null && max != null && min > max) {
        setError('Em uma faixa, a quantidade mínima não pode ser maior que a máxima.')
        return
      }
    }

    if (adicDiasDraft.trim() && parsePtBrNumber(adicDiasDraft) == null) {
      setError('Tempo adicional (dias) inválido.')
      return
    }
    if (adicHorasDraft.trim() && parsePtBrNumber(adicHorasDraft) == null) {
      setError('Tempo adicional (horas) inválido.')
      return
    }

    const faixas = draftsToFaixas(faixasDraft)
    if (!faixas.length) {
      setError('Inclua ao menos uma faixa de prazo (dias ou horas úteis).')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      const primary = faixas[0]?.prazoSeconds ?? null
      const payload: Record<string, unknown> = {
        pageKey: form.pageKey,
        impacto: form.impacto,
        tipo1Id: pageCfg.tipo1 ? form.tipo1Id || null : null,
        tipo2Id: pageCfg.tipo2 ? form.tipo2Id || null : null,
        faixasPrazo: faixas,
        faixaModo,
        faixaAdicionalSeconds: adicionalSeconds,
        tempoPrevistoSeconds: primary,
        pesoPontos: parsePtBrNumber(pesoDraft),
        ativo: form.ativo !== false,
      }

      if (form.id) {
        await api.put(`${endpoint}/${form.id}`, payload)
      } else {
        await api.post(endpoint, payload)
      }

      setOpen(false)
      setForm({ pageKey: 'demandas', impacto: 'media', ativo: true })
      setFaixasDraft([newSlaFaixaDraft()])
      setFaixaModo('correspondente')
      setAdicDiasDraft('')
      setAdicHorasDraft('')
      setPesoDraft('')
      await fetchRows()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao salvar regra')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      await api.delete(`${endpoint}/${id}`)
      await fetchRows()
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao excluir regra')
    } finally {
      setLoading(false)
    }
  }

  function renderTipoField(cfg: TipoFieldConfig | null) {
    if (!cfg) return null
    const value = (form[cfg.key] as string | null | undefined) ?? ''
    return (
      <TextField
        key={cfg.key}
        select
        fullWidth
        label={cfg.label}
        value={value}
        onChange={(e) => setForm((p) => ({ ...p, [cfg.key]: e.target.value || null }))}
      >
        <MenuItem value="">(qualquer)</MenuItem>
        {cfg.source === 'enum'
          ? cfg.options.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))
          : catalogItems(store, cfg.catalog).map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.nome}
              </MenuItem>
            ))}
      </TextField>
    )
  }

  function renderFaixaCard(faixa: SlaFaixaDraft, index: number) {
    const sec = faixaPrazoSeconds(faixa) ?? 0
    const dias = secondsToDiasUteis(sec)
    const corridas = diasUteisToHorasCorridas(dias)

    return (
      <Box
        key={faixa.key}
        sx={{
          p: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2">Faixa {index + 1}</Typography>
          <IconButton
            size="small"
            color="error"
            disabled={faixasDraft.length <= 1}
            onClick={() => setFaixasDraft((rows) => rows.filter((r) => r.key !== faixa.key))}
            aria-label="Remover faixa"
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack gap={1.5}>
          <TextField
            select
            fullWidth
            size="small"
            label="Métrica (quantidade)"
            value={faixa.metric}
            onChange={(e) =>
              updateFaixa(faixa.key, (f) => ({
                ...f,
                metric: e.target.value as QuantityKey | '',
              }))
            }
            helperText="Ex.: SUB's em Validação. Use “Prazo único” se não depender de quantidade."
          >
            <MenuItem value="">Prazo único (qualquer qtd)</MenuItem>
            {pageCfg.quantities.map((q) => (
              <MenuItem key={q.key} value={q.key}>
                {q.label}
              </MenuItem>
            ))}
          </TextField>

          {faixa.metric ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
              <TextField
                size="small"
                label="De (qtd mín.)"
                placeholder="1"
                value={faixa.min}
                onChange={(e) => updateFaixa(faixa.key, (f) => ({ ...f, min: e.target.value }))}
                inputProps={{ inputMode: 'numeric' }}
                sx={{ flex: 1 }}
              />
              <TextField
                size="small"
                label="Até (qtd máx.)"
                placeholder="10"
                value={faixa.max}
                onChange={(e) => updateFaixa(faixa.key, (f) => ({ ...f, max: e.target.value }))}
                helperText="Vazio = sem limite superior"
                inputProps={{ inputMode: 'numeric' }}
                sx={{ flex: 1 }}
              />
            </Stack>
          ) : null}

          <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
            <Autocomplete
              freeSolo
              fullWidth
              options={[...SLA_PRAZO_DIAS_PRESETS]}
              getOptionLabel={(opt) =>
                typeof opt === 'number'
                  ? `${opt} ${opt === 1 ? 'dia útil' : 'dias úteis'}`
                  : String(opt)
              }
              inputValue={faixa.dias}
              onInputChange={(_, v, reason) => {
                if (reason === 'reset') return
                updateFaixa(faixa.key, (f) => applyFaixaFromDias(f, v))
              }}
              onChange={(_, v) => {
                if (v == null) {
                  updateFaixa(faixa.key, (f) => applyFaixaFromDias(f, ''))
                  return
                }
                if (typeof v === 'number') {
                  updateFaixa(faixa.key, (f) => applyFaixaFromDias(f, formatSlaNumberPtBr(v)))
                  return
                }
                updateFaixa(faixa.key, (f) => applyFaixaFromDias(f, String(v)))
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Dias úteis"
                  placeholder="ex.: 2"
                  size="small"
                  inputProps={{ ...params.inputProps, inputMode: 'decimal' }}
                />
              )}
            />
            <TextField
              fullWidth
              size="small"
              label="Horas úteis"
              placeholder="ex.: 16"
              value={faixa.horas}
              onChange={(e) =>
                updateFaixa(faixa.key, (f) => applyFaixaFromHoras(f, e.target.value))
              }
              onBlur={() => {
                const n = parsePtBrNumber(faixa.horas)
                if (n != null) {
                  updateFaixa(faixa.key, (f) => applyFaixaFromHoras(f, formatSlaNumberPtBr(n)))
                }
              }}
              helperText={sec > 0 ? `= ${formatSecondsToHms(sec)}` : '1 dia útil = 8h'}
              inputProps={{ inputMode: 'decimal' }}
            />
          </Stack>

          {sec > 0 ? (
            <Typography variant="caption" color="text.secondary">
              {metricLabel(form.pageKey ?? 'demandas', (faixa.metric || null) as QuantityKey | null)}{' '}
              {faixa.metric
                ? formatFaixaRangeLabel(
                    parsePtBrNumber(faixa.min),
                    parsePtBrNumber(faixa.max)
                  )
                : ''}
              {' → '}
              {formatDiasUteis(sec)}
              {corridas != null
                ? ` (${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(corridas)}h corridas)`
                : ''}
            </Typography>
          ) : null}
        </Stack>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2, flexShrink: 0 }}
      >
        <Box>
          <Typography variant="h6">SLA</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Prazo por página, tipos e impacto. Use <strong>faixas</strong> quando a quantidade muda
            o prazo (ex.: Validação — SUB&apos;s 1–10 vs 11–20). 1 dia útil = 8h úteis.
          </Typography>
          <SlaImpactLegend />
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
          {canCreate ? (
            <Button
              variant="outlined"
              startIcon={<SyncIcon />}
              onClick={handleSyncFromProdutividade}
              disabled={loading}
            >
              Replicar páginas e tipos
            </Button>
          ) : null}
          {canExport ? (
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExport}
              disabled={loading || rows.length === 0}
            >
              Exportar
            </Button>
          ) : null}
          {canImport ? (
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => setSmartImporterOpen(true)}
              disabled={loading}
            >
              Importar
            </Button>
          ) : null}
          {canCreate ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
              Nova regra
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(r) => (r as SlaRule).id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 50 } } }}
          sx={{
            height: '100%',
            border: 0,
            '& .MuiDataGrid-main': { borderRadius: 1 },
          }}
        />
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{form.id ? 'Editar regra' : 'Nova regra'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                select
                fullWidth
                label="Página"
                value={form.pageKey ?? 'demandas'}
                onChange={(e) => {
                  const nextKey = e.target.value
                  setForm({
                    pageKey: nextKey,
                    impacto: form.impacto ?? 'media',
                    ativo: form.ativo !== false,
                    tipo1Id: null,
                    tipo2Id: null,
                  })
                  setFaixasDraft([newSlaFaixaDraft()])
                }}
              >
                {SLA_PAGES.map((p: PageSlaConfig) => (
                  <MenuItem key={p.pageKey} value={p.pageKey}>
                    {p.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                required
                label="Impacto"
                value={form.impacto ?? 'media'}
                onChange={(e) =>
                  setForm((p) => ({ ...p, impacto: e.target.value as SlaImpacto }))
                }
              >
                {SLA_IMPACTO_LEGEND.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Ativo"
                value={form.ativo === false ? 'inativo' : 'ativo'}
                onChange={(e) => setForm((p) => ({ ...p, ativo: e.target.value === 'ativo' }))}
              >
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </TextField>
            </Stack>

            {pageCfg.hint && (
              <Alert severity="info" variant="outlined">
                {pageCfg.hint}
              </Alert>
            )}

            {(pageCfg.tipo1 || pageCfg.tipo2) && (
              <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
                {renderTipoField(pageCfg.tipo1)}
                {renderTipoField(pageCfg.tipo2)}
              </Stack>
            )}

            <Divider />
            <Typography variant="subtitle2">Faixas de prazo do SLA</Typography>
            <Typography variant="caption" color="text.secondary">
              Exemplo Validação: SUB&apos;s 1–10 = 2 dias; 11–20 = 3 dias. Depois escolha se o prazo
              final usa só a faixa correspondente ou a soma das faixas atravessadas. Acima do máximo,
              use o tempo adicional por unidade.
            </Typography>

            <TextField
              select
              fullWidth
              size="small"
              label="Como calcular o prazo final"
              value={faixaModo}
              onChange={(e) => setFaixaModo(e.target.value as SlaFaixaModo)}
              helperText={SLA_FAIXA_MODO_OPTIONS.find((o) => o.value === faixaModo)?.help}
            >
              {SLA_FAIXA_MODO_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack gap={1.5}>{faixasDraft.map((f, i) => renderFaixaCard(f, i))}</Stack>

            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() =>
                setFaixasDraft((rows) => [
                  ...rows,
                  newSlaFaixaDraft({
                    metric: (pageCfg.quantities[0]?.key ?? '') as QuantityKey | '',
                  }),
                ])
              }
              sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
            >
              Adicionar faixa
            </Button>

            <Divider />
            <Typography variant="subtitle2">Tempo adicional (acima do máximo)</Typography>
            <Typography variant="caption" color="text.secondary">
              Se a quantidade passar do maior &quot;Até&quot; das faixas, soma este tempo por unidade
              extra. Ex.: máx. 20 e qtd 25 → +5 × adicional. Deixe vazio se não houver.
              {maxQtdFaixas(faixasPreview) != null
                ? ` Máximo atual das faixas: ${maxQtdFaixas(faixasPreview)}.`
                : ''}
            </Typography>
            <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
              <TextField
                size="small"
                fullWidth
                label="Adicional — dias úteis / un."
                placeholder="ex.: 0,5"
                value={adicDiasDraft}
                onChange={(e) => applyAdicionalFromDias(e.target.value)}
                onBlur={() => {
                  const n = parsePtBrNumber(adicDiasDraft)
                  if (n != null) applyAdicionalFromDias(formatSlaNumberPtBr(n))
                }}
                inputProps={{ inputMode: 'decimal' }}
              />
              <TextField
                size="small"
                fullWidth
                label="Adicional — horas úteis / un."
                placeholder="ex.: 4"
                value={adicHorasDraft}
                onChange={(e) => applyAdicionalFromHoras(e.target.value)}
                onBlur={() => {
                  const n = parsePtBrNumber(adicHorasDraft)
                  if (n != null) applyAdicionalFromHoras(formatSlaNumberPtBr(n))
                }}
                helperText={
                  adicionalSeconds
                    ? `= ${formatSecondsToHms(adicionalSeconds)} por unidade acima do máx.`
                    : 'Opcional'
                }
                inputProps={{ inputMode: 'decimal' }}
              />
            </Stack>

            <Divider />
            <Typography variant="subtitle2">Simular prazo final</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'flex-start' }}>
              <TextField
                size="small"
                label={`Qtd. de teste${previewMetric ? ` (${metricLabel(form.pageKey ?? 'demandas', previewMetric)})` : ''}`}
                placeholder="15"
                value={previewQtdDraft}
                onChange={(e) => setPreviewQtdDraft(e.target.value)}
                inputProps={{ inputMode: 'numeric' }}
                sx={{ width: { xs: '100%', sm: 220 } }}
              />
            </Stack>
            {previewResult?.seconds ? (
              <Alert severity="success" variant="outlined">
                SLA final:{' '}
                <strong>{formatSecondsToHms(previewResult.seconds)}</strong>
                {' · '}
                <strong>{formatDiasUteis(previewResult.seconds)}</strong>
                {previewResult.breakdown.length
                  ? ` — ${previewResult.breakdown.join(' + ')}`
                  : ''}
              </Alert>
            ) : faixasPreview.length > 0 ? (
              <Alert severity="info" variant="outlined">
                {formatFaixasSummary(
                  faixasPreview,
                  (m) => metricLabel(form.pageKey ?? 'demandas', m),
                  faixaModo,
                  adicionalSeconds
                )}
              </Alert>
            ) : (
              <Alert severity="info" variant="outlined">
                Inclua ao menos uma faixa com dias ou horas úteis.
              </Alert>
            )}

            <TextField
              fullWidth
              label="Peso (pontos) — opcional"
              placeholder="ex.: 1,25"
              value={pesoDraft}
              onChange={(e) => setPesoDraft(e.target.value)}
              onBlur={() => {
                const n = parsePtBrNumber(pesoDraft)
                setPesoDraft(n == null ? '' : formatDec2PtBr(n))
              }}
              helperText="Para pontuação futura; não obrigatório."
              inputProps={{ inputMode: 'decimal' }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading || !form.pageKey}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      <SmartImporter
        open={smartImporterOpen}
        onClose={() => setSmartImporterOpen(false)}
        onImport={handleSmartImport}
        config={smartImporterConfigs.sla}
        masterData={importerMasterData}
      />

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snack.severity}
          variant="filled"
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
