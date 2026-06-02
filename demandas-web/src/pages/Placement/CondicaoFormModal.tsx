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
import { usePlacementStore, type PlacementCondicao } from '../../store/placementStore'
import { useMasterDataStore } from '../../store/masterDataStore'
import { consultarCnpjPlacement, onlyDigitsCnpj } from '../../lib/placementCnpjConsulta'
import { formatCnaeDisplay, isValidCnaeLen, normalizeCnaeDigits } from './Fila/utils'

interface CondicaoFormModalProps {
  open: boolean
  onClose: () => void
  editingItem?: PlacementCondicao | null
  /** Pré-preenche grupo ao criar a partir do fluxo de cotação (cliente da casa). */
  defaultGrupoEconomico?: string | null
  /** Razão social inicial (ex.: nome do estipulante no cadastro de Clientes). */
  defaultRazaoSocial?: string | null
  /** CNPJ inicial (ex.: CNPJ do estipulante na base). */
  defaultCnpj?: string | null
  onSubmit: (data: {
    grupoEconomico: string | null
    razaoSocial: string
    cnae: string
    cnpj: string | null
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

export const CondicaoFormModal: React.FC<CondicaoFormModalProps> = ({
  open,
  onClose,
  editingItem,
  defaultGrupoEconomico,
  defaultRazaoSocial,
  defaultCnpj,
  onSubmit,
}) => {
  const [cnpj, setCnpj] = useState('')
  const [cnae, setCnae] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [grupoEconomico, setGrupoEconomico] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [consulting, setConsulting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!editingItem?.id
  const clientes = useMasterDataStore((s) => s.clientes)
  const condicoes = usePlacementStore((s) => s.condicoes)

  const grupoOptions = useMemo(() => {
    const set = new Set<string>()
    clientes.forEach((c) => c.grupoEconomico && set.add(c.grupoEconomico))
    condicoes.forEach((c) => c.grupoEconomico && set.add(c.grupoEconomico))
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [clientes, condicoes])

  useEffect(() => {
    if (!open) return
    if (editingItem) {
      setCnpj(formatCnpjInput(editingItem.cnpj ?? ''))
      setRazaoSocial(editingItem.razaoSocial ?? '')
      setGrupoEconomico(editingItem.grupoEconomico ?? '')
      setCnae(normalizeCnaeDigits(editingItem.cnae ?? ''))
    } else {
      setCnpj(defaultCnpj ? formatCnpjInput(defaultCnpj) : '')
      setRazaoSocial(defaultRazaoSocial?.trim() ?? '')
      setGrupoEconomico(defaultGrupoEconomico?.trim() ?? '')
      setCnae('')
    }
    setError(null)
  }, [open, editingItem, defaultGrupoEconomico, defaultRazaoSocial, defaultCnpj])

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
    const cnpjDigits = onlyDigitsCnpj(cnpj)
    const grupo = grupoEconomico.trim()
    const cnaeDigits = normalizeCnaeDigits(cnae)
    const razao = razaoSocial.trim()

    if (!isEditing && cnpjDigits.length !== 14) {
      setError('Informe o CNPJ com 14 dígitos.')
      return
    }
    if (isEditing && cnpjDigits.length > 0 && cnpjDigits.length !== 14) {
      setError('CNPJ deve ter 14 dígitos ou fique em branco.')
      return
    }
    if (!isValidCnaeLen(cnaeDigits)) {
      setError('CNAE deve ter 7 ou 8 dígitos (apenas números). Use “Consultar CNPJ” ou digite o CNAE.')
      return
    }
    if (isEditing && !razao) {
      setError('Razão social é obrigatória na edição.')
      return
    }

    try {
      setSubmitting(true)
      await onSubmit({
        razaoSocial: isEditing ? razao : razao || '',
        grupoEconomico: grupo || null,
        cnae: cnaeDigits,
        cnpj: cnpjDigits.length === 14 ? cnpjDigits : null,
      })
      onClose()
    } catch (err: any) {
      setError(
        err?.message ||
          err?.data?.message ||
          'Não foi possível salvar a condição. Tente novamente.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'Editar condição' : 'Nova condição'}</DialogTitle>
      <DialogContent>
        <Stack gap={2} mt={1}>
          <TextField
            label="CNPJ"
            value={cnpj}
            onChange={(e) => setCnpj(formatCnpjInput(e.target.value))}
            placeholder="00.000.000/0000-00"
            required
            fullWidth
            inputProps={{ inputMode: 'numeric', maxLength: 18 }}
            helperText="Informe o CNPJ e use “Consultar CNPJ” para preencher CNAE e razão social (Receita via BrasilAPI)."
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

          <TextField
            label={isEditing ? 'Razão social' : 'Razão social (opcional na criação)'}
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            required={isEditing}
            fullWidth
            helperText={
              isEditing
                ? 'Obrigatória na edição. Ajuste se necessário.'
                : 'CNPJ e CNAE são o cadastro principal. Se deixar em branco, o servidor tenta preencher pela BrasilAPI ao salvar; use “Consultar CNPJ” para conferir antes.'
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
                placeholder="Opcional — alinhe ao grupo do cliente"
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

export default CondicaoFormModal
