import React, { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { PrimaryActionButton } from '../../../components/PrimaryActionButton'
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
import { getWorkflowStageKey } from './placementCotacaoWorkflow'
import type { PlacementCotacaoWorkflowStatus } from './placementCotacaoStatus'
import type { PlacementAnalista } from '../../../store/placementStore'
import { useMasterDataStore } from '../../../store/masterDataStore'

type Props = {
  status: string
  form: CotacaoFormState
  saving?: boolean
  analistaResponsavel?: PlacementAnalista | null
  onDesignarAnalista: (analistaResponsavelId: string) => Promise<void>
  onAdvance: (nextStatus: PlacementCotacaoWorkflowStatus) => Promise<void>
  onRetreat: (
    prevStatus: PlacementCotacaoWorkflowStatus,
    mode: WorkflowRetreatMode
  ) => Promise<void>
  onEncerrar: (status: 'Perdida' | 'Cancelada' | 'Fechada') => Promise<void>
}

export function PlacementCotacaoWorkflowPanel({
  status,
  form,
  saving,
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
  const [encerrarStatus, setEncerrarStatus] = useState<'Perdida' | 'Cancelada' | 'Fechada'>('Perdida')

  const stage = getWorkflowStageMeta(status)
  const nextStatus = nextMainFlowStatus(status)
  const prevStatus = previousMainFlowStatus(status)
  const checklist = useMemo(
    () => buildWorkflowChecklist(status, form, operadoras, operadorasById),
    [status, form, operadoras, operadorasById]
  )
  const pendingCount = checklist.filter((c) => !c.done).length
  const terminal = isMainFlowTerminal(status)

  async function handleAdvance() {
    setAdvanceError(null)
    const err = validateForWorkflowAdvance(status, form)
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
    <Box>
      <PlacementCotacaoWorkflowBar status={status} compact />

      {stageKey === 'base_atual' && (
        <PlacementDesignarAnalistaBlock
          analistaCadastroId={form.analistaId}
          analistaResponsavelId={form.analistaResponsavelId}
          analistaResponsavel={analistaResponsavel}
          disabled={saving}
          saving={saving}
          onDesignar={onDesignarAnalista}
        />
      )}

      {stage && (
        <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {stage.label} — {stage.description}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {stage.objective}
          </Typography>
        </Alert>
      )}

      {checklist.length > 0 && !terminal && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Pontos de ajuste
            </Typography>
            {pendingCount > 0 ? (
              <Chip label={`${pendingCount} pendente(s)`} size="small" color="warning" />
            ) : (
              <Chip label="Pronto para avançar" size="small" color="success" />
            )}
          </Stack>
          <List dense disablePadding>
            {checklist.map((item) => (
              <ListItem key={item.id} disableGutters>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  {item.done ? (
                    <CheckCircleIcon color="success" fontSize="small" />
                  ) : (
                    <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: 'body2',
                    color: item.done ? 'text.primary' : 'text.secondary',
                  }}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {advanceError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {advanceError}
        </Alert>
      )}

      {!terminal && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {canRetreatMainFlow(status) && prevStatus && (
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              disabled={saving}
              onClick={() => setRetreatOpen(true)}
            >
              Voltar para «{getWorkflowStageMeta(prevStatus)?.label ?? prevStatus}»
            </Button>
          )}
          {canAdvanceMainFlow(status) && nextStatus && (
            <PrimaryActionButton
              startIcon={<ArrowForwardIcon />}
              onClick={handleAdvance}
              disabled={saving}
            >
              {saving
                ? 'Avançando…'
                : `Avançar para «${getWorkflowStageMeta(nextStatus)?.label ?? nextStatus}»`}
            </PrimaryActionButton>
          )}
          <Button variant="outlined" color="inherit" disabled={saving} onClick={() => setEncerrarOpen(true)}>
            Encerrar processo…
          </Button>
        </Stack>
      )}

      <Dialog open={retreatOpen} onClose={() => setRetreatOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Voltar etapa</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Você está em <strong>{stage?.label ?? status}</strong> e pode retornar para{' '}
            <strong>{getWorkflowStageMeta(prevStatus ?? '')?.label ?? prevStatus}</strong>.
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
          <Button onClick={() => setRetreatOpen(false)}>Cancelar</Button>
          <Button variant="outlined" onClick={() => handleRetreat('keep')} disabled={saving}>
            Voltar e manter dados
          </Button>
          {retreatDiscardAvailable ? (
            <Button
              variant="contained"
              color="warning"
              onClick={() => handleRetreat('discard')}
              disabled={saving}
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
          <Button onClick={() => setEncerrarOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleEncerrar} disabled={saving}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
