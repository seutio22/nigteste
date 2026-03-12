import React, { useState, useEffect } from 'react'
import { 
  IconButton, 
  Badge, 
  Menu, 
  MenuItem, 
  Typography, 
  Box, 
  Button,
  Chip
} from '@mui/material'
import { 
  Bell, 
  Info, 
  MessageSquare,
  FileText,
  Settings,
  Trash2,
  Eye,
  Plus,
  List
} from 'lucide-react'
import { useNotificationStore } from '../store/notificationStore'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { getApi } from '../lib/apiConfig'
import { CreateAlertModal } from './CreateAlertModal'
import { ManagedAlertsModal } from './ManagedAlertsModal'
import { NotificationDetailModal } from './NotificationDetailModal'
import { addDismissedAlert } from '../utils/dismissedAlerts'

export function NotificationDropdown() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [showAll, setShowAll] = useState(false)
  const [createAlertOpen, setCreateAlertOpen] = useState(false)
  const [managedAlertsOpen, setManagedAlertsOpen] = useState(false)
  const [detailNotification, setDetailNotification] = useState<any>(null)
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const canCreateAlerts = ['admin', 'gerente'].includes(user?.role || '')
  
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    remove, 
    clearRead,
    snoozeNotification
  } = useNotificationStore()

  const [now, setNow] = useState(() => new Date())
  const visibleNotifications = notifications.filter(n => !n.snoozedUntil || new Date(n.snoozedUntil) <= now)
  const effectiveUnreadCount = visibleNotifications.filter(n => !n.lida).length

  useEffect(() => {
    const hasSnoozed = notifications.some(n => n.snoozedUntil && new Date(n.snoozedUntil) > new Date())
    if (!hasSnoozed) return
    const interval = setInterval(() => setNow(new Date()), 60 * 1000)
    return () => clearInterval(interval)
  }, [notifications])

  const open = Boolean(anchorEl)
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }
  
  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleNotificationClick = async (notification: any) => {
    markAsRead(notification.id)
    
    const alertaId = notification.dados?.alertaId
    if (alertaId) {
      try {
        await getApi().post(`/user-alerts/${alertaId}/view`)
      } catch {}
    }
    
    setDetailNotification(notification)
    handleClose()
  }

  const handleRemoveNotification = async (e: React.MouseEvent, notification: any) => {
    e.stopPropagation()
    const alertaId = notification.dados?.alertaId
    const isCreator = user?.id === notification.dados?.autorId
    if (alertaId) {
      if (isCreator) {
        try {
          await getApi().delete(`/user-alerts/${alertaId}`)
          window.dispatchEvent(new CustomEvent('refresh-user-alerts'))
        } catch {}
      } else {
        addDismissedAlert(alertaId)
      }
    }
    remove(notification.id)
    if (detailNotification?.id === notification.id) setDetailNotification(null)
  }

  const handleDetailNavigate = () => {
    if (!detailNotification) return
    const d = detailNotification.dados
    if (d?.projectId) {
      navigate(`/projetos/${d.projectId}`, {
        state: {
          activeTab: 1,
          scrollToTaskId: d.taskId || null,
          scrollToSubtaskId: d.subtaskId || null
        }
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

  const getNotificationIcon = (tipo: string, prioridade: string) => {
    const iconProps = { className: 'w-4 h-4' }
    
    switch (tipo) {
      case 'comunicado':
        return <MessageSquare {...iconProps} className="text-primary-500" />
      case 'demanda':
        return <FileText {...iconProps} className="text-green-500" />
      case 'atendimento':
        return <Settings {...iconProps} className="text-orange-500" />
      case 'sistema':
        return <Info {...iconProps} className="text-secondary-500" />
      case 'alerta':
        return <Bell {...iconProps} className="text-amber-500" />
      default:
        return <Bell {...iconProps} className="text-apoio-400" />
    }
  }

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'urgente': return 'bg-red-100 text-red-800'
      case 'alta': return 'bg-orange-100 text-orange-800'
      case 'media': return 'bg-yellow-100 text-yellow-800'
      case 'baixa': return 'bg-green-100 text-green-800'
      default: return 'bg-apoio-100 text-apoio-500'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora mesmo'
    if (diffInMinutes < 60) return `${diffInMinutes} min atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return `${Math.floor(diffInMinutes / 1440)}d atrás`
  }

  const displayedNotifications = showAll ? visibleNotifications : visibleNotifications.slice(0, 5)
  const hasMoreNotifications = visibleNotifications.length > 5

  return (
    <>
      <IconButton
        onClick={handleClick}
        className="relative"
        size="large"
        aria-label="notificações"
        aria-controls={open ? 'notifications-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
      >
        <Badge badgeContent={effectiveUnreadCount} color="error" max={99}>
          <Bell className="w-5 h-5 text-gray-600" />
        </Badge>
      </IconButton>

      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          className: 'w-[480px] max-h-[560px] overflow-y-auto'
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* Header */}
        <Box className="p-4 border-b border-apoio-100">
          <div className="flex items-center justify-between">
            <Typography variant="h6" className="font-semibold">
              Notificações
            </Typography>
            <div className="flex items-center gap-2">
              {canCreateAlerts && (
                <>
                  <IconButton
                    size="small"
                    onClick={() => { setCreateAlertOpen(true); handleClose() }}
                    className="text-amber-600 hover:text-amber-700"
                    title="Criar alerta"
                  >
                    <Plus className="w-4 h-4" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => { setManagedAlertsOpen(true); handleClose() }}
                    className="text-primary-600 hover:text-primary-700"
                    title="Meus alertas"
                  >
                    <List className="w-4 h-4" />
                  </IconButton>
                </>
              )}
              {effectiveUnreadCount > 0 && (
                <Button
                  size="small"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Marcar todas como lidas
                </Button>
              )}
              <IconButton
                size="small"
                onClick={clearRead}
                className="text-apoio-400 hover:text-apoio-500"
              >
                <Trash2 className="w-4 h-4" />
              </IconButton>
            </div>
          </div>
          
          {effectiveUnreadCount > 0 && (
            <Typography variant="body2" color="textSecondary" className="mt-1">
              {effectiveUnreadCount} não lida{effectiveUnreadCount > 1 ? 's' : ''}
            </Typography>
          )}
        </Box>

        {/* Notificações */}
        {displayedNotifications.length > 0 ? (
          <div className="py-2">
            {displayedNotifications.map((notification) => (
              <MenuItem
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-apoio-50 transition-colors ${
                  !notification.lida ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-start gap-3 w-full">
                  {/* Ícone */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.tipo, notification.prioridade)}
                  </div>
                  
                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Typography 
                        variant="subtitle2" 
                        className={`font-medium ${
                          !notification.lida ? 'text-primary-900' : 'text-primary-900'
                        }`}
                      >
                        {notification.titulo}
                      </Typography>
                      
                      <Chip
                        label={notification.prioridade}
                        size="small"
                        className={`text-xs ${getPriorityColor(notification.prioridade)}`}
                      />
                    </div>
                    
                    <Box
                      className="mb-2 overflow-hidden max-h-[80px] pr-1 notification-preview cursor-pointer"
                      sx={{
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        color: '#050032',
                        '& ul, & ol': { margin: '0.25em 0', paddingLeft: '1.2em' },
                        '& p': { marginBottom: '0.25em' },
                        '& strong': { fontWeight: 600 },
                        '& em': { fontStyle: 'italic' }
                      }}
                      dangerouslySetInnerHTML={{ __html: notification.mensagem || '' }}
                    />
                    <Typography variant="caption" className="text-primary-600 font-medium">
                      Clique para ver mensagem completa →
                    </Typography>
                    
                    {notification.dados?.projectId && (
                      <Box className="mb-2 p-2 rounded bg-gray-50 border border-apoio-100">
                        <Typography variant="caption" className="text-gray-600 block font-medium mb-1">Detalhes:</Typography>
                        <Typography variant="caption" className="text-gray-700 block">
                          Projeto: {notification.dados.projectName || '—'}
                        </Typography>
                        {notification.dados.taskName && (
                          <Typography variant="caption" className="text-gray-700 block">
                            Tarefa: {notification.dados.taskName}
                            {notification.dados.phaseName && ` (${notification.dados.phaseName})`}
                          </Typography>
                        )}
                        {notification.dados.subtaskName && (
                          <Typography variant="caption" className="text-gray-700 block">
                            Subtarefa: {notification.dados.subtaskName}
                          </Typography>
                        )}
                        {notification.dados.diasRestantes !== undefined && (
                          <Typography variant="caption" className="text-gray-700 block font-medium">
                            {notification.dados.diasRestantes === 0 ? 'Vence hoje' : notification.dados.diasRestantes === 1 ? 'Vence amanhã' : `${notification.dados.diasRestantes} dias restantes`}
                          </Typography>
                        )}
                        <Typography variant="caption" className="text-primary-600 block mt-1 font-medium">
                          Clique para ir ao cronograma →
                        </Typography>
                      </Box>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <Typography variant="caption" color="textSecondary">
                        {formatTimeAgo(notification.dataCriacao)}
                      </Typography>
                      
                      {notification.dados?.autor && (
                        <Typography variant="caption" color="textSecondary">
                          por {notification.dados.autor}
                        </Typography>
                      )}
                    </div>
                  </div>
                  
                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {!notification.lida && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsRead(notification.id)
                        }}
                        className="text-primary-500 hover:text-primary-700"
                      >
                        <Eye className="w-4 h-4" />
                      </IconButton>
                    )}
                    
                    <IconButton
                      size="small"
                      onClick={(e) => handleRemoveNotification(e, notification)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                </div>
              </MenuItem>
            ))}
            
            {/* Botão "Ver mais" */}
            {hasMoreNotifications && (
              <div className="px-3 py-2">
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => setShowAll(!showAll)}
                  size="small"
                >
                  {showAll ? 'Mostrar menos' : `Ver mais ${visibleNotifications.length - 5} notificação${visibleNotifications.length - 5 > 1 ? 'ões' : 'ão'}`}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Box className="p-8 text-center">
            <Bell className="w-12 h-12 text-apoio-300 mx-auto mb-3" />
            <Typography variant="body1" color="textSecondary">
              Nenhuma notificação
            </Typography>
            <Typography variant="body2" color="textSecondary" className="mt-1">
              Você está em dia com tudo!
            </Typography>
          </Box>
        )}
      </Menu>

      <CreateAlertModal
        open={createAlertOpen}
        onClose={() => setCreateAlertOpen(false)}
        onSuccess={() => window.dispatchEvent(new CustomEvent('refresh-user-alerts'))}
      />
      <ManagedAlertsModal
        open={managedAlertsOpen}
        onClose={() => setManagedAlertsOpen(false)}
      />
      <NotificationDetailModal
        open={Boolean(detailNotification)}
        onClose={() => setDetailNotification(null)}
        notification={detailNotification}
        onNavigate={handleDetailNavigate}
        onSnooze={(id, minutes) => {
          snoozeNotification(id, new Date(Date.now() + minutes * 60 * 1000))
          setDetailNotification(null)
        }}
        canSnooze={!!(detailNotification?.dados?.kanbanTicketId || detailNotification?.dados?.projectId)}
        formatTimeAgo={formatTimeAgo}
        getPriorityColor={getPriorityColor}
      />
    </>
  )
}
