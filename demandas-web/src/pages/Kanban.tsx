import React, { useEffect, useMemo } from 'react'
import { Box, Typography, Chip, IconButton, Tooltip } from '@mui/material'
import { Refresh as RefreshIcon, FilterList as FilterIcon } from '@mui/icons-material'
import { useKanbanStore } from '../store/kanbanStore'
import { useMasterDataStore } from '../store/masterDataStore'
import { useAuthStore } from '../store/authStore'
import { KanbanBoard } from '../components/KanbanBoard'

export default function KanbanPage() {
  const kanbanStore = useKanbanStore()
  const masterDataStore = useMasterDataStore()
  const { user } = useAuthStore()

  // Carregar dados automaticamente quando a página é carregada
  useEffect(() => {
    console.log('🔍 Kanban: Carregando dados da API...')
    
    if (user?.id) {
      console.log('🔍 Kanban: Usuário logado, carregando dados...')
      
      // Carregar dados mestres se necessário
          // Dados mestres são carregados apenas na página Dados Mestres
    // if (masterDataStore.analistas.length === 0) {
    //   masterDataStore.syncFromApi?.()
    // }
      
      // Carregar dados do kanban se necessário
      if (kanbanStore.tickets.length === 0) {
        kanbanStore.syncFromApi()
      }
    } else {
      console.log('🔍 Kanban: Usuário não logado, aguardando...')
    }
  }, [user?.id])

  // Estatísticas dos tickets do kanban
  const kanbanStats = useMemo(() => {
    const total = kanbanStore.tickets.length
    const backlog = kanbanStore.tickets.filter(t => t.status === 'backlog').length
    const todo = kanbanStore.tickets.filter(t => t.status === 'todo').length
    const inProgress = kanbanStore.tickets.filter(t => t.status === 'in-progress').length
    const done = kanbanStore.tickets.filter(t => t.status === 'done').length
    
    return { total, backlog, todo, inProgress, done }
  }, [kanbanStore.tickets])

  const handleRefresh = () => {
    console.log('🔄 Kanban: Atualizando dados...')
    kanbanStore.syncFromApi()
  }

  return (
    <Box sx={{ height: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                Quadro Kanban
              </Typography>
              <Typography variant="body2" className="text-slate-600">
                Visualize e gerencie seus projetos e tarefas em um quadro interativo
              </Typography>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Estatísticas */}
              <div className="flex items-center gap-2">
                <Chip 
                  label={`${kanbanStats.total} Tickets`} 
                  size="small" 
                  variant="outlined" 
                  className="border-blue-300 text-blue-600"
                />
                <Chip 
                  label={`${kanbanStats.backlog} Backlog`} 
                  size="small" 
                  variant="outlined" 
                  className="border-gray-300 text-gray-600"
                />
                <Chip 
                  label={`${kanbanStats.todo} A Fazer`} 
                  size="small" 
                  variant="outlined" 
                  className="border-yellow-300 text-yellow-600"
                />
                <Chip 
                  label={`${kanbanStats.inProgress} Em Andamento`} 
                  size="small" 
                  variant="outlined" 
                  className="border-blue-300 text-blue-600"
                />
                <Chip 
                  label={`${kanbanStats.done} Concluído`} 
                  size="small" 
                  variant="outlined" 
                  className="border-green-300 text-green-600"
                />
              </div>
              
              {/* Botões de ação */}
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
      <Box sx={{ flex: 1, p: 2 }}>
        <KanbanBoard />
      </Box>
    </Box>
  )
}
