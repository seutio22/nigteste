import { useEffect, useMemo, useState, type ChangeEvent, type FocusEvent } from 'react'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { getApi } from '../lib/apiConfig'
import { useMasterDataStore } from '../store/masterDataStore'

type Complexidade = 'baixa' | 'media' | 'alta'

type ProdutividadeRule = {
  id: string
  pageKey: string
  tipoServicoId?: string | null
  tipoDemandaId?: string | null
  qtdSistemas?: number | null
  qtdUsuarios?: number | null
  qtdClientes?: number | null
  qtdRetornos?: number | null
  complexidade?: Complexidade | null
  slaHours?: number | null
  tempoPrevistoMin?: number | null
  pesoPontos?: number | null
  ativo: boolean
}

const PAGE_KEYS = [
  'demandas',
  'manutencoes',
  'analytics',
  'atendimentos',
  'validacoes',
  'reajustes',
  'projetos',
] as const

const COMPLEXIDADES: Complexidade[] = ['baixa', 'media', 'alta']

const endpoint = '/produtividade-regras'

/** Campos numéricos do formulário (texto livre com formatação pt-BR). */
type NumFieldKey =
  | 'slaHours'
  | 'qtdSistemas'
  | 'qtdUsuarios'
  | 'qtdClientes'
  | 'qtdRetornos'
  | 'tempoPrevistoMin'
  | 'pesoPontos'

/** Interpreta valor digitado em pt-BR (milhar `.` e decimal `,`). */
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

function emptyNumDraft(): Record<NumFieldKey, string> {
  return {
    slaHours: '',
    qtdSistemas: '',
    qtdUsuarios: '',
    qtdClientes: '',
    qtdRetornos: '',
    tempoPrevistoMin: '',
    pesoPontos: '',
  }
}

function numDraftFromRule(f: Partial<ProdutividadeRule>): Record<NumFieldKey, string> {
  return {
    slaHours: formatIntPtBr(f.slaHours ?? null),
    qtdSistemas: formatIntPtBr(f.qtdSistemas ?? null),
    qtdUsuarios: formatIntPtBr(f.qtdUsuarios ?? null),
    qtdClientes: formatIntPtBr(f.qtdClientes ?? null),
    qtdRetornos: formatIntPtBr(f.qtdRetornos ?? null),
    tempoPrevistoMin: formatDec2PtBr(f.tempoPrevistoMin ?? null),
    pesoPontos: formatDec2PtBr(f.pesoPontos ?? null),
  }
}

function applyNumDraftToForm(
  f: Partial<ProdutividadeRule>,
  draft: Record<NumFieldKey, string>
): Partial<ProdutividadeRule> {
  const intVal = (s: string) => {
    const n = parsePtBrNumber(s)
    return n == null ? null : Math.round(n)
  }
  const decVal = (s: string) => parsePtBrNumber(s)
  return {
    ...f,
    slaHours: intVal(draft.slaHours),
    qtdSistemas: intVal(draft.qtdSistemas),
    qtdUsuarios: intVal(draft.qtdUsuarios),
    qtdClientes: intVal(draft.qtdClientes),
    qtdRetornos: intVal(draft.qtdRetornos),
    tempoPrevistoMin: decVal(draft.tempoPrevistoMin),
    pesoPontos: decVal(draft.pesoPontos),
  }
}

export default function DadosProdutividadePage() {
  const store = useMasterDataStore()
  const [rows, setRows] = useState<ProdutividadeRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<ProdutividadeRule>>({
    pageKey: 'demandas',
    ativo: true,
  })
  const [numDraft, setNumDraft] = useState<Record<NumFieldKey, string>>(emptyNumDraft)

  const columns = useMemo<GridColDef[]>(
    () => [
      { field: 'pageKey', headerName: 'Página', width: 140 },
      {
        field: 'tipoServicoId',
        headerName: 'Tipo Serviço',
        width: 180,
        valueGetter: (_, row) =>
          row.tipoServicoId
            ? store.tiposServico.find((t) => t.id === row.tipoServicoId)?.nome ?? row.tipoServicoId
            : '—',
      },
      {
        field: 'tipoDemandaId',
        headerName: 'Tipo Demanda',
        width: 180,
        valueGetter: (_, row) =>
          row.tipoDemandaId
            ? store.tiposDemanda.find((t) => t.id === row.tipoDemandaId)?.nome ?? row.tipoDemandaId
            : '—',
      },
      { field: 'complexidade', headerName: 'Complexidade', width: 140 },
      { field: 'slaHours', headerName: 'SLA (h)', width: 110, valueFormatter: (v) => (v != null ? formatIntPtBr(Number(v)) : '—') },
      { field: 'qtdSistemas', headerName: 'Sistemas', width: 110, valueFormatter: (v) => (v != null ? formatIntPtBr(Number(v)) : '—') },
      { field: 'qtdUsuarios', headerName: 'Usuários', width: 110, valueFormatter: (v) => (v != null ? formatIntPtBr(Number(v)) : '—') },
      { field: 'qtdClientes', headerName: 'Clientes', width: 110, valueFormatter: (v) => (v != null ? formatIntPtBr(Number(v)) : '—') },
      { field: 'qtdRetornos', headerName: 'Retornos', width: 110, valueFormatter: (v) => (v != null ? formatIntPtBr(Number(v)) : '—') },
      { field: 'tempoPrevistoMin', headerName: 'Previsto (min)', width: 130, valueFormatter: (v) => (v != null ? formatDec2PtBr(Number(v)) : '—') },
      { field: 'pesoPontos', headerName: 'Peso', width: 90, valueFormatter: (v) => (v != null ? formatDec2PtBr(Number(v)) : '—') },
      {
        field: 'ativo',
        headerName: 'Ativo',
        width: 110,
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
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setForm(params.row as ProdutividadeRule)
                setOpen(true)
              }}
            >
              Editar
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => handleDelete(String((params.row as ProdutividadeRule).id))}
            >
              Excluir
            </Button>
          </Stack>
        ),
      },
    ],
    [store.tiposServico, store.tiposDemanda]
  )

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
    fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!open) {
      setNumDraft(emptyNumDraft())
      return
    }
    setNumDraft(numDraftFromRule(form))
  }, [
    open,
    form.id,
    form.slaHours,
    form.qtdSistemas,
    form.qtdUsuarios,
    form.qtdClientes,
    form.qtdRetornos,
    form.tempoPrevistoMin,
    form.pesoPontos,
  ])

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      const merged = applyNumDraftToForm(form, numDraft)
      const payload = {
        pageKey: merged.pageKey,
        tipoServicoId: merged.tipoServicoId || null,
        tipoDemandaId: merged.tipoDemandaId || null,
        qtdSistemas: merged.qtdSistemas ?? null,
        qtdUsuarios: merged.qtdUsuarios ?? null,
        qtdClientes: merged.qtdClientes ?? null,
        qtdRetornos: merged.qtdRetornos ?? null,
        complexidade: merged.complexidade ?? null,
        slaHours: merged.slaHours ?? null,
        tempoPrevistoMin: merged.tempoPrevistoMin ?? null,
        pesoPontos: merged.pesoPontos ?? null,
        ativo: merged.ativo !== false,
      }

      if (merged.id) {
        await api.put(`${endpoint}/${merged.id}`, payload)
      } else {
        await api.post(endpoint, payload)
      }

      setOpen(false)
      setForm({ pageKey: 'demandas', ativo: true })
      setNumDraft(emptyNumDraft())
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

  type IntNumKey = Exclude<NumFieldKey, 'tempoPrevistoMin' | 'pesoPontos'>

  function bindIntField(key: IntNumKey) {
    return {
      value: numDraft[key],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setNumDraft((d) => ({ ...d, [key]: e.target.value })),
      onBlur: (e: FocusEvent<HTMLInputElement>) => {
        const n = parsePtBrNumber(e.target.value)
        const display = n == null ? '' : formatIntPtBr(Math.round(n))
        setNumDraft((d) => ({ ...d, [key]: display }))
        setForm((f) => ({ ...f, [key]: n == null ? null : Math.round(n) }))
      },
    }
  }

  function bindDec2Field(key: 'tempoPrevistoMin' | 'pesoPontos') {
    return {
      value: numDraft[key],
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setNumDraft((d) => ({ ...d, [key]: e.target.value })),
      onBlur: (e: FocusEvent<HTMLInputElement>) => {
        const n = parsePtBrNumber(e.target.value)
        const display = n == null ? '' : formatDec2PtBr(n)
        setNumDraft((d) => ({ ...d, [key]: display }))
        setForm((f) => ({ ...f, [key]: n == null ? null : n }))
      },
    }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6">Produtividade</Typography>
          <Typography variant="body2" color="text.secondary">
            Matriz de regras para cálculo de tempo previsto.
          </Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setForm({ pageKey: 'demandas', ativo: true })
            setOpen(true)
          }}
        >
          Nova regra
        </Button>
      </Stack>

      {error && (
        <Box sx={{ mb: 2 }}>
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        </Box>
      )}

      <Box sx={{ height: 600, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          getRowId={(r) => (r as any).id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { page: 0, pageSize: 25 } } }}
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
                onChange={(e) => setForm((p) => ({ ...p, pageKey: e.target.value }))}
              >
                {PAGE_KEYS.map((k) => (
                  <MenuItem key={k} value={k}>
                    {k}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Complexidade"
                value={form.complexidade ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, complexidade: (e.target.value || null) as any }))
                }
              >
                <MenuItem value="">(qualquer)</MenuItem>
                {COMPLEXIDADES.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
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

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                select
                fullWidth
                label="Tipo de Serviço (opcional)"
                value={form.tipoServicoId ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, tipoServicoId: e.target.value || null }))}
              >
                <MenuItem value="">(qualquer)</MenuItem>
                {store.tiposServico.map((ts) => (
                  <MenuItem key={ts.id} value={ts.id}>
                    {ts.nome}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                label="Tipo de Demanda (opcional)"
                value={form.tipoDemandaId ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, tipoDemandaId: e.target.value || null }))}
              >
                <MenuItem value="">(qualquer)</MenuItem>
                {store.tiposDemanda.map((td) => (
                  <MenuItem key={td.id} value={td.id}>
                    {td.nome}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                label="SLA (horas)"
                placeholder="ex.: 24 ou 1.000"
                helperText="Ao sair do campo: separador de milhar (.) e valor inteiro."
                inputProps={{ inputMode: 'decimal' }}
                {...bindIntField('slaHours')}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                fullWidth
                label="Qtd. sistemas"
                placeholder="ex.: 10 ou 1.500"
                helperText="Milhar com ponto; inteiro ao sair do campo."
                inputProps={{ inputMode: 'numeric' }}
                {...bindIntField('qtdSistemas')}
              />
              <TextField
                fullWidth
                label="Qtd. usuários"
                placeholder="ex.: 10 ou 1.500"
                helperText="Milhar com ponto; inteiro ao sair do campo."
                inputProps={{ inputMode: 'numeric' }}
                {...bindIntField('qtdUsuarios')}
              />
              <TextField
                fullWidth
                label="Qtd. clientes"
                placeholder="ex.: 10 ou 1.500"
                helperText="Milhar com ponto; inteiro ao sair do campo."
                inputProps={{ inputMode: 'numeric' }}
                {...bindIntField('qtdClientes')}
              />
              <TextField
                fullWidth
                label="Qtd. retornos"
                placeholder="ex.: 10 ou 1.500"
                helperText="Milhar com ponto; inteiro ao sair do campo."
                inputProps={{ inputMode: 'numeric' }}
                {...bindIntField('qtdRetornos')}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                fullWidth
                label="Tempo previsto (min)"
                placeholder="ex.: 90 ou 1.234,50"
                helperText="Ao sair: vírgula decimal e duas casas (ex.: 10,00)."
                inputProps={{ inputMode: 'decimal' }}
                {...bindDec2Field('tempoPrevistoMin')}
              />
              <TextField
                fullWidth
                label="Peso (pontos)"
                placeholder="ex.: 1,25 ou 10,00"
                helperText="Ao sair: vírgula decimal e duas casas (ex.: 10,00)."
                inputProps={{ inputMode: 'decimal' }}
                {...bindDec2Field('pesoPontos')}
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={loading || !form.pageKey}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
