import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  AddCircleOutline as AddCircleOutlineIcon,
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
  Speed,
  Archive,
  InfoOutlined
} from '@mui/icons-material'
import { useProjectStore } from '../../store/projectStore'
import { useAuthStore } from '../../store/authStore'
import { getApi } from '../../lib/apiConfig'
import { PermissionGate } from '../../components/PermissionGate'
import { PrimaryActionButton } from '../../components/PrimaryActionButton'
import { formatIntegerPtBR } from '../../utils/formatNumber'

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
  /** mine = seus projetos | all = todos visíveis | archived = pausados + cancelados */
  const [projectScope, setProjectScope] = useState<'mine' | 'all' | 'archived'>('mine')
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({})
  
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

  // Carregar dados quando a página carrega (padrão: filtro «Meus projetos»)
  useEffect(() => {
    syncFromApi(true)
  }, [syncFromApi])

  // Ao escolher «Todos os projetos» ou «Arquivados», atualizar da API
  useEffect(() => {
    if (projectScope !== 'all' && projectScope !== 'archived') return
    syncFromApi(true)
  }, [projectScope, syncFromApi])

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
  
  /**
   * Meus projetos = dono, gerente ou membro (tabela ProjectMember na API → isMember / canEdit).
   * Admin: não usa canEdit sozinho (seria true em todos); demais perfis: canEdit implica um dos papéis.
   */
  const isProjectMine = useCallback((project: (typeof projects)[0]) => {
    const uid = user?.id
    if (!uid) return false
    if (project.isOwner === true || project.isManager === true || project.isMember === true) return true
    const n = (v: unknown) => (v != null ? String(v).trim() : '')
    if (n(project.ownerId) === n(uid)) return true
    if (n(project.managerId) === n(uid)) return true
    if (n(project.manager) === n(uid)) return true
    const team = project.team
    if (Array.isArray(team) && team.some((id) => n(id) === n(uid))) return true
    if (user?.role !== 'admin' && project.canEdit === true) return true
    return false
  }, [user?.id, user?.role])

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (projectScope === 'mine' && !isProjectMine(project)) {
        return false
      }
      if (projectScope === 'archived') {
        const s = project.status
        if (s !== 'paused' && s !== 'cancelled') return false
      }
      if ((projectScope === 'mine' || projectScope === 'all') && project.status !== 'active') {
        return false
      }
      if (project.isPrivate && project.ownerId && user?.role !== 'admin' && project.ownerId !== user?.id) {
        return false
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const name = (project.name || '').toLowerCase()
        const description = (project.description || '').toLowerCase()
        const manager = (project.manager || '').toLowerCase()
        if (!name.includes(searchLower) && !description.includes(searchLower) && !manager.includes(searchLower)) {
          return false
        }
      }
      if (statusFilter !== 'all' && project.status !== statusFilter) {
        return false
      }
      if (priorityFilter !== 'all' && project.priority !== priorityFilter) {
        return false
      }
      return true
    })
  }, [
    projects,
    projectScope,
    searchTerm,
    statusFilter,
    priorityFilter,
    user?.id,
    user?.role,
    isProjectMine
  ])

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [filteredProjects])

  const statusSummary = useMemo(() => {
    let active = 0
    let completed = 0
    let paused = 0
    let cancelled = 0
    for (const p of sortedProjects) {
      const s = p.status
      if (s === 'active') active++
      else if (s === 'completed') completed++
      else if (s === 'paused') paused++
      else if (s === 'cancelled') cancelled++
    }
    return { active, completed, paused, cancelled }
  }, [sortedProjects])

  /** Só bloqueia a página inteira quando não há cache local; com dados, mostra barra de atualização. */
  const showFullPageLoading = loading && projects.length === 0
  const showRefreshBar = loading && projects.length > 0

  const getOwnerLabel = (project: any) => {
    return project?.ownerName || project?.owner?.name || project?.owner?.email || project?.ownerId || '—'
  }

  const shouldShowReadMore = (text: string) => {
    const t = String(text || '').trim()
    return t.length > 180 || t.includes('\n')
  }

  const renderDescription = (project: any, variant: 'grid' | 'list') => {
    const text = String(project?.description || 'Sem descrição')
    const expanded = !!expandedDescriptions[project.id]
    const canToggle = shouldShowReadMore(text)
    const clampLines = variant === 'grid' ? 3 : 2
    return (
      <Box sx={{ mb: variant === 'grid' ? 2 : 1 }}>
        <Typography
          variant={variant === 'grid' ? 'body2' : 'body2'}
          color="text.secondary"
          sx={{
            ...(expanded
              ? {}
              : {
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: clampLines,
                  overflow: 'hidden'
                })
          }}
        >
          {text}
        </Typography>
        {canToggle && (
          <Button
            size="small"
            variant="text"
            sx={{ px: 0, minWidth: 0, textTransform: 'none' }}
            onClick={(e) => {
              e.stopPropagation()
              setExpandedDescriptions((prev) => ({ ...prev, [project.id]: !expanded }))
            }}
          >
            {expanded ? 'Ler menos' : 'Ler mais'}
          </Button>
        )}
      </Box>
    )
  }

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
            team: [],
            tags: [],
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

  // Primeira carga sem cache: tela leve; com cache, a lista continua visível e só há barra de atualização
  if (showFullPageLoading) {
    return (
      <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
        <Skeleton variant="text" width={220} height={40} sx={{ mb: 2 }} />
        <LinearProgress sx={{ mb: 3, borderRadius: 1 }} />
        <Grid container spacing={2}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Grid item xs={12} sm={6} lg={4} key={i}>
              <Skeleton variant="rounded" height={200} sx={{ borderRadius: 2 }} />
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
        <Typography variant="h4" gutterBottom>
          Projetos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Nenhum projeto encontrado
        </Typography>
        <PermissionGate module="projetos" action="create">
          <PrimaryActionButton
            startIcon={<AddCircleOutlineIcon />}
            onClick={() => navigate('/projetos/novo')}
            sx={{ mt: 2 }}
          >
            Criar Projeto
          </PrimaryActionButton>
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
          onClick={() => syncFromApi(true)}
          sx={{ mt: 2 }}
        >
          Tentar Novamente
        </Button>
      </Box>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {showRefreshBar ? (
        <LinearProgress
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.drawer + 2
          }}
        />
      ) : null}
      {/* Cabeçalho: título, escopo, resumo, busca, filtros e visualização numa única faixa */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-white/20 shadow-sm sticky top-0 z-10">
        <div className="px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 gap-y-3">
            <Typography variant="h5" className="font-bold text-slate-800">
              Projetos
            </Typography>
            <div className="flex items-center gap-2 flex-wrap justify-end">
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
              <PrimaryActionButton
                startIcon={<AddCircleOutlineIcon />}
                onClick={() => navigate('/projetos/novo')}
                sx={{ minWidth: '160px' }}
              >
                Novo Projeto
              </PrimaryActionButton>
            </PermissionGate>
            </div>
          </div>

          <Box
            sx={{
              mt: 1.5,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              columnGap: 1.25,
              rowGap: 1,
            }}
          >
            <ToggleButtonGroup
              value={projectScope}
              exclusive
              size="small"
              color="primary"
              onChange={(_, v) => v && setProjectScope(v)}
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  px: { xs: 1, sm: 1.5 },
                  py: 0.5,
                  borderColor: 'rgba(15, 23, 42, 0.12)',
                  fontSize: { xs: '0.75rem', sm: '0.8125rem' },
                },
              }}
            >
              <ToggleButton value="mine">
                <Group className="w-4 h-4 mr-1 opacity-80 max-sm:hidden" />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Meus projetos</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Meus</Box>
              </ToggleButton>
              <ToggleButton value="all">
                <Public className="w-4 h-4 mr-1 opacity-80 max-sm:hidden" />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Todos os projetos</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Todos</Box>
              </ToggleButton>
              <ToggleButton value="archived">
                <Archive className="w-4 h-4 mr-1 opacity-80 max-sm:hidden" />
                Arquivados
              </ToggleButton>
            </ToggleButtonGroup>

            <Tooltip title="Meus projetos e Todos os projetos mostram apenas projetos ativos. Arquivados reúne pausados e cancelados.">
              <IconButton size="small" aria-label="Sobre os escopos de lista" sx={{ color: 'text.secondary', p: 0.5 }}>
                <InfoOutlined fontSize="small" />
              </IconButton>
            </Tooltip>

            <Chip
              label={`${formatIntegerPtBR(sortedProjects.length)} projeto${sortedProjects.length !== 1 ? 's' : ''}`}
              size="small"
              variant="outlined"
              className="border-slate-300 text-slate-600 bg-slate-50"
              sx={{ borderRadius: '12px', height: 26, '& .MuiChip-label': { px: 1, fontSize: '0.75rem' } }}
            />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
              <Chip
                label={`${formatIntegerPtBR(statusSummary.active)} Ativos`}
                size="small"
                variant="outlined"
                color="success"
                sx={{ borderRadius: '10px', height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
              />
              <Chip
                label={`${formatIntegerPtBR(statusSummary.completed)} Concluídos`}
                size="small"
                variant="outlined"
                color="info"
                sx={{ borderRadius: '10px', height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
              />
              <Chip
                label={`${formatIntegerPtBR(statusSummary.paused)} Pausados`}
                size="small"
                variant="outlined"
                color="warning"
                sx={{ borderRadius: '10px', height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
              />
              <Chip
                label={`${formatIntegerPtBR(statusSummary.cancelled)} Cancelados`}
                size="small"
                variant="outlined"
                color="error"
                sx={{ borderRadius: '10px', height: 22, '& .MuiChip-label': { px: 0.75, fontSize: '0.7rem' } }}
              />
            </Box>

            <TextField
              placeholder="Buscar projetos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              sx={{
                flex: '1 1 160px',
                minWidth: 140,
                maxWidth: { xs: '100%', sm: 320 },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="outlined"
              startIcon={<FilterAlt fontSize="small" />}
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              size="small"
              sx={{ textTransform: 'none', flexShrink: 0, borderRadius: '10px' }}
            >
              Filtros
            </Button>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newView) => newView && setViewMode(newView)}
              size="small"
              sx={{ flexShrink: 0, '& .MuiToggleButton-root': { px: 1 } }}
            >
              <ToggleButton value="list" aria-label="Lista" title="Lista">
                <ViewList fontSize="small" />
              </ToggleButton>
              <ToggleButton value="grid" aria-label="Grade" title="Grade">
                <ViewModule fontSize="small" />
              </ToggleButton>
              <ToggleButton value="kanban" aria-label="Kanban" title="Kanban">
                <ViewKanban fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-4 sm:p-6">
        {/* Conteúdo */}
        {sortedProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Nenhum projeto encontrado
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : projectScope === 'archived'
                  ? 'Não há projetos pausados ou cancelados no momento.'
                  : 'Crie seu primeiro projeto para começar'}
      </Typography>
            <PermissionGate module="projetos" action="create">
            <PrimaryActionButton
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => navigate('/projetos/novo')}
            >
              Criar Projeto
            </PrimaryActionButton>
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
                            {renderDescription(project, 'grid')}
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, gap: 1 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                              <Avatar sx={{ width: 24, height: 24 }}>
                                <Person />
                              </Avatar>
                              <Typography variant="caption" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
                                {project.manager || '—'}
                              </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
                              Criado por: {getOwnerLabel(project)}
                            </Typography>
                          </Box>
                          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
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
                              {renderDescription(project, 'list')}
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
                    startIcon={<AddCircleOutlineIcon />}
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
