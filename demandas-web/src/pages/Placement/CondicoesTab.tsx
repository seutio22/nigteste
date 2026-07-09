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
  type PlacementCondicao,
} from '../../store/placementStore'
import { SnackNotification } from '../../components/SnackNotification'
import { CondicaoFormModal } from './CondicaoFormModal'
import { formatCnaeDisplay } from './Fila/utils'

export default function CondicoesTab() {
  const {
    condicoes,
    isLoadingCondicoes,
    syncCondicoes,
    addCondicao,
    updateCondicao,
    removeCondicao,
  } = usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementCondicao | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    syncCondicoes()
  }, [syncCondicoes])

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementCondicao) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementCondicao) => {
    if (
      !window.confirm(
        `Excluir a condição "${row.razaoSocial}" (${formatCnaeDisplay(row.cnae)})? Esta ação não pode ser desfeita.`
      )
    ) {
      return
    }
    try {
      await removeCondicao(row.id)
      setSnack({
        open: true,
        message: 'Condição excluída com sucesso.',
        severity: 'success',
      })
    } catch (err: any) {
      setSnack({
        open: true,
        message: err?.message || 'Erro ao excluir a condição.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: {
    grupoEconomico: string | null
    razaoSocial: string
    cnae: string
    cnpj: string | null
  }) => {
    if (editing?.id) {
      await updateCondicao(editing.id, data)
      setSnack({
        open: true,
        message: 'Condição atualizada com sucesso.',
        severity: 'success',
      })
    } else {
      await addCondicao(data)
      setSnack({
        open: true,
        message: 'Condição cadastrada com sucesso.',
        severity: 'success',
      })
    }
  }

  const columns = useMemo<GridColDef<PlacementCondicao>[]>(
    () => [
      {
        field: 'grupoEconomico',
        headerName: 'Grupo econômico',
        flex: 1,
        minWidth: 160,
        valueFormatter: (v) => (v ? String(v) : '—'),
      },
      { field: 'razaoSocial', headerName: 'Razão social', flex: 1.5, minWidth: 220 },
      {
        field: 'cnpj',
        headerName: 'CNPJ',
        width: 150,
        valueFormatter: (v) => {
          const d = String(v ?? '').replace(/\D/g, '').slice(0, 14)
          if (d.length !== 14) return v ? String(v) : '—'
          return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
        },
      },
      {
        field: 'cnae',
        headerName: 'CNAE',
        width: 160,
        renderCell: (params) => formatCnaeDisplay(String(params.value ?? '')),
      },
      {
        field: 'acoes',
        headerName: 'Ações',
        width: 120,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Stack direction="row" spacing={0}>
            <IconButton
              size="small"
              aria-label="Editar"
              onClick={() => handleEdit(params.row)}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Excluir"
              color="error"
              onClick={() => handleDelete(params.row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ),
      },
    ],
    [condicoes]
  )

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Condições (grupo + razão + CNAE)</Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => syncCondicoes(true)}
            disabled={isLoadingCondicoes}
          >
            Atualizar
          </Button>
          <PrimaryActionButton startIcon={<AddIcon />} onClick={handleAdd}>
            Nova condição
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Cadastre o CNAE vinculado ao grupo econômico e à razão social do Cliente da Carteira.
        Na cotação, será obrigatório selecionar uma condição compatível.
      </Typography>

      <div style={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={condicoes}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoadingCondicoes}
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

      <CondicaoFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        editingItem={editing}
        onSubmit={handleSubmit}
      />

      <SnackNotification snack={snack} />
    </Box>
  )
}
