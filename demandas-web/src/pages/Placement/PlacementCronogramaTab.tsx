import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import DownloadIcon from '@mui/icons-material/Download'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { usePlacementStore, type PlacementCronogramaAtividade } from '../../store/placementStore'
import { SnackNotification } from '../../components/SnackNotification'
import type { SnackMessage } from '../../types/dadosTypes'
import { PlacementCronogramaAtividadeModal } from './PlacementCronogramaAtividadeModal'
import { PlacementCronogramaGroupedView } from './PlacementCronogramaGroupedView'
import {
  downloadCronogramaTemplateXlsx,
  downloadCronogramaXlsx,
  importCronogramaSpreadsheet,
} from '../../lib/placementCronogramaImportExport'

export default function PlacementCronogramaTab() {
  const {
    cronogramaAtividades,
    isLoadingCronogramaAtividades,
    syncCronogramaAtividades,
    addCronogramaAtividade,
    updateCronogramaAtividade,
    removeCronogramaAtividade,
    importCronogramaBatch,
  } = usePlacementStore()

  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [openForm, setOpenForm] = useState(false)
  const [editing, setEditing] = useState<PlacementCronogramaAtividade | null>(null)
  const [snack, setSnack] = useState<SnackMessage | null>(null)

  useEffect(() => {
    void syncCronogramaAtividades(true)
  }, [syncCronogramaAtividades])

  const nextOrdem = useMemo(() => {
    if (cronogramaAtividades.length === 0) return 1
    return Math.max(...cronogramaAtividades.map((a) => a.ordem)) + 1
  }, [cronogramaAtividades])

  function handleEdit(row: PlacementCronogramaAtividade) {
    setEditing(row)
    setOpenForm(true)
  }

  async function handleDelete(row: PlacementCronogramaAtividade) {
    if (
      !window.confirm(
        `Excluir a tarefa "${row.tarefa}"?\n\nNovas cotações deixarão de exibir esta linha no cronograma.`
      )
    ) {
      return
    }
    try {
      await removeCronogramaAtividade(row.id)
      setSnack({ open: true, message: 'Linha excluída.', severity: 'success' })
    } catch (err: any) {
      setSnack({ open: true, message: err?.message || 'Erro ao excluir.', severity: 'error' })
    }
  }

  async function handleSubmit(data: Parameters<typeof addCronogramaAtividade>[0]) {
    if (editing?.id) {
      await updateCronogramaAtividade(editing.id, data)
      setSnack({ open: true, message: 'Linha atualizada.', severity: 'success' })
    } else {
      await addCronogramaAtividade(data)
      setSnack({ open: true, message: 'Linha cadastrada.', severity: 'success' })
    }
  }

  function handleExport() {
    if (!cronogramaAtividades.length) {
      setSnack({ open: true, message: 'Nenhuma linha para exportar.', severity: 'warning' })
      return
    }
    const count = downloadCronogramaXlsx(cronogramaAtividades)
    setSnack({ open: true, message: `${count} linha(s) exportada(s).`, severity: 'success' })
  }

  async function handleImportFile(file: File) {
    setImporting(true)
    try {
      const { imported, errors } = await importCronogramaSpreadsheet(file, (items, replace) =>
        importCronogramaBatch(items, replace)
      )
      const errDetail = errors.length ? `\n${errors.slice(0, 3).join('\n')}` : ''
      setSnack({
        open: true,
        message: `${imported} linha(s) importada(s).${errDetail}`,
        severity: errors.length && imported === 0 ? 'error' : errors.length ? 'warning' : 'success',
      })
      await syncCronogramaAtividades(true)
    } catch (err: unknown) {
      setSnack({
        open: true,
        message: err instanceof Error ? err.message : 'Erro ao importar planilha.',
        severity: 'error',
      })
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
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
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 720 }}>
          Parametrize o cronograma por <strong>etapa</strong> (fluxo do processo), com <strong>tarefas</strong>,{' '}
          <strong>subtarefas</strong> e <strong>prazo de entrega</strong> em dias — no mesmo padrão da página de
          Projetos.
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            hidden
            disabled={importing}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImportFile(f)
            }}
          />
          <Button
            variant="outlined"
            size="small"
            startIcon={<UploadFileIcon />}
            disabled={importing || isLoadingCronogramaAtividades}
            onClick={() => fileRef.current?.click()}
          >
            Importar
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={isLoadingCronogramaAtividades}
            onClick={handleExport}
          >
            Exportar
          </Button>
          <Button
            variant="text"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={isLoadingCronogramaAtividades}
            onClick={() => downloadCronogramaTemplateXlsx()}
          >
            Modelo
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => void syncCronogramaAtividades(true)}
            disabled={isLoadingCronogramaAtividades}
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
            Nova linha
          </PrimaryActionButton>
        </Stack>
      </Stack>

      {cronogramaAtividades.length === 0 && !isLoadingCronogramaAtividades ? (
        <Alert severity="info">Nenhuma linha cadastrada. Importe o modelo ou adicione manualmente.</Alert>
      ) : (
        <PlacementCronogramaGroupedView
          mode="template"
          atividades={cronogramaAtividades}
          loading={isLoadingCronogramaAtividades || importing}
          onEdit={handleEdit}
          onDelete={(row) => void handleDelete(row)}
        />
      )}

      <PlacementCronogramaAtividadeModal
        open={openForm}
        onClose={() => {
          setOpenForm(false)
          setEditing(null)
        }}
        editingItem={editing}
        atividades={cronogramaAtividades}
        nextOrdem={nextOrdem}
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
