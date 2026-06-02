import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, IconButton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { usePlacementStore, type PlacementPlano } from '../../store/placementStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { SnackNotification } from '../../components/SnackNotification'
import { PlanoFormModal, type PlanoFormData } from './PlanoFormModal'

export default function PlanosTab() {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const { planos, isLoadingPlanos, syncPlanos, addPlano, updatePlano, removePlano } =
    usePlacementStore()

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementPlano | null>(null)
  const [snack, setSnack] = useState<{
    open: boolean
    message: string
    severity: 'success' | 'error' | 'info' | 'warning'
  } | null>(null)

  useEffect(() => {
    void syncPlanos(true)
  }, [syncPlanos])

  const operadoraNome = (id: string) => operadoras.find((o) => o.id === id)?.nome ?? '—'

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementPlano) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementPlano) => {
    if (
      !window.confirm(
        `Excluir o plano "${row.plano}" (${row.categoria} · ${operadoraNome(row.operadoraId)})?`
      )
    ) {
      return
    }
    try {
      await removePlano(row.id)
      setSnack({ open: true, message: 'Plano excluído com sucesso.', severity: 'success' })
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao excluir.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: PlanoFormData) => {
    const payload = {
      operadoraId: data.operadoraId,
      categoria: data.categoria.trim(),
      plano: data.plano.trim(),
      reembolso: data.reembolso.trim() || null,
      eventosReembolsaveis: data.eventosReembolsaveis.trim() || null,
      acomodacao: data.acomodacao.trim() || null,
      abrangencia: data.abrangencia.trim() || null,
    }
    if (editing?.id) {
      await updatePlano(editing.id, payload)
      setSnack({ open: true, message: 'Plano atualizado com sucesso.', severity: 'success' })
    } else {
      await addPlano(payload)
      setSnack({ open: true, message: 'Plano cadastrado com sucesso.', severity: 'success' })
    }
  }

  const columns = useMemo<GridColDef<PlacementPlano>[]>(
    () => [
      {
        field: 'operadoraId',
        headerName: 'Fornecedor',
        flex: 1,
        minWidth: 160,
        valueGetter: (_v, row) => operadoraNome(row.operadoraId),
      },
      { field: 'categoria', headerName: 'Categoria', flex: 1, minWidth: 140 },
      { field: 'plano', headerName: 'Plano', flex: 1, minWidth: 140 },
      {
        field: 'reembolso',
        headerName: 'Reembolso',
        flex: 1,
        minWidth: 120,
        valueFormatter: (v) => (v ? String(v) : '—'),
      },
      {
        field: 'eventosReembolsaveis',
        headerName: 'Eventos reembolsáveis',
        flex: 1,
        minWidth: 160,
        valueFormatter: (v) => (v ? String(v) : '—'),
      },
      {
        field: 'acomodacao',
        headerName: 'Acomodação',
        width: 130,
        valueFormatter: (v) => (v ? String(v) : '—'),
      },
      {
        field: 'abrangencia',
        headerName: 'Abrangência',
        width: 130,
        valueFormatter: (v) => (v ? String(v) : '—'),
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
          Cadastre planos por fornecedor. As categorias aparecem no mapeamento de itens da cotação Saúde.
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => void syncPlanos(true)}
            disabled={isLoadingPlanos}
          >
            Atualizar
          </Button>
          <PrimaryActionButton size="small" startIcon={<AddIcon />} onClick={handleAdd}>
            Novo plano
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <DataGrid
        rows={planos}
        columns={columns}
        loading={isLoadingPlanos}
        autoHeight
        disableRowSelectionOnClick
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
        sx={{ minHeight: 320 }}
      />

      <PlanoFormModal
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
