import React, { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material'
import { useMasterDataStore } from '../../store/masterDataStore'
import { usePlacementStore, type PlacementDiferencial } from '../../store/placementStore'
import { DIFERENCIAL_ITENS } from './Fila/placementDiferenciaisCatalogo'

export type DiferencialFormData = {
  operadoraId: string
  placementPlanoId: string
  itemKey: string
  texto: string
}

interface Props {
  open: boolean
  editing: PlacementDiferencial | null
  onClose: () => void
  onSubmit: (data: DiferencialFormData) => Promise<void>
}

const emptyForm = (): DiferencialFormData => ({
  operadoraId: '',
  placementPlanoId: '',
  itemKey: DIFERENCIAL_ITENS[0]?.key ?? 'telemedicina',
  texto: '',
})

export function DiferencialFormModal({ open, editing, onClose, onSubmit }: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const planos = usePlacementStore((s) => s.planos)
  const syncPlanos = usePlacementStore((s) => s.syncPlanos)

  const [form, setForm] = useState<DiferencialFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) void syncPlanos(true)
  }, [open, syncPlanos])

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        operadoraId: editing.operadoraId,
        placementPlanoId: editing.placementPlanoId,
        itemKey: editing.itemKey,
        texto: editing.texto,
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, editing])

  const planosFiltrados = useMemo(
    () => planos.filter((p) => p.operadoraId === form.operadoraId),
    [planos, form.operadoraId]
  )

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSubmit({
        operadoraId: form.operadoraId,
        placementPlanoId: form.placementPlanoId,
        itemKey: form.itemKey,
        texto: form.texto.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? 'Editar diferencial' : 'Novo diferencial'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={operadoras}
              getOptionLabel={(o) => o.nome}
              value={operadoras.find((o) => o.id === form.operadoraId) ?? null}
              onChange={(_, v) =>
                setForm((f) => ({
                  ...f,
                  operadoraId: v?.id ?? '',
                  placementPlanoId: '',
                }))
              }
              renderInput={(params) => <TextField {...params} label="Fornecedor" required />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={planosFiltrados}
              getOptionLabel={(p) => `${p.plano} (${p.categoria})`}
              value={planosFiltrados.find((p) => p.id === form.placementPlanoId) ?? null}
              onChange={(_, v) => setForm((f) => ({ ...f, placementPlanoId: v?.id ?? '' }))}
              disabled={!form.operadoraId}
              renderInput={(params) => <TextField {...params} label="Plano" required />}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Item diferencial"
              value={form.itemKey}
              onChange={(e) => setForm((f) => ({ ...f, itemKey: e.target.value }))}
            >
              {DIFERENCIAL_ITENS.map((item) => (
                <MenuItem key={item.key} value={item.key}>
                  {item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={4}
              label="Descrição"
              value={form.texto}
              onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
              placeholder="Ex.: S6500: Possui atendimento 24h..."
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={
            saving ||
            !form.operadoraId ||
            !form.placementPlanoId ||
            !form.itemKey ||
            !form.texto.trim()
          }
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
