import { Box, Button, Stack, Typography } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useReajusteStore } from '@/store/reajusteStore'
import { useMasterDataStore } from '@/store/masterDataStore'

const columns: GridColDef[] = [
  { field: 'acoes', headerName: 'Ações', width: 100, sortable: false, filterable: false, renderCell: (p) => (
    <Button size="small" variant="outlined" onClick={() => (window.location.href = `/reajuste/${p.id}`)} disabled>Ver</Button>
  ) },
  { field: 'mes', headerName: 'Mês', width: 100 },
  { field: 'ano', headerName: 'Ano', width: 100 },
  { field: 'filial', headerName: 'Filial', width: 160 },
  { field: 'operadora', headerName: 'Operadora', width: 200 },
  { field: 'responsavelAnalista', headerName: 'Analista', width: 200 },
  { field: 'cliente', headerName: 'Cliente', width: 200 },
  { field: 'contrato', headerName: 'Contrato', width: 140 },
  { field: 'produto', headerName: 'Produto', width: 160 },
  { field: 'total', headerName: 'Total', width: 140 },
]

export default function ReajusteListPage() {
  const navigate = useNavigate()
  const store = useReajusteStore()
  const md = useMasterDataStore()

  const rows = store.items.map((r) => ({
    id: r.id,
    mes: r.mes,
    ano: r.ano,
    filial: r.filial ?? '',
    operadora: md.operadoras.find(o => o.id === r.operadora)?.nome ?? '',
    responsavelAnalista: md.analistas.find(a => a.id === r.responsavelAnalista)?.nome ?? '',
    cliente: md.clientes.find(c => c.id === r.cliente)?.nome ?? '',
    contrato: md.contratos.find(c => c.id === r.contrato)?.codigo ?? '',
    produto: md.produtos.find(p => p.id === r.produto)?.nome ?? '',
    total: r.total ?? 0,
  }))

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Reajuste</Typography>
        <Button variant="contained" onClick={() => navigate('/reajuste/nova')}>Novo lançamento</Button>
      </Stack>
      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          columns={columns}
          rows={rows}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
          pageSizeOptions={[10, 25, 50]}
        />
      </div>
    </Box>
  )
}


