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
  type PlacementCondicaoContratual,
} from '../../store/placementStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { SnackNotification } from '../../components/SnackNotification'
import {
  CondicaoContratualFormModal,
  type CondicaoContratualFormData,
} from './CondicaoContratualFormModal'
import { labelCondicaoContratualItem } from './Fila/placementCondicoesContratuaisCatalogo'

export default function CondicoesContratuaisTab() {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const {
    condicoesContratuais,
    planos,
    isLoadingCondicoesContratuais,
    syncCondicoesContratuais,
    syncPlanos,
    addCondicaoContratual,
    updateCondicaoContratual,
    removeCondicaoContratual,
  } = usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementCondicaoContratual | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    void syncCondicoesContratuais(true)
    void syncPlanos(true)
  }, [syncCondicoesContratuais, syncPlanos])

  const operadoraNome = (id: string) => operadoras.find((o) => o.id === id)?.nome ?? '—'
  const planoLabel = (id: string | null | undefined) => {
    if (!id) return '—'
    const p = planos.find((pl) => pl.id === id)
    return p ? `${p.plano} (${p.categoria})` : '—'
  }

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementCondicaoContratual) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementCondicaoContratual) => {
    const escopo = row.porPlano
      ? planoLabel(row.placementPlanoId)
      : 'fornecedor (geral)'
    if (
      !window.confirm(
        `Excluir «${labelCondicaoContratualItem(row.itemKey)}» — ${operadoraNome(row.operadoraId)} / ${escopo}?`
      )
    ) {
      return
    }
    try {
      await removeCondicaoContratual(row.id)
      setSnack({ open: true, message: 'Condição excluída.', severity: 'success' })
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao excluir.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: CondicaoContratualFormData) => {
    const payload = {
      operadoraId: data.operadoraId,
      porPlano: data.porPlano,
      placementPlanoId: data.porPlano ? data.placementPlanoId : null,
      itemKey: data.itemKey,
      texto: data.texto.trim(),
    }
    try {
      if (editing?.id) {
        await updateCondicaoContratual(editing.id, payload)
        setSnack({ open: true, message: 'Condição atualizada.', severity: 'success' })
      } else {
        await addCondicaoContratual(payload)
        setSnack({ open: true, message: 'Condição cadastrada.', severity: 'success' })
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

  const columns = useMemo<GridColDef<PlacementCondicaoContratual>[]>(
    () => [
      {
        field: 'operadoraId',
        headerName: 'Fornecedor',
        flex: 1,
        minWidth: 140,
        valueGetter: (_v, row) => operadoraNome(row.operadoraId),
      },
      {
        field: 'porPlano',
        headerName: 'Escopo',
        width: 120,
        renderCell: ({ row }) => (
          <Chip
            size="small"
            label={row.porPlano ? 'Por plano' : 'Fornecedor'}
            color={row.porPlano ? 'primary' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'placementPlanoId',
        headerName: 'Plano',
        flex: 1,
        minWidth: 150,
        valueGetter: (_v, row) =>
          row.porPlano ? planoLabel(row.placementPlanoId) : '— (geral)',
      },
      {
        field: 'itemKey',
        headerName: 'Condição',
        flex: 1.2,
        minWidth: 200,
        valueGetter: (_v, row) => labelCondicaoContratualItem(row.itemKey),
      },
      {
        field: 'texto',
        headerName: 'Descrição',
        flex: 2,
        minWidth: 220,
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
          Matriz por fornecedor. Ative «por plano» quando a condição variar entre planos (ex.: remissão).
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void syncCondicoesContratuais(true)}
            disabled={isLoadingCondicoesContratuais}
          >
            Atualizar
          </Button>
          <PrimaryActionButton size="small" startIcon={<AddIcon />} onClick={handleAdd}>
            Nova condição
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <DataGrid
        rows={condicoesContratuais}
        columns={columns}
        loading={isLoadingCondicoesContratuais}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        sx={{ minHeight: 320 }}
      />

      <CondicaoContratualFormModal
        open={openForm}
        editing={editing}
        onClose={() => setOpenForm(false)}
        onSubmit={handleSubmit}
      />

      {snack ? <SnackNotification snack={snack} /> : null}
    </Box>
  )
}
