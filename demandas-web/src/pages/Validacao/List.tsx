import { Box, Button, Stack, Typography, IconButton } from '@mui/material'
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid'
import { useNavigate } from 'react-router-dom'
import { useValidationStore } from '@/store/validationStore'
import { useMasterDataStore } from '@/store/masterDataStore'
import DeleteIcon from '@mui/icons-material/Delete'

export default function ValidationListPage() {
  const navigate = useNavigate()
  const store = useValidationStore()
  const md = useMasterDataStore()

  const columns: GridColDef[] = [
    { field: 'acoes', headerName: 'Ações', width: 80, sortable: false, filterable: false, renderCell: (p) => (
      <IconButton size="small" color="error" onClick={() => store.remove(String(p.id))}><DeleteIcon fontSize="small" /></IconButton>
    ) },
    { field: 'analistaNome', headerName: 'Analista', width: 180 },
    { field: 'dataInicio', headerName: 'Data de início', width: 140 },
    { field: 'dataFinal', headerName: 'Data de finalização', width: 160 },
    { field: 'status', headerName: 'Status', width: 160 },
    { field: 'periodicidade', headerName: 'Periodicidade', width: 160 },
    { field: 'ticket', headerName: 'Nº Ticket', width: 140 },
    { field: 'solicitante', headerName: 'Solicitante', width: 180 },
    { field: 'areaNome', headerName: 'Área solicitante', width: 180 },
    { field: 'demanda', headerName: 'Demanda', width: 180 },
    { field: 'tipoNome', headerName: 'Tipo de demanda', width: 180 },
    { field: 'descricao', headerName: 'Descrição de demanda', flex: 1, minWidth: 220 },
    { field: 'total', headerName: 'Total', width: 120 },
  ]

  const rows = store.items.map((v) => ({
    id: v.id,
    analistaNome: md.analistas.find(a => a.id === v.analista)?.nome ?? '',
    dataInicio: v.dataInicio ?? '',
    dataFinal: v.dataFinal ?? '',
    status: v.status ?? '',
    periodicidade: v.periodicidade ?? '',
    ticket: v.ticket ?? '',
    solicitante: v.solicitante ?? '',
    areaNome: md.areas.find(ar => ar.id === v.area)?.nome ?? '',
    demanda: v.demanda ?? '',
    tipoNome: md.tiposDemanda.find(t => t.id === v.tipo)?.nome ?? '',
    descricao: v.descricao ?? '',
    total: v.total ?? 0,
  }))

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Validação</Typography>
        <Button variant="contained" onClick={() => navigate('/validacao/nova')}>Novo lançamento</Button>
      </Stack>
      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          columns={columns}
          rows={rows}
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 300 } } }}
        />
      </div>
    </Box>
  )
}


