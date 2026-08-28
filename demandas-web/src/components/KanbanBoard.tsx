import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Paper,
  Fab,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  Alert,
  Collapse,
  Snackbar,
} from '@mui/material'
import {
  Add as AddIcon, 
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Event as EventIcon,
  RocketLaunch as RocketLaunchIcon,
  AccessTime as AccessTimeIcon,
  CheckCircleOutline as CheckCircleOutlineIcon,
  ErrorOutline as ErrorOutlineIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  DragIndicator as DragIndicatorIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import {
  useKanbanStore,
  KanbanTicket,
  getActiveKanbanColumns,
} from '../store/kanbanStore'
import { useAuthStore } from '../store/authStore'
import { canViewAllData } from '../lib/utils'
import { tagsForApi, tagsFromFormCsv } from '../utils/tagHelpers'
import { diffCalendarDays, parseLocalDateFromYmd, toDateOnlyString } from '../utils/kanbanDates'
import { runKanbanDeadlineChecks } from '../utils/kanbanDeadlineNotify'

export const KanbanBoard: React.FC = () => {
  const location = useLocation()
  const { user } = useAuthStore()
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<string>('todo') // Definir valor padrão
  const [editingTicket, setEditingTicket] = useState<KanbanTicket | null>(null)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<KanbanTicket | null>(null)
  const [highlightedTicket, setHighlightedTicket] = useState<string | null>(null)
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set())
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    assignee: '',
    startDate: '',
    dueDate: '',
    tags: ''
  })
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [overdueNotifications, setOverdueNotifications] = useState<string[]>([])
  const [showOverdueAlert, setShowOverdueAlert] = useState(false)
  const [overdueMessage, setOverdueMessage] = useState('')
  const overdueAlertDismissedRef = useRef(false)
  const [saveFeedback, setSaveFeedback] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  })

  // Refs para as tarefas
  const ticketRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Usar o store Zustand
  const tickets = useKanbanStore((state) => state.tickets)
  const enabledOptionalColumns = useKanbanStore((state) => state.enabledOptionalColumns)
  const { addTicket, updateTicket, moveTicket, deleteTicket, deleteAllTickets } = useKanbanStore()

  // Função para obter nome do usuário pelo ID
  const getUserNameById = (userId: string): string => {
    // Se for o usuário logado, retornar o nome dele
    if (userId === user?.id) {
      return user.name || 'Usuário Atual'
    }
    
    // Se for 'unassigned', retornar texto amigável
    if (userId === 'unassigned') {
      return 'Não atribuído'
    }
    
    // Para outros usuários, retornar o ID (pode ser melhorado futuramente com uma lista de usuários)
    return userId
  }

  // Tickets do usuário logado (evita selector que retorna array novo → loop de re-render no Zustand)
  const userTickets = useMemo(() => {
    if (!user?.id) return []
    return tickets.filter((ticket) => ticket.assignee === user.id)
  }, [tickets, user?.id])

  const columns = useMemo(
    () =>
      getActiveKanbanColumns(enabledOptionalColumns).map((col) => ({
        ...col,
        tickets: userTickets.filter((ticket) => ticket.status === col.id),
      })),
    [userTickets, enabledOptionalColumns]
  )

  // Verificar tarefas vencidas e próximas do vencimento (lógica central em kanbanDeadlineNotify)
  useEffect(() => {
    const checkOverdueTasks = () => {
      const result = runKanbanDeadlineChecks(userTickets, { syncToNotificationCenter: false })
      if (result.overdueTitles.length > 0) {
        setOverdueMessage(
          `${result.overdueTitles.length} tarefa(s) vencida(s): ${result.overdueTitles.join(', ')}`
        )
        if (!overdueAlertDismissedRef.current) setShowOverdueAlert(true)
      } else {
        overdueAlertDismissedRef.current = false
      }
    }

    checkOverdueTasks()

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      checkOverdueTasks()
    }, 60 * 60 * 1000)

    return () => clearInterval(interval)
  }, [userTickets])

  // Processar navegação de notificação
  useEffect(() => {
    console.log('🔍 KanbanBoard: useEffect de navegação executado, location.state:', location.state)
    
    if (location.state?.highlightTicket && location.state?.scrollToTicket) {
      const ticketId = location.state.highlightTicket
      console.log('🔍 KanbanBoard: Destacando ticket:', ticketId)
      setHighlightedTicket(ticketId)
      
      // Aguardar um pouco para garantir que as tarefas foram renderizadas
      setTimeout(() => {
        const ticketElement = ticketRefs.current[ticketId]
        console.log('🔍 KanbanBoard: Elemento da tarefa encontrado:', ticketElement)
        
        if (ticketElement) {
          // Scroll suave para a tarefa
          ticketElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          })
          
          // Adicionar destaque visual temporário mais chamativo
          ticketElement.style.boxShadow = '0 0 30px rgba(239, 68, 68, 0.8)'
          ticketElement.style.transform = 'scale(1.05)'
          ticketElement.style.transition = 'all 0.5s ease'
          ticketElement.style.border = '3px solid #DA3832'
          ticketElement.style.borderRadius = '12px'
          
          // Adicionar classe CSS para animação
          ticketElement.classList.add('highlighted-ticket')
          
          console.log('🔍 KanbanBoard: Destaque aplicado ao ticket:', ticketId)
          
          // Remover destaque após 5 segundos
          setTimeout(() => {
            if (ticketRefs.current[ticketId]) {
              ticketRefs.current[ticketId]!.style.boxShadow = ''
              ticketRefs.current[ticketId]!.style.transform = ''
              ticketRefs.current[ticketId]!.style.border = ''
              ticketRefs.current[ticketId]!.style.borderRadius = ''
              ticketRefs.current[ticketId]!.classList.remove('highlighted-ticket')
            }
            setHighlightedTicket(null)
            
            // Limpar o estado de navegação
            window.history.replaceState({}, document.title)
            console.log('🔍 KanbanBoard: Destaque removido e estado limpo para ticket:', ticketId)
          }, 5000)
        } else {
          console.log('🔍 KanbanBoard: Elemento da tarefa não encontrado para ID:', ticketId)
        }
      }, 800) // Aumentar o tempo de espera para garantir renderização
    }
  }, [location.state])

  const handleCreateTicket = (columnId: string) => {
    console.log('🔍 KanbanBoard: handleCreateTicket chamado com columnId:', columnId)
    setSelectedColumn(columnId)
    setEditingTicket(null)
    setOpenDialog(true)
    console.log('🔍 KanbanBoard: Dialog aberto, selectedColumn:', columnId)
  }

  const handleToggleExpand = (ticketId: string) => {
    setExpandedTickets((prev) => {
      const next = new Set(prev)
      if (next.has(ticketId)) next.delete(ticketId)
      else next.add(ticketId)
      return next
    })
  }

  const handleEditTicket = (ticket: KanbanTicket) => {
    setEditingTicket(ticket)
    setSelectedColumn(ticket.status)
    
    // Normalizar tags para garantir que seja sempre um array antes de usar .join()
    const normalizedTags = Array.isArray(ticket.tags) ? ticket.tags : []
    
    // input type="date" exige YYYY-MM-DD; API retorna ISO (ex: 2025-01-27T00:00:00.000Z)
    const toDateInput = (s: string | undefined) => (s && String(s).split('T')[0]) || ''
    
    setNewTicket({
      title: ticket.title,
      description: ticket.description || '',
      priority: ticket.priority,
      assignee: getUserNameById(ticket.assignee || 'unassigned'),
      startDate: toDateInput(ticket.startDate),
      dueDate: toDateInput(ticket.dueDate),
      tags: normalizedTags.join(', ')
    })
    setOpenDialog(true)
  }

  const handleSaveTicket = async () => {
    console.log('🔍 KanbanBoard: handleSaveTicket iniciado')
    console.log('🔍 KanbanBoard: newTicket:', newTicket)
    console.log('🔍 KanbanBoard: selectedColumn:', selectedColumn)

    if (!newTicket.title.trim()) {
      console.log('❌ KanbanBoard: Título vazio, retornando')
      return
    }

    if (!selectedColumn) {
      console.log('❌ KanbanBoard: Nenhuma coluna selecionada, retornando')
      return
    }

    const toIsoDateOrNull = (dateInput: string | undefined) => {
      const v = (dateInput ?? '').trim()
      if (!v) return null
      return `${v}T00:00:00.000Z`
    }

    const tagsStr = tagsForApi(newTicket.tags)

    try {
      if (editingTicket) {
        const editedId = editingTicket.id
        await updateTicket(editedId, {
          title: newTicket.title,
          description: newTicket.description,
          priority: newTicket.priority,
          assignee: newTicket.assignee || undefined,
          startDate: toIsoDateOrNull(newTicket.startDate),
          dueDate: toIsoDateOrNull(newTicket.dueDate),
          tags: tagsFromFormCsv(newTicket.tags),
        })
      } else {
        const ticketData = {
          title: newTicket.title,
          description: newTicket.description,
          status: selectedColumn as KanbanTicket['status'],
          priority: newTicket.priority,
          assignee: user?.id || 'unassigned',
          startDate: newTicket.startDate ? newTicket.startDate + 'T00:00:00.000Z' : undefined,
          dueDate: newTicket.dueDate ? newTicket.dueDate + 'T00:00:00.000Z' : undefined,
          tags: tagsFromFormCsv(newTicket.tags),
        }
        await addTicket(ticketData)
      }

      setSaveFeedback({
        open: true,
        message: editingTicket ? 'Tarefa atualizada.' : 'Tarefa criada.',
        severity: 'success',
      })
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível guardar. Verifique a rede ou os dados.'
      console.error('❌ KanbanBoard: Erro ao guardar ticket:', error)
      setSaveFeedback({ open: true, message: msg, severity: 'error' })
      return
    }

    // Recalcular notificações de prazo com o estado já atualizado no store
    queueMicrotask(() => {
      const list = useKanbanStore.getState().getFilteredTickets(user?.role, user?.id, true)
      runKanbanDeadlineChecks(list, { syncToNotificationCenter: false })
    })

    setOpenDialog(false)
    setEditingTicket(null)
    setNewTicket({
      title: '',
      description: '',
      priority: 'medium' as 'low' | 'medium' | 'high',
      assignee: user?.name || 'unassigned',
      startDate: '',
      dueDate: '',
      tags: '',
    })
  }

  const handleMoveTicket = (ticketId: string, newStatus: string) => {
    moveTicket(ticketId, newStatus as KanbanTicket['status']).catch(() => {
      setSaveFeedback({
        open: true,
        message: 'Não foi possível mover a tarefa. Verifique a conexão e tente novamente.',
        severity: 'error',
      })
    })
  }

  const handleDeleteTicket = (ticket: KanbanTicket) => {
    setTicketToDelete(ticket)
    setShowDeleteAlert(true)
  }

  const confirmDeleteTicket = () => {
    if (ticketToDelete) {
      deleteTicket(ticketToDelete.id)
      setShowDeleteAlert(false)
      setTicketToDelete(null)
    }
  }

  return (
    <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          gap: 1.5,
          overflowX: 'auto',
          overflowY: 'hidden',
          alignItems: 'stretch',
        }}
      >
        {columns.map((column) => (
          <Box key={column.id} sx={{ flex: '1 1 0', minWidth: 250, minHeight: 0, display: 'flex' }}>
            <Paper
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverColumn !== column.id) setDragOverColumn(column.id)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverColumn((prev) => (prev === column.id ? null : prev))
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverColumn(null)
                const ticketId = e.dataTransfer.getData('text/plain')
                if (ticketId) handleMoveTicket(ticketId, column.id)
              }}
              sx={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                p: 1.5,
                overflow: 'hidden',
                ...(dragOverColumn === column.id && {
                  outline: `2px dashed ${column.color}`,
                  outlineOffset: '-2px',
                  backgroundColor: 'rgba(0,159,223,0.04)',
                }),
                '&:hover': {
                  boxShadow: 3,
                  transition: 'box-shadow 0.3s ease',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, flexShrink: 0 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', color: column.color, fontSize: '1rem' }}>
                  {column.title}
                </Typography>
                <Typography variant="body2" sx={{ 
                  ml: 'auto', 
                  bgcolor: column.color, 
                  color: 'white', 
                  px: 1.5, 
                  py: 0.5, 
                  borderRadius: 1.5,
                  fontWeight: 'bold',
                  fontSize: '0.75rem'
                }}>
                  {column.tickets.length}
                </Typography>
              </Box>
              
              {/* Botão adicionar */}
              <Box sx={{ mb: 1, textAlign: 'center', flexShrink: 0 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleCreateTicket(column.id)}
                  size="small"
                  sx={{ 
                    width: '100%',
                    height: 36,
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    bgcolor: column.color,
                    '&:hover': {
                      bgcolor: column.color,
                      transform: 'scale(1.01)',
                      boxShadow: 2
                    }
                  }}
                >
                  Adicionar Tarefa
                </Button>
              </Box>
              
              {/* Lista de tickets */}
              <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.25 }}>
                {column.tickets.length > 0 ? (
                  column.tickets.map((ticket) => {
                    const isExpanded = expandedTickets.has(ticket.id)
                    return (
                    <Card 
                      key={ticket.id} 
                      ref={(el) => ticketRefs.current[ticket.id] = el}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', ticket.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onDragEnd={() => setDragOverColumn(null)}
                      sx={{ 
                        mb: 1,
                        position: 'relative',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 1px 2px rgba(16,24,40,0.06)',
                        overflow: 'hidden',
                        // Accent bar (prioridade)
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          backgroundColor:
                            ticket.priority === 'high'
                              ? '#DA3832'
                              : ticket.priority === 'medium'
                                ? '#FF9800'
                                : '#009FDF',
                          opacity: 0.9
                        },
                        transition: 'transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease',
                        '&:hover': { 
                          boxShadow: '0 8px 20px rgba(16,24,40,0.12)',
                          transform: 'translateY(-2px)',
                          borderColor: 'rgba(0,159,223,0.35)'
                        },
                        // Destaque especial para tarefa vinda de notificação
                        ...(highlightedTicket === ticket.id && {
                          border: '2px solid #009FDF',
                          backgroundColor: 'rgba(0, 159, 223, 0.05)'
                        })
                      }}
                    >
                      {/* Indicador de tarefa destacada por notificação */}
                      {highlightedTicket === ticket.id && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '-8px',
                            right: '-8px',
                            width: '24px',
                            height: '24px',
                            backgroundColor: '#DA3832',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            animation: 'pulse-highlight 1s ease-in-out infinite',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            ⚠️
                          </Typography>
                        </Box>
                      )}
                      <CardContent sx={{ p: 1.25, pl: 1.75, '&:last-child': { pb: 1.25 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, gap: 0.5 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 700,
                              color: 'text.primary',
                              fontSize: '0.875rem',
                              flex: 1,
                              lineHeight: 1.3,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {ticket.title}
                          </Typography>
                          
                          <TicketActions 
                            ticket={ticket}
                            currentStatus={column.id}
                            columns={columns}
                            onEdit={() => handleEditTicket(ticket)}
                            onMove={handleMoveTicket}
                            onDelete={() => handleDeleteTicket(ticket)}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                          <Chip 
                            label={ticket.priority === 'high' ? 'Alta' : 
                                   ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                            size="small"
                            sx={{ 
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              borderRadius: 999,
                              color:
                                ticket.priority === 'high'
                                  ? '#8A1C17'
                                  : ticket.priority === 'medium'
                                    ? '#7A4A00'
                                    : '#0B4A66',
                              backgroundColor:
                                ticket.priority === 'high'
                                  ? 'rgba(218,56,50,0.12)'
                                  : ticket.priority === 'medium'
                                    ? 'rgba(255,152,0,0.16)'
                                    : 'rgba(0,159,223,0.14)',
                              border: '1px solid',
                              borderColor:
                                ticket.priority === 'high'
                                  ? 'rgba(218,56,50,0.25)'
                                  : ticket.priority === 'medium'
                                    ? 'rgba(255,152,0,0.28)'
                                    : 'rgba(0,159,223,0.28)',
                            }}
                          />
                          
                          {ticket.startDate && <StartDateChip startDate={ticket.startDate} />}
                          {ticket.dueDate && <DueDateChip dueDate={ticket.dueDate} />}

                          <QuickMoveButtons
                            ticket={ticket}
                            currentStatus={column.id}
                            columns={columns}
                            onMove={handleMoveTicket}
                          />

                          <Button
                            size="small"
                            variant="text"
                            color="inherit"
                            onClick={() => handleToggleExpand(ticket.id)}
                            endIcon={
                              <ExpandMoreIcon
                                sx={{
                                  fontSize: 18,
                                  transform: isExpanded ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.2s',
                                }}
                              />
                            }
                            sx={{
                              ml: 'auto',
                              p: 0,
                              minWidth: 'auto',
                              fontSize: '0.7rem',
                              textTransform: 'none',
                              color: 'text.secondary',
                            }}
                          >
                            {isExpanded ? 'Menos' : 'Mais'}
                          </Button>
                        </Box>

                        <Collapse in={isExpanded}>
                          <Box
                            sx={{
                              mt: 1,
                              pt: 1,
                              borderTop: '1px solid',
                              borderColor: 'divider',
                            }}
                          >
                            {ticket.description ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                  fontSize: '0.8rem',
                                  lineHeight: 1.45,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  mb: 1,
                                }}
                              >
                                {ticket.description}
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Sem descrição.
                              </Typography>
                            )}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {ticket.assignee && (
                                <Typography variant="caption" color="text.secondary">
                                  <strong>Responsável:</strong> {getUserNameById(ticket.assignee)}
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.secondary">
                                <strong>Criado em:</strong>{' '}
                                {new Date(ticket.createdAt).toLocaleDateString('pt-BR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Typography>
                            </Box>
                          </Box>
                        </Collapse>
                      </CardContent>
                    </Card>
                    )
                  })
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    flex: 1,
                    minHeight: 120,
                    color: 'text.secondary',
                    textAlign: 'center',
                    p: 2
                  }}>
                    <Typography variant="h5" sx={{ opacity: 0.6, mb: 0.5, fontSize: '1.5rem' }}>
                      📭
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.6, fontSize: '0.8rem' }}>
                      Nenhuma tarefa
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>

      {/* Botão flutuante */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={() => handleCreateTicket('todo')}
        sx={{ position: 'fixed', bottom: 20, right: 20 }}
      >
        <AddIcon />
      </Fab>

      {/* Dialog para criar/editar ticket */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTicket ? 'Editar Tarefa' : 'Criar Nova Tarefa'} - {columns.find(col => col.id === selectedColumn)?.title}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Título *"
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              fullWidth
              required
              error={!newTicket.title.trim()}
              helperText={!newTicket.title.trim() ? 'Título é obrigatório' : ''}
            />
            <TextField
              label="Descrição (Opcional)"
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Descreva detalhes da tarefa..."
            />
            <TextField
              label="Responsável"
              value={user?.name || 'Usuário não identificado'}
              fullWidth
              disabled
              helperText="Você é automaticamente o responsável por este ticket"
            />
            <TextField
              type="date"
              label="Data de Início (Opcional)"
              value={newTicket.startDate}
              onChange={(e) => setNewTicket({ ...newTicket, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              helperText="Data em que a tarefa deve ser iniciada"
            />
            <TextField
              type="date"
              label="Data de Vencimento (Opcional)"
              value={newTicket.dueDate}
              onChange={(e) => setNewTicket({ ...newTicket, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              helperText="Data limite para conclusão da tarefa"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancelar
          </Button>
          <Button 
            onClick={handleSaveTicket} 
            color="primary" 
            variant="contained"
            disabled={!newTicket.title.trim()}
          >
            {editingTicket ? 'Atualizar' : 'Criar'} Tarefa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Alert de confirmação para exclusão */}
      <Snackbar
        open={showDeleteAlert}
        autoHideDuration={null}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          severity="warning" 
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => setShowDeleteAlert(false)}
              >
                Cancelar
              </Button>
              <Button 
                color="error" 
                size="small" 
                variant="contained"
                onClick={confirmDeleteTicket}
              >
                Excluir
              </Button>
            </Box>
          }
        >
          Tem certeza que deseja excluir a tarefa "{ticketToDelete?.title}"?
        </Alert>
      </Snackbar>
      
      <Snackbar
        open={saveFeedback.open}
        autoHideDuration={saveFeedback.severity === 'error' ? 8000 : 4000}
        onClose={() => setSaveFeedback((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={saveFeedback.severity}
          variant="filled"
          onClose={() => setSaveFeedback((s) => ({ ...s, open: false }))}
          sx={{ width: '100%' }}
        >
          {saveFeedback.message}
        </Alert>
      </Snackbar>

      {/* Alerta para tarefas vencidas */}
      <Snackbar
        open={showOverdueAlert}
        autoHideDuration={10000}
        onClose={() => { overdueAlertDismissedRef.current = true; setShowOverdueAlert(false) }}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => { overdueAlertDismissedRef.current = true; setShowOverdueAlert(false) }}
          severity="error"
          sx={{ width: '100%' }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => { overdueAlertDismissedRef.current = true; setShowOverdueAlert(false) }}
            >
              Fechar
            </Button>
          }
        >
          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
            ⚠️ Tarefas Vencidas Detectadas!
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            {overdueMessage}
          </Typography>
        </Alert>
      </Snackbar>
    </Box>
  )
}

type KanbanColumnLike = { id: string; title: string }

// Componente para ações do ticket
const TicketActions: React.FC<{
  ticket: KanbanTicket
  currentStatus: string
  columns: KanbanColumnLike[]
  onEdit: () => void
  onMove: (ticketId: string, newStatus: string) => void
  onDelete: () => void
}> = ({ ticket, currentStatus, columns, onEdit, onMove, onDelete }) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleMove = (newStatus: string) => {
    onMove(ticket.id, newStatus)
    handleClose()
  }

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
        <Tooltip title="Arraste para mover">
          <DragIndicatorIcon sx={{ fontSize: 18, color: 'text.secondary', cursor: 'grab' }} />
        </Tooltip>
        <IconButton size="small" onClick={handleClick}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={onEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        {columns.map((col) => (
          <MenuItem key={col.id} onClick={() => handleMove(col.id)} disabled={currentStatus === col.id}>
            Mover para {col.title}
          </MenuItem>
        ))}
        <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>
    </>
  )
}

// Componente para movimento rápido (segue a ordem das colunas ativas)
const QuickMoveButtons: React.FC<{
  ticket: KanbanTicket
  currentStatus: string
  columns: KanbanColumnLike[]
  onMove: (ticketId: string, newStatus: string) => void
}> = ({ ticket, currentStatus, columns, onMove }) => {
  const currentIndex = columns.findIndex((col) => col.id === currentStatus)
  const prevColumn = currentIndex > 0 ? columns[currentIndex - 1] : null
  const nextColumn =
    currentIndex >= 0 && currentIndex < columns.length - 1 ? columns[currentIndex + 1] : null

  return (
    <Box sx={{ display: 'flex', gap: 0.25 }}>
      {prevColumn && (
        <Tooltip title={`Mover para ${prevColumn.title}`}>
          <IconButton
            size="small"
            onClick={() => onMove(ticket.id, prevColumn.id)}
            sx={{
              width: 26,
              height: 26,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
      {nextColumn && (
        <Tooltip title={`Mover para ${nextColumn.title}`}>
          <IconButton
            size="small"
            onClick={() => onMove(ticket.id, nextColumn.id)}
            sx={{
              width: 26,
              height: 26,
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

// Chips compactos para datas (sem emojis)
const StartDateChip: React.FC<{ startDate: string }> = ({ startDate }) => {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const startDateObj = parseLocalDateFromYmd(startDate)
  if (!startDateObj) {
    return (
      <Chip size="small" icon={<EventIcon sx={{ fontSize: 16 }} />} label={toDateOnlyString(startDate) || '—'} sx={{ height: 22, fontSize: '0.72rem' }} />
    )
  }

  const diffDays = diffCalendarDays(todayStart, startDateObj)
  
  let status: 'not-started' | 'start-today' | 'start-soon' | 'started' = 'not-started'
  let color: string = 'text.secondary'
  let label = ''
  let iconEl: React.ReactElement = <EventIcon sx={{ fontSize: 16 }} />
  
  if (diffDays < 0) {
    status = 'started'
    color = 'success.main'
    iconEl = <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
    label = `Iniciada há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
  } else if (diffDays === 0) {
    status = 'start-today'
    color = 'info.main'
    iconEl = <RocketLaunchIcon sx={{ fontSize: 16 }} />
    label = 'Inicia hoje!'
  } else if (diffDays <= 3) {
    status = 'start-soon'
    color = 'info.main'
    iconEl = <AccessTimeIcon sx={{ fontSize: 16 }} />
    label = `Inicia em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  } else {
    status = 'not-started'
    color = 'text.secondary'
    iconEl = <EventIcon sx={{ fontSize: 16 }} />
    label = `Inicia em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  }

  const bg =
    status === 'start-today' || status === 'start-soon' ? 'rgba(0,159,223,0.10)' : 'transparent'
  const bc =
    status === 'start-today' || status === 'start-soon' ? 'rgba(0,159,223,0.28)' : 'rgba(220,223,227,0.9)'

  return (
    <Chip
      size="small"
      icon={iconEl}
      label={`${label} • ${startDateObj.toLocaleDateString('pt-BR')}`}
      sx={{
        height: 22,
        fontSize: '0.72rem',
        fontWeight: 600,
        borderRadius: 999,
        color,
        backgroundColor: bg,
        border: '1px solid',
        borderColor: bc,
        '& .MuiChip-icon': { ml: 0.5, mr: 0.25 }
      }}
    />
  )
}

const DueDateChip: React.FC<{ dueDate: string }> = ({ dueDate }) => {
  const today = new Date()
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const dueDateObj = parseLocalDateFromYmd(dueDate)
  if (!dueDateObj) {
    return (
      <Chip size="small" icon={<EventIcon sx={{ fontSize: 16 }} />} label={toDateOnlyString(dueDate) || '—'} sx={{ height: 22, fontSize: '0.72rem' }} />
    )
  }

  const diffDays = diffCalendarDays(todayStart, dueDateObj)
  
  let status: 'overdue' | 'due-today' | 'due-soon' | 'due-later' = 'due-later'
  let color: string = 'text.secondary'
  let label = ''
  let iconEl: React.ReactElement = <EventIcon sx={{ fontSize: 16 }} />
  
  if (diffDays < 0) {
    status = 'overdue'
    color = 'error.main'
    iconEl = <ErrorOutlineIcon sx={{ fontSize: 16 }} />
    label = `Vencida há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
  } else if (diffDays === 0) {
    status = 'due-today'
    color = 'warning.main'
    iconEl = <WarningIcon sx={{ fontSize: 16 }} />
    label = 'Vence hoje!'
  } else if (diffDays <= 3) {
    status = 'due-soon'
    color = 'warning.main'
    iconEl = <AccessTimeIcon sx={{ fontSize: 16 }} />
    label = `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  } else {
    status = 'due-later'
    color = 'text.secondary'
    iconEl = <EventIcon sx={{ fontSize: 16 }} />
    label = `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  }

  const bg =
    status === 'overdue'
      ? 'rgba(218,56,50,0.12)'
      : status === 'due-today' || status === 'due-soon'
        ? 'rgba(255,152,0,0.16)'
        : 'transparent'
  const bc =
    status === 'overdue'
      ? 'rgba(218,56,50,0.28)'
      : status === 'due-today' || status === 'due-soon'
        ? 'rgba(255,152,0,0.28)'
        : 'rgba(220,223,227,0.9)'

  return (
    <Chip
      size="small"
      icon={iconEl}
      label={`${label} • ${dueDateObj.toLocaleDateString('pt-BR')}`}
      sx={{
        height: 22,
        fontSize: '0.72rem',
        fontWeight: 600,
        borderRadius: 999,
        color,
        backgroundColor: bg,
        border: '1px solid',
        borderColor: bc,
        '& .MuiChip-icon': { ml: 0.5, mr: 0.25 }
      }}
    />
  )
}