import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { api } from '../lib/api'
import { CASE_STATUS_LABEL } from '../constants/caseStatus'
import { PRIORITY_LABEL } from '../constants/priority'

type CaseRow = {
  id: string
  protocol: string
  status: string
  priority: string
  queueLabel: string | null
  title: string | null
  updatedAt: string
  area: { name: string; slug: string } | null
  requestType: { name: string; slug: string; slaProfile: { name: string } | null } | null
  assignee: { name: string; email: string } | null
}

export default function CasesListPage() {
  const [cases, setCases] = useState<CaseRow[]>([])
  const [filter, setFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const c = await api<{ cases: CaseRow[] }>('/cases/mine')
      if (c.ok && c.data?.cases) setCases(c.data.cases)
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return cases
    return cases.filter((x) => x.status === filter)
  }, [cases, filter])

  const statusOptions = ['ALL', ...Object.keys(CASE_STATUS_LABEL)]

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          Minhas solicitações
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="filtro-status">Status</InputLabel>
          <Select
            labelId="filtro-status"
            label="Status"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {statusOptions.map((s) => (
              <MenuItem key={s} value={s}>
                {s === 'ALL' ? 'Todos' : CASE_STATUS_LABEL[s] || s}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Protocolo</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Área / tipo</TableCell>
              <TableCell>Prioridade</TableCell>
              <TableCell>Fila</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Atualizado</TableCell>
              <TableCell>SLA</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9}>Carregando…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9}>
                  <Typography color="text.secondary">Nenhuma solicitação neste filtro.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <RouterLink to={`/solicitacoes/${c.id}`} style={{ fontWeight: 600 }}>
                      {c.protocol}
                    </RouterLink>
                  </TableCell>
                  <TableCell>{c.title || '—'}</TableCell>
                  <TableCell>
                    {c.area?.name || '—'}
                    {c.requestType ? ` · ${c.requestType.name}` : ''}
                  </TableCell>
                  <TableCell>{PRIORITY_LABEL[c.priority] || c.priority}</TableCell>
                  <TableCell>{c.queueLabel?.trim() || '—'}</TableCell>
                  <TableCell>{c.assignee?.name || '—'}</TableCell>
                  <TableCell>{new Date(c.updatedAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell>
                    {c.requestType?.slaProfile ? (
                      <Chip
                        size="small"
                        color="info"
                        variant="outlined"
                        label={c.requestType.slaProfile.name}
                        title="Prazos no detalhe da solicitação"
                      />
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={CASE_STATUS_LABEL[c.status] || c.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  )
}
