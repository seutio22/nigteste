import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { Bell, MessageSquare, FileText, Settings, Info, ArrowRight, Clock } from 'lucide-react'

interface NotificationDetailModalProps {
  open: boolean
  onClose: () => void
  notification: any
  onNavigate?: () => void
  onSnooze?: (id: string, minutes: number) => void
  canSnooze?: boolean
  formatTimeAgo: (date: string) => string
  getPriorityColor: (prioridade: string) => string
}

function getNotificationIcon(tipo: string) {
  const iconProps = { className: 'w-5 h-5' }
  switch (tipo) {
    case 'comunicado': return <MessageSquare {...iconProps} className="text-primary-500" />
    case 'demanda': return <FileText {...iconProps} className="text-green-500" />
    case 'atendimento': return <Settings {...iconProps} className="text-orange-500" />
    case 'sistema': return <Info {...iconProps} className="text-secondary-500" />
    case 'alerta': return <Bell {...iconProps} className="text-amber-500" />
    default: return <Bell {...iconProps} className="text-apoio-400" />
  }
}

const SNOOZE_OPTIONS = [
  { label: '30 minutos', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: '2 horas', minutes: 120 },
  { label: '3 horas', minutes: 180 }
]

export function NotificationDetailModal({
  open,
  onClose,
  notification,
  onNavigate,
  onSnooze,
  canSnooze,
  formatTimeAgo,
  getPriorityColor
}: NotificationDetailModalProps) {
  const [snoozeValue, setSnoozeValue] = React.useState<number>(30)
  if (!notification) return null

  const d = notification.dados || {}
  const hasLink = d.projectId || notification.link || d.comunicadoId || d.demandaId || d.atendimentoId || d.kanbanTicketId

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ className: 'max-h-[90vh]' }}>
      <DialogTitle className="flex items-center gap-3 pb-2">
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.tipo)}
        </div>
        <div className="flex-1 min-w-0">
          <Typography variant="h6" className="font-semibold truncate">
            {notification.titulo}
          </Typography>
          <div className="flex items-center gap-2 mt-1">
            <Chip
              label={notification.prioridade}
              size="small"
              className={`text-xs ${getPriorityColor(notification.prioridade)}`}
            />
            <Typography variant="caption" color="textSecondary">
              {formatTimeAgo(notification.dataCriacao)}
              {d.autor && ` • por ${d.autor}`}
            </Typography>
          </div>
        </div>
      </DialogTitle>
      <Divider />
      <DialogContent className="pt-4">
        <Box
          className="overflow-y-auto pr-2 notification-detail-message"
          sx={{
            minHeight: 120,
            maxHeight: '60vh',
            fontSize: '1.05rem',
            lineHeight: 1.7,
            color: '#050032',
            '&::-webkit-scrollbar': { width: 8 },
            '&::-webkit-scrollbar-thumb': { borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
            '& ul, & ol': { margin: '0.75em 0', paddingLeft: '1.5em' },
            '& p': { marginBottom: '0.75em' },
            '& strong': { fontWeight: 600 },
            '& em': { fontStyle: 'italic' },
            '& h1, & h2, & h3': { marginTop: '1em', marginBottom: '0.5em', fontWeight: 600 }
          }}
          dangerouslySetInnerHTML={{ __html: notification.mensagem || '' }}
        />
        {d.projectId && (
          <Box className="mt-4 p-3 rounded-lg bg-apoio-50 border border-apoio-100">
            <Typography variant="subtitle2" className="text-apoio-400 font-medium mb-2">
              Detalhes do projeto
            </Typography>
            <Typography variant="body2" className="text-apoio-500">
              Projeto: {d.projectName || '—'}
            </Typography>
            {d.taskName && (
              <Typography variant="body2" className="text-apoio-500">
                Tarefa: {d.taskName}
                {d.phaseName && ` (${d.phaseName})`}
              </Typography>
            )}
            {d.subtaskName && (
              <Typography variant="body2" className="text-apoio-500">
                Subtarefa: {d.subtaskName}
              </Typography>
            )}
            {d.diasRestantes !== undefined && (
              <Typography variant="body2" className="text-apoio-500 font-medium mt-1">
                {d.diasRestantes === 0 ? 'Vence hoje' : d.diasRestantes === 1 ? 'Vence amanhã' : `${d.diasRestantes} dias restantes`}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <Divider />
      <DialogActions className="px-4 py-3 flex-wrap gap-2">
        {canSnooze && onSnooze && (
          <Box className="flex items-center gap-2 mr-auto">
            <Clock className="w-4 h-4 text-apoio-400" />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Adiar lembrete</InputLabel>
              <Select
                value={snoozeValue}
                label="Adiar lembrete"
                onChange={(e) => setSnoozeValue(Number(e.target.value))}
              >
                {SNOOZE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.minutes} value={opt.minutes}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              onClick={() => onSnooze(notification.id, snoozeValue)}
            >
              Adiar
            </Button>
          </Box>
        )}
        <Button onClick={onClose}>Fechar</Button>
        {hasLink && onNavigate && (
          <Button variant="contained" onClick={onNavigate} endIcon={<ArrowRight className="w-4 h-4" />}>
            Ir para detalhes
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
