import { Box, Button, Stack, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar, GridColumnVisibilityModel, GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useDemandStore } from '@/store/demandStore'
import { useMasterDataStore } from '@/store/masterDataStore'
import { StatusBadge } from '@/components/StatusBadge'
import { useEffect, useState } from 'react'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import VisibilityIcon from '@mui/icons-material/Visibility'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import DeleteIcon from '@mui/icons-material/Delete'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'

const columns: GridColDef[] = [
  { field: 'acoes', headerName: 'Ações', width: 80, sortable: false, filterable: false, renderCell: (p) => (
    <ActionCell id={String(p.id)} status={String(p.row.status ?? '')} />
  ) },
  { field: 'ticket', headerName: 'Nº Ticket', width: 140 },
  { field: 'descricao', headerName: 'Descrição', flex: 1, minWidth: 220 },
  { field: 'status', headerName: 'Status', width: 150, renderCell: (p) => <StatusBadge status={String(p.value ?? '')} /> },
  { field: 'analista', headerName: 'Analista', width: 160 },
  { field: 'area', headerName: 'Área', width: 160 },
  { field: 'cliente', headerName: 'Cliente', width: 200 },
  { field: 'contrato', headerName: 'Contrato', width: 140 },
  { field: 'operadora', headerName: 'Operadora', width: 160 },
  { field: 'produto', headerName: 'Produto', width: 160 },
  { field: 'tipoServico', headerName: 'Tipo de serviço', width: 180 },
  { field: 'updatedAt', headerName: 'Atualizado em', width: 160 },
]

export default function DemandListPage() {
  const navigate = useNavigate()
  const { items } = useDemandStore()
  const md = useMasterDataStore()

  const STORAGE_KEY = 'demands-list-view-v1'
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({})
  const [sortModel, setSortModel] = useState<GridSortModel>([])
  const [filterModel, setFilterModel] = useState<GridFilterModel>({ items: [], quickFilterValues: [] })
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 })

  // carregar preferências
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const saved = JSON.parse(raw)
      if (saved.columnVisibilityModel) setColumnVisibilityModel(saved.columnVisibilityModel)
      if (saved.sortModel) setSortModel(saved.sortModel)
      if (saved.filterModel) setFilterModel(saved.filterModel)
      if (saved.paginationModel) setPaginationModel(saved.paginationModel)
    } catch {}
  }, [])

  function persist(next: Partial<{ columnVisibilityModel: GridColumnVisibilityModel; sortModel: GridSortModel; filterModel: GridFilterModel; paginationModel: GridPaginationModel }>) {
    try {
      const current = {
        columnVisibilityModel,
        sortModel,
        filterModel,
        paginationModel,
      }
      const merged = { ...current, ...next }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {}
  }

  const rows = items.map((d) => ({
    id: d.id,
    ticket: d.ticket ?? '',
    descricao: d.descricao ?? '',
    status: d.status,
    analista: md.analistas.find(a => a.id === d.analista)?.nome ?? '',
    area: md.areas.find(a => a.id === d.area)?.nome ?? '',
    cliente: md.clientes.find(c => c.id === d.cliente)?.nome ?? '',
    contrato: md.contratos.find(c => c.id === d.contrato)?.codigo ?? '',
    operadora: md.operadoras.find(o => o.id === d.operadora)?.nome ?? '',
    produto: md.produtos.find(p => p.id === d.produto)?.nome ?? '',
    tipoServico: md.tiposServico.find(ts => ts.id === (d as any).tipoServico)?.nome ?? '',
    updatedAt: new Date(d.updatedAt).toLocaleString('pt-BR'),
  }))

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Cadastro</Typography>
        <Button variant="contained" onClick={() => navigate('/cadastro/nova')}>Nova demanda</Button>
      </Stack>
      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          columns={columns}
          rows={rows}
          disableRowSelectionOnClick
          onRowDoubleClick={(p) => navigate(`/cadastro/${p.id}`)}
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
          pageSizeOptions={[10, 25, 50]}
          // modelos controlados + persistência
          columnVisibilityModel={columnVisibilityModel}
          onColumnVisibilityModelChange={(m) => { setColumnVisibilityModel(m); persist({ columnVisibilityModel: m }) }}
          sortModel={sortModel}
          onSortModelChange={(m) => { setSortModel(m); persist({ sortModel: m }) }}
          filterModel={filterModel}
          onFilterModelChange={(m) => { setFilterModel(m); persist({ filterModel: m }) }}
          paginationModel={paginationModel}
          onPaginationModelChange={(m) => { setPaginationModel(m); persist({ paginationModel: m }) }}
          sx={{
            '& .MuiDataGrid-row:nth-of-type(odd)': { backgroundColor: (t) => t.palette.action.hover },
          }}
        />
      </div>
    </Box>
  )
}

function ActionCell({ id, status }: { id: string, status: string }) {
  const navigate = useNavigate()
  const store = useDemandStore()
  const md = useMasterDataStore()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [openStatus, setOpenStatus] = useState(false)
  const [newStatus, setNewStatus] = useState(status)
  const [openDelete, setOpenDelete] = useState(false)

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget)
  const handleMenuClose = () => setAnchorEl(null)

  const doChangeStatus = () => {
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    const from = d.status
    const next = { ...d, status: newStatus, updatedAt: new Date().toISOString() }
    store.upsert(next)
    store.log({ demandaId: id, type: 'status_change', field: 'status', from, to: newStatus })
    setOpenStatus(false)
  }

  const doDelete = () => {
    store.remove(id)
    setOpenDelete(false)
  }

  const doDuplicate = () => {
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    const { id: _omit, createdAt: _c, updatedAt: _u, ticket: _t, ...rest } = d
    const duplicated = store.add({ ...rest, status: 'Aberta', ticket: undefined })
    navigate(`/cadastro/${duplicated.id}`)
  }

  const doExportPdf = () => {
    const d = store.items.find((x) => x.id === id)
    if (!d) return
    const label = (val?: string, arr?: { id: string, nome: string }[]) => arr?.find(a => a.id === val)?.nome || '-'
    const contrato = md.contratos.find(c => c.id === d.contrato)?.codigo || '-'
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Demanda ${d.id}</title>
    <style>body{font-family:Arial, sans-serif; padding:24px;} h1{font-size:18px;} table{width:100%; border-collapse:collapse;} td{padding:6px; border-bottom:1px solid #ddd;} .muted{color:#555;}</style>
    </head><body>
    <h1>Demanda ${d.id}</h1>
    <table>
      <tr><td class="muted">Status</td><td>${d.status}</td></tr>
      <tr><td class="muted">Cliente</td><td>${label(d.cliente, md.clientes)}</td></tr>
      <tr><td class="muted">Contrato</td><td>${contrato}</td></tr>
      <tr><td class="muted">Operadora</td><td>${label(d.operadora, md.operadoras)}</td></tr>
      <tr><td class="muted">Produto</td><td>${label(d.produto, md.produtos)}</td></tr>
      <tr><td class="muted">Sistema</td><td>${label(d.sistema, md.sistemas)}</td></tr>
      <tr><td class="muted">Área</td><td>${label(d.area, md.areas)}</td></tr>
      <tr><td class="muted">Analista</td><td>${label(d.analista, md.analistas)}</td></tr>
      <tr><td class="muted">Tipo</td><td>${label(d.tipo, md.tiposDemanda)}</td></tr>
      <tr><td class="muted">Descrição</td><td>${d.descricao ?? '-'}</td></tr>
      <tr><td class="muted">Atualizado em</td><td>${new Date(d.updatedAt).toLocaleString('pt-BR')}</td></tr>
    </table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  return (
    <>
      <IconButton size="small" onClick={handleMenuOpen}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleMenuClose} keepMounted>
        <MenuItem onClick={() => { handleMenuClose(); navigate(`/cadastro/${id}`) }}>
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Ver</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); doDuplicate() }}>
          <ListItemIcon><FileCopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Duplicar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setOpenStatus(true) }}>
          <ListItemIcon><SwapHorizIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Alterar status</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); doExportPdf() }}>
          <ListItemIcon><PictureAsPdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Exportar PDF</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); setOpenDelete(true) }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      <Dialog open={openStatus} onClose={() => setOpenStatus(false)}>
        <DialogTitle>Alterar status</DialogTitle>
        <DialogContent>
          <TextField select label="Novo status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)} sx={{ mt: 1, minWidth: 280 }}>
            {['Aberta','Em andamento','Aguardando validação','Com erros','Em reajuste','Concluída','Cancelada'].map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStatus(false)}>Cancelar</Button>
          <Button variant="contained" onClick={doChangeStatus}>Confirmar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openDelete} onClose={() => setOpenDelete(false)}>
        <DialogTitle>Excluir demanda</DialogTitle>
        <DialogContent>
          <Typography variant="body2">Tem certeza que deseja excluir esta demanda?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDelete(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={doDelete}>Excluir</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}


