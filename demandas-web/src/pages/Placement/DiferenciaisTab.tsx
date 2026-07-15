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
  type PlacementDiferencial,
} from '../../store/placementStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { SnackNotification } from '../../components/SnackNotification'
import { DiferencialFormModal, type DiferencialFormData } from './DiferencialFormModal'
import { labelDiferencialItem } from './Fila/placementDiferenciaisCatalogo'

export default function DiferenciaisTab() {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const {
    diferenciais,
    planos,
    isLoadingDiferenciais,
    syncDiferenciais,
    syncPlanos,
    addDiferencial,
    updateDiferencial,
    removeDiferencial,
  } = usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementDiferencial | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    void syncDiferenciais(true)
    void syncPlanos(true)
  }, [syncDiferenciais, syncPlanos])

  const operadoraNome = (id: string) => operadoras.find((o) => o.id === id)?.nome ?? '—'
  const planoLabel = (id: string) => {
    const p = planos.find((pl) => pl.id === id)
    return p ? `${p.plano} (${p.categoria})` : '—'
  }

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementDiferencial) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementDiferencial) => {
    if (
      !window.confirm(
        `Excluir diferencial «${labelDiferencialItem(row.itemKey)}» — ${planoLabel(row.placementPlanoId)}?`
      )
    ) {
      return
    }
    try {
      await removeDiferencial(row.id)
      setSnack({ open: true, message: 'Diferencial excluído.', severity: 'success' })
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao excluir.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: DiferencialFormData) => {
    const payload = {
      operadoraId: data.operadoraId,
      placementPlanoId: data.placementPlanoId,
      itemKey: data.itemKey,
      texto: data.texto.trim(),
    }
    try {
      if (editing?.id) {
        await updateDiferencial(editing.id, payload)
        setSnack({ open: true, message: 'Diferencial atualizado.', severity: 'success' })
      } else {
        await addDiferencial(payload)
        setSnack({ open: true, message: 'Diferencial cadastrado.', severity: 'success' })
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

  const columns = useMemo<GridColDef<PlacementDiferencial>[]>(
    () => [
      {
        field: 'operadoraId',
        headerName: 'Fornecedor',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) => operadoraNome(row.operadoraId),
      },
      {
        field: 'placementPlanoId',
        headerName: 'Plano',
        flex: 1,
        minWidth: 160,
        valueGetter: (_v, row) => planoLabel(row.placementPlanoId),
      },
      {
        field: 'itemKey',
        headerName: 'Item',
        flex: 1,
        minWidth: 180,
        valueGetter: (_v, row) => labelDiferencialItem(row.itemKey),
      },
      {
        field: 'texto',
        headerName: 'Descrição',
        flex: 2,
        minWidth: 240,
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
    [operadoras, planos]
  )

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Catálogo reutilizável por fornecedor e plano. Importe planilha (modelo acima), cadastre manualmente ou
          confirme o envio a partir da etapa Consolidando dados.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void syncDiferenciais(true)}
            disabled={isLoadingDiferenciais}
          >
            Atualizar
          </Button>
          <PrimaryActionButton size="small" startIcon={<AddIcon />} onClick={handleAdd}>
            Novo diferencial
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <DataGrid
        rows={diferenciais}
        columns={columns}
        loading={isLoadingDiferenciais}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        sx={{ minHeight: 320 }}
      />

      <DiferencialFormModal
        open={openForm}
        editing={editing}
        onClose={() => setOpenForm(false)}
        onSubmit={handleSubmit}
      />

      {snack ? (
        <SnackNotification
          open={snack.open}
          message={snack.message}
          severity={snack.severity}
          onClose={() => setSnack(null)}
        />
      ) : null}
    </Box>
  )
}
