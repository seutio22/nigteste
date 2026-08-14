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
  type PlacementIndicadorOperadora,
} from '../../store/placementStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { SnackNotification } from '../../components/SnackNotification'
import {
  IndicadorOperadoraFormModal,
  type IndicadorOperadoraFormData,
} from './IndicadorOperadoraFormModal'
import { labelIndicadorOperadoraItem } from './Fila/placementIndicadoresOperadorasCatalogo'

export default function IndicadoresOperadorasTab() {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const {
    indicadoresOperadoras,
    isLoadingIndicadoresOperadoras,
    syncIndicadoresOperadoras,
    addIndicadorOperadora,
    updateIndicadorOperadora,
    removeIndicadorOperadora,
  } = usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementIndicadorOperadora | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    void syncIndicadoresOperadoras(true)
  }, [syncIndicadoresOperadoras])

  const operadoraNome = (id: string) => operadoras.find((o) => o.id === id)?.nome ?? '—'

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementIndicadorOperadora) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementIndicadorOperadora) => {
    if (
      !window.confirm(
        `Excluir «${labelIndicadorOperadoraItem(row.itemKey)}» — ${operadoraNome(row.operadoraId)}?`
      )
    ) {
      return
    }
    try {
      await removeIndicadorOperadora(row.id)
      setSnack({ open: true, message: 'Indicador excluído.', severity: 'success' })
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao excluir.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: IndicadorOperadoraFormData) => {
    const payload = {
      operadoraId: data.operadoraId,
      itemKey: data.itemKey,
      texto: data.texto.trim(),
    }
    try {
      if (editing?.id) {
        await updateIndicadorOperadora(editing.id, payload)
        setSnack({ open: true, message: 'Indicador atualizado.', severity: 'success' })
      } else {
        await addIndicadorOperadora(payload)
        setSnack({ open: true, message: 'Indicador cadastrado.', severity: 'success' })
      }
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao salvar.',
        severity: 'error',
      })
      throw err
    }
  }

  const columns = useMemo<GridColDef<PlacementIndicadorOperadora>[]>(
    () => [
      {
        field: 'operadoraId',
        headerName: 'Fornecedor',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) => operadoraNome(row.operadoraId),
      },
      {
        field: 'itemKey',
        headerName: 'Indicador',
        flex: 1.4,
        minWidth: 220,
        valueGetter: (_v, row) => labelIndicadorOperadoraItem(row.itemKey),
      },
      {
        field: 'texto',
        headerName: 'Valor',
        flex: 1.5,
        minWidth: 160,
      },
      {
        field: 'acoes',
        headerName: 'Ações',
        width: 110,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <>
            <IconButton size="small" aria-label="Editar" onClick={() => handleEdit(params.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label="Excluir"
              color="error"
              onClick={() => void handleDelete(params.row)}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </>
        ),
      },
    ],
    [operadoras]
  )

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Comparativo de indicadores por fornecedor (IDSS, ENDIV, porte, vidas, etc.).
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void syncIndicadoresOperadoras(true)}
            disabled={isLoadingIndicadoresOperadoras}
          >
            Atualizar
          </Button>
          <PrimaryActionButton size="small" startIcon={<AddIcon />} onClick={handleAdd}>
            Novo indicador
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <DataGrid
        rows={indicadoresOperadoras}
        columns={columns}
        loading={isLoadingIndicadoresOperadoras}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        sx={{ minHeight: 320 }}
      />

      <IndicadorOperadoraFormModal
        open={openForm}
        editing={editing}
        onClose={() => setOpenForm(false)}
        onSubmit={handleSubmit}
      />

      {snack ? <SnackNotification snack={snack} /> : null}
    </Box>
  )
}
