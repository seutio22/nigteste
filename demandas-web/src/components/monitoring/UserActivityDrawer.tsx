import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import { Close, Mouse, Schedule, Timelapse, TouchApp } from '@mui/icons-material'
import { getBaseUrl } from '../../config/api'
import { formatIntegerPtBR } from '../../utils/formatNumber'
import { getPageAreaLabel, shortenPathDisplay } from '../../utils/pageMonitoringLabels'
import type { UserActivityLog, UserSessionLog } from './monitoringTypes'
import { actionLabel, formatRelativeTime, formatSecondsAsHM, parseUserAgent } from './monitoringFormatters'

interface JourneyData {
  user: { id: string; name: string; email: string; role: string }
  days: number
  since: string
  summary: {
    pageDwellSeconds: number
    idleSeconds: number
    activeSeconds: number
    clickCount: number
    distinctPages: number
    idleRatio: number
  }
  pages: Array<{
    path: string
    area: string
    seconds: number
    visits: number
    idleSeconds: number
    activeSeconds: number
  }>
  topClicks: Array<{ label: string; page: string; count: number; area: string }>
  timeline: Array<{
    id: string
    at: string
    kind: string
    label: string
    page: string | null
    seconds?: number
    detail?: string
  }>
}

interface UserActivityDrawerProps {
  open: boolean
  userId: string | null
  userName: string | null
  token: string | null
  onClose: () => void
}

function kindChipColor(kind: string): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
  if (kind === 'ui_click') return 'primary'
  if (kind === 'page_time') return 'success'
  if (kind === 'idle_time') return 'warning'
  if (kind === 'login') return 'info'
  if (kind === 'logout') return 'error'
  return 'default'
}

export default function UserActivityDrawer({
  open,
  userId,
  userName,
  token,
  onClose
}: UserActivityDrawerProps) {
  const [tab, setTab] = useState(0)
  const [days, setDays] = useState(1)
  const [journey, setJourney] = useState<JourneyData | null>(null)
  const [activities, setActivities] = useState<UserActivityLog[]>([])
  const [sessions, setSessions] = useState<UserSessionLog[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!userId || !token) return
    setLoading(true)
    try {
      const headers = { Authorization: `Bearer ${token}` }
      const [journeyRes, actRes, sessRes] = await Promise.all([
        fetch(`${getBaseUrl()}/monitoring/user/${userId}/journey?days=${days}`, { headers }),
        fetch(`${getBaseUrl()}/monitoring/user/${userId}/activities?limit=100`, { headers }),
        fetch(`${getBaseUrl()}/monitoring/user/${userId}/sessions?limit=15`, { headers })
      ])
      if (journeyRes.ok) setJourney(await journeyRes.json())
      else setJourney(null)
      if (actRes.ok) setActivities(await actRes.json())
      if (sessRes.ok) setSessions(await sessRes.json())
    } catch (e) {
      console.error('UserActivityDrawer:', e)
    } finally {
      setLoading(false)
    }
  }, [userId, token, days])

  useEffect(() => {
    if (open && userId) {
      setTab(0)
      void load()
    }
  }, [open, userId, load])

  const s = journey?.summary
  const maxPageSec = journey?.pages[0]?.seconds || 1

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 560, md: 640 } } }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2, pb: 1 }}>
        <Box>
          <Typography variant="h6">{userName ?? 'Usuário'}</Typography>
          <Typography variant="caption" color="text.secondary">
            Jornada: onde clicou, quanto ficou e quanto ficou ocioso
          </Typography>
        </Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, pb: 1 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={days}
            label="Período"
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <MenuItem value={1}>Hoje</MenuItem>
            <MenuItem value={7}>7 dias</MenuItem>
            <MenuItem value={14}>14 dias</MenuItem>
            <MenuItem value={30}>30 dias</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2 }} variant="scrollable">
        <Tab label="Jornada" />
        <Tab label={`Cliques (${journey?.summary.clickCount ?? 0})`} />
        <Tab label="Timeline" />
        <Tab label="Sessões" />
        <Tab label="Log bruto" />
      </Tabs>

      <Divider />

      {loading ? (
        <Box sx={{ py: 6, textAlign: 'center' }}><CircularProgress /></Box>
      ) : tab === 0 ? (
        <Box sx={{ p: 2, overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          {!journey || (s && s.pageDwellSeconds === 0 && s.clickCount === 0 && s.idleSeconds === 0) ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              Ainda não há jornada detalhada neste período. Após navegar no sistema com a versão atual,
              aparecerão cliques, tempo por página e ociosidade.
            </Alert>
          ) : null}

          {s && (
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Schedule fontSize="small" color="success" />
                    <Typography variant="caption" color="text.secondary">Tempo ativo</Typography>
                  </Stack>
                  <Typography variant="h6">{formatSecondsAsHM(s.activeSeconds)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    na tela − ociosidade
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Timelapse fontSize="small" color="warning" />
                    <Typography variant="caption" color="text.secondary">Tempo ocioso</Typography>
                  </Stack>
                  <Typography variant="h6">{formatSecondsAsHM(s.idleSeconds)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatIntegerPtBR(s.idleRatio)}% do tempo na tela
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <TouchApp fontSize="small" color="primary" />
                    <Typography variant="caption" color="text.secondary">Cliques</Typography>
                  </Stack>
                  <Typography variant="h6">{formatIntegerPtBR(s.clickCount)}</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Mouse fontSize="small" color="info" />
                    <Typography variant="caption" color="text.secondary">Páginas distintas</Typography>
                  </Stack>
                  <Typography variant="h6">{formatIntegerPtBR(s.distinctPages)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatSecondsAsHM(s.pageDwellSeconds)} na tela (total)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}

          <Typography variant="subtitle2" gutterBottom>
            Tempo por página (ativo vs ocioso)
          </Typography>
          <Stack spacing={1.5} sx={{ mb: 3 }}>
            {(journey?.pages || []).slice(0, 15).map((p) => (
              <Box key={p.path}>
                <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Chip label={p.area} size="small" sx={{ mr: 0.5, mb: 0.25 }} />
                    <Typography variant="caption" display="block" noWrap title={p.path}>
                      {shortenPathDisplay(p.path, 48)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={600} sx={{ flexShrink: 0 }}>
                    {formatSecondsAsHM(p.seconds)}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, Math.round((100 * p.seconds) / maxPageSec))}
                  sx={{ height: 6, borderRadius: 1, my: 0.5 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {formatIntegerPtBR(p.visits)} visita(s) · ativo {formatSecondsAsHM(p.activeSeconds)} ·
                  ocioso {formatSecondsAsHM(p.idleSeconds)}
                </Typography>
              </Box>
            ))}
            {(!journey?.pages || journey.pages.length === 0) && (
              <Typography variant="body2" color="text.secondary">Sem permanência registrada.</Typography>
            )}
          </Stack>

          <Typography variant="subtitle2" gutterBottom>
            Onde mais clicou
          </Typography>
          <Stack spacing={0.75}>
            {(journey?.topClicks || []).slice(0, 12).map((c, i) => (
              <Stack key={`${c.page}-${c.label}-${i}`} direction="row" spacing={1} alignItems="flex-start">
                <Chip label={formatIntegerPtBR(c.count)} size="small" color="primary" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={500}>{c.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.area} · {shortenPathDisplay(c.page, 40)}
                  </Typography>
                </Box>
              </Stack>
            ))}
            {(!journey?.topClicks || journey.topClicks.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                Nenhum clique capturado ainda. Use o sistema normalmente — botões, abas e links passam a ser registrados.
              </Typography>
            )}
          </Stack>
        </Box>
      ) : tab === 1 ? (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 180px)' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Clique</TableCell>
                <TableCell>Página</TableCell>
                <TableCell align="right">Vezes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(journey?.topClicks || []).map((c, i) => (
                <TableRow key={`${c.label}-${i}`}>
                  <TableCell>
                    <Typography variant="body2">{c.label}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={c.area} size="small" sx={{ mb: 0.25 }} />
                    <Typography variant="caption" display="block" noWrap title={c.page}>
                      {shortenPathDisplay(c.page, 36)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatIntegerPtBR(c.count)}</TableCell>
                </TableRow>
              ))}
              {(!journey?.topClicks || journey.topClicks.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      Sem cliques neste período.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : tab === 2 ? (
        <Box sx={{ p: 2, overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }}>
          <Stack spacing={1.25}>
            {(journey?.timeline || []).map((ev) => (
              <Box
                key={ev.id}
                sx={{
                  p: 1.25,
                  borderLeft: 3,
                  borderColor:
                    ev.kind === 'idle_time'
                      ? 'warning.main'
                      : ev.kind === 'ui_click'
                        ? 'primary.main'
                        : ev.kind === 'page_time'
                          ? 'success.main'
                          : 'divider',
                  bgcolor: 'action.hover',
                  borderRadius: 1
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                  <Box sx={{ minWidth: 0 }}>
                    <Chip label={ev.kind === 'ui_click' ? 'Clique' : actionLabel(ev.kind)} size="small" color={kindChipColor(ev.kind)} sx={{ mb: 0.5 }} />
                    <Typography variant="body2" fontWeight={500}>{ev.label}</Typography>
                    {ev.page && (
                      <Typography variant="caption" color="text.secondary" display="block" noWrap title={ev.page}>
                        {getPageAreaLabel(ev.page)} · {shortenPathDisplay(ev.page, 42)}
                      </Typography>
                    )}
                    {ev.detail && (
                      <Typography variant="caption" color="text.secondary" display="block">{ev.detail}</Typography>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                    {typeof ev.seconds === 'number' && (
                      <Typography variant="body2" fontWeight={600}>{formatSecondsAsHM(ev.seconds)}</Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatRelativeTime(ev.at)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {new Date(ev.at).toLocaleString('pt-BR')}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            ))}
            {(!journey?.timeline || journey.timeline.length === 0) && (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                Timeline vazia neste período.
              </Typography>
            )}
          </Stack>
        </Box>
      ) : tab === 3 ? (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 180px)' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Login</TableCell>
                <TableCell>Duração</TableCell>
                <TableCell>Origem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((sess) => (
                <TableRow key={sess.id}>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Typography variant="caption" display="block">
                      {new Date(sess.loginTime).toLocaleString('pt-BR')}
                    </Typography>
                    {sess.isActive && <Chip label="Ativa" size="small" color="success" sx={{ mt: 0.5 }} />}
                    {sess.logoutTime && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Fim: {new Date(sess.logoutTime).toLocaleString('pt-BR')}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Typography variant="body2">
                      {sess.duration != null ? formatSecondsAsHM(sess.duration) : sess.isActive ? 'Em andamento' : '—'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {formatIntegerPtBR(sess.pageViews)} views · {formatIntegerPtBR(sess.apiCalls)} API
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Typography variant="caption" display="block">{parseUserAgent(sess.userAgent)}</Typography>
                    {sess.ipAddress && (
                      <Typography variant="caption" color="text.secondary">{sess.ipAddress}</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      Nenhuma sessão registrada.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <TableContainer sx={{ maxHeight: 'calc(100vh - 180px)' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Quando</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>Detalhe</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activities.map((a) => (
                <TableRow key={a.id}>
                  <TableCell sx={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                    <Typography variant="caption" display="block">{formatRelativeTime(a.createdAt)}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(a.createdAt).toLocaleString('pt-BR')}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    <Chip label={actionLabel(a.action)} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ verticalAlign: 'top' }}>
                    {a.page && (
                      <Typography variant="caption" display="block" title={a.page}>
                        {shortenPathDisplay(a.page, 40)}
                      </Typography>
                    )}
                    {a.duration != null && a.duration > 0 && (
                      <Typography variant="caption" color="primary" display="block">
                        {formatSecondsAsHM(a.duration)}
                      </Typography>
                    )}
                    {a.ipAddress && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        IP: {a.ipAddress}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {activities.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                      Nenhuma atividade registrada.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Drawer>
  )
}
