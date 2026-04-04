import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Container,
  Grid,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import ListAltIcon from '@mui/icons-material/ListAlt'
import GroupsIcon from '@mui/icons-material/Groups'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { CASE_STATUS_LABEL } from '../constants/caseStatus'

type CaseRow = {
  id: string
  protocol: string
  status: string
  title: string | null
  updatedAt: string
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [cases, setCases] = useState<CaseRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      const c = await api<{ cases: CaseRow[] }>('/cases/mine')
      if (c.ok && c.data?.cases) setCases(c.data.cases)
      setLoading(false)
    })()
  }, [])

  const recent = cases.slice(0, 5)
  const openCount = cases.filter((x) => !['COMPLETED', 'CANCELLED'].includes(x.status)).length

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Olá, {user?.name}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Acompanhe suas solicitações e abra novos pedidos escolhendo o tipo no catálogo.
      </Typography>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardActionArea component={RouterLink} to="/solicitacoes/nova" sx={{ height: '100%', alignItems: 'stretch' }}>
              <CardContent>
                <AddCircleOutlineIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography fontWeight={600}>Nova solicitação</Typography>
                <Typography variant="body2" color="text.secondary">
                  Catálogo por área e tipo, depois o formulário
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <CardActionArea component={RouterLink} to="/solicitacoes" sx={{ height: '100%' }}>
              <CardContent>
                <ListAltIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                <Typography fontWeight={600}>Minhas solicitações</Typography>
                <Typography variant="body2" color="text.secondary">
                  {loading ? '…' : `${cases.length} total · ${openCount} em andamento`}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      </Grid>

      {(user?.role === 'REQUESTER_MANAGER' ||
        user?.role === 'PORTAL_OPERATOR' ||
        user?.role === 'PORTAL_ADMIN') && (
        <>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1.5 }}>
            Atalhos do seu perfil
          </Typography>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {user?.role === 'REQUESTER_MANAGER' && (
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea component={RouterLink} to="/gestao/solicitacoes" sx={{ height: '100%' }}>
                    <CardContent>
                      <GroupsIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography fontWeight={600}>Gestão — equipe</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Veja solicitações dos colaboradores vinculados a você
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )}
            {(user?.role === 'PORTAL_OPERATOR' || user?.role === 'PORTAL_ADMIN') && (
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea component={RouterLink} to="/operacao/fila" sx={{ height: '100%' }}>
                    <CardContent>
                      <PrecisionManufacturingIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography fontWeight={600}>Operação — fila</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Triagem, prioridade, fila e responsável
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )}
            {user?.role === 'PORTAL_ADMIN' && (
              <Grid item xs={12} sm={6} md={4}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardActionArea component={RouterLink} to="/admin/centro" sx={{ height: '100%' }}>
                    <CardContent>
                      <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                      <Typography fontWeight={600}>Painel administrativo</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Usuários, áreas e formulários por tipo
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            )}
          </Grid>
        </>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>
          Solicitações recentes
        </Typography>
        <Button component={RouterLink} to="/solicitacoes" size="small">
          Ver todas
        </Button>
      </Box>

      {recent.length === 0 ? (
        <Typography color="text.secondary">Nenhuma solicitação ainda. Comece por “Nova solicitação”.</Typography>
      ) : (
        <List sx={{ bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
          {recent.map((c) => (
            <ListItem
              key={c.id}
              secondaryAction={
                <Chip size="small" label={CASE_STATUS_LABEL[c.status] || c.status} sx={{ mr: 1 }} />
              }
              divider
            >
              <ListItemText
                primary={
                  <RouterLink to={`/solicitacoes/${c.id}`} style={{ color: 'inherit', fontWeight: 600 }}>
                    {c.protocol}
                  </RouterLink>
                }
                secondary={c.title || 'Sem título'}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Container>
  )
}
