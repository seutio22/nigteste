import React, { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from '@mui/material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import type { PlacementAnalista } from '../../store/placementStore'

interface Props {
  open: boolean
  onClose: () => void
  editingItem?: PlacementAnalista | null
  onSubmit: (data: {
    nome: string
    coordenadorAnalista: string
    gerenteAnalista: string
  }) => Promise<void>
}

export function PlacementAnalistaFormModal({
  open,
  onClose,
  editingItem,
  onSubmit,
}: Props) {
  const [nome, setNome] = useState('')
  const [coordenadorAnalista, setCoordenadorAnalista] = useState('')
  const [gerenteAnalista, setGerenteAnalista] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editingItem?.id

  useEffect(() => {
    if (!open) return
    setNome(editingItem?.nome?.trim() ?? '')
    setCoordenadorAnalista(editingItem?.coordenadorAnalista?.trim() ?? '')
    setGerenteAnalista(editingItem?.gerenteAnalista?.trim() ?? '')
    setError(null)
  }, [open, editingItem])

  function handleClose() {
    if (submitting) return
    onClose()
  }

  async function handleSubmit() {
    setError(null)
    const n = nome.trim()
    const c = coordenadorAnalista.trim()
    const g = gerenteAnalista.trim()
    if (!n) {
      setError('Informe o nome do analista.')
      return
    }
    if (!c) {
      setError('Informe o coordenador analista.')
      return
    }
    if (!g) {
      setError('Informe o gerente analista.')
      return
    }
    try {
      setSubmitting(true)
      await onSubmit({ nome: n, coordenadorAnalista: c, gerenteAnalista: g })
      onClose()
    } catch (err: any) {
      setError(err?.message || err?.data?.message || 'Não foi possível salvar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'Editar analista' : 'Novo analista'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField
              label="Nome do analista"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              fullWidth
              autoFocus
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Coordenador analista"
              value={coordenadorAnalista}
              onChange={(e) => setCoordenadorAnalista(e.target.value)}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Gerente analista"
              value={gerenteAnalista}
              onChange={(e) => setGerenteAnalista(e.target.value)}
              required
              fullWidth
            />
          </Grid>
          {error && (
            <Grid item xs={12}>
              <div style={{ color: '#d32f2f', fontSize: '0.875rem' }}>{error}</div>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <PrimaryActionButton onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Salvar'}
        </PrimaryActionButton>
      </DialogActions>
    </Dialog>
  )
}
