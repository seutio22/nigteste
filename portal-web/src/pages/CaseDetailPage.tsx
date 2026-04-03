import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Divider,
  Paper,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { api } from '../lib/api'
import { CASE_STATUS_LABEL } from '../constants/caseStatus'
import { PRIORITY_LABEL } from '../constants/priority'

type CaseDetail = {
  id: string
  protocol: string
  status: string
  priority: string
  queueLabel: string | null
  title: string | null
  answers: unknown
  createdAt: string
  updatedAt: string
  area: { id: string; name: string; slug: string } | null
  requestType: { id: string; name: string; slug: string } | null
  user: { id: string; name: string; email: string } | null
  assignee: { id: string; name: string; email: string } | null
}

function formatAnswers(answers: unknown): string {
  if (answers == null || answers === '') return '—'
  if (typeof answers === 'object') {
    try {
      return JSON.stringify(answers, null, 2)
    } catch {
      return String(answers)
    }
  }
  return String(answers)
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [c, setC] = useState<CaseDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      setErr('ID inválido')
      setLoading(false)
      return
    }
    void (async () => {
      const res = await api<{ case: CaseDetail }>(`/cases/${id}`)
      if (!res.ok || !res.data?.case) {
        setErr(res.error || 'Não encontrado')
        setC(null)
      } else {
        setC(res.data.case)
        setErr(null)
      }
      setLoading(false)
    })()
  }, [id])

  if (loading) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="text.secondary">Carregando…</Typography>
      </Container>
    )
  }

  if (err || !c) {
    return (
      <Container sx={{ py: 4 }}>
        <Typography color="error">{err || 'Solicitação não encontrada.'}</Typography>
        <Button component={RouterLink} to="/solicitacoes" sx={{ mt: 2 }} startIcon={<ArrowBackIcon />}>
          Voltar à lista
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <RouterLink to="/" style={{ color: 'inherit' }}>
          Início
        </RouterLink>
        <RouterLink to="/solicitacoes" style={{ color: 'inherit' }}>
          Solicitações
        </RouterLink>
        <Typography color="text.primary">{c.protocol}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          {c.protocol}
        </Typography>
        <Chip label={CASE_STATUS_LABEL[c.status] || c.status} color="primary" variant="outlined" />
      </Box>

      <Button component={RouterLink} to="/solicitacoes" size="small" startIcon={<ArrowBackIcon />} sx={{ mb: 3 }}>
        Voltar
      </Button>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="subtitle2" color="text.secondary">
          Título
        </Typography>
        <Typography sx={{ mb: 2 }}>{c.title || '—'}</Typography>

        <Typography variant="subtitle2" color="text.secondary">
          Área
        </Typography>
        <Typography sx={{ mb: 2 }}>{c.area?.name || '—'}</Typography>

        <Typography variant="subtitle2" color="text.secondary">
          Tipo de solicitação
        </Typography>
        <Typography sx={{ mb: 2 }}>{c.requestType?.name || '—'}</Typography>

        <Typography variant="subtitle2" color="text.secondary">
          Solicitante
        </Typography>
        <Typography sx={{ mb: 2 }}>
          {c.user ? `${c.user.name} (${c.user.email})` : '—'}
        </Typography>

        <Typography variant="subtitle2" color="text.secondary">
          Prioridade
        </Typography>
        <Typography sx={{ mb: 2 }}>{PRIORITY_LABEL[c.priority] || c.priority}</Typography>

        <Typography variant="subtitle2" color="text.secondary">
          Fila / classificação
        </Typography>
        <Typography sx={{ mb: 2 }}>{c.queueLabel?.trim() || '—'}</Typography>

        <Typography variant="subtitle2" color="text.secondary">
          Responsável (operação)
        </Typography>
        <Typography sx={{ mb: 2 }}>
          {c.assignee ? `${c.assignee.name} (${c.assignee.email})` : '—'}
        </Typography>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" color="text.secondary">
          Dados enviados
        </Typography>
        <Box
          component="pre"
          sx={{
            mt: 1,
            p: 2,
            bgcolor: 'action.hover',
            borderRadius: 1,
            fontSize: '0.85rem',
            overflow: 'auto',
            maxHeight: 320,
          }}
        >
          {formatAnswers(c.answers)}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="caption" color="text.secondary" display="block">
          Criado em {new Date(c.createdAt).toLocaleString('pt-BR')}
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block">
          Atualizado em {new Date(c.updatedAt).toLocaleString('pt-BR')}
        </Typography>
      </Paper>
    </Container>
  )
}
