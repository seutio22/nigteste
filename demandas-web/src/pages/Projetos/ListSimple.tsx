import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
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
  Switch,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  FormControl,
  InputLabel,
  Select,
  FormHelperText
} from '@mui/material'
import { 
  Add, 
  Search, 
  Refresh,
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
  Delete,
  Upload,
  FileUpload,
  CloudUpload,
  FolderOpen,
  Assignment,
  Work,
  Business,
  Engineering,
  Science,
  Code,
  Palette,
  Analytics,
  Speed
} from '@mui/icons-material'
import { useProjectStore } from '../../store/projectStore'
import { useAuthStore } from '../../store/authStore'
import { getApi } from '../../lib/apiConfig'
import { PermissionGate } from '../../components/PermissionGate'

export default function ProjectListPageSimple() {
  const navigate = useNavigate()
  // Usar seletores separados para garantir reatividade do Zustand
  const projects = useProjectStore((state) => state.projects)
  const loading = useProjectStore((state) => state.loading)
  const error = useProjectStore((state) => state.error)
  const syncFromApi = useProjectStore((state) => state.syncFromApi)
  const add = useProjectStore((state) => state.add)
  const remove = useProjectStore((state) => state.remove)
  const { user } = useAuthStore()

  // Estados para filtros e visualizações
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'kanban'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)
  
  // Estados para funcionalidade de incluir vários projetos
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [bulkAddStep, setBulkAddStep] = useState(0)
  const [bulkProjects, setBulkProjects] = useState<Array<{
    name: string
    description: string
    status: string
    priority: string
    startDate: string
    endDate: string
    manager: string
    budget: string
    progress: number
  }>>([])
  const [bulkAddLoading, setBulkAddLoading] = useState(false)

  // Carregar dados quando a página carrega
  useEffect(() => {
    syncFromApi()
  }, [syncFromApi])

  // Função para remover projeto com tratamento de erro
  const handleRemoveProject = async (id: string) => {
    try {
      // O método remove do store já chama a API e atualiza o estado local
      await remove(id)
      console.log('✅ Projeto removido com sucesso:', id)
    } catch (error) {
      console.error('Erro ao excluir projeto:', error)
      alert('Erro ao excluir projeto. Tente novamente.')
    }
  }
  
  // Aplicar filtros e ordenação
  const filteredProjects = projects.filter(project => {
    // Segurança extra no frontend: ocultar projetos privados de outros usuários
    if (project.isPrivate && project.ownerId && user?.role !== 'admin' && project.ownerId !== user?.id) {
      return false
    }
    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const name = (project.name || '').toLowerCase()
      const description = (project.description || '').toLowerCase()
      const manager = (project.manager || '').toLowerCase()
      if (!name.includes(searchLower) && !description.includes(searchLower) && !manager.includes(searchLower)) {
        return false
      }
    }

    // Filtro de status
    if (statusFilter !== 'all' && project.status !== statusFilter) {
      return false
    }

    // Filtro de prioridade
    if (priorityFilter !== 'all' && project.priority !== priorityFilter) {
      return false
    }

    return true
  })

  // Ordenar projetos
  const sortedProjects = [...filteredProjects].sort((a, b) => {
    // Por padrão, ordenar por data de criação (mais recentes primeiro)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  // Funções auxiliares para exibição
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'success'
      default: return 'default'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Flag color="error" />
      case 'high': return <Flag color="warning" />
      case 'medium': return <Flag color="info" />
      case 'low': return <Flag color="success" />
      default: return <Flag />
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'Urgente'
      case 'high': return 'Alta'
      case 'medium': return 'Média'
      case 'low': return 'Baixa'
      default: return priority
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'paused': return 'warning'
      case 'completed': return 'info'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo'
      case 'paused': return 'Pausado'
      case 'completed': return 'Concluído'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayArrow color="success" />
      case 'paused': return <Pause color="warning" />
      case 'completed': return <CheckCircle color="info" />
      case 'cancelled': return <Stop color="error" />
      default: return <PlayArrow />
    }
  }

  const getCategoryIcon = (name: string) => {
    const nameLower = name.toLowerCase()
    if (nameLower.includes('desenvolvimento') || nameLower.includes('dev')) return <Code />
    if (nameLower.includes('design') || nameLower.includes('ui')) return <Palette />
    if (nameLower.includes('marketing') || nameLower.includes('mkt')) return <TrendingUp />
    if (nameLower.includes('vendas') || nameLower.includes('sales')) return <Business />
    if (nameLower.includes('pesquisa') || nameLower.includes('r&d')) return <Science />
    if (nameLower.includes('infra') || nameLower.includes('infraestrutura')) return <Build />
    if (nameLower.includes('analytics') || nameLower.includes('dados')) return <Analytics />
    return <Work />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Agora mesmo'
    if (diffInHours < 24) return `${diffInHours}h atrás`
    if (diffInHours < 48) return 'Ontem'
    return formatDate(dateString)
  }

  // Função para adicionar projeto em lote
  const handleBulkAdd = () => {
    setBulkProjects([{
      name: '',
      description: '',
      status: 'active',
      priority: 'medium',
      startDate: '',
      endDate: '',
      manager: user?.name || '',
      budget: '',
      progress: 0
    }])
    setBulkAddStep(0)
    setBulkAddOpen(true)
  }

  const addBulkProject = () => {
    setBulkProjects([...bulkProjects, {
      name: '',
      description: '',
      status: 'active',
      priority: 'medium',
      startDate: '',
      endDate: '',
      manager: user?.name || '',
      budget: '',
      progress: 0
    }])
  }

  const removeBulkProject = (index: number) => {
    setBulkProjects(bulkProjects.filter((_, i) => i !== index))
  }

  const updateBulkProject = (index: number, field: string, value: any) => {
    const updated = [...bulkProjects]
    updated[index] = { ...updated[index], [field]: value }
    setBulkProjects(updated)
  }

  const handleBulkSubmit = async () => {
    setBulkAddLoading(true)
    try {
      for (const project of bulkProjects) {
        if (project.name.trim()) {
          await add({
            name: project.name,
            description: project.description,
            status: project.status as any,
            priority: project.priority as any,
            startDate: project.startDate ? new Date(project.startDate).toISOString() : new Date().toISOString(),
            endDate: project.endDate ? new Date(project.endDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            manager: project.manager,
            budget: project.budget ? parseFloat(project.budget) : undefined,
            progress: project.progress,
            team: '[]',
            tags: '[]',
            color: '#1976d2'
          })
        }
      }
      setBulkAddOpen(false)
      setBulkProjects([])
      setBulkAddStep(0)
      alert(`${bulkProjects.filter(p => p.name.trim()).length} projeto(s) criado(s) com sucesso!`)
    } catch (error) {
      console.error('Erro ao criar projetos:', error)
      alert('Erro ao criar projetos. Tente novamente.')
    } finally {
      setBulkAddLoading(false)
    }
  }

  // Mostrar loading se estiver carregando
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4">
          Carregando projetos...
        </Typography>
      </Box>
    )
  }

  // Se não está carregando e não há erro, mas também não há projetos, mostrar mensagem
  if (!loading && !error && projects.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Projetos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Nenhum projeto encontrado
        </Typography>
        <PermissionGate module="projetos" action="create">
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/projetos/novo')}
            sx={{ mt: 2 }}
          >
            Criar Projeto
          </Button>
        </PermissionGate>
      </Box>
    )
  }

  // Mostrar erro se houver
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Projetos
        </Typography>
        <Typography variant="body1" color="error">
          Erro ao carregar projetos: {error}
        </Typography>
        <Button
          variant="contained"
          startIcon={<Refresh />}
          onClick={syncFromApi}
          sx={{ mt: 2 }}
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
                          color: '#050032',
                          '&:hover': {
                            backgroundColor: 'rgba(5, 0, 50, 0.08)',
                          },
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: '#050032',
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
                  label={`${sortedProjects.length} projeto${sortedProjects.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className="border-slate-300 text-slate-600 bg-slate-50"
                  sx={{ borderRadius: '12px' }}
                />
                
                {/* Estatísticas */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={`${sortedProjects.filter(p => p.status === 'active').length} Ativos`}
                    size="small"
                    variant="outlined"
                    color="success"
                    sx={{ borderRadius: '12px' }}
                  />
                  <Chip
                    label={`${sortedProjects.filter(p => p.status === 'completed').length} Concluídos`}
                    size="small"
                    variant="outlined"
                    color="info"
                    sx={{ borderRadius: '12px' }}
                  />
                  <Chip
                    label={`${sortedProjects.filter(p => p.status === 'paused').length} Pausados`}
                    size="small"
                    variant="outlined"
                    color="warning"
                    sx={{ borderRadius: '12px' }}
                  />
                </Box>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outlined"
                startIcon={<Download />}
                onClick={() => alert('Funcionalidade de exportar em desenvolvimento')}
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
                    boxShadow: '0 4px 12px 0 rgba(0, 37, 97, 0.15)'
                  }
                }}
              >
                Exportar
              </Button>
              <PermissionGate module="projetos" action="create">
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={handleBulkAdd}
                size="medium"
                className="text-orange-600 border-orange-300 hover:text-orange-700 hover:border-orange-400 hover:bg-orange-50 transition-all duration-300 font-medium"
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
                    boxShadow: '0 4px 12px 0 rgba(251, 146, 60, 0.15)'
                  }
                }}
              >
                Incluir Vários
              </Button>
            </PermissionGate>
              <PermissionGate module="projetos" action="create">
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
            </PermissionGate>
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
        {sortedProjects.length === 0 ? (
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
            <PermissionGate module="projetos" action="create">
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/projetos/novo')}
              className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
              sx={{ borderRadius: '14px' }}
            >
              Criar Projeto
            </Button>
          </PermissionGate>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
      <Grid container spacing={3}>
                {sortedProjects.map((project) => (
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
                  {project.name || 'Projeto sem nome'}
                </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {project.description || 'Sem descrição'}
                </Typography>
                          </Box>
                          {(project as any).canEdit && (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
                                  handleRemoveProject(project.id)
                                }
                              }}
                              sx={{ color: 'error.main' }}
                            >
                              <Delete />
                            </IconButton>
                          )}
                        </Box>

                        {/* Status e Prioridade */}
                        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                          <Chip
                            icon={getStatusIcon(project.status)}
                            label={getStatusLabel(project.status)}
                            color={getStatusColor(project.status)}
                            size="small"
                          />
                          <Chip
                            icon={getPriorityIcon(project.priority)}
                            label={getPriorityLabel(project.priority)}
                            color={getPriorityColor(project.priority)}
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
                              {project.progress || 0}%
                            </Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={project.progress || 0} 
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>

                        {/* Estatísticas */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                              {project.budget ? `R$ ${project.budget.toLocaleString('pt-BR')}` : 'N/A'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Orçamento
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="h6" color="secondary" fontWeight="bold">
                              {formatDate(project.endDate)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Prazo
                            </Typography>
                          </Box>
                        </Box>

                        {/* Gerente e Data */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              <Person />
                            </Avatar>
                            <Typography variant="caption" color="text.secondary">
                              {project.manager}
                </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(project.createdAt)}
                </Typography>
                        </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
            )}
            {viewMode === 'list' && (
              <Paper>
                <List>
                  {sortedProjects.map((project, index) => (
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
                            {getCategoryIcon(project.name)}
                          </Avatar>
                        </ListItemAvatar>
                        
                        <ListItemText
                          primary={
                            <Typography variant="subtitle1" fontWeight="bold">
                              {project.name || 'Projeto sem nome'}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                {project.description || 'Sem descrição'}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Chip
                                  icon={getStatusIcon(project.status)}
                                  label={getStatusLabel(project.status)}
                                  color={getStatusColor(project.status)}
                                  size="small"
                                />
                                <Chip
                                  icon={getPriorityIcon(project.priority)}
                                  label={getPriorityLabel(project.priority)}
                                  color={getPriorityColor(project.priority)}
                                  size="small"
                                />
                                <Typography variant="caption" color="text.secondary">
                                  {project.progress || 0}% concluído
                                </Typography>
                              </Box>
                            </Box>
                          }
                        />
                        
                        <ListItemSecondaryAction>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ textAlign: 'right' }}>
                              <Typography variant="body2" fontWeight="bold">
                                {project.manager}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatTimeAgo(project.createdAt)}
                              </Typography>
                            </Box>
                            {(project as any).canEdit && (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
                                    handleRemoveProject(project.id)
                                  }
                                }}
                                sx={{ color: 'error.main' }}
                              >
                                <Delete />
                              </IconButton>
                            )}
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                      {index < sortedProjects.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            )}
            {viewMode === 'kanban' && (
              <Grid container spacing={3}>
                {[
                  { status: 'active', label: 'Ativos', color: 'success' },
                  { status: 'paused', label: 'Pausados', color: 'warning' },
                  { status: 'completed', label: 'Concluídos', color: 'info' },
                  { status: 'cancelled', label: 'Cancelados', color: 'error' }
                ].map((statusGroup) => {
                  const statusProjects = sortedProjects.filter(project => project.status === statusGroup.status)
                  
                  return (
                    <Grid item xs={12} md={3} key={statusGroup.status}>
                      <Paper sx={{ p: 2, minHeight: 400 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <Chip
                            label={statusGroup.label}
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
                                  {project.name || 'Projeto sem nome'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                                  {project.description || 'Sem descrição'}
                                </Typography>
                                
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Chip
                                    icon={getPriorityIcon(project.priority)}
                                    label={getPriorityLabel(project.priority)}
                                    color={getPriorityColor(project.priority)}
                                    size="small"
                                  />
                                </Box>
                                
                                <Box sx={{ mb: 1 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      Progresso
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {project.progress || 0}%
                                    </Typography>
                                  </Box>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={project.progress || 0} 
                                    sx={{ height: 4, borderRadius: 2 }}
                                  />
                                </Box>
                                
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Typography variant="caption" color="text.secondary">
                                    {project.manager}
                                  </Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatTimeAgo(project.createdAt)}
                                    </Typography>
                                    {(project as any).canEdit && (
                                      <IconButton
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (window.confirm('Tem certeza que deseja excluir este projeto?')) {
                                            handleRemoveProject(project.id)
                                          }
                                        }}
                                        sx={{ color: 'error.main', p: 0.5 }}
                                      >
                                        <Delete fontSize="small" />
                                      </IconButton>
                                    )}
                                  </Box>
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
            )}
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
        <MenuItem onClick={() => { setStatusFilter('active'); setFilterMenuAnchor(null); }}>
          Apenas Ativos
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter('paused'); setFilterMenuAnchor(null); }}>
          Apenas Pausados
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter('completed'); setFilterMenuAnchor(null); }}>
          Apenas Concluídos
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter('cancelled'); setFilterMenuAnchor(null); }}>
          Apenas Cancelados
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { setPriorityFilter('all'); setFilterMenuAnchor(null); }}>
          Todas as Prioridades
        </MenuItem>
        <MenuItem onClick={() => { setPriorityFilter('urgent'); setFilterMenuAnchor(null); }}>
          Apenas Urgentes
        </MenuItem>
        <MenuItem onClick={() => { setPriorityFilter('high'); setFilterMenuAnchor(null); }}>
          Apenas Altas
        </MenuItem>
        <MenuItem onClick={() => { setPriorityFilter('medium'); setFilterMenuAnchor(null); }}>
          Apenas Médias
        </MenuItem>
        <MenuItem onClick={() => { setPriorityFilter('low'); setFilterMenuAnchor(null); }}>
          Apenas Baixas
        </MenuItem>
      </Menu>

      {/* Dialog para Incluir Vários Projetos */}
      <Dialog 
        open={bulkAddOpen} 
        onClose={() => setBulkAddOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CloudUpload color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Incluir Vários Projetos
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Stepper activeStep={bulkAddStep} orientation="vertical">
            <Step>
              <StepLabel>Configuração dos Projetos</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Adicione os dados dos projetos que deseja criar. Você pode adicionar quantos projetos quiser.
                </Typography>
                
                <Stack spacing={2}>
                  {bulkProjects.map((project, index) => (
                    <Paper key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          Projeto {index + 1}
                        </Typography>
                        {bulkProjects.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => removeBulkProject(index)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        )}
    </Box>
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Nome do Projeto *"
                            value={project.name}
                            onChange={(e) => updateBulkProject(index, 'name', e.target.value)}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Gerente"
                            value={project.manager}
                            onChange={(e) => updateBulkProject(index, 'manager', e.target.value)}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Descrição"
                            value={project.description}
                            onChange={(e) => updateBulkProject(index, 'description', e.target.value)}
                            multiline
                            rows={2}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                              value={project.status}
                              label="Status"
                              onChange={(e) => updateBulkProject(index, 'status', e.target.value)}
                            >
                              <MenuItem value="active">Ativo</MenuItem>
                              <MenuItem value="paused">Pausado</MenuItem>
                              <MenuItem value="completed">Concluído</MenuItem>
                              <MenuItem value="cancelled">Cancelado</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Prioridade</InputLabel>
                            <Select
                              value={project.priority}
                              label="Prioridade"
                              onChange={(e) => updateBulkProject(index, 'priority', e.target.value)}
                            >
                              <MenuItem value="low">Baixa</MenuItem>
                              <MenuItem value="medium">Média</MenuItem>
                              <MenuItem value="high">Alta</MenuItem>
                              <MenuItem value="urgent">Urgente</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Progresso (%)"
                            type="number"
                            value={project.progress}
                            onChange={(e) => updateBulkProject(index, 'progress', Number(e.target.value))}
                            inputProps={{ min: 0, max: 100 }}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Data de Início"
                            type="date"
                            value={project.startDate}
                            onChange={(e) => updateBulkProject(index, 'startDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Data de Término"
                            type="date"
                            value={project.endDate}
                            onChange={(e) => updateBulkProject(index, 'endDate', e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            size="small"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Orçamento (R$)"
                            type="number"
                            value={project.budget}
                            onChange={(e) => updateBulkProject(index, 'budget', e.target.value)}
                            inputProps={{ min: 0, step: 0.01 }}
                            size="small"
                          />
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                  
                  <Button
                    variant="outlined"
                    startIcon={<Add />}
                    onClick={addBulkProject}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Adicionar Outro Projeto
                  </Button>
                </Stack>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkAddOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleBulkSubmit}
            disabled={bulkAddLoading || bulkProjects.every(p => !p.name.trim())}
            startIcon={bulkAddLoading ? <CircularProgress size={20} /> : <CloudUpload />}
          >
            {bulkAddLoading ? 'Criando...' : `Criar ${bulkProjects.filter(p => p.name.trim()).length} Projeto(s)`}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}
