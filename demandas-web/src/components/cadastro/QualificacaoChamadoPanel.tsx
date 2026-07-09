import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { ClipboardCheck } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useDemandStore } from '../../store/demandStore'
import { api } from '../../lib/api.local'
import { fmt } from '../../lib/utils'
import {
  loadChamadoQualificacaoLocal,
  saveChamadoQualificacaoLocal,
} from '../../lib/chamadoQualificacaoStorage'
import {
  type ChamadoQualificacao,
  EMPTY_CHAMADO_QUALIFICACAO,
  chamadoQualificacaoIgual,
  parseChamadoQualificacao,
} from '../../types/chamadoQualificacao'
import { QualificacaoChamadoFields } from './QualificacaoChamadoFields'

interface Props {
  demandId: string
  ticket?: string | null
  /** Dentro do card lateral (sem borda dupla) */
  embedded?: boolean
}

function resolveInitialQualificacao(
  demandId: string,
  fromDemand: unknown,
): ChamadoQualificacao {
  const fromApi = parseChamadoQualificacao(fromDemand)
  if (fromApi?.avaliadoEm) return fromApi
  const local = loadChamadoQualificacaoLocal(demandId)
  if (local.avaliadoEm) return local
  return fromApi ?? { ...EMPTY_CHAMADO_QUALIFICACAO }
}

export function QualificacaoChamadoPanel({ demandId, ticket, embedded }: Props) {
  const { user } = useAuthStore()
  const upsert = useDemandStore((s) => s.upsert)
  const demand = useDemandStore((s) => s.items.find((d) => d.id === demandId))

  const [draft, setDraft] = useState<ChamadoQualificacao>(() =>
    resolveInitialQualificacao(demandId, demand?.qualificacaoChamado),
  )
  const [saved, setSaved] = useState<ChamadoQualificacao>(() =>
    resolveInitialQualificacao(demandId, demand?.qualificacaoChamado),
  )
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning'; text: string } | null>(
    null,
  )

  useEffect(() => {
    const next = resolveInitialQualificacao(demandId, demand?.qualificacaoChamado)
    setDraft(next)
    setSaved(next)
  }, [demandId, demand?.qualificacaoChamado, demand?.updatedAt])

  const dirty = useMemo(() => !chamadoQualificacaoIgual(draft, saved), [draft, saved])

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    const payload: ChamadoQualificacao = {
      ...draft,
      observacao: draft.observacao?.trim() ?? '',
      avaliadoEm: new Date().toISOString(),
      avaliadoPor: user?.name || user?.email || 'Analista',
    }

    let persistedOnApi = false
    try {
      await api.updateDemanda(demandId, { qualificacaoChamado: payload } as any)
      persistedOnApi = true
    } catch {
      /* preview / API ainda sem coluna — fallback local */
    }

    saveChamadoQualificacaoLocal(demandId, payload)

    if (demand) {
      await upsert({ ...demand, qualificacaoChamado: payload })
    }

    setSaved(payload)
    setDraft(payload)
    setFeedback({
      type: persistedOnApi ? 'success' : 'warning',
      text: persistedOnApi
        ? 'Qualificação salva no chamado.'
        : 'Qualificação salva neste navegador (API ainda não publicada com este campo).',
    })
    setSaving(false)
  }

  const content = (
    <>
      <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mb: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            flexShrink: 0,
          }}
        >
          <ClipboardCheck size={20} />
        </Box>
        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Qualificação do chamado
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {ticket ? `Chamado ${ticket}` : 'Avalie a qualidade dos dados recepcionados'}
          </Typography>
        </Box>
      </Stack>

      <QualificacaoChamadoFields
        value={draft}
        onChange={(next) => {
          setDraft(next)
          setFeedback(null)
        }}
        disabled={saving}
      />

      {saved.avaliadoEm && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Última avaliação: {fmt(saved.avaliadoEm)}
          {saved.avaliadoPor ? ` · ${saved.avaliadoPor}` : ''}
        </Typography>
      )}

      {feedback && (
        <Alert severity={feedback.type} sx={{ mt: 2 }}>
          {feedback.text}
        </Alert>
      )}

      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        disabled={!dirty || saving}
        onClick={() => void handleSave()}
      >
        {saving ? 'Salvando…' : dirty ? 'Salvar qualificação' : 'Qualificação salva'}
      </Button>
    </>
  )

  if (embedded) {
    return <Box>{content}</Box>
  }

  return (
    <Box
      component="aside"
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 2.5,
        boxShadow: 1,
      }}
    >
      {content}
    </Box>
  )
}
