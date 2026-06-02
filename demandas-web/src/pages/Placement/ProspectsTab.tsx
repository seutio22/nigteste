import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, IconButton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import {
  usePlacementStore,
  type PlacementProspect,
} from '../../store/placementStore'
import { SnackNotification } from '../../components/SnackNotification'
import { ProspectFormModal } from './ProspectFormModal'
import { CondicaoFormModal } from './CondicaoFormModal'
import { formatCnaeDisplay, normalizeCnaeDigits } from './Fila/utils'

function formatCnpjDisplay(value: string): string {
  const d = (value || '').replace(/\D+/g, '').slice(0, 14)
  if (d.length !== 14) return value || ''
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

export default function ProspectsTab() {
  const {
    prospects,
    isLoadingProspects,
    syncProspects,
    addProspect,
    updateProspect,
    removeProspect,
  } = usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementProspect | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    syncProspects()
  }, [syncProspects])

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementProspect) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementProspect) => {
    if (
      !window.confirm(
        `Excluir o prospect "${row.razaoSocial}"? Esta ação não pode ser desfeita.`
      )
    ) {
      return
    }
    try {
      await removeProspect(row.id)
      setSnack({
        open: true,
        message: 'Prospect excluído com sucesso.',
        severity: 'success',
      })
    } catch (err: any) {
      setSnack({
        open: true,
        message: err?.message || 'Erro ao excluir o prospect.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: {
    razaoSocial: string
    cnpj: string
    grupoEconomico: string | null
    cnae: string
  }) => {
    if (editing?.id) {
      await updateProspect(editing.id, data)
      setSnack({
        open: true,
        message: 'Prospect atualizado com sucesso.',
        severity: 'success',
      })
    } else {
      await addProspect(data)
      setSnack({
        open: true,
        message: 'Prospect cadastrado com sucesso.',
        severity: 'success',
      })
    }
  }

  const columns = useMemo<GridColDef<PlacementProspect>[]>(
    () => [
      { field: 'razaoSocial', headerName: 'Razão social', flex: 1.5, minWidth: 220 },
      {
        field: 'grupoEconomico',
        headerName: 'Grupo econômico',
        flex: 1,
        minWidth: 180,
        valueFormatter: (value) => (value ? String(value) : '—'),
      },
      {
        field: 'cnae',
        headerName: 'CNAE',
        width: 150,
        renderCell: (params) =>
          formatCnaeDisplay(normalizeCnaeDigits(String(params.value ?? ''))),
      },
      {
        field: 'cnpj',
        headerName: 'CNPJ',
        width: 200,
        renderCell: (params) => formatCnpjDisplay(String(params.value ?? '')),
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
    [prospects]
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
            Prospects
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Base de clientes potenciais usados nas cotações Placement
            (razão social, grupo econômico, CNPJ e CNAE).
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => syncProspects(true)}
            disabled={isLoadingProspects}
          >
            Atualizar
          </Button>
          <PrimaryActionButton onClick={handleAdd} startIcon={<AddIcon />}>
            Novo prospect
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <div style={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={prospects}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoadingProspects}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50, 100]}
          initialState={{
            pagination: { paginationModel: { page: 0, pageSize: 25 } },
            sorting: { sortModel: [{ field: 'razaoSocial', sort: 'asc' }] },
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

      <ProspectFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        editingItem={editing}
        onSubmit={handleSubmit}
      />

      <SnackNotification snack={snack} />
    </Box>
  )
}
