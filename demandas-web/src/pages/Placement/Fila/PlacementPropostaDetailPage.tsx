import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { api } from '../../../lib/api.local'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import { toFormState } from './Detail'
import { getStatusColor, getWorkflowStatusDisplayLabel } from './utils'
import { mergeApiCotacaoIntoForm } from './placementKickOffPersist'
import { PlacementPropostaViewer } from './PlacementPropostaViewer'

/** Apresentação interna robusta (mesmo visual do comparativo) — Proposta enviada. */
export default function PlacementPropostaDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const cotacaoFromStore = usePlacementCotacaoStore((s) => s.getById(id ?? ''))
  const syncMasterData = useMasterDataStore((s) => s.syncFromApi)

  const [form, setForm] = useState<CotacaoFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    void syncMasterData?.({ entities: ['operadoras', 'produtos', 'analistas', 'clientes'] })
  }, [syncMasterData])

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
      .then((data: unknown) => {
        if (cancelled) return
        setForm((prev) => {
          const next = toFormState(data)
          if (!prev) return next
          return mergeApiCotacaoIntoForm(prev, next, data)
        })
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        if (!seed) {
          setErrorMsg('Não foi possível carregar a cotação.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, cotacaoFromStore?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((next: CotacaoFormState) => {
    setForm(next)
  }, [])

  const handlePersisted = useCallback((apiCotacao: unknown) => {
    setForm((prev) => {
      if (!prev) return prev
      return mergeApiCotacaoIntoForm(prev, toFormState(apiCotacao), apiCotacao)
    })
  }, [])

  if (loading && !form) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (!form || !id) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{errorMsg ?? 'Cotação não encontrada.'}</Alert>
        <Button sx={{ mt: 2 }} startIcon={<ArrowBackIcon />} onClick={() => navigate('/placement/fila')}>
          Voltar à fila
        </Button>
      </Box>
    )
  }

  const statusColor = getStatusColor(form.status)

  return (
    <PlacementPropostaViewer
      cotacaoId={id}
      form={form}
      onChange={handleChange}
      onPersisted={handlePersisted}
      initialPane="comparativo"
      headerLeft={
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/placement/fila/${id}`)}
            aria-label="Voltar à cotação"
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
              <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                Apresentação da proposta
              </Typography>
              <Chip
                size="small"
                label={getWorkflowStatusDisplayLabel(form.status)}
                sx={{ bgcolor: statusColor, color: '#fff', fontWeight: 700 }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" noWrap>
              {form.ticket || id}
            </Typography>
          </Box>
        </Stack>
      }
    />
  )
}
