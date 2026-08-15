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
import { formatCnpjMask, isCnpjShape, onlyDigitsCnpj } from '../../lib/placementCnpjConsulta'
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

function formatCnpj(value: string): string {
  return formatCnpjMask(value)
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
    const cnpjDigits = onlyDigitsCnpj(cnpj)

    if (!razao) {
      setError('Informe a razão social.')
      return
    }
    if (!isCnpjShape(cnpjDigits)) {
      setError('CNPJ deve ter 14 caracteres (A–Z e 0–9; DV numérico).')
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
            placeholder="00.000.000/0000-00 ou 12.ABC.345/01DE-35"
            required
            fullWidth
            inputProps={{ maxLength: 18 }}
            helperText="CNPJ numérico ou alfanumérico (14 caracteres; DV numérico)."
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
