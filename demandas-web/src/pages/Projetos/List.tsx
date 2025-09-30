import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Stack,
  Alert,
  TextField,
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Tooltip,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  ListItemSecondaryAction,
  Skeleton,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material'
import { 
  Add, 
  Search, 
  FilterList,
  ViewList,
  ViewModule,
  ViewKanban,
  CalendarToday,
  Person,
  Flag,
  MoreVert,
  Star,
  StarBorder,
  TrendingUp,
  Schedule,
  CheckCircle,
  Warning,
  Error,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
  Sort,
  FilterAlt,
  Group,
  Timeline,
  Dashboard,
  Settings,
  Notifications,
  Announcement,
  Message,
  Email,
  Public,
  Lock,
  Build,
  Download,
  FolderOpen
} from '@mui/icons-material'
import { useProjectStore } from '../../store/projectStore'
import { useAuthStore } from '../../store/authStore'
import ExportProjectsModal from '../../components/ExportProjectsModal'

export default function ProjectListPage() {
  const navigate = useNavigate()
  const { projects, tasks, loading, error, syncFromApi } = useProjectStore()
  const { user } = useAuthStore()
  
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'kanban'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)

  // Carregar dados quando a página carrega
  useEffect(() => {
    syncFromApi()
  }, [syncFromApi])

  // Recarregar dados quando a página ganha foco (usuário volta da página de detalhes)
  useEffect(() => {
    const handleFocus = () => {
      syncFromApi()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [syncFromApi])

  // Converter dados da API para o formato esperado pela interface
  const convertedProjects = projects.map(project => {
    
    // Verificar se team é string e fazer parse
    let equipe = []
    if (project.team) {
      try {
        if (typeof project.team === 'string') {
          equipe = JSON.parse(project.team)
        } else if (Array.isArray(project.team)) {
          equipe = project.team
        }
      } catch (e) {
        console.warn('Erro ao fazer parse do team:', e)
        equipe = []
      }
    }
    
    // Garantir que equipe é sempre um array
    if (!Array.isArray(equipe)) {
      equipe = []
    }
    
    return {
      id: project.id,
      titulo: project.name || 'Projeto sem nome',
      descricao: project.description || 'Sem descrição',
      status: project.status === 'active' ? 'Em Andamento' : 
              project.status === 'completed' ? 'Concluído' : 
              project.status === 'paused' ? 'Pausado' : 
              project.status === 'cancelled' ? 'Cancelado' : 'Planejado',
      prioridade: project.priority === 'high' ? 'Alta' : 
                  project.priority === 'urgent' ? 'Urgente' : 
                  project.priority === 'medium' ? 'Média' : 
                  project.priority === 'low' ? 'Baixa' : 'Média',
      responsavel: (project as any).managerId || 'Não definido',
      dataInicio: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dataFim: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      progresso: project.progress || 0,
      categoria: 'Geral',
      equipe: equipe
    }
  })


  // Aplicar filtros
  const filteredProjects = convertedProjects.filter(project => {
    if (searchTerm && !project.titulo.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !project.descricao.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (statusFilter !== 'all' && project.status !== statusFilter) {
      return false
    }
    if (priorityFilter !== 'all' && project.prioridade !== priorityFilter) {
      return false
    }
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Em Andamento': return 'warning'
      case 'Planejado': return 'info'
      case 'Concluído': return 'success'
      case 'Cancelado': return 'error'
      default: return 'default'
    }
  }

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta': return 'error'
      case 'Média': return 'warning'
      case 'Baixa': return 'success'
      default: return 'default'
    }
  }

  const getProgressColor = (progresso: number) => {
    if (progresso >= 80) return 'success'
    if (progresso >= 50) return 'warning'
    return 'error'
  }

  const renderGridView = () => (
    <Grid container spacing={3}>
      {filteredProjects.map((project) => (
        <Grid item xs={12} sm={6} lg={4} key={project.id}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)'
              }
            }}
            onClick={() => navigate(`/projetos/${project.id}`)}
          >
            <CardContent sx={{ p: 3 }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {project.titulo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {project.descricao.substring(0, 120)}...
                  </Typography>
                </Box>
              </Box>

              {/* Status e Prioridade */}
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  label={project.status}
                  color={getStatusColor(project.status)}
                  size="small"
                />
                <Chip
                  label={project.prioridade}
                  color={getPriorityColor(project.prioridade)}
                  size="small"
                />
                <Chip
                  label={project.categoria}
                  color="primary"
                  size="small"
                />
              </Stack>

              {/* Progresso */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Progresso
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {project.progresso}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={project.progresso}
                  color={getProgressColor(project.progresso)}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              {/* Responsável e Datas */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24 }}>
                    <Person />
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {project.responsavel}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {new Date(project.dataInicio).toLocaleDateString('pt-BR')}
                </Typography>
              </Box>

              {/* Equipe */}
              {project.equipe && project.equipe.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Equipe ({project.equipe.length} membros)
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    {project.equipe.slice(0, 3).map((membro: string, index: number) => (
                      <Avatar
                        key={index}
                        sx={{ width: 24, height: 24, fontSize: '0.75rem' }}
                      >
                        {membro.charAt(0).toUpperCase()}
                      </Avatar>
                    ))}
                    {project.equipe.length > 3 && (
                      <Avatar sx={{ width: 24, height: 24, fontSize: '0.75rem', bgcolor: 'grey.300' }}>
                        +{project.equipe.length - 3}
                      </Avatar>
                    )}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )

  const renderListView = () => (
    <Paper>
      <List>
        {filteredProjects.map((project, index) => (
          <React.Fragment key={project.id}>
            <ListItem 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
              onClick={() => navigate(`/projetos/${project.id}`)}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <FolderOpen />
                </Avatar>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Typography variant="subtitle1" fontWeight="bold">
                    {project.titulo}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {project.descricao.substring(0, 100)}...
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={project.status}
                        color={getStatusColor(project.status)}
                        size="small"
                      />
                      <Chip
                        label={project.prioridade}
                        color={getPriorityColor(project.prioridade)}
                        size="small"
                      />
                      <Chip
                        label={project.categoria}
                        color="primary"
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {project.progresso}% concluído
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" fontWeight="bold">
                    {project.responsavel}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(project.dataInicio).toLocaleDateString('pt-BR')}
                  </Typography>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < filteredProjects.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  )

  const renderKanbanView = () => (
    <Grid container spacing={3}>
      {[
        { status: 'Planejado', color: 'info' },
        { status: 'Em Andamento', color: 'warning' },
        { status: 'Concluído', color: 'success' }
      ].map((statusGroup) => {
        const statusProjects = filteredProjects.filter(project => project.status === statusGroup.status)
        
        return (
          <Grid item xs={12} md={4} key={statusGroup.status}>
            <Paper sx={{ p: 2, minHeight: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip
                  label={statusGroup.status}
                  color={statusGroup.color as any}
                  size="small"
                />
                <Chip
                  label={statusProjects.length}
                  color="default"
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              <Stack spacing={2}>
                {statusProjects.map((project) => (
                  <Card
                    key={project.id}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 2 }
                    }}
                    onClick={() => navigate(`/projetos/${project.id}`)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                        {project.titulo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                        {project.descricao.substring(0, 60)}...
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          label={project.prioridade}
                          color={getPriorityColor(project.prioridade)}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {project.responsavel}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {project.progresso}%
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Paper>
          </Grid>
        )
      })}
    </Grid>
  )

  // Mostrar loading se estiver carregando
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" gutterBottom>
                Projetos
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Carregando projetos...
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="80%" height={20} />
                  <Skeleton variant="rectangular" width="100%" height={20} sx={{ mt: 2 }} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    )
  }

  // Se não está carregando e não há erro, mas também não há projetos, mostrar mensagem
  if (!loading && !error && projects.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" gutterBottom>
                Projetos
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Nenhum projeto encontrado
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhum projeto encontrado
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Crie seu primeiro projeto para começar
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/projetos/novo')}
            className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
            sx={{ borderRadius: '14px' }}
          >
            Criar Projeto
          </Button>
        </Box>
      </Box>
    )
  }


  // Mostrar erro se houver
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h4" gutterBottom>
                Projetos
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Erro ao carregar projetos
              </Typography>
            </Box>
          </Stack>
        </Paper>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={syncFromApi}
        >
          Tentar Novamente
        </Button>
      </Box>
    )
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Principal com Design Padrão */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                Projetos
              </Typography>
              
              {/* Filtro Automático */}
              <div className="flex items-center gap-3 mt-2">
                <FormControlLabel
                  control={
                    <Switch
                      checked={true}
                      disabled
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: '#667eea',
                          '&:hover': {
                            backgroundColor: 'rgba(102, 126, 234, 0.08)',
                          },
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#667eea',
                        },
                      }}
                    />
                  }
                  label={
                    <div className="flex items-center gap-2">
                      <Group className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-600">Todos os Projetos</span>
                    </div>
                  }
                />
                
                {/* Contador de projetos */}
                <Chip
                  label={`${filteredProjects.length} projeto${filteredProjects.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className="border-slate-300 text-slate-600 bg-slate-50"
                  sx={{ borderRadius: '12px' }}
                />
                
                {/* Estatísticas */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={`${filteredProjects.filter(p => p.status === 'Em Andamento').length} Em Andamento`}
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    label={`${filteredProjects.filter(p => p.status === 'Concluído').length} Concluídos`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    label={`${filteredProjects.filter(p => p.status === 'Pausado').length} Pausados`}
                    color="info"
                    variant="outlined"
                  />
                  <Chip
                    label={`${filteredProjects.filter(p => p.status === 'Cancelado').length} Cancelados`}
                    color="error"
                    variant="outlined"
                  />
                </Box>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={syncFromApi}
                size="medium"
                className="text-slate-600 border-slate-300 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-all duration-300 font-medium"
                sx={{
                  borderRadius: '14px',
                  padding: '10px 20px',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  height: '44px',
                  borderWidth: '2px',
                  '&:hover': {
                    borderWidth: '2px',
                  }
                }}
              >
                Sincronizar
              </Button>
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => setExportModalOpen(true)}
                size="medium"
                className="text-primary-600 border-primary-300 hover:text-primary-700 hover:border-primary-400 hover:bg-primary-50 transition-all duration-300 font-medium"
                sx={{
                  borderRadius: '14px',
                  padding: '10px 20px',
                  textTransform: 'none',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  height: '44px',
                  borderWidth: '2px',
                  '&:hover': {
                    borderWidth: '2px',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px 0 rgba(59, 130, 246, 0.15)'
                  }
                }}
              >
                Exportar
              </Button>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/projetos/novo')}
                size="medium"
                className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 font-semibold"
                sx={{
                  borderRadius: '14px',
                  padding: '10px 20px',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  height: '44px',
                  minWidth: '160px',
                  boxShadow: '0 4px 14px 0 rgba(15, 23, 42, 0.25)',
                  '&:hover': {
                    boxShadow: '0 8px 25px 0 rgba(15, 23, 42, 0.35)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                Novo Projeto
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6 space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <FilterAlt className="text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Filtros e Visualizações</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <TextField
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />

            {/* Filtros */}
            <Button
              variant="outlined"
              startIcon={<FilterAlt />}
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              size="small"
            >
              Filtros
            </Button>

            {/* Visualizações */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newView) => newView && setViewMode(newView)}
              size="small"
            >
              <ToggleButton value="list">
                <Tooltip title="Lista">
                  <ViewList />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="grid">
                <Tooltip title="Grid">
                  <ViewModule />
                </Tooltip>
              </ToggleButton>
              <ToggleButton value="kanban">
                <Tooltip title="Kanban">
                  <ViewKanban />
                </Tooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
        </div>

        {/* Conteúdo */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum projeto encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Crie seu primeiro projeto para começar'
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/projetos/novo')}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
              sx={{ borderRadius: '14px' }}
            >
              Criar Projeto
            </Button>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'list' && renderListView()}
            {viewMode === 'kanban' && renderKanbanView()}
          </>
        )}
      </div>

      {/* Menu de Filtros */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setStatusFilter('all'); setFilterMenuAnchor(null); }}>
          Todos os Status
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter('Planejado'); setFilterMenuAnchor(null); }}>
          Planejado
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter('Em Andamento'); setFilterMenuAnchor(null); }}>
          Em Andamento
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter('Concluído'); setFilterMenuAnchor(null); }}>
          Concluído
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setPriorityFilter('all'); setFilterMenuAnchor(null); }}>
          Todas as Prioridades
        </MenuItem>
        <MenuItem onClick={() => { setPriorityFilter('Alta'); setFilterMenuAnchor(null); }}>
          Apenas Altas
        </MenuItem>
        <MenuItem onClick={() => { setPriorityFilter('Média'); setFilterMenuAnchor(null); }}>
          Apenas Médias
        </MenuItem>
        <MenuItem onClick={() => { setPriorityFilter('Baixa'); setFilterMenuAnchor(null); }}>
          Apenas Baixas
        </MenuItem>
      </Menu>

      {/* Modal de Exportação */}
      <ExportProjectsModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        projects={projects}
        appliedFilters={{
          searchTerm,
          statusFilter,
          priorityFilter,
          viewMode
        }}
      />
    </div>
  )
}
