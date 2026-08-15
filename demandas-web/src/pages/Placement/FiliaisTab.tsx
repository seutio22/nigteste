import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Chip, IconButton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import {
  usePlacementStore,
  type PlacementFilial,
} from '../../store/placementStore'
import { SnackNotification } from '../../components/SnackNotification'
import { FilialFormModal } from './FilialFormModal'
import { formatCnpj14 } from '../../lib/cnpjAlfanumerico'

export default function FiliaisTab() {
  const { filiais, isLoading, syncFiliais, addFilial, updateFilial, removeFilial } =
    usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementFilial | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    syncFiliais(true)
  }, [syncFiliais])

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementFilial) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementFilial) => {
    if (
      !window.confirm(
        `Excluir a filial "${row.razaoSocial}"? Esta ação não pode ser desfeita.`
      )
    ) {
      return
    }
    try {
      await removeFilial(row.id)
      setSnack({
        open: true,
        message: 'Filial excluída com sucesso.',
        severity: 'success',
      })
    } catch (err: any) {
      setSnack({
        open: true,
        message: err?.message || 'Erro ao excluir a filial.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: {
    razaoSocial: string
    cnpj: string
    status: 'Ativo' | 'Inativo'
  }) => {
    if (editing?.id) {
      await updateFilial(editing.id, data)
      setSnack({
        open: true,
        message: 'Filial atualizada com sucesso.',
        severity: 'success',
      })
    } else {
      await addFilial(data)
      setSnack({
        open: true,
        message: 'Filial cadastrada com sucesso.',
        severity: 'success',
      })
    }
  }

  const columns = useMemo<GridColDef<PlacementFilial>[]>(
    () => [
      { field: 'razaoSocial', headerName: 'Razão social', flex: 1.5, minWidth: 220 },
      {
        field: 'cnpj',
        headerName: 'CNPJ',
        width: 200,
        renderCell: (params) => formatCnpj14(String(params.value ?? '')) || String(params.value ?? ''),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        renderCell: (params) => (
          <Chip
            label={params.value === 'Inativo' ? 'Inativo' : 'Ativo'}
            color={params.value === 'Inativo' ? 'default' : 'success'}
            size="small"
            variant={params.value === 'Inativo' ? 'outlined' : 'filled'}
          />
        ),
      },
      {
        field: 'acoes',
        headerName: 'Ações',
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" gap={0.5}>
            <IconButton
              color="primary"
              size="small"
              onClick={() => handleEdit(params.row)}
              title="Editar"
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              color="error"
              size="small"
              onClick={() => handleDelete(params.row)}
              title="Excluir"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [filiais]
  )

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        justifyContent="space-between"
        gap={1.5}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Filiais
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cadastro de filiais com razão social, CNPJ e status.
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => syncFiliais(true)}
            disabled={isLoading}
          >
            Atualizar
          </Button>
          <PrimaryActionButton onClick={handleAdd} startIcon={<AddIcon />}>
            Nova filial
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <div style={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={filiais}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
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

      <FilialFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        editingItem={editing}
        onSubmit={handleSubmit}
      />

      <SnackNotification snack={snack} />
    </Box>
  )
}
