import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import type { CotacaoFormState } from './CotacaoFormFields'
import {
  canAdvanceMainFlow,
  canRetreatMainFlow,
  getWorkflowStageMeta,
  nextMainFlowStatus,
  previousMainFlowStatus,
  PLACEMENT_WORKFLOW_TERMINAL_STAGES,
} from './placementCotacaoWorkflow'
import {
  buildWorkflowChecklist,
  isMainFlowTerminal,
  validateForWorkflowAdvance,
} from './placementWorkflowAdvance'
import {
  describeRetreatDiscard,
  describeRetreatKeep,
  hasRetreatDiscardData,
  type WorkflowRetreatMode,
} from './placementWorkflowRetreat'
import { PlacementCotacaoWorkflowBar } from './PlacementCotacaoWorkflowBar'
import { PlacementDesignarAnalistaBlock } from './PlacementDesignarAnalistaBlock'
import { PlacementWorkflowChecklistCompact } from './PlacementWorkflowChecklistCompact'
import { getWorkflowStageKey } from './placementCotacaoWorkflow'
import type { PlacementCotacaoWorkflowStatus } from './placementCotacaoStatus'
import type { PlacementAnalista } from '../../../store/placementStore'
import { useMasterDataStore } from '../../../store/masterDataStore'
import {
  PlacementNavBackButton,
  PlacementNavForwardButton,
  PlacementNavSecondaryButton,
  PlacementWorkflowNavActions,
  PlacementWorkflowNavLabel,
  PlacementWorkflowNavRow,
  PlacementWorkflowNavShell,
  PlacementWorkflowStageLine,
  placementNavButtonSx,
  placementNavForwardSx,
} from './placementWorkflowNav'
import TimelineIcon from '@mui/icons-material/Timeline'

type Props = {
  status: string
  form: CotacaoFormState
  saving?: boolean
  beneficiariosTotal?: number
  analistaResponsavel?: PlacementAnalista | null
  onDesignarAnalista: (analistaResponsavelId: string) => Promise<void>
  onAdvance: (nextStatus: PlacementCotacaoWorkflowStatus) => Promise<void>
  onRetreat: (
    prevStatus: PlacementCotacaoWorkflowStatus,
    mode: WorkflowRetreatMode
  ) => Promise<void>
  onEncerrar: (status: 'Perdida' | 'Cancelada' | 'Fechada') => Promise<void>
}

export const PlacementCotacaoWorkflowPanel = React.memo(function PlacementCotacaoWorkflowPanel({
  status,
  form,
  saving,
  beneficiariosTotal = 0,
  analistaResponsavel,
  onDesignarAnalista,
  onAdvance,
  onRetreat,
  onEncerrar,
}: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const operadorasById = useMasterDataStore((s) => s.operadorasById)
  const stageKey = getWorkflowStageKey(status)
  const [advanceError, setAdvanceError] = useState<string | null>(null)
  const [encerrarOpen, setEncerrarOpen] = useState(false)
  const [retreatOpen, setRetreatOpen] = useState(false)
  const [stageInfoOpen, setStageInfoOpen] = useState(false)
  const [encerrarStatus, setEncerrarStatus] = useState<'Perdida' | 'Cancelada' | 'Fechada'>('Perdida')

  const stage = getWorkflowStageMeta(status)
  const nextStatus = nextMainFlowStatus(status)
  const prevStatus = previousMainFlowStatus(status)
  const prevLabel = prevStatus ? getWorkflowStageMeta(prevStatus)?.label ?? prevStatus : ''
  const nextLabel = nextStatus ? getWorkflowStageMeta(nextStatus)?.label ?? nextStatus : ''
  const checklist = useMemo(
    () => buildWorkflowChecklist(status, form, operadoras, operadorasById, { beneficiariosTotal }),
    [status, form, operadoras, operadorasById, beneficiariosTotal]
  )
  const terminal = isMainFlowTerminal(status)

  async function handleAdvance() {
    setAdvanceError(null)
    const err = validateForWorkflowAdvance(status, form, { beneficiariosTotal })
    if (err) {
      setAdvanceError(err)
      return
    }
    if (!nextStatus) {
      setAdvanceError('Não há próxima etapa disponível para este status.')
      return
    }
    try {
      await onAdvance(nextStatus)
    } catch (e: any) {
      setAdvanceError(e?.message ?? 'Não foi possível avançar a etapa.')
    }
  }

  async function handleEncerrar() {
    setAdvanceError(null)
    try {
      await onEncerrar(encerrarStatus)
      setEncerrarOpen(false)
    } catch (e: any) {
      setAdvanceError(e?.message ?? 'Não foi possível encerrar.')
    }
  }

  async function handleRetreat(mode: WorkflowRetreatMode) {
    setAdvanceError(null)
    if (!prevStatus) return
    try {
      await onRetreat(prevStatus, mode)
      setRetreatOpen(false)
    } catch (e: any) {
      setAdvanceError(e?.message ?? 'Não foi possível voltar a etapa.')
    }
  }

  const retreatDiscardAvailable = hasRetreatDiscardData(status)

  return (
    <>
      <PlacementWorkflowNavShell>
        <PlacementCotacaoWorkflowBar status={status} compact />

        {stage && !terminal && (
          <PlacementWorkflowStageLine
            label={stage.label}
            description={stage.description}
            objective={stage.objective}
            expanded={stageInfoOpen}
            onToggleInfo={() => setStageInfoOpen((v) => !v)}
            icon={<TimelineIcon fontSize="small" />}
          />
        )}

        {!terminal && (
          <PlacementWorkflowNavRow>
            <PlacementWorkflowNavActions>
              {canRetreatMainFlow(status) && prevStatus && (
                <PlacementNavBackButton disabled={saving} onClick={() => setRetreatOpen(true)}>
                  <PlacementWorkflowNavLabel action="Voltar" target={prevLabel} />
                </PlacementNavBackButton>
              )}
              {canAdvanceMainFlow(status) && nextStatus && (
                <PlacementNavForwardButton onClick={handleAdvance} disabled={saving}>
                  {saving ? (
                    'Avançando…'
                  ) : (
                    <PlacementWorkflowNavLabel action="Avançar" target={nextLabel} />
                  )}
                </PlacementNavForwardButton>
              )}
              <PlacementNavSecondaryButton disabled={saving} onClick={() => setEncerrarOpen(true)}>
                Encerrar
              </PlacementNavSecondaryButton>
            </PlacementWorkflowNavActions>

            {checklist.length > 0 && <PlacementWorkflowChecklistCompact items={checklist} />}
          </PlacementWorkflowNavRow>
        )}

        {advanceError && (
          <Alert severity="error" sx={{ mt: 1.5, py: 0 }} onClose={() => setAdvanceError(null)}>
            <Typography variant="body2">{advanceError}</Typography>
          </Alert>
        )}
      </PlacementWorkflowNavShell>

      {stageKey === 'base_atual' && (
        <PlacementDesignarAnalistaBlock
          analistaCadastroId={form.analistaId}
          analistaResponsavelId={form.analistaResponsavelId}
          analistaResponsavel={analistaResponsavel}
          disabled={saving}
          saving={saving}
          onDesignar={onDesignarAnalista}
          advanceTargetLabel="Kick off"
        />
      )}

      {stageKey === 'validacao' && (
        <PlacementDesignarAnalistaBlock
          analistaCadastroId={form.analistaId}
          analistaResponsavelId={form.analistaResponsavelId}
          analistaResponsavel={analistaResponsavel}
          disabled={saving}
          saving={saving}
          onDesignar={onDesignarAnalista}
          advanceTargetLabel="Kick off"
        />
      )}

      <Dialog open={retreatOpen} onClose={() => setRetreatOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Voltar etapa</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Você está em <strong>{stage?.label ?? status}</strong> e pode retornar para{' '}
            <strong>{prevLabel}</strong>.
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              Manter dados
            </Typography>
            <Typography variant="body2">
              {prevStatus ? describeRetreatKeep(status, prevStatus) : ''}
            </Typography>
          </Alert>
          {retreatDiscardAvailable && (
            <Alert severity="warning">
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Descartar dados desta etapa
              </Typography>
              <Typography variant="body2">{describeRetreatDiscard(status)}</Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1, px: 2, pb: 2 }}>
          <Button onClick={() => setRetreatOpen(false)} sx={placementNavButtonSx}>
            Cancelar
          </Button>
          <Button variant="outlined" onClick={() => handleRetreat('keep')} disabled={saving} sx={placementNavButtonSx}>
            Voltar e manter dados
          </Button>
          {retreatDiscardAvailable ? (
            <Button
              variant="contained"
              color="warning"
              onClick={() => handleRetreat('discard')}
              disabled={saving}
              sx={placementNavButtonSx}
            >
              Voltar e descartar dados
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog open={encerrarOpen} onClose={() => setEncerrarOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Encerrar cotação</DialogTitle>
        <DialogContent>
          <TextField
            select
            fullWidth
            label="Resultado"
            value={encerrarStatus}
            onChange={(e) =>
              setEncerrarStatus(e.target.value as 'Perdida' | 'Cancelada' | 'Fechada')
            }
            sx={{ mt: 1 }}
          >
            <MenuItem value="Fechada">Fechada (sucesso)</MenuItem>
            {PLACEMENT_WORKFLOW_TERMINAL_STAGES.map((s) => (
              <MenuItem key={s.status} value={s.status}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEncerrarOpen(false)} sx={placementNavButtonSx}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={handleEncerrar} disabled={saving} sx={placementNavForwardSx}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
})
