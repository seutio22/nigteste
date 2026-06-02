import React, { useEffect, useState } from 'react'
import { Box, Button, IconButton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { usePlacementStore, type PlacementCorretorParceiro } from '../../store/placementStore'
import { SnackNotification } from '../../components/SnackNotification'
import { CorretorParceiroFormModal } from './CorretorParceiroFormModal'

export default function CorretoresParceirosTab() {
  const {
    corretoresParceiros,
    isLoadingCorretores,
    syncCorretoresParceiros,
    addCorretorParceiro,
    updateCorretorParceiro,
    removeCorretorParceiro,
  } = usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementCorretorParceiro | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    void syncCorretoresParceiros(true)
  }, [syncCorretoresParceiros])

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementCorretorParceiro) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementCorretorParceiro) => {
    if (
      !window.confirm(
        `Excluir o corretor parceiro "${row.nome}"? Cotações que o utilizavam ficarão sem corretor vinculado.`
      )
    ) {
      return
    }
    try {
      await removeCorretorParceiro(row.id)
      setSnack({ open: true, message: 'Registro excluído com sucesso.', severity: 'success' })
    } catch (err: any) {
      setSnack({
        open: true,
        message: err?.message || 'Erro ao excluir.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: { nome: string }) => {
    if (editing?.id) {
      await updateCorretorParceiro(editing.id, data)
      setSnack({ open: true, message: 'Corretor atualizado com sucesso.', severity: 'success' })
    } else {
      await addCorretorParceiro(data)
      setSnack({ open: true, message: 'Corretor cadastrado com sucesso.', severity: 'success' })
    }
  }

  const columns: GridColDef<PlacementCorretorParceiro>[] = [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 240 },
    {
      field: 'acoes',
      headerName: 'Ações',
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton size="small" aria-label="Editar" onClick={() => handleEdit(params.row)}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" aria-label="Excluir" onClick={() => void handleDelete(params.row)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ]

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Typography variant="body2" color="text.secondary">
          Cadastro utilizado na Fila de cotações (campo ao lado da filial). Apenas o nome é obrigatório.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void syncCorretoresParceiros(true)}
            disabled={isLoadingCorretores}
          >
            Atualizar
          </Button>
          <PrimaryActionButton startIcon={<AddIcon />} onClick={handleAdd}>
            Novo corretor
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={corretoresParceiros}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoadingCorretores}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
            sorting: { sortModel: [{ field: 'nome', sort: 'asc' }] },
          }}
          sx={{
            '& .MuiDataGrid-cell': { borderBottom: '1px solid #e0e0e0' },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: '#f5f5f5',
              borderBottom: '2px solid #e0e0e0',
            },
          }}
        />
      </div>

      <CorretorParceiroFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        editingItem={editing}
        onSubmit={handleSubmit}
      />

      <SnackNotification snack={snack} />
    </Box>
  )
}
