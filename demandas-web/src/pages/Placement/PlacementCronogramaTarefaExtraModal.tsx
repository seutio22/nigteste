import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import { useEffect, useState } from 'react'
import { ETAPA_KEY_OPTIONS } from './Fila/placementCronograma'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'

type ParentOption = { id: string; label: string }

type Props = {
  open: boolean
  onClose: () => void
  defaultEtapaKey?: string
  defaultParentId?: string | null
  parentOptions?: ParentOption[]
  onSubmit: (data: {
    etapaKey: string
    tarefa: string
    parentId?: string | null
    slaDias?: number | null
    responsavelPadrao?: string | null
  }) => void
}

export function PlacementCronogramaTarefaExtraModal({
  open,
  onClose,
  defaultEtapaKey,
  defaultParentId,
  parentOptions = [],
  onSubmit,
}: Props) {
  const [etapaKey, setEtapaKey] = useState(defaultEtapaKey ?? 'base_atual')
  const [parentId, setParentId] = useState<string>('')
  const [tarefa, setTarefa] = useState('')
  const [slaDias, setSlaDias] = useState('')
  const [responsavel, setResponsavel] = useState('')

  useEffect(() => {
    if (!open) return
    setEtapaKey(defaultEtapaKey ?? 'base_atual')
    setParentId(defaultParentId ?? '')
    setTarefa('')
    setSlaDias('')
    setResponsavel('')
  }, [open, defaultEtapaKey, defaultParentId])

  function handleSave() {
    const nome = tarefa.trim()
    if (!nome) return
    const sla = slaDias.trim() === '' ? null : Math.max(0, Math.round(Number(slaDias)))
    onSubmit({
      etapaKey,
      tarefa: nome,
      parentId: parentId || null,
      slaDias: sla != null && Number.isFinite(sla) ? sla : null,
      responsavelPadrao: responsavel.trim() || null,
    })
    onClose()
  }

  const isSubtarefa = Boolean(parentId)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isSubtarefa ? 'Adicionar subtarefa' : 'Adicionar tarefa'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Etapa</InputLabel>
            <Select label="Etapa" value={etapaKey} onChange={(e) => setEtapaKey(String(e.target.value))}>
              {ETAPA_KEY_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {parentOptions.length > 0 ? (
            <FormControl size="small" fullWidth>
              <InputLabel>Tarefa pai (opcional)</InputLabel>
              <Select
                label="Tarefa pai (opcional)"
                value={parentId}
                onChange={(e) => setParentId(String(e.target.value))}
              >
                <MenuItem value="">Nenhuma — tarefa principal</MenuItem>
                {parentOptions.map((o) => (
                  <MenuItem key={o.id} value={o.id}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          <TextField
            label={isSubtarefa ? 'Subtarefa' : 'Tarefa'}
            size="small"
            fullWidth
            required
            value={tarefa}
            onChange={(e) => setTarefa(e.target.value)}
          />
          <TextField
            label="Prazo (dias)"
            type="number"
            size="small"
            fullWidth
            value={slaDias}
            onChange={(e) => setSlaDias(e.target.value)}
          />
          <TextField
            label="Responsável padrão"
            size="small"
            fullWidth
            value={responsavel}
            onChange={(e) => setResponsavel(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onClose}>
          Cancelar
        </Button>
        <PrimaryActionButton onClick={handleSave} disabled={!tarefa.trim()}>
          Adicionar
        </PrimaryActionButton>
      </DialogActions>
    </Dialog>
  )
}
