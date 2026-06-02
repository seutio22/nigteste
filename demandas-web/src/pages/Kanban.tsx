import React, { useEffect, useMemo } from 'react'
import { Box, Typography, Chip, IconButton, Tooltip, Button } from '@mui/material'
import { Refresh as RefreshIcon, FilterList as FilterIcon, DeleteSweep as DeleteSweepIcon } from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { clearKanbanLocalCache, useKanbanStore } from '../store/kanbanStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useAuthStore } from '../store/authStore'
import { KanbanBoard } from '../components/KanbanBoard'
import { formatIntegerPtBR } from '../utils/formatNumber'

export default function KanbanPage() {
  const kanbanStore = useKanbanStore()
  const masterDataStore = useMasterDataStore()
  const { user, token } = useAuthStore()
  const navigate = useNavigate()

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

    // Sincronizar dados com API
    kanbanStore.syncFromApi().then(() => {
      console.log('✅ Kanban: Dados sincronizados com sucesso')
    }).catch(error => {
      console.error('❌ Kanban: Erro na sincronização:', error)
    })
  }, [token, user?.id, navigate])

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

  return (
    <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
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
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <Box sx={{ flex: 1, p: 1, pt: 0.75 }}>
        <KanbanBoard />
      </Box>
    </Box>
  )
}
