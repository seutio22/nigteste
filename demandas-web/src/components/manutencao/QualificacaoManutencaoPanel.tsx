import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { ClipboardCheck } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useManutencaoStore } from '../../store/manutencaoStore'
import { api } from '../../lib/api.local'
import { fmt } from '../../lib/utils'
import {
  loadManutencaoQualificacaoLocal,
  saveManutencaoQualificacaoLocal,
} from '../../lib/manutencaoQualificacaoStorage'
import {
  type ManutencaoQualificacao,
  EMPTY_MANUTENCAO_QUALIFICACAO,
  manutencaoQualificacaoIgual,
  parseManutencaoQualificacao,
} from '../../types/manutencaoQualificacao'
import { QualificacaoManutencaoFields } from './QualificacaoManutencaoFields'

interface Props {
  manutencaoId: string
  ticket?: string | null
  embedded?: boolean
}

function resolveInitialQualificacao(
  manutencaoId: string,
  fromItem: unknown,
): ManutencaoQualificacao {
  const fromApi = parseManutencaoQualificacao(fromItem)
  if (fromApi?.avaliadoEm) return fromApi
  const local = loadManutencaoQualificacaoLocal(manutencaoId)
  if (local.avaliadoEm) return local
  return fromApi ?? { ...EMPTY_MANUTENCAO_QUALIFICACAO }
}

export function QualificacaoManutencaoPanel({ manutencaoId, ticket, embedded }: Props) {
  const { user } = useAuthStore()
  const upsert = useManutencaoStore((s) => s.upsert)
  const item = useManutencaoStore((s) => s.items.find((m) => m.id === manutencaoId))

  const [draft, setDraft] = useState<ManutencaoQualificacao>(() =>
    resolveInitialQualificacao(manutencaoId, item?.qualificacaoChamado),
  )
  const [saved, setSaved] = useState<ManutencaoQualificacao>(() =>
    resolveInitialQualificacao(manutencaoId, item?.qualificacaoChamado),
  )
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning'; text: string } | null>(
    null,
  )

  useEffect(() => {
    const next = resolveInitialQualificacao(manutencaoId, item?.qualificacaoChamado)
    setDraft(next)
    setSaved(next)
  }, [manutencaoId, item?.qualificacaoChamado, item?.updatedAt])

  const dirty = useMemo(() => !manutencaoQualificacaoIgual(draft, saved), [draft, saved])

  const handleSave = async () => {
    setSaving(true)
    setFeedback(null)
    const payload: ManutencaoQualificacao = {
      ...draft,
      observacao: draft.observacao?.trim() ?? '',
      avaliadoEm: new Date().toISOString(),
      avaliadoPor: user?.name || user?.email || 'Analista',
    }

    let persistedOnApi = false
    try {
      await api.updateManutencao(manutencaoId, { qualificacaoChamado: payload } as any)
      persistedOnApi = true
    } catch {
      /* preview / API ainda sem coluna — fallback local */
    }

    saveManutencaoQualificacaoLocal(manutencaoId, payload)

    if (item) {
      await upsert({ ...item, qualificacaoChamado: payload })
    }

    setSaved(payload)
    setDraft(payload)
    setFeedback({
      type: persistedOnApi ? 'success' : 'warning',
      text: persistedOnApi
        ? 'Qualificação salva na manutenção.'
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
            {ticket ? `Manutenção ${ticket}` : 'Avalie a qualidade dos dados recepcionados'}
          </Typography>
        </Box>
      </Stack>

      <QualificacaoManutencaoFields
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
