import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import { Bell, Mail, List, Trash2, Eye, Users, CheckCircle2, UserCheck } from 'lucide-react'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { getApi } from '../lib/apiConfig'
import { addDismissedAlert, getDismissedAlertIds } from '../utils/dismissedAlerts'
import { NotificationDetailModal } from '../components/NotificationDetailModal'
import { CreateAlertModal } from '../components/CreateAlertModal'
import { PrimaryActionButton } from '../components/PrimaryActionButton'
import { formatIntegerPtBR } from '../utils/formatNumber'
import { AddCircleOutline as AddCircleOutlineIcon } from '@mui/icons-material'
import { createKanbanTicketFromNotification } from '../utils/notificationToKanban'

function contentKey(n: { titulo?: string; mensagem?: string; dataCriacao?: string }) {
  return `content:${(n.titulo ?? '').trim().slice(0, 200)}|${(n.mensagem ?? '').trim().slice(0, 500)}|${(n.dataCriacao ?? '').trim().slice(0, 30)}`
}

function formatTimeAgo(dateString: string) {
  const now = new Date()
  const date = new Date(dateString)
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
  if (diffInMinutes < 1) return 'Agora'
  if (diffInMinutes < 60) return `${diffInMinutes} min`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`
  return `${Math.floor(diffInMinutes / 1440)}d`
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return d
  }
}

function getPriorityColor(prioridade: string) {
  switch (prioridade) {
    case 'urgente':
      return 'bg-red-100 text-red-800'
    case 'alta':
      return 'bg-orange-100 text-orange-800'
    case 'media':
      return 'bg-yellow-100 text-yellow-800'
    case 'baixa':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-apoio-100 text-apoio-500'
  }
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [detailNotification, setDetailNotification] = useState<any>(null)
  const [createAlertOpen, setCreateAlertOpen] = useState(false)
  const [managedAlerts, setManagedAlerts] = useState<any[]>([])
  const [managedLoading, setManagedLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewsDialogAlert, setViewsDialogAlert] = useState<{
    titulo: string
    visualizacoes: { usuarioNome?: string; usuarioId?: string; dataVisualizacao?: string }[]
  } | null>(null)

  const { user } = useAuthStore()
  const canCreateAlerts = ['admin', 'gerente'].includes(user?.role || '')
  const {
    notifications,
    dismissedKeys,
    markAsRead,
    remove,
    markAllAsRead
  } = useNotificationStore()

  const dismissedIdsSet = useMemo(
    () => new Set(getDismissedAlertIds().map((id) => String(id).trim()).filter(Boolean)),
    [notifications]
  )
  const visibleNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        const alertaId = n.dados?.alertaId != null ? String(n.dados.alertaId).trim() : ''
        if (alertaId && dismissedIdsSet.has(alertaId)) return false
        const key = n.dados?.alertaId ?? n.dados?.dedupeKey
        if (key && dismissedKeys?.includes(key)) return false
        if (dismissedKeys?.includes(contentKey(n))) return false
        return true
      }),
    [notifications, dismissedKeys, dismissedIdsSet]
  )
  const unreadOnly = useMemo(
    () => visibleNotifications.filter((n) => !n.lida),
    [visibleNotifications]
  )
  const readOnly = useMemo(
    () => visibleNotifications.filter((n) => n.lida),
    [visibleNotifications]
  )

  /** Índice da aba "Meus alertas criados" (após Caixa de entrada, Lidas) */
  const managedTabIndex = canCreateAlerts ? 2 : -1

  useEffect(() => {
    if (canCreateAlerts && tab === managedTabIndex) {
      setManagedLoading(true)
      getApi()
        .get('/user-alerts/managed')
        .then((res: any) => setManagedAlerts(res?.alertas ?? []))
        .catch(() => setManagedAlerts([]))
        .finally(() => setManagedLoading(false))
    }
  }, [canCreateAlerts, tab, managedTabIndex])

  // Atualização imediata ao abrir a caixa de entrada (não esperar o próximo polling)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('refresh-user-alerts'))
  }, [])

  const handleOpenDetail = async (notification: any) => {
    markAsRead(notification.id)
    const alertaId = notification.dados?.alertaId
    if (alertaId) {
      try {
        await getApi().post(`/user-alerts/${alertaId}/view`, {})
      } catch {}
    }
    setDetailNotification(notification)
  }

  const handleRemove = async (e: React.MouseEvent, notification: any) => {
    e.stopPropagation()
    const alertaId = notification.dados?.alertaId
    if (alertaId) addDismissedAlert(alertaId)
    remove(notification.id)
    if (detailNotification?.id === notification.id) setDetailNotification(null)
  }

  const handleDetailNavigate = () => {
    if (!detailNotification) return
    const d = detailNotification.dados
    if (d?.projectId) {
      navigate(`/projetos/${d.projectId}`, {
        state: { activeTab: 1, scrollToTaskId: d.taskId || null, scrollToSubtaskId: d.subtaskId || null }
      })
    } else if (d?.kanbanTicketId) {
      navigate('/kanban', { state: { highlightTicket: d.kanbanTicketId, scrollToTicket: true } })
    } else if (detailNotification.link) {
      navigate(detailNotification.link)
    } else if (d?.comunicadoId) {
      navigate(`/comunicados/${d.comunicadoId}`)
    } else if (d?.demandaId) {
      navigate(`/cadastro/${d.demandaId}`)
    } else if (d?.atendimentoId) {
      navigate(`/atendimento/${d.atendimentoId}`)
    }
    setDetailNotification(null)
  }

  const handleDeleteManagedAlert = async (id: string) => {
    setDeletingId(id)
    try {
      await getApi().delete(`/user-alerts/${id}`)
      setManagedAlerts((prev) => prev.filter((a) => a.id !== id))
      window.dispatchEvent(new CustomEvent('refresh-user-alerts'))
    } catch {
      // ignore
    } finally {
      setDeletingId(null)
    }
  }

  const listToShow = tab === 0 ? unreadOnly : tab === 1 ? readOnly : []

  return (
    <Box className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <Typography variant="h5" className="font-semibold text-primary-900">
              Caixa de entrada
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Caixa: {formatIntegerPtBR(unreadOnly.length)} não lida(s)
              {readOnly.length > 0 && ` · Lidas: ${formatIntegerPtBR(readOnly.length)}`}
            </Typography>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadOnly.length > 0 && (
            <Button size="small" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
          {canCreateAlerts && (
            <PrimaryActionButton
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => setCreateAlertOpen(true)}
            >
              Novo alerta
            </PrimaryActionButton>
          )}
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        className="border-b border-apoio-200 mb-4"
        sx={{ '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 } }}
      >
        <Tab icon={<Mail className="w-4 h-4" />} iconPosition="start" label="Caixa de entrada" />
        <Tab icon={<CheckCircle2 className="w-4 h-4" />} iconPosition="start" label="Lidas" />
        {canCreateAlerts && (
          <Tab icon={<List className="w-4 h-4" />} iconPosition="start" label="Meus alertas criados" />
        )}
      </Tabs>

      {(tab === 0 || tab === 1) && (
        <TableContainer component={Paper} variant="outlined" className="rounded-lg overflow-hidden">
          <Table size="medium">
            <TableHead>
              <TableRow className="bg-apoio-50">
                <TableCell width={48} className="font-semibold text-apoio-700"></TableCell>
                <TableCell className="font-semibold text-apoio-700">Assunto</TableCell>
                <TableCell className="font-semibold text-apoio-700">De</TableCell>
                <TableCell className="font-semibold text-apoio-700">Data</TableCell>
                <TableCell align="right" className="font-semibold text-apoio-700">
                  Ações
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listToShow.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-apoio-500">
                    {tab === 0
                      ? 'Caixa de entrada vazia — você não tem mensagens não lidas.'
                      : 'Nenhuma mensagem lida ainda. Abra uma notificação na caixa ou marque como lida para ela aparecer aqui.'}
                  </TableCell>
                </TableRow>
              ) : (
                listToShow.map((n) => (
                  <TableRow
                    key={n.id}
                    hover
                    onClick={() => handleOpenDetail(n)}
                    className="cursor-pointer"
                    sx={{
                      backgroundColor: n.lida ? undefined : 'rgba(0, 37, 97, 0.04)'
                    }}
                  >
                    <TableCell>
                      {!n.lida && (
                        <span className="w-2 h-2 rounded-full bg-primary-500 block" title="Não lida" />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Typography variant="body2" className="font-medium">
                          {n.titulo || '(Sem assunto)'}
                        </Typography>
                        <Chip
                          label={n.prioridade}
                          size="small"
                          className={`text-xs ${getPriorityColor(n.prioridade)}`}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {n.dados?.autor ?? 'Sistema'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="textSecondary">
                        {formatTimeAgo(n.dataCriacao)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDetail(n)}
                        title="Abrir"
                        className="text-primary-600"
                      >
                        <Eye className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={(e) => handleRemove(e, n)}
                        title="Excluir"
                        className="text-apoio-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === managedTabIndex && canCreateAlerts && (
        <TableContainer component={Paper} variant="outlined" className="rounded-lg overflow-hidden">
          {managedLoading ? (
            <Box className="flex justify-center py-12">
              <CircularProgress />
            </Box>
          ) : managedAlerts.length === 0 ? (
            <Box className="py-12 text-center text-apoio-500">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <Typography>Nenhum alerta criado por você ainda.</Typography>
              <Typography variant="body2" className="mt-1">
                Alertas enviados para todos os usuários também aparecem aqui.
              </Typography>
              <PrimaryActionButton
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => setCreateAlertOpen(true)}
                className="mt-4"
              >
                Criar primeiro alerta
              </PrimaryActionButton>
            </Box>
          ) : (
            <Table size="medium">
              <TableHead>
                <TableRow className="bg-apoio-50">
                  <TableCell className="font-semibold text-apoio-700">Assunto</TableCell>
                  <TableCell className="font-semibold text-apoio-700">Destinatários</TableCell>
                  <TableCell className="font-semibold text-apoio-700">Data exibição</TableCell>
                  <TableCell className="font-semibold text-apoio-700">Quem leu</TableCell>
                  <TableCell align="right" className="font-semibold text-apoio-700">
                    Ações
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {managedAlerts.map((a) => (
                  <TableRow key={a.id} hover>
                    <TableCell>
                      <Typography variant="body2" className="font-medium">
                        {a.titulo}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" className="line-clamp-1 block">
                        {a.mensagem?.replace(/<[^>]*>/g, '').slice(0, 80)}…
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={<Users className="w-3 h-3" />}
                        label={a.destinatariosLabel ?? 'Todos os usuários'}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{formatDate(a.dataExibicao)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box className="flex items-center gap-1 flex-wrap">
                        <Chip
                          size="small"
                          label={`${a.visualizacoes?.length ?? 0} leitura(s)`}
                          variant="outlined"
                        />
                        <Button
                          size="small"
                          startIcon={<UserCheck className="w-4 h-4" />}
                          onClick={() =>
                            setViewsDialogAlert({
                              titulo: a.titulo,
                              visualizacoes: Array.isArray(a.visualizacoes) ? a.visualizacoes : []
                            })
                          }
                        >
                          Ver detalhes
                        </Button>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => {
                          const asNotif = {
                            id: a.id,
                            titulo: a.titulo,
                            mensagem: a.mensagem,
                            tipo: 'alerta',
                            prioridade: a.prioridade || 'media',
                            lida: true,
                            dataCriacao: a.createdAt,
                            dados: { alertaId: a.id, autor: a.autorNome, autorId: a.autorId }
                          }
                          setDetailNotification(asNotif)
                        }}
                        title="Ver"
                        className="text-primary-600"
                      >
                        <Eye className="w-4 h-4" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteManagedAlert(a.id)}
                        disabled={deletingId === a.id}
                        title="Excluir"
                        className="text-apoio-400 hover:text-red-500"
                      >
                        {deletingId === a.id ? (
                          <CircularProgress size={18} />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TableContainer>
      )}

      <Dialog open={Boolean(viewsDialogAlert)} onClose={() => setViewsDialogAlert(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Leituras — {viewsDialogAlert?.titulo}</DialogTitle>
        <DialogContent dividers>
          {!viewsDialogAlert?.visualizacoes?.length ? (
            <Typography color="text.secondary" className="py-2">
              Ninguém abriu este alerta ainda (ou as visualizações ainda não foram registradas).
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell className="font-semibold">Usuário</TableCell>
                  <TableCell className="font-semibold">Data e hora</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {viewsDialogAlert.visualizacoes.map((v, i) => (
                  <TableRow key={v.usuarioId ? `${v.usuarioId}-${i}` : i}>
                    <TableCell>{v.usuarioNome || v.usuarioId || '—'}</TableCell>
                    <TableCell>
                      {v.dataVisualizacao
                        ? formatDate(
                            typeof v.dataVisualizacao === 'string'
                              ? v.dataVisualizacao
                              : new Date(v.dataVisualizacao as unknown as Date).toISOString()
                          )
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewsDialogAlert(null)}>Fechar</Button>
        </DialogActions>
      </Dialog>

      <NotificationDetailModal
        open={Boolean(detailNotification)}
        onClose={() => setDetailNotification(null)}
        notification={detailNotification}
        onNavigate={handleDetailNavigate}
        onCreateKanbanTicket={
          detailNotification &&
          user?.id &&
          ['alerta', 'sistema'].includes(String(detailNotification.tipo))
            ? async () => {
                try {
                  const ticket = await createKanbanTicketFromNotification(detailNotification, user.id)
                  setDetailNotification(null)
                  navigate('/kanban', {
                    state: { highlightTicket: ticket.id, scrollToTicket: true }
                  })
                } catch {
                  window.alert('Não foi possível criar o ticket no Kanban. Tente novamente.')
                }
              }
            : undefined
        }
        formatTimeAgo={formatTimeAgo}
        getPriorityColor={getPriorityColor}
      />
      <CreateAlertModal
        open={createAlertOpen}
        onClose={() => setCreateAlertOpen(false)}
        onSuccess={() => {
          window.dispatchEvent(new CustomEvent('refresh-user-alerts'))
          if (tab === managedTabIndex) {
            setManagedLoading(true)
            getApi()
              .get('/user-alerts/managed')
              .then((res: any) => setManagedAlerts(res?.alertas ?? []))
              .catch(() => setManagedAlerts([]))
              .finally(() => setManagedLoading(false))
          }
        }}
      />
    </Box>
  )
}
