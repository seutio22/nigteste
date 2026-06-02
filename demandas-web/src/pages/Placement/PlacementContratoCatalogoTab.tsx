import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, IconButton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import RefreshIcon from '@mui/icons-material/Refresh'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { usePlacementStore, type PlacementNomeCadastro } from '../../store/placementStore'
import { SnackNotification } from '../../components/SnackNotification'
import type { SnackMessage } from '../../types/dadosTypes'
import { PlacementNomeCadastroModal } from './PlacementNomeCadastroModal'

export type ContratoCatalogoKind =
  | 'tipoContratacao'
  | 'modalidadeContrato'
  | 'prazoVigenciaContrato'
  | 'projeto'
  | 'pedido'
  | 'temperatura'

const META: Record<
  ContratoCatalogoKind,
  {
    title: string
    description: string
    novoLabel: string
    deleteWarn: string
    modalNew: string
    modalEdit: string
  }
> = {
  tipoContratacao: {
    title: 'Tipo de contratação',
    description: 'Opções exibidas na cotação (Detalhes), antes do mapeamento de plano. Apenas o nome.',
    novoLabel: 'Novo tipo',
    deleteWarn: 'Excluir este tipo? Cotações que o utilizavam ficarão sem tipo selecionado.',
    modalNew: 'Novo tipo de contratação',
    modalEdit: 'Editar tipo de contratação',
  },
  modalidadeContrato: {
    title: 'Modalidade de contrato',
    description: 'Opções exibidas na cotação (Detalhes), antes do mapeamento de plano. Apenas o nome.',
    novoLabel: 'Nova modalidade',
    deleteWarn: 'Excluir esta modalidade? Cotações que a utilizavam ficarão sem modalidade selecionada.',
    modalNew: 'Nova modalidade de contrato',
    modalEdit: 'Editar modalidade de contrato',
  },
  prazoVigenciaContrato: {
    title: 'Prazo de vigência do contrato',
    description: 'Opções exibidas na cotação (Detalhes), antes do mapeamento de plano. Apenas o nome.',
    novoLabel: 'Novo prazo',
    deleteWarn: 'Excluir este prazo? Cotações que o utilizavam ficarão sem prazo selecionado.',
    modalNew: 'Novo prazo de vigência do contrato',
    modalEdit: 'Editar prazo de vigência do contrato',
  },
  projeto: {
    title: 'Projetos',
    description: 'Opções exibidas na nova cotação (Fila). Cadastre apenas o nome do projeto.',
    novoLabel: 'Novo projeto',
    deleteWarn: 'Excluir este projeto? Cotações que o utilizavam ficarão sem projeto selecionado.',
    modalNew: 'Novo projeto',
    modalEdit: 'Editar projeto',
  },
  pedido: {
    title: 'Tipo de pedido/conta',
    description: 'Opções exibidas na nova cotação (Fila). Cadastre apenas o texto do tipo.',
    novoLabel: 'Novo tipo',
    deleteWarn: 'Excluir este tipo? Cotações que o utilizavam ficarão sem tipo selecionado.',
    modalNew: 'Novo tipo de pedido/conta',
    modalEdit: 'Editar tipo de pedido/conta',
  },
  temperatura: {
    title: 'Temperatura',
    description: 'Opções exibidas na nova cotação (Fila). Cadastre apenas o nome.',
    novoLabel: 'Nova temperatura',
    deleteWarn: 'Excluir esta temperatura? Cotações que a utilizavam ficarão sem temperatura selecionada.',
    modalNew: 'Nova temperatura',
    modalEdit: 'Editar temperatura',
  },
}

export function PlacementContratoCatalogoTab({ kind }: { kind: ContratoCatalogoKind }) {
  const tiposContratacao = usePlacementStore((s) => s.tiposContratacao)
  const modalidadesContrato = usePlacementStore((s) => s.modalidadesContrato)
  const prazosVigenciaContrato = usePlacementStore((s) => s.prazosVigenciaContrato)
  const projetos = usePlacementStore((s) => s.projetos)
  const pedidos = usePlacementStore((s) => s.pedidos)
  const temperaturas = usePlacementStore((s) => s.temperaturas)
  const isLoadingContrato = usePlacementStore((s) => s.isLoadingContratoCatalogos)
  const isLoadingProjetosPedidos = usePlacementStore((s) => s.isLoadingProjetosPedidos)
  const syncPlacementContratoCatalogos = usePlacementStore((s) => s.syncPlacementContratoCatalogos)
  const syncProjetosPedidos = usePlacementStore((s) => s.syncProjetosPedidos)
  const addTipo = usePlacementStore((s) => s.addTipoContratacao)
  const updateTipo = usePlacementStore((s) => s.updateTipoContratacao)
  const removeTipo = usePlacementStore((s) => s.removeTipoContratacao)
  const addMod = usePlacementStore((s) => s.addModalidadeContrato)
  const updateMod = usePlacementStore((s) => s.updateModalidadeContrato)
  const removeMod = usePlacementStore((s) => s.removeModalidadeContrato)
  const addPrazo = usePlacementStore((s) => s.addPrazoVigenciaContrato)
  const updatePrazo = usePlacementStore((s) => s.updatePrazoVigenciaContrato)
  const removePrazo = usePlacementStore((s) => s.removePrazoVigenciaContrato)
  const addProjeto = usePlacementStore((s) => s.addProjeto)
  const updateProjeto = usePlacementStore((s) => s.updateProjeto)
  const removeProjeto = usePlacementStore((s) => s.removeProjeto)
  const addPedido = usePlacementStore((s) => s.addPedido)
  const updatePedido = usePlacementStore((s) => s.updatePedido)
  const removePedido = usePlacementStore((s) => s.removePedido)
  const addTemperatura = usePlacementStore((s) => s.addTemperatura)
  const updateTemperatura = usePlacementStore((s) => s.updateTemperatura)
  const removeTemperatura = usePlacementStore((s) => s.removeTemperatura)

  const m = META[kind]
  const isProjetoPedido = kind === 'projeto' || kind === 'pedido' || kind === 'temperatura'
  const isLoading = isProjetoPedido ? isLoadingProjetosPedidos : isLoadingContrato

  const rows = useMemo((): PlacementNomeCadastro[] => {
    if (kind === 'tipoContratacao') return tiposContratacao
    if (kind === 'modalidadeContrato') return modalidadesContrato
    if (kind === 'prazoVigenciaContrato') return prazosVigenciaContrato
    if (kind === 'projeto') return projetos
    if (kind === 'pedido') return pedidos
    return temperaturas
  }, [kind, tiposContratacao, modalidadesContrato, prazosVigenciaContrato, projetos, pedidos, temperaturas])

  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementNomeCadastro | null>(null)
  const [snack, setSnack] = useState<SnackMessage | null>(null)

  useEffect(() => {
    if (isProjetoPedido) void syncProjetosPedidos(true)
    else void syncPlacementContratoCatalogos(true)
  }, [isProjetoPedido, syncPlacementContratoCatalogos, syncProjetosPedidos])

  const handleAdd = () => {
    setEditing(null)
    setOpenForm(true)
  }

  const handleEdit = (row: PlacementNomeCadastro) => {
    setEditing(row)
    setOpenForm(true)
  }

  const handleDelete = async (row: PlacementNomeCadastro) => {
    if (!window.confirm(`${m.deleteWarn}\n\nRegistro: "${row.nome}"`)) return
    try {
      if (kind === 'tipoContratacao') await removeTipo(row.id)
      else if (kind === 'modalidadeContrato') await removeMod(row.id)
      else if (kind === 'prazoVigenciaContrato') await removePrazo(row.id)
      else if (kind === 'projeto') await removeProjeto(row.id)
      else if (kind === 'pedido') await removePedido(row.id)
      else await removeTemperatura(row.id)
      setSnack({ open: true, message: 'Registro excluído.', severity: 'success' })
    } catch (err: unknown) {
      const anyE = err as { message?: string }
      setSnack({
        open: true,
        message: anyE?.message || 'Erro ao excluir.',
        severity: 'error',
      })
    }
  }

  const handleSubmit = async (data: { nome: string }) => {
    if (editing?.id) {
      if (kind === 'tipoContratacao') await updateTipo(editing.id, data)
      else if (kind === 'modalidadeContrato') await updateMod(editing.id, data)
      else if (kind === 'prazoVigenciaContrato') await updatePrazo(editing.id, data)
      else if (kind === 'projeto') await updateProjeto(editing.id, data)
      else if (kind === 'pedido') await updatePedido(editing.id, data)
      else await updateTemperatura(editing.id, data)
      setSnack({ open: true, message: 'Registro atualizado.', severity: 'success' })
    } else {
      if (kind === 'tipoContratacao') await addTipo(data)
      else if (kind === 'modalidadeContrato') await addMod(data)
      else if (kind === 'prazoVigenciaContrato') await addPrazo(data)
      else if (kind === 'projeto') await addProjeto(data)
      else if (kind === 'pedido') await addPedido(data)
      else await addTemperatura(data)
      setSnack({ open: true, message: 'Registro cadastrado.', severity: 'success' })
    }
  }

  const columns: GridColDef<PlacementNomeCadastro>[] = [
    { field: 'nome', headerName: 'Nome', flex: 1, minWidth: 280 },
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
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {m.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {m.description}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() =>
              void (isProjetoPedido ? syncProjetosPedidos(true) : syncPlacementContratoCatalogos(true))
            }
            disabled={isLoading}
          >
            Atualizar
          </Button>
          <PrimaryActionButton startIcon={<AddIcon />} onClick={handleAdd}>
            {m.novoLabel}
          </PrimaryActionButton>
        </Stack>
      </Stack>

      <div style={{ height: 520, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          loading={isLoading}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
        />
      </div>

      <PlacementNomeCadastroModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        editingItem={editing}
        titleNew={m.modalNew}
        titleEdit={m.modalEdit}
        onSubmit={handleSubmit}
      />

      <SnackNotification snack={snack} />
    </Box>
  )
}
