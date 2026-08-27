import React, { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import type { PlacementCronogramaAtividade } from '../../store/placementStore'
import {
  ETAPA_KEY_OPTIONS,
  slaReferenciaLabel,
  type PlacementCronogramaSlaReferencia,
} from './Fila/placementCronograma'

type FormState = {
  ordem: string
  etapaKey: string
  tarefa: string
  parentId: string
  responsavelPadrao: string
  slaDias: string
  slaReferencia: PlacementCronogramaSlaReferencia
  ativo: boolean
  observacoes: string
}

const emptyForm = (): FormState => ({
  ordem: '',
  etapaKey: 'base_atual',
  tarefa: '',
  parentId: '',
  responsavelPadrao: '',
  slaDias: '',
  slaReferencia: 'apos_anterior',
  ativo: true,
  observacoes: '',
})

type Props = {
  open: boolean
  onClose: () => void
  editingItem: PlacementCronogramaAtividade | null
  atividades: PlacementCronogramaAtividade[]
  nextOrdem: number
  onSubmit: (data: {
    ordem?: number
    etapaKey: string
    tarefa: string
    parentId?: string | null
    slaDias?: number | null
    slaReferencia: PlacementCronogramaSlaReferencia
    responsavelPadrao?: string | null
    ativo: boolean
    observacoes?: string | null
  }) => Promise<void>
}

export function PlacementCronogramaAtividadeModal({
  open,
  onClose,
  editingItem,
  atividades,
  nextOrdem,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  const tarefasPai = useMemo(
    () =>
      atividades.filter(
        (a) => !a.parentId && a.id !== editingItem?.id && a.ativo !== false
      ),
    [atividades, editingItem?.id]
  )

  const isSubtarefa = Boolean(form.parentId)

  useEffect(() => {
    if (!open) return
    if (editingItem) {
      setForm({
        ordem: String(editingItem.ordem),
        etapaKey: editingItem.etapaKey,
        tarefa: editingItem.tarefa,
        parentId: editingItem.parentId ?? '',
        responsavelPadrao: editingItem.responsavelPadrao ?? '',
        slaDias: editingItem.slaDias != null ? String(editingItem.slaDias) : '',
        slaReferencia:
          editingItem.slaReferencia === 'inicio_processo' ? 'inicio_processo' : 'apos_anterior',
        ativo: editingItem.ativo !== false,
        observacoes: editingItem.observacoes ?? '',
      })
    } else {
      setForm({ ...emptyForm(), ordem: String(nextOrdem) })
    }
  }, [open, editingItem, nextOrdem])

  async function handleSave() {
    const tarefa = form.tarefa.trim()
    const etapaKey = form.etapaKey.trim()
    if (!tarefa || !etapaKey) return
    setSaving(true)
    try {
      const ordem = form.ordem.trim() ? Math.round(Number(form.ordem)) : undefined
      const slaDias = form.slaDias.trim() === '' ? null : Math.max(0, Math.round(Number(form.slaDias)))
      const parent = tarefasPai.find((t) => t.id === form.parentId)
      await onSubmit({
        ordem,
        etapaKey: parent?.etapaKey ?? etapaKey,
        tarefa,
        parentId: form.parentId.trim() || null,
        slaDias: isSubtarefa ? null : slaDias != null && Number.isFinite(slaDias) ? slaDias : null,
        slaReferencia: isSubtarefa ? 'apos_anterior' : form.slaReferencia,
        responsavelPadrao: form.responsavelPadrao.trim() || null,
        ativo: form.ativo,
        observacoes: form.observacoes.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingItem ? 'Editar item' : 'Novo item'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              label="Tipo"
              value={isSubtarefa ? 'subtarefa' : 'tarefa'}
              onChange={(e) => {
                const subtarefa = e.target.value === 'subtarefa'
                setForm((f) => ({
                  ...f,
                  parentId: subtarefa ? f.parentId || tarefasPai[0]?.id || '' : '',
                  slaDias: subtarefa ? '' : f.slaDias,
                }))
              }}
            >
              <MenuItem value="tarefa">Tarefa</MenuItem>
              <MenuItem value="subtarefa">Subtarefa</MenuItem>
            </Select>
          </FormControl>

          {isSubtarefa ? (
            <FormControl size="small" fullWidth required>
              <InputLabel>Tarefa pai</InputLabel>
              <Select
                label="Tarefa pai"
                value={form.parentId}
                onChange={(e) => {
                  const parentId = String(e.target.value)
                  const parent = tarefasPai.find((t) => t.id === parentId)
                  setForm((f) => ({
                    ...f,
                    parentId,
                    etapaKey: parent?.etapaKey ?? f.etapaKey,
                  }))
                }}
              >
                {tarefasPai.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.tarefa}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <FormControl size="small" fullWidth required>
              <InputLabel>Etapa</InputLabel>
              <Select
                label="Etapa"
                value={form.etapaKey}
                onChange={(e) => setForm((f) => ({ ...f, etapaKey: String(e.target.value) }))}
              >
                {ETAPA_KEY_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <TextField
            label={isSubtarefa ? 'Subtarefa' : 'Tarefa'}
            value={form.tarefa}
            onChange={(e) => setForm((f) => ({ ...f, tarefa: e.target.value }))}
            size="small"
            fullWidth
            required
          />

          <TextField
            label="Responsável padrão"
            value={form.responsavelPadrao}
            onChange={(e) => setForm((f) => ({ ...f, responsavelPadrao: e.target.value }))}
            size="small"
            fullWidth
            placeholder="Opcional — herda na cotação"
          />

          {!isSubtarefa ? (
            <>
              <TextField
                label="Prazo entrega (dias)"
                type="number"
                value={form.slaDias}
                onChange={(e) => setForm((f) => ({ ...f, slaDias: e.target.value }))}
                size="small"
                fullWidth
                inputProps={{ min: 0 }}
              />
              <FormControl size="small" fullWidth>
                <InputLabel>Referência do SLA</InputLabel>
                <Select
                  label="Referência do SLA"
                  value={form.slaReferencia}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slaReferencia: e.target.value as PlacementCronogramaSlaReferencia,
                    }))
                  }
                >
                  <MenuItem value="inicio_processo">{slaReferenciaLabel('inicio_processo')}</MenuItem>
                  <MenuItem value="apos_anterior">{slaReferenciaLabel('apos_anterior')}</MenuItem>
                </Select>
              </FormControl>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Subtarefas herdam a etapa da tarefa pai e seguem na cadeia de SLA após a tarefa.
            </Typography>
          )}

          <TextField
            label="Ordem"
            type="number"
            value={form.ordem}
            onChange={(e) => setForm((f) => ({ ...f, ordem: e.target.value }))}
            size="small"
            fullWidth
          />

          <TextField
            label="Observações"
            value={form.observacoes}
            onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
            size="small"
            fullWidth
            multiline
            minRows={2}
          />

          <FormControlLabel
            control={
              <Switch
                checked={form.ativo}
                onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
              />
            }
            label="Ativo"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <PrimaryActionButton variant="text" onClick={onClose} disabled={saving}>
          Cancelar
        </PrimaryActionButton>
        <PrimaryActionButton
          onClick={() => void handleSave()}
          disabled={
            saving ||
            !form.tarefa.trim() ||
            !form.etapaKey.trim() ||
            (isSubtarefa && !form.parentId)
          }
        >
          Salvar
        </PrimaryActionButton>
      </DialogActions>
    </Dialog>
  )
}
