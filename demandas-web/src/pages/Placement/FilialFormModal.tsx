import React, { useEffect, useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import type {
  PlacementFilial,
  PlacementFilialStatus,
} from '../../store/placementStore'

interface FilialFormModalProps {
  open: boolean
  onClose: () => void
  editingItem?: PlacementFilial | null
  onSubmit: (data: {
    razaoSocial: string
    cnpj: string
    status: PlacementFilialStatus
  }) => Promise<void>
}

function onlyDigits(value: string): string {
  return (value || '').replace(/\D+/g, '')
}

function formatCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`
}

export const FilialFormModal: React.FC<FilialFormModalProps> = ({
  open,
  onClose,
  editingItem,
  onSubmit,
}) => {
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [status, setStatus] = useState<PlacementFilialStatus>('Ativo')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editingItem?.id

  useEffect(() => {
    if (!open) return
    if (editingItem) {
      setRazaoSocial(editingItem.razaoSocial ?? '')
      setCnpj(formatCnpj(editingItem.cnpj ?? ''))
      setStatus((editingItem.status as PlacementFilialStatus) ?? 'Ativo')
    } else {
      setRazaoSocial('')
      setCnpj('')
      setStatus('Ativo')
    }
    setError(null)
  }, [open, editingItem])

  const handleClose = () => {
    if (submitting) return
    onClose()
  }

  const handleSubmit = async () => {
    setError(null)
    const razao = razaoSocial.trim()
    const cnpjDigits = onlyDigits(cnpj)

    if (!razao) {
      setError('Informe a razão social.')
      return
    }
    if (cnpjDigits.length !== 14) {
      setError('CNPJ deve ter 14 dígitos.')
      return
    }

    try {
      setSubmitting(true)
      await onSubmit({ razaoSocial: razao, cnpj: cnpjDigits, status })
      onClose()
    } catch (err: any) {
      setError(
        err?.message ||
          err?.data?.message ||
          'Não foi possível salvar a filial. Tente novamente.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'Editar filial' : 'Nova filial'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          <TextField
            label="Razão social"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            required
            autoFocus
            fullWidth
          />
          <TextField
            label="CNPJ"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            placeholder="00.000.000/0000-00"
            required
            fullWidth
            inputProps={{ inputMode: 'numeric', maxLength: 18 }}
            helperText="Informe os 14 dígitos do CNPJ."
          />
          <TextField
            select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PlacementFilialStatus)}
            required
            fullWidth
          >
            <MenuItem value="Ativo">Ativo</MenuItem>
            <MenuItem value="Inativo">Inativo</MenuItem>
          </TextField>

          {error && (
            <div style={{ color: '#d32f2f', fontSize: '0.875rem' }}>{error}</div>
          )}
        </Stack>
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

export default FilialFormModal
