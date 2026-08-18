import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Alert, Box, CircularProgress, Stack, Typography } from '@mui/material'
import { api } from '../../../lib/api.local'
import { setPlacementShareToken } from '../../../lib/placementShareSession'
import { useMasterDataStore } from '../../../store/masterDataStore'
import type { CotacaoFormState } from './CotacaoFormFields'
import { toFormState } from './Detail'
import { PlacementPropostaViewer } from './PlacementPropostaViewer'
import {
  preferLocalComparativoConfigInKickOff,
  preferRicherKickOffWhenApplyingApi,
} from './placementKickOffPersist'
import {
  clearAguardandoOperadoraFiltrosVisibilidade,
  parseAguardandoOperadoraFromKickOff,
} from './placementAguardandoOperadora'
import {
  clearPlacementShareAccessSession,
  usePlacementShareAccessTracking,
} from './usePlacementShareAccessTracking'

type SharePayload = {
  shareInfo?: { name?: string; accessLogId?: string }
  cotacao?: unknown
  operadoras?: Array<{ id: string; nome: string }>
}

function formForPublicShareSession(form: CotacaoFormState): CotacaoFormState {
  const ag = parseAguardandoOperadoraFromKickOff(form.kickOffEstrategia)
  if (!ag) return form
  const cleared = clearAguardandoOperadoraFiltrosVisibilidade(ag)
  return {
    ...form,
    kickOffEstrategia: {
      ...form.kickOffEstrategia,
      aguardandoOperadora: {
        ...(form.kickOffEstrategia?.aguardandoOperadora ?? {}),
        ...cleared,
      },
    },
  }
}

export default function SharePlacementPresentationPage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CotacaoFormState | null>(null)
  const [cotacaoId, setCotacaoId] = useState('')
  const [title, setTitle] = useState('Apresentação da proposta')
  const [sessionNonce, setSessionNonce] = useState(0)
  const [accessLogId, setAccessLogId] = useState<string | undefined>()

  const { trackPane } = usePlacementShareAccessTracking(token, accessLogId)

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return
      setForm((prev) => (prev ? formForPublicShareSession(prev) : prev))
      setSessionNonce((n) => n + 1)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  useEffect(() => {
    if (!token) return
    setPlacementShareToken(token)
    let cancelled = false
    setLoading(true)
    setError(null)

    api
      .get(`/share/placement/${token}`)
      .then((raw: unknown) => {
        if (cancelled) return
        const data = raw as SharePayload
        if (!data?.cotacao) {
          setError('Apresentação indisponível.')
          setLoading(false)
          return
        }
        const nextForm = formForPublicShareSession(toFormState(data.cotacao))
        setForm(nextForm)
        setCotacaoId(String((data.cotacao as { id?: string }).id ?? ''))
        setTitle(data.shareInfo?.name || `Proposta ${nextForm.ticket}`)
        setAccessLogId(data.shareInfo?.accessLogId)
        if (Array.isArray(data.operadoras)) {
          useMasterDataStore.setState((s) => {
            const byId = { ...s.operadorasById } as Record<string, any>
            const list = data.operadoras!.map((op) => {
              const prev = s.operadoras.find((x) => x.id === op.id)
              const merged = { ...(prev ?? {}), id: op.id, nome: op.nome }
              byId[op.id] = merged
              return merged
            })
            return { operadoras: list as typeof s.operadoras, operadorasById: byId }
          })
        }
        setLoading(false)
      })
      .catch((err: any) => {
        if (cancelled) return
        setError(err?.message ?? 'Link inválido ou expirado.')
        setLoading(false)
      })

    return () => {
      cancelled = true
      setPlacementShareToken(null)
      clearPlacementShareAccessSession()
    }
  }, [token])

  const handleChange = useCallback((next: CotacaoFormState) => {
    setForm(next)
  }, [])

  const handlePersisted = useCallback((apiCotacao: unknown) => {
    const data = apiCotacao as Record<string, unknown>
    setForm((prev) => {
      if (!prev) return prev
      if (!data || typeof data !== 'object') return prev
      // PUT no-op do share — não reconstruir formulário.
      if (data.__placementShareLocalNoop) return prev
      // Em modo público o PUT é local (noop); mescla se vier cotação completa.
      if (!(data as { id?: string }).id) {
        const ko = data.kickOffEstrategia
        if (ko && typeof ko === 'object') {
          let kickOff = preferRicherKickOffWhenApplyingApi(
            ko as CotacaoFormState['kickOffEstrategia'],
            prev.kickOffEstrategia
          )
          kickOff = preferLocalComparativoConfigInKickOff(kickOff, prev.kickOffEstrategia) ?? kickOff
          return { ...prev, kickOffEstrategia: kickOff }
        }
        return prev
      }
      try {
        const next = toFormState(data)
        let kickOff = preferRicherKickOffWhenApplyingApi(next.kickOffEstrategia, prev.kickOffEstrategia)
        kickOff = preferLocalComparativoConfigInKickOff(kickOff, prev.kickOffEstrategia) ?? kickOff
        return { ...next, kickOffEstrategia: kickOff }
      } catch {
        return prev
      }
    })
  }, [])

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  }

  if (error || !form || !cotacaoId) {
    return (
      <Box sx={{ p: 3, maxWidth: 560, mx: 'auto' }}>
        <Alert severity="error">{error ?? 'Apresentação não encontrada.'}</Alert>
      </Box>
    )
  }

  return (
    <PlacementPropostaViewer
      key={`${token}-${sessionNonce}`}
      cotacaoId={cotacaoId}
      form={form}
      onChange={handleChange}
      onPersisted={handlePersisted}
      publicMode
      initialPane="grupo_elegivel"
      onPublicPaneChange={trackPane}
      headerLeft={
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }} noWrap>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {form.ticket}
          </Typography>
        </Stack>
      }
    />
  )
}
