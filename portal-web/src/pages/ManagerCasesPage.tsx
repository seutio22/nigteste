import { useEffect, useState } from 'react'
import { Link as RouterLink, Navigate } from 'react-router-dom'
import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { CASE_STATUS_LABEL } from '../constants/caseStatus'
import PageScaffold from '../components/PageScaffold'

type CaseRow = {
  id: string
  protocol: string
  status: string
  title: string | null
  updatedAt: string
  user: { id: string; name: string; email: string }
  area: { name: string } | null
  requestType: { name: string } | null
}

export default function ManagerCasesPage() {
  const { user } = useAuth()
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const r = await api<{ cases: CaseRow[] }>('/manager/cases')
      if (r.ok && r.data?.cases) setCases(r.data.cases)
      setLoading(false)
    })()
  }, [])

  if (user?.role !== 'REQUESTER_MANAGER') {
    return <Navigate to="/" replace />
  }

  return (
    <PageScaffold>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Gestão — solicitações da equipe
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Solicitações dos colaboradores vinculados a si (campo gestor no cadastro de usuários).
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
        <Table size="small" sx={{ '& .MuiTableCell-root': { py: 1.125, px: 1.5 } }}>
          <TableHead>
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell>Protocolo</TableCell>
              <TableCell>Colaborador</TableCell>
              <TableCell>Título</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Carregando…</TableCell>
              </TableRow>
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>
                  <Typography color="text.secondary">Nenhuma solicitação ou nenhum colaborador vinculado.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => (
                <TableRow key={c.id} hover>
                  <TableCell>
                    <RouterLink to={`/solicitacoes/${c.id}`}>{c.protocol}</RouterLink>
                  </TableCell>
                  <TableCell>{c.user.name}</TableCell>
                  <TableCell>{c.title || '—'}</TableCell>
                  <TableCell>{c.requestType?.name || '—'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={CASE_STATUS_LABEL[c.status] || c.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>
    </PageScaffold>
  )
}
