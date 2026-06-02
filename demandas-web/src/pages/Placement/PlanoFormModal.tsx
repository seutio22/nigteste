import React, { useEffect, useState } from 'react'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from '@mui/material'
import { useMasterDataStore } from '../../store/masterDataStore'
import type { PlacementPlano } from '../../store/placementStore'

export type PlanoFormData = {
  operadoraId: string
  categoria: string
  plano: string
  reembolso: string
  eventosReembolsaveis: string
  acomodacao: string
  abrangencia: string
}

interface Props {
  open: boolean
  editing: PlacementPlano | null
  onClose: () => void
  onSubmit: (data: PlanoFormData) => Promise<void>
}

const emptyForm = (): PlanoFormData => ({
  operadoraId: '',
  categoria: '',
  plano: '',
  reembolso: '',
  eventosReembolsaveis: '',
  acomodacao: '',
  abrangencia: '',
})

export function PlanoFormModal({ open, editing, onClose, onSubmit }: Props) {
  const operadoras = useMasterDataStore((s) => s.operadoras)
  const [form, setForm] = useState<PlanoFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        operadoraId: editing.operadoraId,
        categoria: editing.categoria,
        plano: editing.plano,
        reembolso: editing.reembolso ?? '',
        eventosReembolsaveis: editing.eventosReembolsaveis ?? '',
        acomodacao: editing.acomodacao ?? '',
        abrangencia: editing.abrangencia ?? '',
      })
    } else {
      setForm(emptyForm())
    }
    setError('')
  }, [open, editing])

  const operadoraSel = operadoras.find((o) => o.id === form.operadoraId) ?? null

  async function handleSave() {
    if (!form.operadoraId) {
      setError('Selecione o fornecedor (operadora).')
      return
    }
    if (!form.categoria.trim()) {
      setError('Informe a categoria.')
      return
    }
    if (!form.plano.trim()) {
      setError('Informe o plano.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit(form)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? 'Editar plano' : 'Novo plano'}</DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={2} sx={{ pt: 0.5 }}>
          <Grid item xs={12}>
            <Autocomplete
              options={operadoras}
              getOptionLabel={(o) => o.nome}
              value={operadoraSel}
              onChange={(_, opt) => setForm((f) => ({ ...f, operadoraId: opt?.id ?? '' }))}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => (
                <TextField {...params} label="Fornecedor" required placeholder="Operadora" />
              )}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Categoria"
              fullWidth
              required
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Plano"
              fullWidth
              required
              value={form.plano}
              onChange={(e) => setForm((f) => ({ ...f, plano: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Reembolso"
              fullWidth
              value={form.reembolso}
              onChange={(e) => setForm((f) => ({ ...f, reembolso: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Eventos reembolsáveis"
              fullWidth
              value={form.eventosReembolsaveis}
              onChange={(e) => setForm((f) => ({ ...f, eventosReembolsaveis: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Acomodação"
              fullWidth
              value={form.acomodacao}
              onChange={(e) => setForm((f) => ({ ...f, acomodacao: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Abrangência"
              fullWidth
              value={form.abrangencia}
              onChange={(e) => setForm((f) => ({ ...f, abrangencia: e.target.value }))}
            />
          </Grid>
          {error ? (
            <Grid item xs={12}>
              <TextField error helperText={error} fullWidth disabled />
            </Grid>
          ) : null}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )
}
