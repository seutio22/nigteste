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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import { api } from '../../../lib/api.local'
import { useMasterDataStore } from '../../../store/masterDataStore'
import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import { ComparativoEstudoDashboard } from './ComparativoEstudoDashboard'
import { PlacementAguardandoOperadoraPanel } from './PlacementAguardandoOperadoraPanel'
import { toFormState } from './Detail'
import { getStatusColor, getWorkflowStatusDisplayLabel } from './utils'
import {
  preferLocalComparativoConfigInKickOff,
  preferRicherKickOffWhenApplyingApi,
} from './placementKickOffPersist'
import { getWorkflowStageKey } from './placementCotacaoWorkflow'

type FullscreenPane = 'comparativo' | 'lancamento'

export default function PlacementComparativoDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const cotacaoFromStore = usePlacementCotacaoStore((s) => s.getById(id ?? ''))
  const syncMasterData = useMasterDataStore((s) => s.syncFromApi)

  const [form, setForm] = useState<CotacaoFormState | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activePane, setActivePane] = useState<FullscreenPane>('comparativo')

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
        setForm(toFormState(data))
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('GET cotacao comparativo:', err)
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
    const data = apiCotacao as Record<string, unknown>
    setForm((prev) => {
      if (!prev) return prev
      const next = toFormState(data)
      let kickOff = preferRicherKickOffWhenApplyingApi(next.kickOffEstrategia, prev.kickOffEstrategia)
      kickOff = preferLocalComparativoConfigInKickOff(kickOff, prev.kickOffEstrategia) ?? kickOff
      return { ...next, kickOffEstrategia: kickOff }
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
  const workflowStage = getWorkflowStageKey(form.status)
  const podeLancarPropostas = workflowStage === 'aguardando_operadora'

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 1300,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      <Box
        component="header"
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, md: 2.5 },
          py: 1.25,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
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
                Comparativo de propostas
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
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={activePane}
            onChange={(_, v: FullscreenPane | null) => v && setActivePane(v)}
          >
            <ToggleButton value="comparativo">Comparativo</ToggleButton>
            <ToggleButton value="lancamento" disabled={!podeLancarPropostas}>
              Lançar propostas
            </ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            size="small"
            onClick={() => navigate(`/placement/fila/${id}/etapa`)}
          >
            Etapa tela cheia
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<SlideshowIcon />}
            onClick={() => navigate(`/placement/fila/${id}/slides?slide=comparativo_propostas`)}
          >
            Slides
          </Button>
        </Stack>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {activePane === 'comparativo' ? (
          <ComparativoEstudoDashboard
            variant="fullscreen"
            cotacaoId={id}
            form={form}
            onChange={handleChange}
            onPersisted={handlePersisted}
            onNavigateToLancamento={() => setActivePane('lancamento')}
            onOpenSlides={() => navigate(`/placement/fila/${id}/slides?slide=comparativo_propostas`)}
            lancamentoDisponivel={podeLancarPropostas}
          />
        ) : (
          <Box sx={{ height: '100%', overflow: 'auto', p: { xs: 2, md: 3 } }}>
            <PlacementAguardandoOperadoraPanel
              embedded
              cotacaoId={id}
              form={form}
              onChange={handleChange}
              onPersisted={handlePersisted}
              onOpenSlides={() => navigate(`/placement/fila/${id}/slides?slide=comparativo_propostas`)}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
