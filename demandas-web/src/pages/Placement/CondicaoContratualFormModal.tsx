import React, { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  MenuItem,
  Switch,
  TextField,
} from '@mui/material'
import { useMasterDataStore } from '../../store/masterDataStore'
import {
  usePlacementStore,
  type PlacementCondicaoContratual,
} from '../../store/placementStore'
import { CONDICAO_CONTRATUAL_ITENS } from './Fila/placementCondicoesContratuaisCatalogo'

export type CondicaoContratualFormData = {
  operadoraId: string
  porPlano: boolean
  placementPlanoId: string
  itemKey: string
  texto: string
}

interface Props {
  open: boolean
  editing: PlacementCondicaoContratual | null
  onClose: () => void
  onSubmit: (data: CondicaoContratualFormData) => Promise<void>
}

const emptyForm = (): CondicaoContratualFormData => ({
  operadoraId: '',
  porPlano: false,
  placementPlanoId: '',
  itemKey: CONDICAO_CONTRATUAL_ITENS[0]?.key ?? 'vigencia_contratual',
  texto: '',
})

export function CondicaoContratualFormModal({ open, editing, onClose, onSubmit }: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const planos = usePlacementStore((s) => s.planos)
  const syncPlanos = usePlacementStore((s) => s.syncPlanos)

  const [form, setForm] = useState<CondicaoContratualFormData>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) void syncPlanos(true)
  }, [open, syncPlanos])

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        operadoraId: editing.operadoraId,
        porPlano: editing.porPlano === true,
        placementPlanoId: editing.placementPlanoId ?? '',
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
        porPlano: form.porPlano,
        placementPlanoId: form.porPlano ? form.placementPlanoId : '',
        itemKey: form.itemKey,
        texto: form.texto.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const canSave =
    !!form.operadoraId &&
    !!form.itemKey &&
    !!form.texto.trim() &&
    (!form.porPlano || !!form.placementPlanoId)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editing ? 'Editar condição contratual' : 'Nova condição contratual'}
      </DialogTitle>
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
            <FormControlLabel
              control={
                <Switch
                  checked={form.porPlano}
                  onChange={(_, checked) =>
                    setForm((f) => ({
                      ...f,
                      porPlano: checked,
                      placementPlanoId: checked ? f.placementPlanoId : '',
                    }))
                  }
                />
              }
              label="Cadastrar por plano"
              sx={{ mt: 1 }}
            />
          </Grid>
          {form.porPlano && (
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
          )}
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Condição"
              value={form.itemKey}
              onChange={(e) => setForm((f) => ({ ...f, itemKey: e.target.value }))}
            >
              {CONDICAO_CONTRATUAL_ITENS.map((item) => (
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
              placeholder="Ex.: 24 meses · Compulsório · PME…"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={saving || !canSave}
        >
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
