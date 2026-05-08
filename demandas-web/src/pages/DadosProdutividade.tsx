import { useEffect, useMemo, useState } from 'react'
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
      { field: 'slaHours', headerName: 'SLA (h)', width: 110 },
      { field: 'qtdSistemas', headerName: 'Sistemas', width: 110 },
      { field: 'qtdUsuarios', headerName: 'Usuários', width: 110 },
      { field: 'qtdClientes', headerName: 'Clientes', width: 110 },
      { field: 'qtdRetornos', headerName: 'Retornos', width: 110 },
      { field: 'tempoPrevistoMin', headerName: 'Previsto (min)', width: 130 },
      { field: 'pesoPontos', headerName: 'Peso', width: 90 },
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

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const api = getApi()
      const payload = {
        pageKey: form.pageKey,
        tipoServicoId: form.tipoServicoId || null,
        tipoDemandaId: form.tipoDemandaId || null,
        qtdSistemas: form.qtdSistemas ?? null,
        qtdUsuarios: form.qtdUsuarios ?? null,
        qtdClientes: form.qtdClientes ?? null,
        qtdRetornos: form.qtdRetornos ?? null,
        complexidade: form.complexidade ?? null,
        slaHours: form.slaHours ?? null,
        tempoPrevistoMin: form.tempoPrevistoMin ?? null,
        pesoPontos: form.pesoPontos ?? null,
        ativo: form.ativo !== false,
      }

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
                type="number"
                label="SLA (horas)"
                value={form.slaHours ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, slaHours: e.target.value === '' ? null : Number(e.target.value) }))}
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                fullWidth
                type="number"
                label="Qtd. sistemas"
                value={form.qtdSistemas ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, qtdSistemas: e.target.value === '' ? null : Number(e.target.value) }))
                }
              />
              <TextField
                fullWidth
                type="number"
                label="Qtd. usuários"
                value={form.qtdUsuarios ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, qtdUsuarios: e.target.value === '' ? null : Number(e.target.value) }))
                }
              />
              <TextField
                fullWidth
                type="number"
                label="Qtd. clientes"
                value={form.qtdClientes ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, qtdClientes: e.target.value === '' ? null : Number(e.target.value) }))
                }
              />
              <TextField
                fullWidth
                type="number"
                label="Qtd. retornos"
                value={form.qtdRetornos ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, qtdRetornos: e.target.value === '' ? null : Number(e.target.value) }))
                }
              />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} gap={2}>
              <TextField
                fullWidth
                type="number"
                label="Tempo previsto (min)"
                value={form.tempoPrevistoMin ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, tempoPrevistoMin: e.target.value === '' ? null : Number(e.target.value) }))
                }
              />
              <TextField
                fullWidth
                type="number"
                label="Peso (pontos)"
                value={form.pesoPontos ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, pesoPontos: e.target.value === '' ? null : Number(e.target.value) }))
                }
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
