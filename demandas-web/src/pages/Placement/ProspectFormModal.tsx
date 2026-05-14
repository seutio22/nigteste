import React, { useEffect, useMemo, useState } from 'react'
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { usePlacementStore, type PlacementProspect } from '../../store/placementStore'
import { useMasterDataStore } from '../../store/masterDataStore'

interface ProspectFormModalProps {
  open: boolean
  onClose: () => void
  editingItem?: PlacementProspect | null
  onSubmit: (data: {
    razaoSocial: string
    cnpj: string
    grupoEconomico: string | null
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

export const ProspectFormModal: React.FC<ProspectFormModalProps> = ({
  open,
  onClose,
  editingItem,
  onSubmit,
}) => {
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [grupoEconomico, setGrupoEconomico] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editingItem?.id
  const clientes = useMasterDataStore((s) => s.clientes)
  const prospects = usePlacementStore((s) => s.prospects)

  /** Lista de grupos econômicos já existentes (clientes da casa + prospects). */
  const grupoOptions = useMemo(() => {
    const set = new Set<string>()
    clientes.forEach((c) => c.grupoEconomico && set.add(c.grupoEconomico))
    prospects.forEach((p) => p.grupoEconomico && set.add(p.grupoEconomico))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [clientes, prospects])

  useEffect(() => {
    if (!open) return
    if (editingItem) {
      setRazaoSocial(editingItem.razaoSocial ?? '')
      setCnpj(formatCnpj(editingItem.cnpj ?? ''))
      setGrupoEconomico(editingItem.grupoEconomico ?? '')
    } else {
      setRazaoSocial('')
      setCnpj('')
      setGrupoEconomico('')
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
    const grupo = grupoEconomico.trim()

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
      await onSubmit({
        razaoSocial: razao,
        cnpj: cnpjDigits,
        grupoEconomico: grupo || null,
      })
      onClose()
    } catch (err: any) {
      setError(
        err?.message ||
          err?.data?.message ||
          'Não foi possível salvar o prospect. Tente novamente.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'Editar prospect' : 'Novo prospect'}</DialogTitle>
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
          <Autocomplete
            freeSolo
            options={grupoOptions}
            value={grupoEconomico}
            onChange={(_, val) => setGrupoEconomico(String(val ?? ''))}
            onInputChange={(_, val) => setGrupoEconomico(val ?? '')}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Grupo econômico"
                placeholder="Selecione ou digite um novo grupo"
                helperText="Opcional — pode reutilizar um grupo já existente."
              />
            )}
          />

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

export default ProspectFormModal
