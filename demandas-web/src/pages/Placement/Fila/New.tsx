import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import { PrimaryActionButton } from '../../../components/PrimaryActionButton'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { useAuthStore } from '../../../store/authStore'
import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'
import { CotacaoFormFields, EMPTY_COTACAO_FORM, type CotacaoFormState } from './CotacaoFormFields'
import { parseBRLToCents } from './utils'

export default function PlacementFilaNewPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { analistas, syncFromApi } = useMasterDataStore()
  const addCotacao = usePlacementCotacaoStore((s) => s.addCotacao)

  const [form, setForm] = useState<CotacaoFormState>(() => ({
    ...EMPTY_COTACAO_FORM,
  }))
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  /** Sincroniza master data (analistas, clientes, operadoras) ao montar. */
  useEffect(() => {
    syncFromApi?.()
  }, [syncFromApi])

  /** Default: analista = usuário logado, se houver match por email/nome. */
  const defaultAnalistaId = useMemo(() => {
    if (!user) return ''
    const byEmail = analistas.find(
      (a) => a.email && user.email && a.email.toLowerCase() === user.email.toLowerCase()
    )
    if (byEmail) return byEmail.id
    const byName = analistas.find(
      (a) => a.nome && user.name && a.nome.toLowerCase() === user.name.toLowerCase()
    )
    return byName?.id ?? ''
  }, [analistas, user])

  useEffect(() => {
    if (defaultAnalistaId && !form.analistaId) {
      setForm((f) => ({ ...f, analistaId: defaultAnalistaId }))
    }
  }, [defaultAnalistaId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit() {
    setErrorMsg(null)
    if (!form.status) {
      setErrorMsg('Informe o status.')
      return
    }
    if (form.clienteTipo === 'casa' && !form.clienteId) {
      setErrorMsg('Selecione o cliente da casa no Mapeamento.')
      return
    }
    if (form.clienteTipo === 'prospect' && !form.prospectId) {
      setErrorMsg('Selecione o prospect no Mapeamento (ou cadastre um novo).')
      return
    }
    setSubmitting(true)
    try {
      const created = await addCotacao({
        ticket: form.ticket?.trim() || undefined,
        status: form.status,
        analistaId: form.analistaId || null,
        userId: user?.id ?? null,
        clienteId: form.clienteTipo === 'casa' ? form.clienteId || null : null,
        prospectId: form.clienteTipo === 'prospect' ? form.prospectId || null : null,
        ramo: form.ramo?.trim() || null,
        operadorasIds: form.operadorasIds.length ? form.operadorasIds : null,
        vidas: form.vidas ? Number(form.vidas) : null,
        valorEstimadoCents: parseBRLToCents(form.valorEstimadoBRL),
        dataInicio: form.dataInicio || null,
        dataLimite: form.dataLimite || null,
        descricao: form.descricao?.trim() || null,
        observacoes: form.observacoes?.trim() || null,
      })
      navigate(`/placement/fila/${created.id}`)
    } catch (err: any) {
      console.error('❌ addCotacao:', err)
      setErrorMsg(err?.message ?? 'Erro ao salvar cotação.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          variant="text"
          onClick={() => navigate('/placement/fila')}
        >
          Voltar para Fila
        </Button>
      </Stack>

      <Paper sx={{ p: 3, mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Nova cotação placement
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Registre uma cotação para acompanhar na Fila do módulo Placement.
        </Typography>
      </Paper>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <CotacaoFormFields value={form} onChange={setForm} disabled={submitting} />

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <PrimaryActionButton
          startIcon={<SaveIcon />}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? 'Salvando…' : 'Cadastrar cotação'}
        </PrimaryActionButton>
      </Box>
    </Container>
  )
}
