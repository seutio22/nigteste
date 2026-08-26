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
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import * as XLSX from 'xlsx'
import { getApi } from '../lib/apiConfig'
import { useMasterDataStore } from '../store/masterDataStore'
import {
  formatPresetLabel,
  formatSecondsToHms,
  parseHmsToSeconds,
  percentOfJornada,
  TEMPO_PREVISTO_PRESETS_MIN,
} from './produtividadeJornada'
import { usePermissions } from '../hooks/usePermissions'
import {
  computeQuantityLineSeconds,
  getPageConfig,
  PRODUTIVIDADE_PAGES,
  type CatalogKey,
  type PageProdutividadeConfig,
  type QuantityFieldConfig,
  type QuantityKey,
  type TempoAdicionalKey,
  type TempoBaseKey,
  type TipoFieldConfig,
} from './produtividadePageConfig'
import {
  computeSistemasTempoSeconds,
  parseSistemasDetalhe,
  type SistemaTempoLinha,
} from './produtividadeSistemasDetalhe'
import { SmartImporter } from '../components/SmartImporter'
import { smartImporterConfigs } from '../config/smartImporterConfigs'
import {
  buildProdutividadeExportRows,
  runProdutividadeSmartImport,
  type ProdutividadeRuleRow,
} from '../lib/produtividadeImportExport'
import type { ImportResult } from '../types/smartImporter'

type ProdutividadeRule = {
  id: string
  pageKey: string
  tipo1Id?: string | null
  tipo2Id?: string | null
  qtdSistemas?: number | null
  tempoSistemasSeconds?: number | null
  tempoSistemasAdicionalSeconds?: number | null
  tempoSistemasAdicionalPorTotalSeconds?: number | null
  sistemasDetalhe?: SistemaTempoLinha[] | unknown | null
  qtdUsuarios?: number | null
  tempoUsuariosSeconds?: number | null
  tempoUsuariosAdicionalSeconds?: number | null
  qtdClientes?: number | null
  tempoClientesSeconds?: number | null
  tempoClientesAdicionalSeconds?: number | null
  qtdRetornos?: number | null
  tempoRetornosSeconds?: number | null
  tempoRetornosAdicionalSeconds?: number | null
  qtdItens?: number | null
  tempoItensSeconds?: number | null
  tempoItensAdicionalSeconds?: number | null
  qtdContratos?: number | null
  tempoContratosSeconds?: number | null
  tempoContratosAdicionalSeconds?: number | null
  qtdSubs?: number | null
  tempoSubsSeconds?: number | null
  tempoSubsAdicionalSeconds?: number | null
  tempoPrevistoSeconds?: number | null
  pesoPontos?: number | null
  ativo: boolean
}

type SistemaLinhaDraft = {
  key: string
  /** '' = padrão (qualquer sistema) */
  sistemaId: string
  tempoHms: string
  porTotalHms: string
}

const endpoint = '/produtividade-regras'

let sistemaLinhaSeq = 0
function newSistemaLinhaDraft(partial?: Partial<SistemaLinhaDraft>): SistemaLinhaDraft {
  sistemaLinhaSeq += 1
  return {
    key: `sis-${sistemaLinhaSeq}`,
    sistemaId: '',
    tempoHms: '',
    porTotalHms: '',
    ...partial,
  }
}

const ALL_QTY_KEYS: QuantityKey[] = [
  'qtdSistemas',
  'qtdUsuarios',
  'qtdClientes',
  'qtdRetornos',
  'qtdItens',
  'qtdContratos',
  'qtdSubs',
]

const ALL_TEMPO_KEYS: (TempoBaseKey | TempoAdicionalKey)[] = [
  'tempoSistemasSeconds',
  'tempoSistemasAdicionalSeconds',
  'tempoUsuariosSeconds',
  'tempoUsuariosAdicionalSeconds',
  'tempoClientesSeconds',
  'tempoClientesAdicionalSeconds',
  'tempoRetornosSeconds',
  'tempoRetornosAdicionalSeconds',
  'tempoItensSeconds',
  'tempoItensAdicionalSeconds',
  'tempoContratosSeconds',
  'tempoContratosAdicionalSeconds',
  'tempoSubsSeconds',
  'tempoSubsAdicionalSeconds',
]

function parsePtBrNumber(raw: string | undefined): number | null {
  if (raw == null) return null
  const s = raw.trim().replace(/\s/g, '')
  if (!s) return null
  const normalized = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/\./g, '')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

function formatIntPtBr(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return ''
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(Number(value))
}

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

function emptyQtyDraft(keys: QuantityKey[]): Record<string, string> {
  const d: Record<string, string> = {}
  for (const k of keys) d[k] = ''
  return d
}

function emptyTempoDraft(cfg: PageProdutividadeConfig): Record<string, string> {
  const d: Record<string, string> = { tempoFixo: '' }
  for (const q of cfg.quantities) {
    d[q.tempoBaseKey] = ''
    d[q.tempoAdicionalKey] = ''
  }
  return d
}

function TempoInput({
  label,
  value,
  onChange,
  helperText,
}: {
  label: string
  value: string
  onChange: (next: string) => void
  helperText?: string
}) {
  return (
    <Autocomplete
      freeSolo
      fullWidth
      options={[...TEMPO_PREVISTO_PRESETS_MIN]}
      getOptionLabel={(opt) => (typeof opt === 'number' ? formatPresetLabel(opt) : String(opt))}
      filterOptions={(options, state) => {
        const q = state.inputValue.trim().toLowerCase()
        if (!q) return options
        const digits = q.replace(/\D/g, '')
        return options.filter((min) => String(min).includes(digits || q))
      }}
      inputValue={value}
      onInputChange={(_, v, reason) => {
        if (reason === 'reset') return
        onChange(v)
      }}
      onChange={(_, v) => {
        if (v == null) {
          onChange('')
          return
        }
        if (typeof v === 'number') {
          onChange(formatSecondsToHms(v * 60))
          return
        }
        const sec = parseHmsToSeconds(v)
        onChange(sec != null ? formatSecondsToHms(sec) : v)
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder="5  ou  00:05:00"
          size="small"
          onBlur={(e) => {
            params.inputProps.onBlur?.(e as any)
            const sec = parseHmsToSeconds(value)
            if (sec != null) onChange(formatSecondsToHms(sec))
          }}
          helperText={helperText}
        />
      )}
    />
  )
}

export default function DadosProdutividadePage() {
  const store = useMasterDataStore()
  const { canCreate, canEdit, canDelete, canImport, canExport } = usePermissions('dadosProdutividade')
  const [rows, setRows] = useState<ProdutividadeRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [smartImporterOpen, setSmartImporterOpen] = useState(false)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'warning' | 'info'
  }>({ open: false, message: '', severity: 'success' })

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<ProdutividadeRule>>({
    pageKey: 'demandas',
    ativo: true,
  })
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>(emptyQtyDraft(ALL_QTY_KEYS))
  const [tempoDraft, setTempoDraft] = useState<Record<string, string>>({})
  const [pesoDraft, setPesoDraft] = useState('')
  const [sistemasLinhas, setSistemasLinhas] = useState<SistemaLinhaDraft[]>([])
  const [adicPorTotalDemaisHms, setAdicPorTotalDemaisHms] = useState('')

  const pageCfg = useMemo(() => getPageConfig(form.pageKey ?? 'demandas'), [form.pageKey])
  const pageSupportsTotalSistema = form.pageKey === 'manutencoes'

  const importerMasterData = useMemo(
    () => ({ ...store, produtividadeRegras: rows }),
    [store, rows]
  )

  const sistemasDetalhePreview = useMemo((): SistemaTempoLinha[] => {
    return sistemasLinhas
      .map((l) => {
        const tempo = parseHmsToSeconds(l.tempoHms)
        if (tempo == null || tempo <= 0) return null
        const porTotal = parseHmsToSeconds(l.porTotalHms)
        return {
          sistemaId: l.sistemaId || null,
          tempoSeconds: tempo,
          tempoAdicionalPorTotalSeconds: porTotal != null && porTotal > 0 ? porTotal : null,
        } satisfies SistemaTempoLinha
      })
      .filter(Boolean) as SistemaTempoLinha[]
  }, [sistemasLinhas])

  const totalPreviewSeconds = useMemo(() => {
    if (pageCfg.allowTempoFixo && pageCfg.quantities.length === 0) {
      return parseHmsToSeconds(tempoDraft.tempoFixo) ?? 0
    }
    let sum = 0
    for (const q of pageCfg.quantities) {
      if (q.key === 'qtdSistemas') {
        const qtd = parsePtBrNumber(qtyDraft.qtdSistemas)
        const ids =
          sistemasDetalhePreview.filter((d) => d.sistemaId).map((d) => d.sistemaId!) ||
          []
        // Preview: se há linhas específicas, simula esses sistemas; senão usa qtd informada
        const sistemaIds =
          ids.length > 0
            ? ids
            : Array.from({ length: Math.max(1, qtd ?? (sistemasDetalhePreview.length ? 1 : 0)) }, (_, i) =>
                `preview-${i}`
              )
        sum += computeSistemasTempoSeconds({
          sistemaIds: sistemasDetalhePreview.length ? sistemaIds : qtd != null ? sistemaIds : [],
          detalhe: sistemasDetalhePreview,
          tempoBaseSeconds: parseHmsToSeconds(tempoDraft.tempoSistemasSeconds),
          tempoAdicionalSeconds: parseHmsToSeconds(tempoDraft.tempoSistemasAdicionalSeconds),
          tempoAdicionalPorTotalDemaisSeconds: parseHmsToSeconds(adicPorTotalDemaisHms),
        })
        continue
      }
      const qtd = parsePtBrNumber(qtyDraft[q.key])
      const base = parseHmsToSeconds(tempoDraft[q.tempoBaseKey])
      const adic = parseHmsToSeconds(tempoDraft[q.tempoAdicionalKey])
      sum += computeQuantityLineSeconds(qtd, base, adic)
    }
    return sum
  }, [pageCfg, qtyDraft, tempoDraft, sistemasDetalhePreview, adicPorTotalDemaisHms])

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
        field: 'quantidades',
        headerName: 'Quantidades + tempos',
        flex: 1,
        minWidth: 280,
        sortable: false,
        valueGetter: (_, row) => {
          const cfg = getPageConfig(row.pageKey)
          const parts = cfg.quantities
            .map((q) => {
              if (q.key === 'qtdSistemas') {
                const detalhe = parseSistemasDetalhe((row as any).sistemasDetalhe)
                if (detalhe.length) {
                  return `Sistemas: ${detalhe.length} linha(s) detalhadas`
                }
              }
              const qtd = (row as any)[q.key] as number | null | undefined
              const base = (row as any)[q.tempoBaseKey] as number | null | undefined
              const adic = (row as any)[q.tempoAdicionalKey] as number | null | undefined
              if (qtd == null && !base && !adic) return null
              const line = computeQuantityLineSeconds(qtd, base, adic)
              const qtdLabel = qtd != null ? `qtd ${formatIntPtBr(qtd)}` : 'qtd 1'
              return `${q.label}: ${qtdLabel} → ${formatSecondsToHms(line) || '00:00:00'}`
            })
            .filter(Boolean)
          return parts.length ? parts.join(' · ') : '—'
        },
      },
      {
        field: 'tempoPrevistoSeconds',
        headerName: 'Total',
        width: 100,
        valueGetter: (_, row) => formatSecondsToHms(row.tempoPrevistoSeconds) || '—',
      },
      {
        field: 'pctJornada',
        headerName: '% 8h',
        width: 90,
        valueGetter: (_, row) => {
          const p = percentOfJornada(row.tempoPrevistoSeconds)
          return p == null ? '—' : `${p}%`
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
              onClick={() => openEdit(params.row as ProdutividadeRule)}
            >
              Editar
            </Button>
            ) : null}
            {canDelete ? (
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => handleDelete(String((params.row as ProdutividadeRule).id))}
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

  const hydrateDraftsFromRule = (rule: Partial<ProdutividadeRule>, cfg: PageProdutividadeConfig) => {
    const qd = emptyQtyDraft(ALL_QTY_KEYS)
    for (const k of ALL_QTY_KEYS) {
      qd[k] = formatIntPtBr((rule as any)[k] ?? null)
    }
    setQtyDraft(qd)

    const td = emptyTempoDraft(cfg)
    for (const q of cfg.quantities) {
      td[q.tempoBaseKey] = formatSecondsToHms((rule as any)[q.tempoBaseKey])
      td[q.tempoAdicionalKey] = formatSecondsToHms((rule as any)[q.tempoAdicionalKey])
    }
    if (cfg.allowTempoFixo) {
      td.tempoFixo = formatSecondsToHms(rule.tempoPrevistoSeconds)
    }
    setTempoDraft(td)
    setPesoDraft(formatDec2PtBr(rule.pesoPontos ?? null))
    setAdicPorTotalDemaisHms(formatSecondsToHms(rule.tempoSistemasAdicionalPorTotalSeconds))

    const detalhe = parseSistemasDetalhe(rule.sistemasDetalhe)
    if (detalhe.length) {
      setSistemasLinhas(
        detalhe.map((d) =>
          newSistemaLinhaDraft({
            sistemaId: d.sistemaId || '',
            tempoHms: formatSecondsToHms(d.tempoSeconds),
            porTotalHms: formatSecondsToHms(d.tempoAdicionalPorTotalSeconds),
          })
        )
      )
    } else if (rule.tempoSistemasSeconds || rule.tempoSistemasAdicionalSeconds) {
      // Legado: expõe como linha "padrão (qualquer)"
      const linhas: SistemaLinhaDraft[] = []
      if (rule.tempoSistemasSeconds) {
        linhas.push(
          newSistemaLinhaDraft({
            sistemaId: '',
            tempoHms: formatSecondsToHms(rule.tempoSistemasSeconds),
          })
        )
      }
      setSistemasLinhas(linhas)
    } else {
      setSistemasLinhas([])
    }
  }

  const openEdit = (row: ProdutividadeRule) => {
    const cfg = getPageConfig(row.pageKey)
    setForm(row)
    hydrateDraftsFromRule(row, cfg)
    setOpen(true)
  }

  const openNew = () => {
    const cfg = getPageConfig('demandas')
    setForm({ pageKey: 'demandas', ativo: true })
    setQtyDraft(emptyQtyDraft(ALL_QTY_KEYS))
    setTempoDraft(emptyTempoDraft(cfg))
    setPesoDraft('')
    setSistemasLinhas([])
    setAdicPorTotalDemaisHms('')
    setOpen(true)
  }

  const fetchRows = async () => {
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      const data = await api.get<ProdutividadeRule[]>(endpoint)
      setRows(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message ?? 'Erro ao carregar regras')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      const allowed = new Set(pageCfg.quantities.map((q) => q.key))

      // Limpa métricas de outras páginas
      const payload: Record<string, unknown> = {
        pageKey: form.pageKey,
        tipo1Id: pageCfg.tipo1 ? form.tipo1Id || null : null,
        tipo2Id: pageCfg.tipo2 ? form.tipo2Id || null : null,
        pesoPontos: parsePtBrNumber(pesoDraft),
        ativo: form.ativo !== false,
      }

      for (const k of ALL_QTY_KEYS) payload[k] = null
      for (const k of ALL_TEMPO_KEYS) payload[k] = null
      payload.sistemasDetalhe = null
      payload.tempoSistemasAdicionalPorTotalSeconds = null

      let total = 0

      if (pageCfg.allowTempoFixo && pageCfg.quantities.length === 0) {
        const fixo = parseHmsToSeconds(tempoDraft.tempoFixo)
        if (tempoDraft.tempoFixo?.trim() && fixo == null) {
          setError('Tempo previsto inválido. Digite minutos (ex.: 90) ou HH:MM:SS.')
          setLoading(false)
          return
        }
        total = fixo ?? 0
      } else {
        for (const q of pageCfg.quantities) {
          if (!allowed.has(q.key)) continue

          if (q.key === 'qtdSistemas') {
            const qtdRaw = parsePtBrNumber(qtyDraft.qtdSistemas)
            const qtd = qtdRaw == null ? null : Math.round(qtdRaw)
            const detalhe = sistemasDetalhePreview
            const adicDemaisRaw = tempoDraft.tempoSistemasAdicionalSeconds
            const adicDemais = parseHmsToSeconds(adicDemaisRaw)
            const porTotalDemais = parseHmsToSeconds(adicPorTotalDemaisHms)

            if (adicDemaisRaw?.trim() && adicDemais == null) {
              setError('Tempo adicional (demais sistemas) inválido.')
              setLoading(false)
              return
            }
            if (adicPorTotalDemaisHms.trim() && porTotalDemais == null) {
              setError('Adicional por Total (demais sistemas) inválido.')
              setLoading(false)
              return
            }
            for (const l of sistemasLinhas) {
              if (l.tempoHms.trim() && parseHmsToSeconds(l.tempoHms) == null) {
                setError('Há tempo de sistema inválido. Use minutos ou HH:MM:SS.')
                setLoading(false)
                return
              }
              if (l.porTotalHms.trim() && parseHmsToSeconds(l.porTotalHms) == null) {
                setError('Há adicional por Total inválido em sistemas.')
                setLoading(false)
                return
              }
            }

            const padrao = detalhe.find((d) => !d.sistemaId)
            payload.qtdSistemas = null
            payload.sistemasDetalhe = detalhe.length ? detalhe : null
            payload.tempoSistemasSeconds = padrao?.tempoSeconds ?? null
            payload.tempoSistemasAdicionalSeconds = adicDemais
            payload.tempoSistemasAdicionalPorTotalSeconds = porTotalDemais

            const previewIds = detalhe.filter((d) => d.sistemaId).map((d) => d.sistemaId!)
            total += computeSistemasTempoSeconds({
              sistemaIds:
                previewIds.length > 0
                  ? previewIds
                  : Array.from({ length: Math.max(qtd ?? (padrao ? 1 : 0), 0) }, (_, i) => `p-${i}`),
              detalhe,
              tempoBaseSeconds: padrao?.tempoSeconds ?? null,
              tempoAdicionalSeconds: adicDemais,
              tempoAdicionalPorTotalDemaisSeconds: porTotalDemais,
            })
            continue
          }

          const qtdRaw = parsePtBrNumber(qtyDraft[q.key])
          const qtd = qtdRaw == null ? null : Math.round(qtdRaw)
          const baseRaw = tempoDraft[q.tempoBaseKey]
          const adicRaw = tempoDraft[q.tempoAdicionalKey]
          const base = parseHmsToSeconds(baseRaw)
          const adic = parseHmsToSeconds(adicRaw)

          if (baseRaw?.trim() && base == null) {
            setError(`Tempo total de ${q.label} inválido.`)
            setLoading(false)
            return
          }
          if (adicRaw?.trim() && adic == null) {
            setError(`Tempo adicional de ${q.label} inválido.`)
            setLoading(false)
            return
          }

          // qtd* = só preview no formulário; não grava filtro rígido (taxas aplicam à qtd real do chamado)
          payload[q.key] = null
          payload[q.tempoBaseKey] = base
          payload[q.tempoAdicionalKey] = adic
          total += computeQuantityLineSeconds(qtd, base, adic)
        }
      }

      payload.tempoPrevistoSeconds = total > 0 ? total : null

      if (form.id) {
        await api.put(`${endpoint}/${form.id}`, payload)
      } else {
        await api.post(endpoint, payload)
      }

      setOpen(false)
      setForm({ pageKey: 'demandas', ativo: true })
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

  const handleExport = () => {
    try {
      if (!rows.length) {
        setSnack({
          open: true,
          message: 'Nenhuma regra de produtividade para exportar',
          severity: 'warning',
        })
        return
      }
      const exportRows = buildProdutividadeExportRows(rows as ProdutividadeRuleRow[], store)
      const workbook = XLSX.utils.book_new()
      const worksheet = XLSX.utils.json_to_sheet(exportRows)
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtividade')
      const fileName = `dados_produtividade_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
      setSnack({
        open: true,
        message: `${exportRows.length} regra(s) exportada(s) com sucesso`,
        severity: 'success',
      })
    } catch (e: any) {
      setSnack({
        open: true,
        message: e?.message ?? 'Erro ao exportar produtividade',
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
      const run = await runProdutividadeSmartImport(api, result, store)
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
        console.warn('Import produtividade — erros:', run.errors)
      }
    } catch (e: any) {
      setSnack({
        open: true,
        message: e?.message ?? 'Erro durante a importação de produtividade',
        severity: 'error',
      })
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

  function renderSistemasBlock() {
    const sistemas = store.sistemas || []
    return (
      <Box
        sx={{
          p: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Sistemas
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
          Cadastre tempo por sistema específico, ou use &quot;Qualquer (padrão)&quot; para todos. Sistemas do
          chamado sem linha usam o tempo adicional dos demais.
          {pageSupportsTotalSistema
            ? ' Em Manutenções, o adicional por Total usa o Total de cada sistema na Operação.'
            : ''}
        </Typography>

        <Stack gap={1.25}>
          {sistemasLinhas.map((linha) => (
            <Stack
              key={linha.key}
              direction={{ xs: 'column', md: 'row' }}
              gap={1}
              alignItems={{ md: 'flex-start' }}
            >
              <TextField
                select
                size="small"
                label="Sistema"
                value={linha.sistemaId}
                onChange={(e) =>
                  setSistemasLinhas((rows) =>
                    rows.map((r) =>
                      r.key === linha.key ? { ...r, sistemaId: e.target.value } : r
                    )
                  )
                }
                sx={{ minWidth: { md: 200 }, flex: 1 }}
              >
                <MenuItem value="">Qualquer (padrão)</MenuItem>
                {sistemas.map((s: any) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.nome || s.id}
                  </MenuItem>
                ))}
              </TextField>
              <TempoInput
                label="Tempo do sistema"
                value={linha.tempoHms}
                onChange={(v) =>
                  setSistemasLinhas((rows) =>
                    rows.map((r) => (r.key === linha.key ? { ...r, tempoHms: v } : r))
                  )
                }
                helperText="Tempo base deste sistema"
              />
              {pageSupportsTotalSistema ? (
                <TempoInput
                  label="Adic. por un. do Total"
                  value={linha.porTotalHms}
                  onChange={(v) =>
                    setSistemasLinhas((rows) =>
                      rows.map((r) => (r.key === linha.key ? { ...r, porTotalHms: v } : r))
                    )
                  }
                  helperText="× Total do sistema no chamado"
                />
              ) : null}
              <IconButton
                size="small"
                color="error"
                onClick={() => setSistemasLinhas((rows) => rows.filter((r) => r.key !== linha.key))}
                sx={{ mt: { md: 0.5 } }}
                aria-label="Remover sistema"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>

        <Stack direction="row" gap={1} sx={{ mt: 1.5 }} flexWrap="wrap">
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setSistemasLinhas((rows) => [...rows, newSistemaLinhaDraft()])}
            sx={{ textTransform: 'none' }}
          >
            Adicionar sistema
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() =>
              setSistemasLinhas((rows) => [...rows, newSistemaLinhaDraft({ sistemaId: '' })])
            }
            sx={{ textTransform: 'none' }}
          >
            + Padrão (qualquer)
          </Button>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
          <TextField
            label="Qtd. ref. (opcional)"
            size="small"
            sx={{ width: { xs: '100%', md: 140 } }}
            placeholder="ex.: 2"
            value={qtyDraft.qtdSistemas ?? ''}
            onChange={(e) => setQtyDraft((d) => ({ ...d, qtdSistemas: e.target.value }))}
            helperText="Só preview; no chamado usa a qtd real"
            inputProps={{ inputMode: 'numeric' }}
          />
          <TempoInput
            label="Tempo adicional (demais sistemas)"
            value={tempoDraft.tempoSistemasAdicionalSeconds ?? ''}
            onChange={(v) => setTempoDraft((d) => ({ ...d, tempoSistemasAdicionalSeconds: v }))}
            helperText="Sistemas do chamado sem linha específica/padrão"
          />
          {pageSupportsTotalSistema ? (
            <TempoInput
              label="Adic. por Total (demais)"
              value={adicPorTotalDemaisHms}
              onChange={setAdicPorTotalDemaisHms}
              helperText="× Total nos sistemas demais"
            />
          ) : null}
        </Stack>
      </Box>
    )
  }

  function renderQuantityRow(q: QuantityFieldConfig) {
    if (q.key === 'qtdSistemas') return renderSistemasBlock()

    const qtd = parsePtBrNumber(qtyDraft[q.key])
    const base = parseHmsToSeconds(tempoDraft[q.tempoBaseKey])
    const adic = parseHmsToSeconds(tempoDraft[q.tempoAdicionalKey])
    const line = computeQuantityLineSeconds(qtd, base, adic)
    const n = qtd == null || qtd < 1 ? 1 : qtd

    return (
      <Box
        key={q.key}
        sx={{
          p: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          {q.label}
        </Typography>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5} alignItems={{ md: 'flex-start' }}>
          <TextField
            label="Quantidade"
            size="small"
            sx={{ width: { xs: '100%', md: 120 } }}
            placeholder="1"
            value={qtyDraft[q.key] ?? ''}
            onChange={(e) => setQtyDraft((d) => ({ ...d, [q.key]: e.target.value }))}
            onBlur={() => {
              const n = parsePtBrNumber(qtyDraft[q.key])
              setQtyDraft((d) => ({
                ...d,
                [q.key]: n == null ? '' : formatIntPtBr(Math.round(n)),
              }))
            }}
            helperText="Só para preview do total; no chamado usa a qtd real"
            inputProps={{ inputMode: 'numeric' }}
          />
          <TempoInput
            label="Tempo total (1ª un.)"
            value={tempoDraft[q.tempoBaseKey] ?? ''}
            onChange={(v) => setTempoDraft((d) => ({ ...d, [q.tempoBaseKey]: v }))}
            helperText="Ex.: 5 min para 1 unidade"
          />
          <TempoInput
            label="Tempo adicional (>1)"
            value={tempoDraft[q.tempoAdicionalKey] ?? ''}
            onChange={(v) => setTempoDraft((d) => ({ ...d, [q.tempoAdicionalKey]: v }))}
            helperText="Somado a cada unidade além da 1ª"
          />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {line > 0
            ? `Subtotal (${n} un.): ${formatSecondsToHms(line)} = base${
                n > 1 ? ` + ${n - 1}× adicional` : ''
              }`
            : 'Preencha quantidade e tempos desta métrica (opcional).'}
        </Typography>
      </Box>
    )
  }

  const pct = percentOfJornada(totalPreviewSeconds)

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
          <Typography variant="h6">Produtividade</Typography>
          <Typography variant="body2" color="text.secondary">
            Tempo previsto por página e tipos. Em Sistemas: tempo por sistema (ou padrão), adicional
            para os demais e, em Manutenções, adicional pelo Total de cada sistema. Jornada:{' '}
            <strong>08:00:00</strong>.
          </Typography>
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end">
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
          getRowId={(r) => (r as ProdutividadeRule).id}
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
                  const cfg = getPageConfig(nextKey)
                  setForm({
                    pageKey: nextKey,
                    ativo: form.ativo !== false,
                    tipo1Id: null,
                    tipo2Id: null,
                  })
                  setQtyDraft(emptyQtyDraft(ALL_QTY_KEYS))
                  setTempoDraft(emptyTempoDraft(cfg))
                  setSistemasLinhas([])
                  setAdicPorTotalDemaisHms('')
                }}
              >
                {PRODUTIVIDADE_PAGES.map((p: PageProdutividadeConfig) => (
                  <MenuItem key={p.pageKey} value={p.pageKey}>
                    {p.label}
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

            {pageCfg.quantities.length > 0 && (
              <>
                <Divider />
                <Typography variant="subtitle2">Quantidades e tempos</Typography>
                <Typography variant="caption" color="text.secondary">
                  Ex.: 1 sistema = 5 min (tempo total); 2 sistemas = 5 min + 1× adicional.
                </Typography>
                <Stack gap={1.5}>{pageCfg.quantities.map(renderQuantityRow)}</Stack>
              </>
            )}

            {pageCfg.allowTempoFixo && pageCfg.quantities.length === 0 && (
              <TempoInput
                label="Tempo previsto"
                value={tempoDraft.tempoFixo ?? ''}
                onChange={(v) => setTempoDraft((d) => ({ ...d, tempoFixo: v }))}
                helperText="Digite minutos (ex.: 90) ou HH:MM:SS"
              />
            )}

            <Alert severity="success" variant="outlined">
              Total previsto:{' '}
              <strong>{formatSecondsToHms(totalPreviewSeconds) || '00:00:00'}</strong>
              {pct != null ? ` · ${pct}% da jornada 08:00:00` : ''}
            </Alert>

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
        config={smartImporterConfigs.produtividade}
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
