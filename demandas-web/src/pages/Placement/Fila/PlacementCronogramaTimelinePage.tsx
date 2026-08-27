import { useMemo, useState } from 'react'
import { Alert, Box, Stack, TextField, Typography } from '@mui/material'
import {
  buildCronogramaTree,
  flattenCronogramaTree,
  formatIsoDatePt,
  normalizeIsoDate,
} from './placementCronograma'
import { getWorkflowStageKey } from './placementCotacaoWorkflow'
import { usePlacementCronogramaPage } from './placementCronogramaPageContext'
import { PlacementCronogramaGroupedView } from '../PlacementCronogramaGroupedView'
import { PlacementCronogramaTarefaExtraModal } from '../PlacementCronogramaTarefaExtraModal'
import {
  addTarefaComplementar,
  excludeAtividadeFromInstancia,
} from './placementCronogramaSync'

type AddModalState = {
  etapaKey: string
  parentId?: string | null
} | null

export default function PlacementCronogramaTimelinePage() {
  const {
    form,
    cronograma,
    setCronograma,
    atividadesMerged,
    isLoadingAtividades,
    patchLinha,
    setValidationMsg,
  } = usePlacementCronogramaPage()

  const [addModal, setAddModal] = useState<AddModalState>(null)

  const etapas = useMemo(
    () => buildCronogramaTree(atividadesMerged, cronograma),
    [atividadesMerged, cronograma]
  )

  const currentEtapaKey = getWorkflowStageKey(form.status)
  const entregaFinal = flattenCronogramaTree(etapas).at(-1)?.dataPrevistaEfetiva

  const parentOptions = useMemo(() => {
    if (!addModal) return []
    return atividadesMerged
      .filter((a) => a.etapaKey === addModal.etapaKey && !a.parentId)
      .map((a) => ({ id: a.id, label: a.tarefa }))
  }, [addModal, atividadesMerged])

  function openAddModal(etapaKey: string, parentId?: string | null) {
    setAddModal({ etapaKey, parentId: parentId ?? null })
  }

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
        <TextField
          label="Data de início do processo"
          type="date"
          size="small"
          value={cronograma.dataInicioProcesso ?? ''}
          onChange={(e) =>
            setCronograma((prev) => ({
              ...prev,
              dataInicioProcesso: normalizeIsoDate(e.target.value),
            }))
          }
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 220 }}
        />
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        Tarefas carregadas do modelo em <strong>Dados → Placement → Cronograma</strong>. Nesta cotação você pode{' '}
        <strong>remover</strong> o que não ocorreu no processo ou <strong>adicionar</strong> tarefas e subtarefas
        extras — sem alterar o modelo global. Clique em <strong>Salvar</strong> para persistir.
      </Alert>

      <PlacementCronogramaGroupedView
        mode="instance"
        atividades={atividadesMerged}
        instancia={cronograma}
        participantes={cronograma.participantes}
        currentEtapaKey={currentEtapaKey}
        loading={isLoadingAtividades}
        onPatchLinha={patchLinha}
        onValidationError={setValidationMsg}
        onRemoveAtividade={(atividadeId) =>
          setCronograma((prev) => excludeAtividadeFromInstancia(prev, atividadeId))
        }
        onAddTarefa={openAddModal}
      />

      <PlacementCronogramaTarefaExtraModal
        open={addModal != null}
        onClose={() => setAddModal(null)}
        defaultEtapaKey={addModal?.etapaKey ?? currentEtapaKey}
        defaultParentId={addModal?.parentId}
        parentOptions={parentOptions}
        onSubmit={(data) => {
          const { instancia } = addTarefaComplementar(cronograma, data)
          setCronograma(instancia)
        }}
      />

      {entregaFinal ? (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          Entrega final prevista: {formatIsoDatePt(entregaFinal)}
        </Typography>
      ) : null}
    </Box>
  )
}
