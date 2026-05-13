import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityIcon from '@mui/icons-material/Visibility'
import EditIcon from '@mui/icons-material/Edit'
import ViewListIcon from '@mui/icons-material/ViewList'
import ViewKanbanIcon from '@mui/icons-material/ViewKanban'
import { PrimaryActionButton } from '../../../components/PrimaryActionButton'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementCotacaoStore, COTACAO_STATUSES, type PlacementCotacao } from '../../../store/placementCotacaoStore'
import { formatCentsToBRL, getStatusColor } from './utils'
import { formatGridDatePtBR, gridCellToDate } from '../../../utils/gridDate'

type ViewMode = 'lista' | 'kanban'

export default function PlacementFilaListPage() {
  const navigate = useNavigate()
  const { cotacoes, isLoading, syncCotacoes } = usePlacementCotacaoStore()
  const { analistasById, clientesById, syncFromApi } = useMasterDataStore()

  const [viewMode, setViewMode] = useState<ViewMode>('lista')

  useEffect(() => {
    syncFromApi?.()
    syncCotacoes()
  }, [syncFromApi, syncCotacoes])

  const rows = useMemo(
    () =>
      cotacoes.map((c) => ({
        ...c,
        analistaNome:
          c.analista?.nome ?? (c.analistaId ? analistasById[c.analistaId]?.nome : '') ?? '',
        clienteNome:
          c.cliente?.nome ?? (c.clienteId ? clientesById[c.clienteId]?.nome : '') ?? '',
      })),
    [cotacoes, analistasById, clientesById]
  )

  const columns: GridColDef[] = [
    {
      field: 'acoes',
      headerName: 'Ações',
      width: 100,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Abrir">
            <IconButton size="small" onClick={() => navigate(`/placement/fila/${params.row.id}`)}>
              <VisibilityIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => navigate(`/placement/fila/${params.row.id}/edit`)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
    { field: 'ticket', headerName: 'Nº Cotação', width: 160 },
    {
      field: 'status',
      headerName: 'Status',
      width: 180,
      renderCell: (p) => {
        const cfg = getStatusColor(String(p.value ?? ''))
        return (
          <Chip
            label={String(p.value ?? '—')}
            size="small"
            sx={{ bgcolor: cfg.bg, color: cfg.text, fontWeight: 600 }}
          />
        )
      },
    },
    { field: 'clienteNome', headerName: 'Estipulante / Cliente', flex: 1, minWidth: 200 },
    { field: 'ramo', headerName: 'Ramo', width: 160 },
    { field: 'analistaNome', headerName: 'Analista', width: 180 },
    {
      field: 'operadorasIds',
      headerName: 'Operadoras',
      width: 130,
      valueGetter: (_, row) =>
        Array.isArray(row.operadorasIds) ? row.operadorasIds.length : 0,
    },
    {
      field: 'vidas',
      headerName: 'Vidas',
      width: 100,
      type: 'number',
    },
    {
      field: 'valorEstimadoCents',
      headerName: 'Valor estimado',
      width: 160,
      renderCell: (p) => formatCentsToBRL(Number(p.value)),
    },
    {
      field: 'dataLimite',
      headerName: 'Data limite',
      width: 130,
      type: 'dateTime',
      valueGetter: (_, row) => {
        if (!row.dataLimite) return null
        const d = new Date(row.dataLimite)
        return Number.isNaN(d.getTime()) ? null : d
      },
      valueFormatter: (value) => formatGridDatePtBR(value),
      sortComparator: (v1, v2) => {
        if (!v1 && !v2) return 0
        if (!v1) return 1
        if (!v2) return -1
        return gridCellToDate(v1).getTime() - gridCellToDate(v2).getTime()
      },
    },
    {
      field: 'updatedAt',
      headerName: 'Atualizado em',
      width: 160,
      type: 'dateTime',
      valueGetter: (_, row) => {
        if (!row.updatedAt) return null
        const d = new Date(row.updatedAt)
        return Number.isNaN(d.getTime()) ? null : d
      },
      valueFormatter: (value) => formatGridDatePtBR(value),
    },
  ]

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ md: 'center' }}
          justifyContent="space-between"
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Fila Placement
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cotações em andamento — registre uma nova ou acompanhe o que está em curso.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup
              size="small"
              value={viewMode}
              exclusive
              onChange={(_, v) => v && setViewMode(v)}
              aria-label="modo de visualização"
            >
              <ToggleButton value="lista" aria-label="lista">
                <ViewListIcon fontSize="small" sx={{ mr: 0.5 }} /> Lista
              </ToggleButton>
              <ToggleButton value="kanban" aria-label="kanban">
                <ViewKanbanIcon fontSize="small" sx={{ mr: 0.5 }} /> Kanban
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => syncCotacoes(true)}
              disabled={isLoading}
            >
              Atualizar
            </Button>
            <PrimaryActionButton
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => navigate('/placement/fila/nova')}
            >
              Nova cotação
            </PrimaryActionButton>
          </Stack>
        </Stack>
      </Paper>

      {viewMode === 'lista' ? (
        <Paper sx={{ height: 'calc(100vh - 280px)', minHeight: 480, p: 1 }}>
          <DataGrid
            rows={rows}
            columns={columns}
            loading={isLoading}
            disableRowSelectionOnClick
            slots={{ toolbar: GridToolbar }}
            slotProps={{ toolbar: { showQuickFilter: true } }}
            onRowDoubleClick={(p) => navigate(`/placement/fila/${p.id}`)}
            initialState={{
              sorting: { sortModel: [{ field: 'updatedAt', sort: 'desc' }] },
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </Paper>
      ) : (
        <KanbanBoard cotacoes={rows} />
      )}
    </Container>
  )
}

interface KanbanBoardProps {
  cotacoes: (PlacementCotacao & { analistaNome?: string; clienteNome?: string })[]
}

function KanbanBoard({ cotacoes }: KanbanBoardProps) {
  const navigate = useNavigate()
  const updateCotacao = usePlacementCotacaoStore((s) => s.updateCotacao)

  const grouped = useMemo(() => {
    const map: Record<string, typeof cotacoes> = {}
    for (const status of COTACAO_STATUSES) map[status] = []
    for (const c of cotacoes) {
      const k = (c.status as string) ?? 'Aberta'
      if (!map[k]) map[k] = []
      map[k].push(c)
    }
    return map
  }, [cotacoes])

  function onDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  async function onDrop(e: React.DragEvent, status: string) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (!id) return
    const card = cotacoes.find((c) => c.id === id)
    if (!card || card.status === status) return
    try {
      await updateCotacao(id, { status })
    } catch (err) {
      console.error('❌ kanban drop:', err)
    }
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COTACAO_STATUSES.length}, minmax(260px, 1fr))`,
        gap: 1.5,
        overflowX: 'auto',
        pb: 1,
      }}
    >
      {COTACAO_STATUSES.map((status) => {
        const cfg = getStatusColor(status)
        const items = grouped[status] ?? []
        return (
          <Paper
            key={status}
            sx={{ p: 1.5, minHeight: 480, bgcolor: 'grey.50', display: 'flex', flexDirection: 'column' }}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, status)}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Chip
                label={status}
                size="small"
                sx={{ bgcolor: cfg.bg, color: cfg.text, fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary">
                {items.length}
              </Typography>
            </Stack>
            <Stack spacing={1}>
              {items.map((c) => (
                <Paper
                  key={c.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, c.id)}
                  onClick={() => navigate(`/placement/fila/${c.id}`)}
                  sx={{
                    p: 1.5,
                    cursor: 'grab',
                    borderLeft: `3px solid ${cfg.text}`,
                    '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' },
                    transition: 'all .15s ease',
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {c.ticket}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {c.clienteNome || '—'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {c.ramo || 'Sem ramo'} · {Array.isArray(c.operadorasIds) ? c.operadorasIds.length : 0} op.
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {c.analistaNome || ''}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {formatCentsToBRL(c.valorEstimadoCents ?? null)}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
              {items.length === 0 && (
                <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center', mt: 2 }}>
                  Solte uma cotação aqui
                </Typography>
              )}
            </Stack>
          </Paper>
        )
      })}
    </Box>
  )
}
