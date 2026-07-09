import React, { useEffect, useState } from 'react'
import { Box, Button, IconButton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { usePlacementStore, type PlacementAnalista } from '../../store/placementStore'
import { SnackNotification } from '../../components/SnackNotification'
import { PlacementAnalistaFormModal } from './PlacementAnalistaFormModal'

export default function AnalistasTab() {
  const {
    analistas,
    isLoadingAnalistas,
    syncAnalistas,
    addAnalista,
    updateAnalista,
    removeAnalista,
  } = usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementAnalista | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    void syncAnalistas(true)
  }, [syncAnalistas])

  const columns: GridColDef<PlacementAnalista>[] = [
    { field: 'nome', headerName: 'Nome do analista', flex: 1, minWidth: 180 },
    { field: 'coordenadorAnalista', headerName: 'Coordenador analista', flex: 1, minWidth: 160 },
    { field: 'gerenteAnalista', headerName: 'Gerente analista', flex: 1, minWidth: 160 },
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
          <IconButton
            size="small"
            aria-label="Excluir"
            onClick={() => void handleDelete(params.row)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Stack>
      ),
    },
  ]

  function handleEdit(row: PlacementAnalista) {
    setEditing(row)
    setOpenForm(true)
  }

  async function handleDelete(row: PlacementAnalista) {
    if (
      !window.confirm(
        `Excluir o analista "${row.nome}"? Cotações com este responsável ficarão sem designação.`
      )
    ) {
      return
    }
    try {
      await removeAnalista(row.id)
      setSnack({ open: true, message: 'Registro excluído com sucesso.', severity: 'success' })
    } catch (err: any) {
      setSnack({
        open: true,
        message: err?.message || 'Erro ao excluir.',
        severity: 'error',
      })
    }
  }

  async function handleSubmit(data: {
    nome: string
    coordenadorAnalista: string
    gerenteAnalista: string
  }) {
    if (editing?.id) {
      await updateAnalista(editing.id, data)
      setSnack({ open: true, message: 'Analista atualizado com sucesso.', severity: 'success' })
    } else {
      await addAnalista(data)
      setSnack({ open: true, message: 'Analista cadastrado com sucesso.', severity: 'success' })
    }
  }

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="body2" color="text.secondary">
          Catálogo para designar o analista responsável pelo processo na Fila (antes de Solicitação Mercado).
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void syncAnalistas(true)}
            disabled={isLoadingAnalistas}
          >
            Atualizar
          </Button>
          <PrimaryActionButton
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null)
              setOpenForm(true)
            }}
          >
            Novo analista
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={analistas}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoadingAnalistas}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10, page: 0 } },
            sorting: { sortModel: [{ field: 'nome', sort: 'asc' }] },
          }}
        />
      </div>

      <PlacementAnalistaFormModal
        open={openForm}
        onClose={() => {
          setOpenForm(false)
          setEditing(null)
        }}
        editingItem={editing}
        onSubmit={handleSubmit}
      />

      {snack && (
        <SnackNotification
          open={snack.open}
          message={snack.message}
          severity={snack.severity}
          onClose={() => setSnack(null)}
        />
      )}
    </Box>
  )
}
