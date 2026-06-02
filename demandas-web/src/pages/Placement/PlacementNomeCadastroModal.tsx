import React, { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'

export interface PlacementNomeCadastroRow {
  id: string
  nome: string
}

interface PlacementNomeCadastroModalProps {
  open: boolean
  onClose: () => void
  editingItem?: PlacementNomeCadastroRow | null
  titleNew: string
  titleEdit: string
  onSubmit: (data: { nome: string }) => Promise<void>
}

export const PlacementNomeCadastroModal: React.FC<PlacementNomeCadastroModalProps> = ({
  open,
  onClose,
  editingItem,
  titleNew,
  titleEdit,
  onSubmit,
}) => {
  const [nome, setNome] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editingItem?.id

  useEffect(() => {
    if (!open) return
    setNome(editingItem?.nome?.trim() ?? '')
    setError(null)
  }, [open, editingItem])

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  async function handleSubmit() {
    setError(null)
    const n = nome.trim()
    if (!n) {
      setError('Informe o nome.')
      return
    }
    try {
      setSubmitting(true)
      await onSubmit({ nome: n })
      onClose()
    } catch (err: unknown) {
      const anyE = err as { message?: string; data?: { message?: string } }
      setError(anyE?.message || anyE?.data?.message || 'Não foi possível salvar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEditing ? titleEdit : titleNew}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          <TextField
            label="Nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            fullWidth
            autoFocus
            helperText="Cadastro apenas com nome."
          />
          {error && <div style={{ color: '#d32f2f', fontSize: '0.875rem' }}>{error}</div>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Cancelar
        </Button>
        <PrimaryActionButton onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Salvar'}
        </PrimaryActionButton>
      </DialogActions>
    </Dialog>
  )
}
