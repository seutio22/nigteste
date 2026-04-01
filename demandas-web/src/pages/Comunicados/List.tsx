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
  AddCircleOutline as AddCircleOutlineIcon,
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
  Delete
} from '@mui/icons-material'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { useComunicadoStore } from '../../store/comunicadoStore'
import { useAuthStore } from '../../store/authStore'
import { formatIntegerPtBR } from '../../utils/formatNumber'

export default function ComunicadosListPage() {
  const navigate = useNavigate()
  const comunicadoStore = useComunicadoStore()
  const { user } = useAuthStore()
  
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'kanban'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null)
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null)
  
  
  // Carregar comunicados quando a página for montada
  useEffect(() => {
    if (comunicadoStore.items.length === 0 && !comunicadoStore.loading) {
      comunicadoStore.fetchComunicados()
    }
  }, []) // Remover dependências para evitar loops

  // Função para remover comunicado com tratamento de erro
  const handleRemoveComunicado = async (id: string) => {
    try {
      await comunicadoStore.remove(id)
    } catch (error) {
      console.error('Erro ao excluir comunicado:', error)
    }
  }
  
  // Aplicar filtros e ordenação
  const filteredComunicados = comunicadoStore.items.filter(comunicado => {
    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      // Processar tags de forma segura
      let tags: string[] = [];
      try {
        tags = typeof comunicado.tags === 'string' ? JSON.parse(comunicado.tags || '[]') : comunicado.tags || [];
        if (!Array.isArray(tags)) tags = [];
      } catch (error) {
        tags = [];
      }
      
      if (!comunicado.titulo.toLowerCase().includes(searchLower) &&
          !comunicado.conteudo.toLowerCase().includes(searchLower) &&
          !comunicado.autor.toLowerCase().includes(searchLower) &&
          !tags.some(tag => tag.toLowerCase().includes(searchLower))) {
        return false
      }
    }

    // Filtro de categoria
    if (categoryFilter !== 'all' && comunicado.categoria !== categoryFilter) {
      return false
    }

    // Filtro de prioridade
    if (priorityFilter !== 'all' && comunicado.prioridade !== priorityFilter) {
      return false
    }

    // Filtro de status (publicado)
    if (statusFilter !== 'all') {
      if (statusFilter === 'published' && !comunicado.publicado) return false
      if (statusFilter === 'draft' && comunicado.publicado) return false
    }

    return true
  })

  // Ordenar comunicados
  const sortedComunicados = [...filteredComunicados].sort((a, b) => {
    // Por padrão, ordenar por data de criação (mais recentes primeiro)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const getPriorityColor = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta': return 'error'
      case 'Média': return 'warning'
      case 'Baixa': return 'success'
      default: return 'default'
    }
  }

  const getPriorityIcon = (prioridade: string) => {
    switch (prioridade) {
      case 'Alta': return <Flag color="error" />
      case 'Média': return <Flag color="warning" />
      case 'Baixa': return <Flag color="success" />
      default: return <Flag />
    }
  }

  const getPriorityLabel = (prioridade: string) => {
    return prioridade
  }

  const getStatusColor = (publicado: boolean) => {
    return publicado ? 'success' : 'default'
  }

  const getStatusLabel = (publicado: boolean) => {
    return publicado ? 'Publicado' : 'Rascunho'
  }

  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case 'Urgente': return <Warning />
      case 'Informativo': return <Announcement />
      case 'Evento': return <CalendarToday />
      case 'Manutenção': return <Build />
      default: return <Announcement />
    }
  }

  const getCategoryLabel = (categoria: string) => {
    return categoria
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

  // Renderizar loading
  if (comunicadoStore.loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                Comunicados
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Central de comunicação e anúncios da empresa
              </Typography>
            </Box>
          </Box>
          </Paper>
          
        <Grid container spacing={3}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Card sx={{ height: 300 }}>
                <CardContent>
                  <Skeleton variant="text" width="80%" height={32} />
                  <Skeleton variant="text" width="60%" height={24} />
                  <Skeleton variant="text" width="100%" height={20} />
                  <Skeleton variant="text" width="90%" height={20} />
                  <Skeleton variant="text" width="70%" height={20} />
                  <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Skeleton variant="rectangular" width={60} height={24} />
                    <Skeleton variant="rectangular" width={80} height={24} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            ))}
        </Grid>
      </Box>
    )
  }

  // Renderizar erro
  if (comunicadoStore.error) {
    return (
      <Box sx={{ p: 4 }}>
        <Paper sx={{ p: 8, textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 3 }}>
          Erro ao carregar comunicados: {comunicadoStore.error}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            startIcon={<Refresh />}
            onClick={() => comunicadoStore.fetchComunicados()}
          >
            Tentar Novamente
          </Button>
        </Box>
        </Paper>
      </Box>
    )
  }

  const renderGridView = () => (
    <Grid container spacing={3}>
      {sortedComunicados.map((comunicado) => (
        <Grid item xs={12} sm={6} lg={4} key={comunicado.id}>
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
            onClick={() => navigate(`/comunicados/${comunicado.id}`)}
          >
            <CardContent sx={{ p: 3 }}>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {comunicado.titulo}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {comunicado.conteudo.replace(/<[^>]*>/g, '')}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Tem certeza que deseja excluir este comunicado?')) {
                      handleRemoveComunicado(comunicado.id)
                    }
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <Delete />
                </IconButton>
              </Box>

              {/* Categoria e Prioridade */}
              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                <Chip
                  icon={getCategoryIcon(comunicado.categoria)}
                  label={getCategoryLabel(comunicado.categoria)}
                  color="primary"
                  size="small"
                />
                <Chip
                  icon={getPriorityIcon(comunicado.prioridade)}
                  label={getPriorityLabel(comunicado.prioridade)}
                  color={getPriorityColor(comunicado.prioridade)}
                  size="small"
                />
                <Chip
                  label={getStatusLabel(comunicado.publicado)}
                  color={getStatusColor(comunicado.publicado)}
                  size="small"
                />
              </Stack>

              {/* Estatísticas */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h6" color="primary" fontWeight="bold">
                    {formatIntegerPtBR(comunicado.visualizacoes?.length || 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Visualizações
                  </Typography>
                </Box>
              </Box>

              {/* Autor e Data */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 24, height: 24 }}>
                    <Person />
                  </Avatar>
                  <Typography variant="caption" color="text.secondary">
                    {comunicado.autor}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {formatTimeAgo(comunicado.createdAt)}
                </Typography>
              </Box>

              {/* Tags */}
              {(() => {
                try {
                  const tags = typeof comunicado.tags === 'string' ? JSON.parse(comunicado.tags || '[]') : comunicado.tags || [];
                  if (tags && Array.isArray(tags) && tags.length > 0) {
                    return (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {tags.slice(0, 3).map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        ))}
                        {tags.length > 3 && (
                          <Chip
                            label={`+${formatIntegerPtBR(tags.length - 3)}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    );
                  }
                  return null;
                } catch (error) {
                  console.warn('Erro ao processar tags do comunicado:', error);
                  return null;
                }
              })()}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )

  const renderListView = () => (
    <Paper>
      <List>
        {sortedComunicados.map((comunicado, index) => (
          <React.Fragment key={comunicado.id}>
            <ListItem 
              sx={{ 
                cursor: 'pointer',
                '&:hover': { backgroundColor: 'action.hover' }
              }}
              onClick={() => navigate(`/comunicados/${comunicado.id}`)}
            >
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {getCategoryIcon(comunicado.categoria)}
                </Avatar>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Typography variant="subtitle1" fontWeight="bold">
                    {comunicado.titulo}
                  </Typography>
                }
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {comunicado.conteudo.replace(/<[^>]*>/g, '')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        icon={getCategoryIcon(comunicado.categoria)}
                        label={getCategoryLabel(comunicado.categoria)}
                        color="primary"
                        size="small"
                      />
                      <Chip
                        icon={getPriorityIcon(comunicado.prioridade)}
                        label={getPriorityLabel(comunicado.prioridade)}
                        color={getPriorityColor(comunicado.prioridade)}
                        size="small"
                      />
                      <Chip
                        label={getStatusLabel(comunicado.publicado)}
                        color={getStatusColor(comunicado.publicado)}
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatIntegerPtBR(comunicado.visualizacoes?.length || 0)} visualizações
                      </Typography>
                    </Box>
                  </Box>
                }
              />
              
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {comunicado.autor}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimeAgo(comunicado.createdAt)}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (window.confirm('Tem certeza que deseja excluir este comunicado?')) {
                        handleRemoveComunicado(comunicado.id)
                      }
                    }}
                    sx={{ color: 'error.main' }}
                  >
                    <Delete />
                  </IconButton>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < sortedComunicados.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    </Paper>
  )

  const renderKanbanView = () => (
    <Grid container spacing={3}>
      {[
        { status: true, label: 'Publicados', color: 'success' },
        { status: false, label: 'Rascunhos', color: 'default' }
      ].map((statusGroup) => {
        const statusComunicados = sortedComunicados.filter(comunicado => comunicado.publicado === statusGroup.status)
        
        return (
          <Grid item xs={12} md={6} key={statusGroup.status.toString()}>
            <Paper sx={{ p: 2, minHeight: 400 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip
                  label={statusGroup.label}
                  color={statusGroup.color as any}
                  size="small"
                />
                <Chip
                  label={formatIntegerPtBR(statusComunicados.length)}
                  color="default"
                  size="small"
                  variant="outlined"
                />
              </Box>
              
              <Stack spacing={2}>
                {statusComunicados.map((comunicado) => (
                  <Card
                    key={comunicado.id}
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': { boxShadow: 2 }
                    }}
                    onClick={() => navigate(`/comunicados/${comunicado.id}`)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                        {comunicado.titulo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1 }}>
                        {comunicado.conteudo.replace(/<[^>]*>/g, '')}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Chip
                          icon={getPriorityIcon(comunicado.prioridade)}
                          label={getPriorityLabel(comunicado.prioridade)}
                          color={getPriorityColor(comunicado.prioridade)}
                          size="small"
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">
                          {comunicado.autor}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(comunicado.createdAt)}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm('Tem certeza que deseja excluir este comunicado?')) {
                                handleRemoveComunicado(comunicado.id)
                              }
                            }}
                            sx={{ color: 'error.main', p: 0.5 }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
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
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Principal com Design Padrão */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
              <Typography variant="h5" className="font-bold text-slate-800">
                  Comunicados
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
                      <span className="text-sm text-slate-600">Todos os Comunicados</span>
                    </div>
                  }
                />
                
                {/* Contador de comunicados */}
                <Chip
                  label={`${formatIntegerPtBR(sortedComunicados.length)} comunicado${sortedComunicados.length !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  className="border-slate-300 text-slate-600 bg-slate-50"
                  sx={{ borderRadius: '12px' }}
                />
                
                {/* Estatísticas */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label={`${formatIntegerPtBR(sortedComunicados.filter(c => c.publicado).length)} Publicados`}
                    size="small"
                    variant="outlined"
                    color="success"
                    sx={{ borderRadius: '12px' }}
                  />
                  <Chip
                    label={`${formatIntegerPtBR(sortedComunicados.filter(c => !c.publicado).length)} Rascunhos`}
                    size="small"
                    variant="outlined"
                    color="default"
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
              <PrimaryActionButton
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => navigate('/comunicados/novo')}
                sx={{ minWidth: '160px' }}
              >
                Novo Comunicado
              </PrimaryActionButton>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6 space-y-6">
        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-4 mb-4">
            <FilterAlt className="text-apoio-400" />
            <h3 className="text-lg font-medium text-gray-900">Filtros e Visualizações</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <TextField
              placeholder="Buscar comunicados..."
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
        {sortedComunicados.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum comunicado encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm || categoryFilter !== 'all' || priorityFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Crie seu primeiro comunicado para começar'
              }
            </Typography>
            <PrimaryActionButton
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => navigate('/comunicados/novo')}
            >
              Criar Comunicado
            </PrimaryActionButton>
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
        <MenuItem onClick={() => { setCategoryFilter('all'); setFilterMenuAnchor(null); }}>
          Todas as Categorias
        </MenuItem>
        <MenuItem onClick={() => { setCategoryFilter('Urgente'); setFilterMenuAnchor(null); }}>
          Urgente
        </MenuItem>
        <MenuItem onClick={() => { setCategoryFilter('Evento'); setFilterMenuAnchor(null); }}>
          Evento
        </MenuItem>
        <MenuItem onClick={() => { setCategoryFilter('Manutenção'); setFilterMenuAnchor(null); }}>
          Manutenção
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
        <Divider />
        <MenuItem onClick={() => { setStatusFilter('all'); setFilterMenuAnchor(null); }}>
          Todos os Status
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter('published'); setFilterMenuAnchor(null); }}>
          Apenas Publicados
        </MenuItem>
        <MenuItem onClick={() => { setStatusFilter('draft'); setFilterMenuAnchor(null); }}>
          Apenas Rascunhos
        </MenuItem>
      </Menu>
    </div>
  )
}
