import React, { useState, useEffect, useRef } from 'react'
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
  Grid,
  Fab,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Alert,
  Snackbar
} from '@mui/material'
import { 
  Add as AddIcon, 
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon
} from '@mui/icons-material'
import { useKanbanStore, KanbanTicket, KANBAN_COLUMNS } from '../store/kanbanStore'
import { useAuthStore } from '../store/authStore'
import { useNotificationStore } from '../store/notificationStore'
import { canViewAllData } from '../lib/utils'

export const KanbanBoard: React.FC = () => {
  const location = useLocation()
  const { user } = useAuthStore()
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<string>('todo') // Definir valor padrão
  const [editingTicket, setEditingTicket] = useState<KanbanTicket | null>(null)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [ticketToDelete, setTicketToDelete] = useState<KanbanTicket | null>(null)
  const [highlightedTicket, setHighlightedTicket] = useState<string | null>(null)
  const [viewDescriptionTicket, setViewDescriptionTicket] = useState<KanbanTicket | null>(null)
  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    // assignee será definido pelo backend automaticamente
    startDate: '',
    dueDate: '',
    tags: ''
  })
  const [overdueNotifications, setOverdueNotifications] = useState<string[]>([])
  const [showOverdueAlert, setShowOverdueAlert] = useState(false)
  const [overdueMessage, setOverdueMessage] = useState('')

  // Refs para as tarefas
  const ticketRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Usar o store Zustand
  const {
    tickets,
    addTicket,
    updateTicket,
    moveTicket,
    deleteTicket,
    deleteAllTickets,
    getColumnsWithTickets,
    getFilteredColumnsWithTickets
  } = useKanbanStore()

  // Store de notificações
  const notificationStore = useNotificationStore()
  
  console.log('🔍 KanbanBoard: Store de notificações carregado:', {
    totalNotifications: notificationStore.notifications.length,
    notifications: notificationStore.notifications
  })

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

  // Obter colunas com tickets filtrados por permissão - SEMPRE filtrar por usuário logado
  const columns = getFilteredColumnsWithTickets(user?.role, user?.id, true) // true = viewOwnDataOnly
  
  // Obter tickets filtrados para o usuário logado - SEMPRE mostrar apenas os próprios tickets
  const userTickets = useKanbanStore(state => state.getFilteredTickets(user?.role, user?.id, true)) // true = viewOwnDataOnly

  // Verificar tarefas vencidas e próximas do vencimento
  useEffect(() => {
    console.log('🔍 KanbanBoard: useEffect de verificação de tarefas executado')
    console.log('🔍 KanbanBoard: Tickets do usuário:', userTickets.length)
    
    const checkOverdueTasks = () => {
      // Usar data atual em UTC para evitar problemas de fuso horário
      const today = new Date()
      const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      
      const overdueTasks: string[] = []
      const dueTodayTasks: string[] = []
      const dueTomorrowTasks: string[] = []
      const dueSoonTasks: string[] = []
      
      // Usar apenas os tickets do usuário logado
      userTickets.forEach(ticket => {
        if (ticket.dueDate && ticket.status !== 'done') {
          // Criar data de vencimento em UTC para comparação precisa
          // Se a data está em formato ISO com Z, extrair apenas a parte da data
          let dateString = ticket.dueDate
          if (dateString.includes('T') && dateString.includes('Z')) {
            // Extrair apenas a parte da data (YYYY-MM-DD)
            dateString = dateString.split('T')[0]
          }
          
          // Criar data usando apenas a parte da data para evitar problemas de timezone
          const dueDate = new Date(dateString + 'T00:00:00')
          // Verificar se a data é válida
          if (isNaN(dueDate.getTime())) {
            console.warn('⚠️ KanbanBoard: Data de vencimento inválida:', ticket.dueDate)
            return
          }
          const dueDateUTC = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
          
          // Calcular diferença em dias usando UTC
          const diffTime = dueDateUTC.getTime() - todayUTC.getTime()
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
          
          console.log('🔍 KanbanBoard: Verificando ticket:', ticket.title, 'Status:', ticket.status)
          console.log('🔍 KanbanBoard: Start Date raw:', ticket.startDate, 'Due Date raw:', ticket.dueDate)
          console.log('🔍 KanbanBoard: Due Date parsed:', dueDate, 'Due Date UTC:', dueDateUTC)
          console.log('🔍 KanbanBoard: Today UTC:', todayUTC.toISOString().split('T')[0], 'Due UTC:', dueDateUTC.toISOString().split('T')[0], 'Diff Days:', diffDays)
          
          // Verificar se a tarefa já deve ter iniciado (se tem data de início)
          const shouldStartAlert = ticket.startDate ? (() => {
            // Aplicar mesma lógica de parsing para startDate
            let startDateString = ticket.startDate
            if (startDateString.includes('T') && startDateString.includes('Z')) {
              startDateString = startDateString.split('T')[0]
            }
            const startDate = new Date(startDateString + 'T00:00:00')
            const startDateUTC = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
            const startDiffDays = Math.round((startDateUTC.getTime() - todayUTC.getTime()) / (1000 * 60 * 60 * 24))
            return startDiffDays <= 0 // Já deveria ter iniciado
          })() : true // Se não tem data de início, sempre pode ter alerta
          
          // Só criar alertas se a tarefa já deveria ter iniciado (ou não tem data de início)
          if (shouldStartAlert) {
            if (diffDays < 0) {
              overdueTasks.push(ticket.title)
            } else if (diffDays === 0) {
              dueTodayTasks.push(ticket.title)
            } else if (diffDays === 1) {
              dueTomorrowTasks.push(ticket.title)
            } else if (diffDays <= 3) {
              dueSoonTasks.push(ticket.title)
            }
          } else {
            console.log('🔍 KanbanBoard: Tarefa ainda não deve iniciar:', ticket.title, 'Start Date:', ticket.startDate)
          }
        }
      })
      
      console.log('🔍 KanbanBoard: Tarefas vencidas:', overdueTasks)
      console.log('🔍 KanbanBoard: Tarefas que vencem hoje:', dueTodayTasks)
      console.log('🔍 KanbanBoard: Tarefas que vencem amanhã:', dueTomorrowTasks)
      console.log('🔍 KanbanBoard: Tarefas que vencem em breve:', dueSoonTasks)
      
      // Criar notificações para tarefas vencidas
      overdueTasks.forEach(taskTitle => {
        const task = userTickets.find(t => t.title === taskTitle)
        if (!task) return
        
        console.log('🔍 KanbanBoard: Criando notificação para tarefa vencida:', task.title, 'ID:', task.id)
        
        const existingNotification = notificationStore.notifications.find(
          n => n.mensagem.includes(taskTitle) && n.tipo === 'sistema'
        )
        
        if (!existingNotification) {
          const notification = {
            titulo: 'Tarefa Vencida',
            mensagem: `A tarefa "${taskTitle}" está vencida!`,
            tipo: 'sistema' as const,
            prioridade: 'urgente' as const,
            dados: {
              categoria: 'kanban-overdue',
              kanbanTicketId: task.id
            }
          }
          
          console.log('🔍 KanbanBoard: Adicionando notificação:', notification)
          notificationStore.add(notification)
          console.log('🔍 KanbanBoard: Notificação adicionada. Total no store:', notificationStore.notifications.length)
        } else {
          console.log('🔍 KanbanBoard: Notificação já existe para:', taskTitle)
        }
      })
      
      // Criar notificações para tarefas que vencem hoje
      dueTodayTasks.forEach(taskTitle => {
        const task = userTickets.find(t => t.title === taskTitle)
        if (!task) return
        
        console.log('🔍 KanbanBoard: Criando notificação para tarefa que vence hoje:', task.title, 'ID:', task.id)
        
        const existingNotification = notificationStore.notifications.find(
          n => n.mensagem.includes(taskTitle) && n.tipo === 'sistema'
        )
        
        if (!existingNotification) {
          const notification = {
            titulo: 'Tarefa Vence Hoje',
            mensagem: `A tarefa "${taskTitle}" vence hoje!`,
            tipo: 'sistema' as const,
            prioridade: 'alta' as const,
            dados: {
              categoria: 'kanban-due-today',
              kanbanTicketId: task.id
            }
          }
          
          console.log('🔍 KanbanBoard: Adicionando notificação:', notification)
          notificationStore.add(notification)
          console.log('🔍 KanbanBoard: Notificação adicionada. Total no store:', notificationStore.notifications.length)
        } else {
          console.log('🔍 KanbanBoard: Notificação já existe para:', taskTitle)
        }
      })
      
      // Criar notificações para tarefas que vencem amanhã
      dueTomorrowTasks.forEach(taskTitle => {
        const task = userTickets.find(t => t.title === taskTitle)
        if (!task) return
        
        console.log('🔍 KanbanBoard: Criando notificação para tarefa que vence amanhã:', task.title, 'ID:', task.id)
        
        const existingNotification = notificationStore.notifications.find(
          n => n.mensagem.includes(taskTitle) && n.tipo === 'sistema'
        )
        
        if (!existingNotification) {
          const notification = {
            titulo: 'Tarefa Vence Amanhã',
            mensagem: `A tarefa "${taskTitle}" vence amanhã!`,
            tipo: 'sistema' as const,
            prioridade: 'alta' as const,
            dados: {
              categoria: 'kanban-due-tomorrow',
              kanbanTicketId: task.id
            }
          }
          
          console.log('🔍 KanbanBoard: Adicionando notificação:', notification)
          notificationStore.add(notification)
          console.log('🔍 KanbanBoard: Notificação adicionada. Total no store:', notificationStore.notifications.length)
        } else {
          console.log('🔍 KanbanBoard: Notificação já existe para:', taskTitle)
        }
      })
      
      // Criar notificações para tarefas que vencem em breve
      dueSoonTasks.forEach(taskTitle => {
        const task = userTickets.find(t => t.title === taskTitle)
        if (!task) return
        
        console.log('🔍 KanbanBoard: Criando notificação para tarefa que vence em breve:', task.title, 'ID:', task.id)
        
        const existingNotification = notificationStore.notifications.find(
          n => n.mensagem.includes(taskTitle) && n.tipo === 'sistema'
        )
        
        if (!existingNotification) {
          const notification = {
            titulo: 'Tarefa Vence em Breve',
            mensagem: `A tarefa "${taskTitle}" vence em breve!`,
            tipo: 'sistema' as const,
            prioridade: 'media' as const,
            dados: {
              categoria: 'kanban-due-soon',
              kanbanTicketId: task.id
            }
          }
          
          console.log('🔍 KanbanBoard: Adicionando notificação:', notification)
          notificationStore.add(notification)
          console.log('🔍 KanbanBoard: Notificação adicionada. Total no store:', notificationStore.notifications.length)
        } else {
          console.log('🔍 KanbanBoard: Notificação já existe para:', taskTitle)
        }
      })
      
      // Limpar notificações de tarefas concluídas
      notificationStore.notifications.forEach(notification => {
        if (notification.dados?.categoria?.startsWith('kanban-')) {
          const taskTitle = notification.mensagem.match(/"([^"]+)"/)?.[1]
          if (taskTitle) {
            const task = userTickets.find(t => t.title === taskTitle)
            if (task && task.status === 'done') {
              notificationStore.remove(notification.id)
            }
          }
        }
      })
      
      // Mostrar alerta se houver tarefas vencidas
      if (overdueTasks.length > 0) {
        setOverdueMessage(`${overdueTasks.length} tarefa(s) vencida(s): ${overdueTasks.join(', ')}`)
        setShowOverdueAlert(true)
      }
    }
    
    // Verificar imediatamente
    checkOverdueTasks()
    
    // Verificar a cada hora
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      checkOverdueTasks()
    }, 60 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [userTickets, notificationStore])

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
          ticketElement.style.border = '3px solid #ef4444'
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

  const handleViewDescription = (ticket: KanbanTicket) => {
    setViewDescriptionTicket(ticket)
  }

  const handleEditTicket = (ticket: KanbanTicket) => {
    setEditingTicket(ticket)
    setSelectedColumn(ticket.status)
    
    // Normalizar tags para garantir que seja sempre um array antes de usar .join()
    const normalizedTags = Array.isArray(ticket.tags) ? ticket.tags : []
    
    setNewTicket({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      assignee: getUserNameById(ticket.assignee || 'unassigned'), // Usar nome legível do usuário
      startDate: ticket.startDate || '',
      dueDate: ticket.dueDate || '',
      tags: normalizedTags.join(', ')
    })
    setOpenDialog(true)
  }

  const handleSaveTicket = () => {
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

    if (editingTicket) {
      console.log('🔍 KanbanBoard: Editando ticket existente')
      // Atualizar ticket existente
      updateTicket(editingTicket.id, {
        title: newTicket.title,
        description: newTicket.description,
        priority: newTicket.priority,
        assignee: newTicket.assignee || undefined,
        startDate: newTicket.startDate ? newTicket.startDate + 'T00:00:00.000Z' : undefined, // Converter para ISO com UTC
        dueDate: newTicket.dueDate ? newTicket.dueDate + 'T00:00:00.000Z' : undefined, // Converter para ISO com UTC
        tags: newTicket.tags || '' // Backend espera string, não array
      })
    } else {
      console.log('🔍 KanbanBoard: Criando novo ticket')
      // Criar novo ticket - SEMPRE vincular ao usuário logado
      const ticketData = {
        title: newTicket.title,
        description: newTicket.description,
        status: selectedColumn as KanbanTicket['status'],
        priority: newTicket.priority,
        assignee: user?.id || 'unassigned', // SEMPRE usar o ID do usuário logado
        startDate: newTicket.startDate ? newTicket.startDate + 'T00:00:00.000Z' : undefined, // Converter para ISO com UTC
        dueDate: newTicket.dueDate ? newTicket.dueDate + 'T00:00:00.000Z' : undefined, // Converter para ISO com UTC
        tags: newTicket.tags || '' // Backend espera string, não array
      }
      
      console.log('🔍 KanbanBoard: Dados do ticket:', ticketData)
      
      try {
        console.log('🔍 KanbanBoard: Chamando addTicket...')
        addTicket(ticketData)
        console.log('✅ KanbanBoard: Ticket criado com sucesso')
      } catch (error) {
        console.error('❌ Erro ao criar ticket:', error)
      }
    }

    setOpenDialog(false)
    setEditingTicket(null)
    setNewTicket({
      title: '',
      description: '',
      priority: 'medium' as 'low' | 'medium' | 'high',
      assignee: user?.name || 'unassigned', // Usar NOME do usuário logado ou 'unassigned'
      startDate: '',
      dueDate: '',
      tags: ''
    })
  }

  const handleMoveTicket = (ticketId: string, newStatus: string) => {
    moveTicket(ticketId, newStatus as KanbanTicket['status'])
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

  const handleClearAllTickets = () => {
    if (window.confirm('Tem certeza que deseja excluir TODAS as tarefas? Esta ação não pode ser desfeita.')) {
      deleteAllTickets()
    }
  }

  const allTickets = userTickets

  // Obter estatísticas baseadas nos dados filtrados
  const filteredTickets = getFilteredColumnsWithTickets(user?.role, user?.id).flatMap(col => col.tickets)
  const totalTickets = filteredTickets.length
  const backlogCount = filteredTickets.filter(t => t.status === 'backlog').length
  const todoCount = filteredTickets.filter(t => t.status === 'todo').length
  const inProgressCount = filteredTickets.filter(t => t.status === 'in-progress').length
  const doneCount = filteredTickets.filter(t => t.status === 'done').length

  return (
    <Box sx={{ p: 1 }}>
              {/* Header - Ultra compacto para mais espaço de tarefas */}
        <Paper sx={{ p: 0.25, mb: 0.25 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
              Kanban de Tarefas
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              Sistema de gerenciamento de tarefas - Dados persistidos automaticamente
            </Typography>
          </Box>
          
          {allTickets.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              onClick={handleClearAllTickets}
              startIcon={<WarningIcon />}
            >
              Limpar Todas
            </Button>
          )}
        </Box>
        
        {/* Estatísticas - Uma única linha horizontal */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'space-between' }}>
          <Card sx={{ 
            bgcolor: 'primary.main', 
            color: 'white',
            minHeight: 40,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            '&:hover': { 
              transform: 'translateY(-1px)',
              boxShadow: 2,
              transition: 'all 0.2s ease'
            }
          }}>
                          <CardContent sx={{ textAlign: 'center', p: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.25, fontSize: '1.4rem' }}>
                  {totalTickets}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.8rem' }}>
                  Total
                </Typography>
              </CardContent>
          </Card>
          
          <Card sx={{ 
            bgcolor: 'warning.main', 
            color: 'white',
            minHeight: 40,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            '&:hover': { 
              transform: 'translateY(-1px)',
              boxShadow: 2,
              transition: 'all 0.2s ease'
            }
          }}>
                          <CardContent sx={{ textAlign: 'center', p: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.25, fontSize: '1.4rem' }}>
                  {backlogCount}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.8rem' }}>
                  Backlog
                </Typography>
              </CardContent>
          </Card>
          
          <Card sx={{ 
            bgcolor: 'info.main', 
            color: 'white',
            minHeight: 40,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            '&:hover': { 
              transform: 'translateY(-1px)',
              boxShadow: 2,
              transition: 'all 0.2s ease'
            }
          }}>
                          <CardContent sx={{ textAlign: 'center', p: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.25, fontSize: '1.4rem' }}>
                  {todoCount}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.8rem' }}>
                  A Fazer
                </Typography>
              </CardContent>
          </Card>
          
          <Card sx={{ 
            bgcolor: 'info.main', 
            color: 'white',
            minHeight: 40,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            '&:hover': { 
              transform: 'translateY(-1px)',
              boxShadow: 2,
              transition: 'all 0.2s ease'
            }
          }}>
                          <CardContent sx={{ textAlign: 'center', p: 0.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.25, fontSize: '1.4rem' }}>
                  {inProgressCount}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'medium', fontSize: '0.8rem' }}>
                  Em Andamento
                </Typography>
              </CardContent>
          </Card>
          
          <Card sx={{ 
            bgcolor: 'success.main', 
            color: 'white',
            minHeight: 40,
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 1,
            '&:hover': { 
              transform: 'translateY(-1px)',
              boxShadow: 2,
              transition: 'all 0.2s ease'
            }
          }}>
            <CardContent sx={{ textAlign: 'center', p: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.25, fontSize: '1.1rem' }}>
                {doneCount}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 'medium', fontSize: '0.65rem' }}>
                Concluídas
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Kanban Board - Mais espaço para tarefas */}
      <Grid container spacing={1.5} sx={{ mt: 0.25 }}>
        {columns.map((column) => (
          <Grid item key={column.id} xs={12} sm={6} md={3}>
            <Paper sx={{ 
              p: 1.5, 
              minHeight: 'calc(100vh - 200px)', 
              maxHeight: 'calc(100vh - 200px)', 
              overflow: 'hidden',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-1px)',
                transition: 'all 0.3s ease'
              }
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
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
              
              {/* Botão adicionar - Mais compacto */}
              <Box sx={{ mb: 1.5, textAlign: 'center' }}>
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
              
              {/* Lista de tickets - Área com scroll para ocupar todo o espaço */}
              <Box sx={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                {column.tickets.length > 0 ? (
                  column.tickets.map((ticket) => (
                    <Card 
                      key={ticket.id} 
                      ref={(el) => ticketRefs.current[ticket.id] = el}
                      sx={{ 
                        mb: 1, 
                        position: 'relative', // Para posicionar o indicador
                        '&:hover': { 
                          boxShadow: 2,
                          transform: 'translateX(2px)',
                          transition: 'all 0.2s ease'
                        },
                        // Destaque especial para tarefa vinda de notificação
                        ...(highlightedTicket === ticket.id && {
                          border: '2px solid #3b82f6',
                          backgroundColor: 'rgba(59, 130, 246, 0.05)'
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
                            backgroundColor: '#ef4444',
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
                      <CardContent sx={{ p: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'text.primary', fontSize: '0.9rem', flex: 1 }}>
                            {ticket.title}
                          </Typography>
                          
                          {/* Menu de ações */}
                          <TicketActions 
                            ticket={ticket}
                            currentStatus={column.id}
                            onEdit={() => handleEditTicket(ticket)}
                            onMove={handleMoveTicket}
                            onDelete={() => handleDeleteTicket(ticket)}
                          />
                        </Box>
                        
                        {ticket.description && (
                          <Box sx={{ mb: 1.5 }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                mb: 1,
                                lineHeight: 1.5, 
                                fontSize: '0.85rem',
                                display: '-webkit-box',
                                WebkitLineClamp: 4,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                minHeight: '4.5rem'
                              }}
                            >
                              {ticket.description}
                            </Typography>
                            
                            {/* Botão Ver - Carrega descrição completa */}
                            <Button
                              size="small"
                              variant="text"
                              color="primary"
                              onClick={() => handleViewDescription(ticket)}
                              sx={{ 
                                p: 0.5, 
                                minWidth: 'auto',
                                fontSize: '0.75rem',
                                textTransform: 'none',
                                '&:hover': { backgroundColor: 'transparent' }
                              }}
                            >
                              Ver mais...
                            </Button>
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
                          <Chip 
                            label={ticket.priority === 'high' ? 'Alta' : 
                                   ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                            size="small"
                            sx={{ 
                              backgroundColor: ticket.priority === 'high' ? '#f44336' : 
                                             ticket.priority === 'medium' ? '#ff9800' : '#4caf50',
                              color: 'white',
                              fontSize: '0.65rem',
                              height: '20px'
                            }}
                          />
                          
                          {/* Botões de movimento rápido */}
                          <QuickMoveButtons 
                            ticket={ticket}
                            currentStatus={column.id}
                            onMove={handleMoveTicket}
                          />
                        </Box>

                        {ticket.assignee && (
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, fontWeight: 'medium', fontSize: '0.7rem' }}>
                            👤 {getUserNameById(ticket.assignee)}
                          </Typography>
                        )}
                        
                        {/* Data de Criação */}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, fontWeight: 'medium', fontSize: '0.7rem' }}>
                          📅 Criado em: {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                        </Typography>
                        
                        {/* Data de Início */}
                        {ticket.startDate && (
                          <Box sx={{ mt: 0.5 }}>
                            <StartDateDisplay startDate={ticket.startDate} />
                          </Box>
                        )}
                        
                        {/* Data Final de Entrega */}
                        {ticket.dueDate && (
                          <Box sx={{ mt: 0.5 }}>
                            <DueDateDisplay dueDate={ticket.dueDate} />
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: 'calc(100vh - 400px)',
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
          </Grid>
        ))}
      </Grid>

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

      {/* Dialog para visualizar descrição completa */}
      <Dialog open={!!viewDescriptionTicket} onClose={() => setViewDescriptionTicket(null)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {viewDescriptionTicket?.title}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            {viewDescriptionTicket?.description ? (
              <Typography 
                variant="body1" 
                color="text.primary" 
                sx={{ 
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {viewDescriptionTicket.description}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                Esta tarefa não possui descrição.
              </Typography>
            )}
            
            {/* Informações adicionais */}
            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
                Detalhes da Tarefa:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Status:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {viewDescriptionTicket?.status === 'backlog' ? 'Backlog' :
                     viewDescriptionTicket?.status === 'todo' ? 'A Fazer' :
                     viewDescriptionTicket?.status === 'in-progress' ? 'Em Andamento' : 'Concluída'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Prioridade:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {viewDescriptionTicket?.priority === 'high' ? 'Alta' :
                     viewDescriptionTicket?.priority === 'medium' ? 'Média' : 'Baixa'}
                  </Typography>
                </Box>
                {viewDescriptionTicket?.assignee && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Responsável:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {getUserNameById(viewDescriptionTicket.assignee)}
                    </Typography>
                  </Box>
                )}
                {viewDescriptionTicket?.startDate && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Início:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {new Date(viewDescriptionTicket.startDate).toLocaleDateString('pt-BR')}
                    </Typography>
                  </Box>
                )}
                {viewDescriptionTicket?.dueDate && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Vencimento:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {new Date(viewDescriptionTicket.dueDate).toLocaleDateString('pt-BR')}
                    </Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">Criada em:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    {new Date(viewDescriptionTicket?.createdAt || '').toLocaleDateString('pt-BR')}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDescriptionTicket(null)} color="primary">
            Fechar
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
      
      {/* Alerta para tarefas vencidas */}
      <Snackbar
        open={showOverdueAlert}
        autoHideDuration={10000}
        onClose={() => setShowOverdueAlert(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowOverdueAlert(false)}
          severity="error"
          sx={{ width: '100%' }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => setShowOverdueAlert(false)}
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

// Componente para ações do ticket
const TicketActions: React.FC<{
  ticket: KanbanTicket
  currentStatus: string
  onEdit: () => void
  onMove: (ticketId: string, newStatus: string) => void
  onDelete: () => void
}> = ({ ticket, currentStatus, onEdit, onMove, onDelete }) => {
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
      <IconButton size="small" onClick={handleClick}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={onEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Editar
        </MenuItem>
        <MenuItem onClick={() => handleMove('backlog')} disabled={currentStatus === 'backlog'}>
          📋 Mover para Backlog
        </MenuItem>
        <MenuItem onClick={() => handleMove('todo')} disabled={currentStatus === 'done'}>
          📝 Mover para A Fazer
        </MenuItem>
        <MenuItem onClick={() => handleMove('in-progress')} disabled={currentStatus === 'in-progress'}>
          🔄 Mover para Em Andamento
        </MenuItem>
        <MenuItem onClick={() => handleMove('done')} disabled={currentStatus === 'done'}>
          ✅ Mover para Concluído
        </MenuItem>
        <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Excluir
        </MenuItem>
      </Menu>
    </>
  )
}

// Componente para movimento rápido
const QuickMoveButtons: React.FC<{
  ticket: KanbanTicket
  currentStatus: string
  onMove: (ticketId: string, newStatus: string) => void
}> = ({ ticket, currentStatus, onMove }) => {
  const getNextStatus = () => {
    switch (currentStatus) {
      case 'backlog': return 'todo'
      case 'todo': return 'in-progress'
      case 'in-progress': return 'done'
      default: return null
    }
  }

  const getPrevStatus = () => {
    switch (currentStatus) {
      case 'done': return 'in-progress'
      case 'in-progress': return 'todo'
      case 'todo': return 'backlog'
      default: return null
    }
  }

  const nextStatus = getNextStatus()
  const prevStatus = getPrevStatus()

  return (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {prevStatus && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onMove(ticket.id, prevStatus)}
          sx={{ 
            minWidth: 'auto', 
            px: 1, 
            py: 0.25, 
            fontSize: '0.6rem',
            height: '20px'
          }}
        >
          ⬅️
        </Button>
      )}
      {nextStatus && (
        <Button
          size="small"
          variant="outlined"
          onClick={() => onMove(ticket.id, nextStatus)}
          sx={{ 
            minWidth: 'auto', 
            px: 1, 
            py: 0.25, 
            fontSize: '0.6rem',
            height: '20px'
          }}
        >
          ➡️
        </Button>
      )}
    </Box>
  )
}

// Componente para exibir data de início com indicadores visuais
const StartDateDisplay: React.FC<{ startDate: string }> = ({ startDate }) => {
  // Usar data atual em UTC para evitar problemas de fuso horário
  const today = new Date()
  const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  // Criar data de início em UTC para comparação precisa
  // Aplicar mesma lógica de parsing para evitar problemas de timezone
  let dateString = startDate
  if (dateString.includes('T') && dateString.includes('Z')) {
    dateString = dateString.split('T')[0]
  }
  const startDateObj = new Date(dateString + 'T00:00:00')
  const startDateUTC = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate())
  
  const diffTime = startDateUTC.getTime() - todayUTC.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  let status: 'not-started' | 'start-today' | 'start-soon' | 'started' = 'not-started'
  let color = 'text.secondary'
  let icon = '📅'
  let label = ''
  
  if (diffDays < 0) {
    status = 'started'
    color = 'success.main'
    icon = '✅'
    label = `Iniciada há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
  } else if (diffDays === 0) {
    status = 'start-today'
    color = 'info.main'
    icon = '🚀'
    label = 'Inicia hoje!'
  } else if (diffDays <= 3) {
    status = 'start-soon'
    color = 'info.main'
    icon = '⏰'
    label = `Inicia em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  } else {
    status = 'not-started'
    color = 'text.secondary'
    icon = '📅'
    label = `Inicia em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  }
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 0.5,
      p: 0.5,
      borderRadius: 1,
      backgroundColor: status === 'start-today' ? 'info.light' : 
                     status === 'start-soon' ? 'info.light' : 'transparent',
      border: `1px solid ${status === 'start-today' ? 'info.main' : 
                          status === 'start-soon' ? 'info.main' : 'transparent'}`
    }}>
      <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
        {icon}
      </Typography>
      <Typography 
        variant="caption" 
        sx={{ 
          fontWeight: 'medium', 
          fontSize: '0.7rem',
          color: color
        }}
      >
        {label}
      </Typography>
      <Typography 
        variant="caption" 
        sx={{ 
          fontSize: '0.65rem',
          color: 'text.secondary',
          ml: 'auto'
        }}
      >
        {startDateObj.toLocaleDateString('pt-BR')}
      </Typography>
    </Box>
  )
}

// Componente para exibir data de entrega com indicadores visuais
const DueDateDisplay: React.FC<{ dueDate: string }> = ({ dueDate }) => {
  // Usar data atual em UTC para evitar problemas de fuso horário
  const today = new Date()
  const todayUTC = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  // Criar data de vencimento em UTC para comparação precisa
  // Aplicar mesma lógica de parsing para evitar problemas de timezone
  let dateString = dueDate
  if (dateString.includes('T') && dateString.includes('Z')) {
    dateString = dateString.split('T')[0]
  }
  const dueDateObj = new Date(dateString + 'T00:00:00')
  const dueDateUTC = new Date(dueDateObj.getFullYear(), dueDateObj.getMonth(), dueDateObj.getDate())
  
  const diffTime = dueDateUTC.getTime() - todayUTC.getTime()
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
  
  let status: 'overdue' | 'due-today' | 'due-soon' | 'due-later' = 'due-later'
  let color = 'text.secondary'
  let icon = '📅'
  let label = ''
  
  if (diffDays < 0) {
    status = 'overdue'
    color = 'error.main'
    icon = '⚠️'
    label = `Vencida há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
  } else if (diffDays === 0) {
    status = 'due-today'
    color = 'warning.main'
    icon = '🚨'
    label = 'Vence hoje!'
  } else if (diffDays <= 3) {
    status = 'due-soon'
    color = 'warning.main'
    icon = '⏰'
    label = `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  } else {
    status = 'due-later'
    color = 'text.secondary'
    icon = '📅'
    label = `Vence em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`
  }
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 0.5,
      p: 0.5,
      borderRadius: 1,
      backgroundColor: status === 'overdue' ? 'error.light' : 
                     status === 'due-today' ? 'warning.light' : 
                     status === 'due-soon' ? 'warning.light' : 'transparent',
      border: `1px solid ${status === 'overdue' ? 'error.main' : 
                          status === 'due-today' ? 'warning.main' : 
                          status === 'due-soon' ? 'warning.main' : 'transparent'}`
    }}>
      <Typography variant="caption" sx={{ fontSize: '0.8rem' }}>
        {icon}
      </Typography>
      <Typography 
        variant="caption" 
        sx={{ 
          fontWeight: 'medium', 
          fontSize: '0.7rem',
          color: color
        }}
      >
        {label}
      </Typography>
      <Typography 
        variant="caption" 
        sx={{ 
          fontSize: '0.65rem',
          color: 'text.secondary',
          ml: 'auto'
        }}
      >
        {dueDateObj.toLocaleDateString('pt-BR')}
      </Typography>
    </Box>
  )
}