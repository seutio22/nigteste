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
import SearchIcon from '@mui/icons-material/Search'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { usePlacementStore, type PlacementProspect } from '../../store/placementStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { consultarCnpjPlacement, onlyDigitsCnpj } from '../../lib/placementCnpjConsulta'
import { formatCnaeDisplay, isValidCnaeLen, normalizeCnaeDigits } from './Fila/utils'

interface ProspectFormModalProps {
  open: boolean
  onClose: () => void
  editingItem?: PlacementProspect | null
  /**
   * Quando false (ex.: nova cotação na Fila), não sugere grupos já existentes no sistema —
   * o usuário define o grupo econômico no cadastro (apenas digitação livre).
   * @default true
   */
  suggestGrupoEconomico?: boolean
  onSubmit: (data: {
    razaoSocial: string
    cnpj: string
    grupoEconomico: string | null
    cnae: string
  }) => Promise<void>
}

function formatCnpjInput(value: string): string {
  const d = onlyDigitsCnpj(value)
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
  suggestGrupoEconomico = true,
  onSubmit,
}) => {
  const [cnpj, setCnpj] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnae, setCnae] = useState('')
  const [grupoEconomico, setGrupoEconomico] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [consulting, setConsulting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editingItem?.id
  const clientes = useMasterDataStore((s) => s.clientes)
  const prospects = usePlacementStore((s) => s.prospects)

  const grupoOptions = useMemo(() => {
    if (!suggestGrupoEconomico) return [] as string[]
    const set = new Set<string>()
    clientes.forEach((c) => c.grupoEconomico && set.add(c.grupoEconomico))
    prospects.forEach((p) => p.grupoEconomico && set.add(p.grupoEconomico))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [clientes, prospects, suggestGrupoEconomico])

  useEffect(() => {
    if (!open) return
    if (editingItem) {
      setRazaoSocial(editingItem.razaoSocial ?? '')
      setCnpj(formatCnpjInput(editingItem.cnpj ?? ''))
      setGrupoEconomico(editingItem.grupoEconomico ?? '')
      setCnae(normalizeCnaeDigits(editingItem.cnae ?? ''))
    } else {
      setRazaoSocial('')
      setCnpj('')
      setGrupoEconomico('')
      setCnae('')
    }
    setError(null)
  }, [open, editingItem])

  const handleClose = () => {
    if (submitting || consulting) return
    onClose()
  }

  async function handleConsultarCnpj() {
    setError(null)
    const digits = onlyDigitsCnpj(cnpj)
    if (digits.length !== 14) {
      setError('Informe o CNPJ com 14 dígitos para consultar.')
      return
    }
    try {
      setConsulting(true)
      const res = await consultarCnpjPlacement(digits)
      if (res.razaoSocial) setRazaoSocial(res.razaoSocial)
      if (res.cnae) setCnae(res.cnae)
      if (!res.razaoSocial && !res.cnae) {
        setError('A consulta não retornou razão social nem CNAE. Preencha manualmente.')
      }
    } catch (err: any) {
      const msg =
        err?.message ||
        (typeof err?.responseText === 'string' ? err.responseText : '') ||
        'Não foi possível consultar o CNPJ.'
      setError(String(msg))
    } finally {
      setConsulting(false)
    }
  }

  const handleSubmit = async () => {
    setError(null)
    const razao = razaoSocial.trim()
    const cnpjDigits = onlyDigitsCnpj(cnpj)
    const grupo = grupoEconomico.trim()
    const cnaeDigits = normalizeCnaeDigits(cnae)

    if (cnpjDigits.length !== 14) {
      setError('CNPJ deve ter 14 dígitos.')
      return
    }
    if (!razao) {
      setError('Informe a razão social ou use “Consultar CNPJ”.')
      return
    }
    if (!isValidCnaeLen(cnaeDigits)) {
      setError('CNAE deve ter 7 ou 8 dígitos. Use “Consultar CNPJ” ou digite o CNAE.')
      return
    }

    try {
      setSubmitting(true)
      await onSubmit({
        razaoSocial: razao,
        cnpj: cnpjDigits,
        grupoEconomico: grupo || null,
        cnae: cnaeDigits,
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
            label="CNPJ"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpjInput(e.target.value))}
            placeholder="00.000.000/0000-00"
            required
            autoFocus={!isEditing}
            fullWidth
            inputProps={{ inputMode: 'numeric', maxLength: 18 }}
            helperText="Informe o CNPJ e use “Consultar CNPJ” para preencher razão social e CNAE (Receita via BrasilAPI)."
          />
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={handleConsultarCnpj}
            disabled={consulting || onlyDigitsCnpj(cnpj).length !== 14}
          >
            {consulting ? 'Consultando…' : 'Consultar CNPJ'}
          </Button>

          <TextField
            label="Razão social"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            required
            fullWidth
            helperText="Preenchida pela consulta ao CNPJ; você pode editar."
          />

          <TextField
            label="CNAE"
            value={cnae}
            onChange={(e) => setCnae(normalizeCnaeDigits(e.target.value))}
            required
            fullWidth
            inputProps={{ inputMode: 'numeric', maxLength: 8 }}
            helperText={
              cnae && isValidCnaeLen(normalizeCnaeDigits(cnae))
                ? `Formato: ${formatCnaeDisplay(cnae)}`
                : '7 ou 8 dígitos — preenchido pela consulta ou digite manualmente.'
            }
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
                placeholder={suggestGrupoEconomico ? 'Selecione ou digite um novo grupo' : 'Digite o grupo econômico'}
                helperText={
                  suggestGrupoEconomico
                    ? 'Opcional — pode reutilizar um grupo já existente.'
                    : 'Informe o grupo econômico desejado (cadastro na Fila — sem sugestão automática da base).'
                }
              />
            )}
          />

          {error && (
            <div style={{ color: '#d32f2f', fontSize: '0.875rem' }}>{error}</div>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting || consulting}>
          Cancelar
        </Button>
        <PrimaryActionButton onClick={handleSubmit} disabled={submitting || consulting}>
          {submitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Salvar'}
        </PrimaryActionButton>
      </DialogActions>
    </Dialog>
  )
}

export default ProspectFormModal
