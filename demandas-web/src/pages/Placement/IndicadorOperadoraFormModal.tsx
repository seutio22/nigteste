import React, { useEffect, useState } from 'react'
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
import {
  usePlacementStore,
  type PlacementIndicadorOperadora,
} from '../../store/placementStore'
import { INDICADOR_OPERADORA_ITENS } from './Fila/placementIndicadoresOperadorasCatalogo'

export type IndicadorOperadoraFormData = {
  operadoraId: string
  itemKey: string
  texto: string
}

interface Props {
  open: boolean
  editing: PlacementIndicadorOperadora | null
  onClose: () => void
  onSubmit: (data: IndicadorOperadoraFormData) => Promise<void>
}

const emptyForm = (): IndicadorOperadoraFormData => ({
  operadoraId: '',
  itemKey: INDICADOR_OPERADORA_ITENS[0]?.key ?? 'idss',
  texto: '',
})

export function IndicadorOperadoraFormModal({ open, editing, onClose, onSubmit }: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const [form, setForm] = useState<IndicadorOperadoraFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        operadoraId: editing.operadoraId,
        itemKey: editing.itemKey,
        texto: editing.texto,
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, editing])

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await onSubmit({
        operadoraId: form.operadoraId,
        itemKey: form.itemKey,
        texto: form.texto.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave = !!form.operadoraId && !!form.itemKey && !!form.texto.trim()

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? 'Editar indicador' : 'Novo indicador'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <Autocomplete
              options={operadoras}
              getOptionLabel={(o) => o.nome}
              value={operadoras.find((o) => o.id === form.operadoraId) ?? null}
              onChange={(_, v) => setForm((f) => ({ ...f, operadoraId: v?.id ?? '' }))}
              renderInput={(params) => <TextField {...params} label="Fornecedor" required />}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              select
              fullWidth
              label="Indicador"
              value={form.itemKey}
              onChange={(e) => setForm((f) => ({ ...f, itemKey: e.target.value }))}
            >
              {INDICADOR_OPERADORA_ITENS.map((item) => (
                <MenuItem key={item.key} value={item.key}>
                  {item.indice ? `${item.indice} — ${item.nomenclatura}` : item.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              minRows={3}
              label="Valor / descrição"
              value={form.texto}
              onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
              placeholder="Ex.: 0,7875 · Grande · Medicina de Grupo · 4.938.911"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => void handleSubmit()} disabled={saving || !canSave}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
