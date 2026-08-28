import React, { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Button,
  Menu,
  MenuItem,
  Checkbox,
  ListItemText,
  Snackbar,
  Alert,
} from '@mui/material'
import {
  Refresh as RefreshIcon,
  DeleteSweep as DeleteSweepIcon,
  OpenInFull as OpenInFullIcon,
  CloseFullscreen as CloseFullscreenIcon,
  ViewWeek as ViewWeekIcon,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import {
  clearKanbanLocalCache,
  useKanbanStore,
  KANBAN_OPTIONAL_COLUMNS,
  type KanbanOptionalStatus,
} from '../store/kanbanStore'
import { useAuthStore } from '../store/authStore'
import { KanbanBoard } from '../components/KanbanBoard'
import { formatIntegerPtBR } from '../utils/formatNumber'

export default function KanbanPage() {
  const kanbanStore = useKanbanStore()
  const { user, token } = useAuthStore()
  const navigate = useNavigate()

  const [fullscreen, setFullscreen] = useState(false)
  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState<null | HTMLElement>(null)
  const [columnsError, setColumnsError] = useState<string | null>(null)
  const [savingColumn, setSavingColumn] = useState<string | null>(null)

  // Verificar autenticação e carregar dados
  useEffect(() => {
    // Verificação: Se não há token OU não há usuário, redirecionar
    if (!token || !user?.id) {
      console.warn('⚠️ Kanban: Usuário não autenticado - redirecionando para login...')
      navigate('/login', { replace: true })
      return
    }

    console.log('✅ Kanban: Usuário autenticado, carregando dados...')
    clearKanbanLocalCache()

    // Sincronizar dados e preferências de colunas com API
    kanbanStore.loadColumnPrefs()
    kanbanStore.syncFromApi().then(() => {
      console.log('✅ Kanban: Dados sincronizados com sucesso')
    }).catch(error => {
      console.error('❌ Kanban: Erro na sincronização:', error)
    })
  }, [token, user?.id, navigate])

  // Sair da tela cheia com Esc
  useEffect(() => {
    if (!fullscreen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [fullscreen])

  // Estatísticas dos tickets do kanban - APENAS tickets do usuário logado
  const kanbanStats = useMemo(() => {
    // Filtrar apenas tickets do usuário logado
    const userTickets = kanbanStore.getFilteredTickets(user?.role, user?.id, true)
    const total = userTickets.length
    const backlog = userTickets.filter(t => t.status === 'backlog').length
    const todo = userTickets.filter(t => t.status === 'todo').length
    const inProgress = userTickets.filter(t => t.status === 'in-progress').length
    const done = userTickets.filter(t => t.status === 'done').length
    
    return { total, backlog, todo, inProgress, done }
  }, [kanbanStore.tickets, user?.id, user?.role])

  const handleRefresh = () => {
    // Verificar autenticação antes de atualizar
    if (!token || !user?.id) {
      console.warn('⚠️ Kanban: Não é possível atualizar sem autenticação')
      navigate('/login', { replace: true })
      return
    }
    
    console.log('🔄 Kanban: Atualizando dados...')
    kanbanStore.syncFromApi()
  }

  const handleClearAllTickets = () => {
    if (kanbanStats.total <= 0) return
    const ok = window.confirm('Tem certeza que deseja excluir TODAS as tarefas? Esta ação não pode ser desfeita.')
    if (ok) kanbanStore.deleteAllTickets()
  }

  const handleToggleColumn = async (columnId: KanbanOptionalStatus) => {
    const enabled = kanbanStore.enabledOptionalColumns.includes(columnId)
    setSavingColumn(columnId)
    try {
      await kanbanStore.setOptionalColumnEnabled(columnId, !enabled)
    } catch (error: unknown) {
      const msg =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: string }).message)
          : 'Não foi possível salvar a preferência de colunas.'
      setColumnsError(
        msg.includes('Mova as tarefas')
          ? msg
          : 'Não foi possível salvar. Se a coluna tiver tarefas, mova-as antes de desativá-la.'
      )
    } finally {
      setSavingColumn(null)
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        ...(fullscreen
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 1300,
              height: '100vh',
              overflow: 'hidden',
              bgcolor: 'background.default',
            }
          : { height: '100%', width: '100%', minHeight: 0, overflow: 'hidden' }),
      }}
    >
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Typography variant="h6" className="font-bold text-slate-800 leading-tight">
                Quadro Kanban
              </Typography>
              <Typography variant="body2" className="text-slate-600 leading-tight">
                Visualize e gerencie seus projetos e tarefas em um quadro interativo
              </Typography>
              <Typography variant="caption" className="text-slate-500 block leading-tight">
                🔒 Seus tickets são privados - apenas você pode vê-los
              </Typography>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Estatísticas */}
              <div className="flex items-center gap-2">
                <Chip 
                  label={`${formatIntegerPtBR(kanbanStats.total)} Tickets`} 
                  size="small" 
                  variant="outlined" 
                  className="border-blue-300 text-blue-600"
                />
                <Chip 
                  label={`${formatIntegerPtBR(kanbanStats.backlog)} Backlog`} 
                  size="small" 
                  variant="outlined" 
                  className="border-gray-300 text-gray-600"
                />
                <Chip 
                  label={`${formatIntegerPtBR(kanbanStats.todo)} A Fazer`} 
                  size="small" 
                  variant="outlined" 
                  className="border-yellow-300 text-yellow-600"
                />
                <Chip 
                  label={`${formatIntegerPtBR(kanbanStats.inProgress)} Em Andamento`} 
                  size="small" 
                  variant="outlined" 
                  className="border-blue-300 text-blue-600"
                />
                <Chip 
                  label={`${formatIntegerPtBR(kanbanStats.done)} Concluído`} 
                  size="small" 
                  variant="outlined" 
                  className="border-green-300 text-green-600"
                />
              </div>
              
              {/* Botões de ação */}
              <Button
                variant="outlined"
                size="small"
                startIcon={<ViewWeekIcon />}
                onClick={(e) => setColumnsMenuAnchor(e.currentTarget)}
              >
                Colunas
              </Button>
              {kanbanStats.total > 0 && (
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={handleClearAllTickets}
                  startIcon={<DeleteSweepIcon />}
                >
                  Limpar todas
                </Button>
              )}
              <Tooltip title="Atualizar dados">
                <IconButton onClick={handleRefresh} size="small">
                  <RefreshIcon className="w-4 h-4" />
                </IconButton>
              </Tooltip>
              <Tooltip title={fullscreen ? 'Sair da tela cheia (Esc)' : 'Tela cheia'}>
                <IconButton onClick={() => setFullscreen((v) => !v)} size="small">
                  {fullscreen ? (
                    <CloseFullscreenIcon className="w-4 h-4" />
                  ) : (
                    <OpenInFullIcon className="w-4 h-4" />
                  )}
                </IconButton>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Menu de colunas opcionais */}
      <Menu
        anchorEl={columnsMenuAnchor}
        open={Boolean(columnsMenuAnchor)}
        onClose={() => setColumnsMenuAnchor(null)}
      >
        <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary' }}>
          Colunas adicionais do fluxo
        </Typography>
        {KANBAN_OPTIONAL_COLUMNS.map((col) => {
          const enabled = kanbanStore.enabledOptionalColumns.includes(col.id)
          return (
            <MenuItem
              key={col.id}
              dense
              disabled={savingColumn === col.id}
              onClick={() => handleToggleColumn(col.id as KanbanOptionalStatus)}
            >
              <Checkbox size="small" checked={enabled} sx={{ p: 0.5, mr: 1 }} />
              <ListItemText
                primary={col.title}
                primaryTypographyProps={{ fontSize: '0.85rem' }}
              />
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: col.color, ml: 1.5 }} />
            </MenuItem>
          )
        })}
        <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: 'text.secondary', maxWidth: 260 }}>
          Para desativar uma coluna, mova antes as tarefas que estão nela.
        </Typography>
      </Menu>

      {/* Conteúdo */}
      <Box sx={{ flex: 1, p: 1, pt: 0.75, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <KanbanBoard />
      </Box>

      <Snackbar
        open={Boolean(columnsError)}
        autoHideDuration={7000}
        onClose={() => setColumnsError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="warning" variant="filled" onClose={() => setColumnsError(null)} sx={{ width: '100%' }}>
          {columnsError}
        </Alert>
      </Snackbar>
    </Box>
  )
}
