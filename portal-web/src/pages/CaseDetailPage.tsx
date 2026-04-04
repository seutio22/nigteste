import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Paper,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline'
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked'
import { api } from '../lib/api'
import { CASE_STATUS_LABEL } from '../constants/caseStatus'
import { PRIORITY_LABEL } from '../constants/priority'

type SlaEtapa = {
  id: string
  titulo: string
  descricao: string
  estado: 'concluida' | 'em_andamento' | 'pendente' | 'atrasado' | 'pausada'
  prazoAte: string | null
  prazoLabel: string | null
  ordem: number
}

type SlaPayload = {
  temPerfil: boolean
  unidade: 'dias_uteis' | 'minutos'
  etapas: SlaEtapa[]
}

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
  slaSubmittedAt?: string | null
  slaTriagemDueAt?: string | null
  slaAtuacaoDueAt?: string | null
  slaPausedAt?: string | null
  area: { id: string; name: string; slug: string } | null
  requestType: {
    id: string
    name: string
    slug: string
    slaProfile: { id: string; name: string; prazoEmDiasUteis: boolean } | null
  } | null
  user: { id: string; name: string; email: string } | null
  assignee: { id: string; name: string; email: string } | null
  sla?: SlaPayload
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

function estadoIcon(estado: SlaEtapa['estado']) {
  switch (estado) {
    case 'concluida':
      return <CheckCircleOutlineIcon color="success" fontSize="small" />
    case 'em_andamento':
      return <HourglassEmptyIcon color="primary" fontSize="small" />
    case 'atrasado':
      return <ErrorOutlineIcon color="error" fontSize="small" />
    case 'pausada':
      return <PauseCircleOutlineIcon color="warning" fontSize="small" />
    default:
      return <RadioButtonUncheckedIcon color="disabled" fontSize="small" />
  }
}

function estadoChip(estado: SlaEtapa['estado']) {
  const map: Record<SlaEtapa['estado'], { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
    concluida: { label: 'Concluída', color: 'success' },
    em_andamento: { label: 'Em andamento', color: 'primary' },
    pendente: { label: 'Pendente', color: 'default' },
    atrasado: { label: 'Atrasado', color: 'error' },
    pausada: { label: 'Em pausa', color: 'warning' },
  }
  const m = map[estado]
  return <Chip size="small" label={m.label} color={m.color} variant={estado === 'pendente' ? 'outlined' : 'filled'} />
}

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [c, setC] = useState<CaseDetail | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState(0)

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

  const sla = c.sla
  const temSlaUi = sla?.temPerfil && sla.etapas.length > 0

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

      {c.requestType?.slaProfile && (
        <Alert severity="info" sx={{ mb: 2 }} icon={false}>
          <Typography variant="subtitle2" fontWeight={700}>
            SLA: {c.requestType.slaProfile.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {c.requestType.slaProfile.prazoEmDiasUteis
              ? 'Prazos em dias úteis (segunda a sexta), salvo pausa quando for solicitada informação adicional.'
              : 'Prazos em minutos corridos; pausa conforme configurado no perfil.'}
          </Typography>
        </Alert>
      )}

      <Button component={RouterLink} to="/solicitacoes" size="small" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Voltar
      </Button>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Detalhes" />
        <Tab label="Prazos e etapas (SLA)" />
      </Tabs>

      {tab === 0 && (
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
      )}

      {tab === 1 && temSlaUi && sla && <StackSlaEtapas sla={sla} />}

      {tab === 1 && !temSlaUi && (
        <Alert severity="warning">
          {!c.requestType?.slaProfile
            ? 'Este tipo de formulário ainda não tem perfil de SLA. Em Administração → SLA, vincule um perfil ao tipo ou use a tabela “Vincular SLA aos formulários”.'
            : 'Não foi possível carregar as etapas de SLA. Tente atualizar a página.'}
        </Alert>
      )}
    </Container>
  )
}

function StackSlaEtapas({ sla }: { sla: SlaPayload }) {
  const sorted = [...sla.etapas].sort((a, b) => a.ordem - b.ordem)
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Unidade de referência:{' '}
        <strong>{sla.unidade === 'dias_uteis' ? 'dias úteis (segunda a sexta)' : 'minutos corridos'}</strong>.
      </Typography>
      {sorted.map((e) => (
        <Card
          key={e.id}
          variant="outlined"
          sx={{
            borderLeft: 4,
            borderColor:
              e.estado === 'atrasado'
                ? 'error.main'
                : e.estado === 'em_andamento'
                  ? 'primary.main'
                  : e.estado === 'pausada'
                    ? 'warning.main'
                    : e.estado === 'concluida'
                      ? 'success.main'
                      : 'divider',
          }}
        >
          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
              {estadoIcon(e.estado)}
              <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
                {e.titulo}
              </Typography>
              {estadoChip(e.estado)}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: e.prazoLabel ? 1 : 0 }}>
              {e.descricao}
            </Typography>
            {e.prazoLabel && (
              <Typography variant="body2" color="primary.dark" fontWeight={600}>
                {e.prazoLabel}
              </Typography>
            )}
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}
