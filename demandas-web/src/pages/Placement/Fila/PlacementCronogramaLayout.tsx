import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SaveIcon from '@mui/icons-material/Save'
import SlideshowIcon from '@mui/icons-material/Slideshow'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { api } from '../../../lib/api.local'
import { usePlacementCotacaoStore } from '../../../store/placementCotacaoStore'
import { usePlacementStore } from '../../../store/placementStore'
import { toFormState } from './Detail'
import { getStatusColor, getWorkflowStatusDisplayLabel } from './utils'
import { mergeApiCotacaoIntoForm, buildKickOffEstrategiaPatch } from './placementKickOffPersist'
import { persistKickOffSlim } from './placementKickOffSlimPersist'
import { upsertCronogramaLinha, type PlacementCronogramaInstancia, type PlacementCronogramaLinha } from './placementCronograma'
import { parseKickOffEstrategiaFromApi } from './placementKickOffEstrategia'
import {
  ensureCronogramaLinhasFromTemplate,
  mergeAtividadesComComplementares,
} from './placementCronogramaSync'
import { PlacementCronogramaPageProvider } from './placementCronogramaPageContext'

export default function PlacementCronogramaLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams<{ id: string }>()
  const cotacaoFromStore = usePlacementCotacaoStore((s) => s.getById(id ?? ''))
  const cronogramaAtividades = usePlacementStore((s) => s.cronogramaAtividades)
  const syncCronogramaAtividades = usePlacementStore((s) => s.syncCronogramaAtividades)
  const isLoadingAtividades = usePlacementStore((s) => s.isLoadingCronogramaAtividades)

  const [form, setForm] = useState<ReturnType<typeof toFormState> | null>(null)
  const [cronograma, setCronograma] = useState<PlacementCronogramaInstancia>({
    dataInicioProcesso: null,
    linhas: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [validationMsg, setValidationMsg] = useState<string | null>(null)

  const tab = location.pathname.endsWith('/participantes') ? 'participantes' : 'cronograma'

  useEffect(() => {
    void syncCronogramaAtividades(true)
  }, [syncCronogramaAtividades])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    setLoading(true)
    setErrorMsg(null)

    const seed = cotacaoFromStore
    if (seed) {
      const seededForm = toFormState(seed)
      setForm(seededForm)
      setCronograma(parseKickOffEstrategiaFromApi(seededForm.kickOffEstrategia).cronograma ?? {
        dataInicioProcesso: null,
        linhas: [],
      })
      setLoading(false)
    }

    api
      .get(`/placement/cotacoes/${id}`)
      .then((data: unknown) => {
        if (cancelled) return
        setForm((prev) => {
          const next = toFormState(data)
          const merged = !prev ? next : mergeApiCotacaoIntoForm(prev, next, data)
          const parsed = parseKickOffEstrategiaFromApi(merged.kickOffEstrategia)
          setCronograma(parsed.cronograma ?? { dataInicioProcesso: null, linhas: [] })
          return merged
        })
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        console.error('GET cotacao cronograma:', err)
        if (!seed) {
          setErrorMsg('Não foi possível carregar a cotação.')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [id, cotacaoFromStore?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const atividadesMerged = useMemo(
    () => mergeAtividadesComComplementares(cronogramaAtividades, cronograma),
    [cronogramaAtividades, cronograma.tarefasComplementares, cronograma.atividadesExcluidas]
  )

  useEffect(() => {
    if (!form) return
    setCronograma((prev) =>
      ensureCronogramaLinhasFromTemplate(
        atividadesMerged,
        prev,
        prev.dataInicioProcesso ?? form.dataInicio ?? null
      )
    )
  }, [form?.dataInicio, atividadesMerged, form]) // eslint-disable-line react-hooks/exhaustive-deps

  const patchLinha = useCallback((atividadeId: string, patch: Partial<PlacementCronogramaLinha>) => {
    setCronograma((prev) => upsertCronogramaLinha(prev, atividadeId, patch))
  }, [])

  async function handleSave() {
    if (!id || !form) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const kickOff = buildKickOffEstrategiaPatch(form.kickOffEstrategia, { cronograma })
      const apiCotacao = await persistKickOffSlim(id, kickOff)
      setForm((prev) => {
        if (!prev) return prev
        return mergeApiCotacaoIntoForm(prev, { ...prev, kickOffEstrategia: kickOff }, apiCotacao)
      })
      setSaveMsg('Cronograma salvo com sucesso.')
    } catch (err: unknown) {
      console.error('save cronograma:', err)
      setSaveMsg('Erro ao salvar o cronograma.')
    } finally {
      setSaving(false)
    }
  }

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
  const titulo = form.ticket || form.razaoSocial || id

  const ctxValue = {
    id,
    form,
    cronograma,
    setCronograma,
    saving,
    saveMsg,
    setSaveMsg,
    validationMsg,
    setValidationMsg,
    handleSave,
    patchLinha,
    isLoadingAtividades,
    atividadesMerged,
  }

  return (
    <PlacementCronogramaPageProvider value={ctxValue}>
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
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
              <IconButton size="small" onClick={() => navigate(`/placement/fila/${id}`)} aria-label="Voltar">
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                    Cronograma
                  </Typography>
                  <Chip
                    size="small"
                    label={getWorkflowStatusDisplayLabel(form.status)}
                    sx={{ bgcolor: statusColor, color: '#fff', fontWeight: 700 }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {titulo}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                size="small"
                startIcon={<SlideshowIcon />}
                onClick={() => navigate(`/placement/fila/${id}/slides`)}
              >
                Slides
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<OpenInFullIcon />}
                onClick={() => navigate(`/placement/fila/${id}/comparativo`)}
              >
                Comparativo
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={() => void handleSave()}
                disabled={saving}
              >
                Salvar
              </Button>
            </Stack>
          </Stack>

          <Tabs
            value={tab}
            onChange={(_, v) => {
              if (v === 'participantes') navigate(`/placement/fila/${id}/cronograma/participantes`)
              else navigate(`/placement/fila/${id}/cronograma`)
            }}
            sx={{ mt: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5 } }}
          >
            <Tab value="cronograma" label="Etapas e tarefas" />
            <Tab
              value="participantes"
              label={`Participantes${(cronograma.participantes?.length ?? 0) > 0 ? ` (${cronograma.participantes!.length})` : ''}`}
            />
          </Tabs>
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', p: { xs: 1.5, md: 2.5 } }}>
          {saveMsg ? (
            <Alert
              severity={saveMsg.includes('Erro') ? 'error' : 'success'}
              sx={{ mb: 2 }}
              onClose={() => setSaveMsg(null)}
            >
              {saveMsg}
            </Alert>
          ) : null}
          {validationMsg ? (
            <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setValidationMsg(null)}>
              {validationMsg}
            </Alert>
          ) : null}
          <Outlet />
        </Box>
      </Box>
    </PlacementCronogramaPageProvider>
  )
}
