import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import DeleteIcon from '@mui/icons-material/Delete'
import { PrimaryActionButton } from '../../../components/PrimaryActionButton'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'
import { api } from '../../../lib/api.local'
import { CotacaoFormFields, type CotacaoFormState } from './CotacaoFormFields'
import { formatCentsToBRL, getStatusColor, parseBRLToCents } from './utils'

export default function PlacementFilaDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { syncFromApi } = useMasterDataStore()
  const cotacaoFromStore = usePlacementCotacaoStore((s) => s.cotacoes.find((c) => c.id === id))
  const updateCotacao = usePlacementCotacaoStore((s) => s.updateCotacao)
  const removeCotacao = usePlacementCotacaoStore((s) => s.removeCotacao)

  const [form, setForm] = useState<CotacaoFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    syncFromApi?.()
  }, [syncFromApi])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)

    const seed = cotacaoFromStore
    if (seed) {
      setForm(toFormState(seed))
      setLoading(false)
    }

    api
      .get(`/placement/cotacoes/${id}`)
      .then((data: any) => {
        if (cancelled) return
        setForm(toFormState(data))
        setLoading(false)
      })
      .catch((err: any) => {
        if (cancelled) return
        console.error('❌ GET cotacao:', err)
        if (!seed) {
          setErrorMsg('Não foi possível carregar a cotação.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, cotacaoFromStore?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const headerStatusColor = useMemo(
    () => getStatusColor(form?.status ?? 'Aberta'),
    [form?.status]
  )

  async function handleSave() {
    if (!id || !form) return
    setSaving(true)
    setErrorMsg(null)
    try {
      await updateCotacao(id, {
        ticket: form.ticket?.trim() || undefined,
        status: form.status,
        analistaId: form.analistaId || null,
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
    } catch (err: any) {
      console.error('❌ updateCotacao:', err)
      setErrorMsg(err?.message ?? 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id) return
    try {
      await removeCotacao(id)
      navigate('/placement/fila')
    } catch (err: any) {
      console.error('❌ removeCotacao:', err)
      setErrorMsg(err?.message ?? 'Erro ao excluir.')
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
        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {form?.ticket || '—'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cotação placement · {form?.ramo || 'sem ramo'} · {form?.operadorasIds?.length ?? 0} operadora(s)
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={form?.status ?? '—'}
              color={headerStatusColor.chip}
              sx={{ fontWeight: 600 }}
            />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {formatCentsToBRL(parseBRLToCents(form?.valorEstimadoBRL ?? ''))}
            </Typography>
          </Stack>
        </Stack>
      </Paper>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {loading || !form ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <CotacaoFormFields value={form} onChange={setForm} disabled={saving} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              color="error"
              startIcon={<DeleteIcon />}
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
            >
              Excluir
            </Button>
            <PrimaryActionButton
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </PrimaryActionButton>
          </Box>
        </>
      )}

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <DialogTitle>Excluir cotação?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Esta ação não pode ser desfeita. Tem certeza que deseja excluir
            a cotação <strong>{form?.ticket}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button color="error" onClick={handleDelete} variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

function toFormState(data: any): CotacaoFormState {
  const valorCents = typeof data?.valorEstimadoCents === 'number' ? data.valorEstimadoCents : null
  const prospectId = data?.prospectId ?? data?.prospect?.id ?? ''
  const clienteId = data?.clienteId ?? data?.cliente?.id ?? ''
  const grupoEconomico =
    data?.cliente?.grupoEconomico ?? data?.prospect?.grupoEconomico ?? ''
  return {
    ticket: data?.ticket ?? '',
    status: data?.status ?? 'Aberta',
    analistaId: data?.analistaId ?? data?.analista?.id ?? '',
    clienteTipo: prospectId ? 'prospect' : 'casa',
    grupoEconomico,
    clienteId,
    prospectId,
    ramo: data?.ramo ?? '',
    operadorasIds: Array.isArray(data?.operadorasIds) ? data.operadorasIds : [],
    vidas: data?.vidas != null ? String(data.vidas) : '',
    valorEstimadoBRL: valorCents != null ? formatCentsToBRL(valorCents) : '',
    dataInicio: data?.dataInicio ? String(data.dataInicio).slice(0, 10) : '',
    dataLimite: data?.dataLimite ? String(data.dataLimite).slice(0, 10) : '',
    descricao: data?.descricao ?? '',
    observacoes: data?.observacoes ?? '',
  }
}
