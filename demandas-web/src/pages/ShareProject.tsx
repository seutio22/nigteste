import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Grid,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  Alert,
  CircularProgress,
  Button,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Share as ShareIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  UnfoldMore as UnfoldMoreIcon,
  UnfoldLess as UnfoldLessIcon,
  Flag as FlagIcon,
  Notes as NotesIcon,
  DateRange as DateRangeIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { api } from '../lib/api.local';
import ProjectGantt from '../components/ProjectGantt';

interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  startDate: string;
  endDate: string;
  progress: number;
  budget?: number;
  client?: {
    id: string;
    nome: string;
  };
  manager: {
    id: string;
    name: string;
    email: string;
  };
  members: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  externalMembers: Array<{
    id: string;
    name: string;
    email?: string;
    company?: string;
    role: string;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate?: string;
    assignee?: {
      id: string;
      nome: string;
    };
    subtaskItems: Array<{
      id: string;
      title: string;
      status: string;
      progress: number;
      dueDate?: string;
    }>;
  }>;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: string;
    completed: boolean;
  }>;
  timeline: {
    phases: Array<{
      id: string;
      name: string;
      status: string;
      startDate?: string;
      endDate?: string;
      tasks: Array<{
        id: string;
        name: string;
        status: string;
        priority: string;
        responsible: string;
        startDate?: string;
        dueDate?: string;
        subtasks: Array<{
          id: string;
          title: string;
          status: string;
          priority: string;
          assignee?: string;
        }>;
      }>;
    }>;
  };
}

interface ShareInfo {
  name: string;
  description?: string;
  createdAt: string;
}

const ShareProject: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectData | null>(null);
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [allowedViews, setAllowedViews] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (token) {
      fetchProjectData();
    }
  }, [token]);

  // Funções para controlar expansão das etapas
  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const newSet = new Set(prev);
      if (newSet.has(phaseId)) {
        newSet.delete(phaseId);
      } else {
        newSet.add(phaseId);
      }
      return newSet;
    });
  };

  const expandAllPhases = () => {
    if (project?.timeline?.phases) {
      setExpandedPhases(new Set(project.timeline.phases.map(phase => phase.id)));
    }
  };

  const collapseAllPhases = () => {
    setExpandedPhases(new Set());
  };

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching project data for token:', token);
      const response = await api.get(`/share/${token}`);
      console.log('📊 API Response:', response);
      
      if (response.project) {
        console.log('✅ Project data received:', response.project);
        console.log('🔍 Project details:', {
          id: response.project.id,
          name: response.project.name,
          status: response.project.status,
          priority: response.project.priority,
          progress: response.project.progress,
          manager: response.project.manager,
          client: response.project.client,
          members: response.project.members?.length || 0,
          externalMembers: response.project.externalMembers?.length || 0,
          tasks: response.project.tasks?.length || 0,
          milestones: response.project.milestones?.length || 0,
          timelines: response.project.timelines?.length || 0
        });
        
        console.log('🔍 Timeline data:', response.project.timeline);
        console.log('🔍 Tasks data:', response.project.tasks);
        console.log('🔍 Milestones data:', response.project.milestones);
        
        setProject(response.project);
        setShareInfo(response.shareInfo);
        setAllowedViews(response.allowedViews || []);
        
        console.log('🔍 Allowed views:', response.allowedViews);
        console.log('🔍 Share info:', response.shareInfo);
      }
    } catch (error: any) {
      console.error('Erro ao carregar projeto:', error);
      if (error.response?.status === 404) {
        setError('Link de compartilhamento inválido ou expirado');
      } else if (error.response?.status === 410) {
        setError('Link de compartilhamento expirado');
      } else {
        setError('Erro ao carregar projeto compartilhado');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: { [key: string]: string } = {
      active: '#4caf50',
      completed: '#2196f3',
      paused: '#ff9800',
      cancelled: '#f44336',
      todo: '#9e9e9e',
      in_progress: '#2196f3',
      review: '#ff9800',
      done: '#4caf50'
    };
    return statusColors[status] || '#9e9e9e';
  };

  const getPriorityColor = (priority: string) => {
    const priorityColors: { [key: string]: string } = {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336',
      urgent: '#9c27b0'
    };
    return priorityColors[priority] || '#9e9e9e';
  };

  // CORRIGIDA: Evita problemas de timezone ao exibir datas
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === '') return '-'
    try {
      // Se já está no formato YYYY-MM-DD, formata diretamente
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-')
        return `${day}/${month}/${year}`
      }
      
      // Se tem hora (formato ISO), extrai apenas a parte da data
      if (typeof dateString === 'string' && dateString.includes('T')) {
        const datePart = dateString.split('T')[0]
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          const [year, month, day] = datePart.split('-')
          return `${day}/${month}/${year}`
        }
      }
      
      // Para outros formatos, usa Date mas com métodos locais para evitar timezone
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return '-'
      
      // Usa métodos locais para evitar conversão de timezone
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      return `${day}/${month}/${year}`
    } catch (error) {
      console.error('❌ Erro ao formatar data:', dateString, error)
      return '-'
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: { [key: string]: string } = {
      active: 'Ativo',
      completed: 'Concluído',
      paused: 'Pausado',
      cancelled: 'Cancelado',
      todo: 'A fazer',
      in_progress: 'Em andamento',
      review: 'Em revisão',
      done: 'Concluído'
    };
    return statusLabels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const priorityLabels: { [key: string]: string } = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return priorityLabels[priority] || priority;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Projeto não encontrado'}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          Voltar ao início
        </Button>
      </Container>
    );
  }

  const timelineIndicatorsAllowed =
    allowedViews.includes('timeline') ||
    allowedViews.includes('indicators');

  const availableTabs = [
    { key: 'overview', label: 'Visão Geral', allowed: allowedViews.includes('overview') },
    { key: 'timeline', label: 'Cronograma Detalhado', allowed: allowedViews.includes('timeline') },
    { key: 'indicators', label: 'Indicadores', allowed: allowedViews.includes('indicators') || timelineIndicatorsAllowed },
    { key: 'gantt', label: 'Gráfico de Gantt', allowed: allowedViews.includes('gantt') },
    { key: 'team', label: 'Equipe', allowed: allowedViews.includes('team') },
    { key: 'resources', label: 'Stakeholders', allowed: allowedViews.includes('resources') }
  ].filter(tab => tab.allowed);

  const calculatePhaseProgress = (phase: any) => {
    if (!phase?.tasks?.length) return 0;
    const total = phase.tasks.reduce((sum: number, t: any) => sum + (t.progress ?? 0), 0);
    return Math.round(total / phase.tasks.length);
  };

  const renderOverview = () => {
    const phases = project.timeline?.phases ?? [];
    const totalTasks = phases.reduce((acc: number, p: any) => acc + (p.tasks?.length ?? 0), 0);

    return (
      <Box>
        {/* Cabeçalho da Visão Geral */}
        <Paper
          sx={{
            p: 3,
            mb: 3,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider'
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h5" fontWeight="bold" color="text.primary" gutterBottom>
                {project.name || 'Sem nome'}
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                <Chip
                  size="small"
                  label={getStatusLabel(project.status)}
                  sx={{ backgroundColor: getStatusColor(project.status), color: 'white', fontWeight: 600 }}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={getPriorityLabel(project.priority)}
                  sx={{
                    borderColor: (project.priority === 'urgent' || project.priority === 'high') ? 'error.main' : undefined,
                    color: (project.priority === 'urgent' || project.priority === 'high') ? 'error.main' : undefined
                  }}
                />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                  variant="determinate"
                  value={project.progress ?? 0}
                  size={72}
                  thickness={4}
                  sx={{ color: 'primary.main' }}
                />
                <Box
                  sx={{
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    position: 'absolute',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Typography variant="body2" fontWeight="bold" color="text.secondary">
                    {project.progress ?? 0}%
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Progresso geral</Typography>
                <Typography variant="body2" fontWeight="bold">
                  {phases.length} fases · {totalTasks} tarefas
                </Typography>
              </Box>
            </Box>
          </Box>
          {project.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {project.description}
            </Typography>
          )}
        </Paper>

        <Grid container spacing={3}>
          {/* Coluna principal */}
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AssignmentIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">Informações do Projeto</Typography>
                </Box>
                <Typography variant="body1" color="text.secondary">
                  {project.description || 'Sem descrição.'}
                </Typography>
              </CardContent>
            </Card>

            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <FlagIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">Status e Datas</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Status</Typography>
                    <Chip
                      label={getStatusLabel(project.status)}
                      sx={{ backgroundColor: getStatusColor(project.status), color: 'white', mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Prioridade</Typography>
                    <Chip
                      label={getPriorityLabel(project.priority)}
                      sx={{ backgroundColor: getPriorityColor(project.priority), color: 'white', mt: 0.5 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Data de Início</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
                      <CalendarIcon sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                      {formatDate(project.startDate)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" display="block">Data de Término</Typography>
                    <Typography variant="body1" fontWeight="medium" sx={{ mt: 0.5 }}>
                      <CalendarIcon sx={{ mr: 0.5, fontSize: 18, verticalAlign: 'middle' }} />
                      {formatDate(project.endDate)}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {project.budget != null && project.budget > 0 && (
              <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <NotesIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Orçamento</Typography>
                  </Box>
                  <Typography variant="h6" color="primary.main" fontWeight="bold">
                    R$ {Number(project.budget).toLocaleString('pt-BR')}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <TimelineIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">Resumo Rápido</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Fases</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">{phases.length}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Tarefas</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">{totalTasks}</Typography>
                </Box>
                <Divider />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">Progresso</Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">{project.progress ?? 0}%</Typography>
                </Box>
              </CardContent>
            </Card>

            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <DateRangeIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">Resumo do Cronograma</Typography>
                </Box>
                {phases.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {phases.map((phase: any) => (
                      <Box key={phase.id}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight="600" noWrap sx={{ maxWidth: '70%' }}>
                            {phase.name?.split(':')[0] ?? phase.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontWeight="600">
                            {calculatePhaseProgress(phase)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={calculatePhaseProgress(phase)}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Nenhuma fase cadastrada.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderTimeline = () => {
    console.log('🔍 Rendering timeline, project.timeline:', project.timeline);
    
    if (!project.timeline || !project.timeline.phases || project.timeline.phases?.length === 0) {
      return (
        <Alert severity="info">
          Nenhum cronograma configurado para este projeto. 
          {project.timeline ? `Timeline existe: ${!!project.timeline}, Fases: ${project.timeline.phases?.length || 0}` : 'Timeline é null/undefined'}
        </Alert>
      );
    }

    const phases = project.timeline.phases;

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Cronograma Detalhado do Projeto
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              startIcon={<UnfoldMoreIcon />}
              onClick={expandAllPhases}
              variant="outlined"
            >
              Expandir Todas
            </Button>
            <Button
              size="small"
              startIcon={<UnfoldLessIcon />}
              onClick={collapseAllPhases}
              variant="outlined"
            >
              Recolher Todas
            </Button>
          </Box>
        </Box>
        
        {/* Resumo do Cronograma - Cards Informativos */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'all 0.3s ease-in-out',
                boxShadow: 6
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarIcon sx={{ fontSize: 32, mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Datas do Projeto
                  </Typography>
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Início
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {formatDate(project.startDate)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Fim Previsto
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {formatDate(project.endDate)}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'all 0.3s ease-in-out',
                boxShadow: 6
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssignmentIcon sx={{ fontSize: 32, mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Fases
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {phases.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Fases configuradas
                </Typography>
                <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${phases.filter((p: any) => p.status === 'em_andamento' || p.status === 'in-progress').length} Ativas`}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                  />
                  <Chip 
                    label={`${phases.filter((p: any) => p.status === 'concluido' || p.status === 'completed').length} Concluídas`}
                    size="small"
                    sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'all 0.3s ease-in-out',
                boxShadow: 6
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircleIcon sx={{ fontSize: 32, mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Tarefas
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {phases.reduce((total: number, p: any) => total + (p.tasks?.length || 0), 0)}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  Total de tarefas nas fases
                </Typography>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.9 }}>
                    Tarefas concluídas
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={
                      phases.reduce((total: number, p: any) => {
                        const completed = p.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'concluido').length || 0;
                        return total + completed;
                      }, 0) / Math.max(1, phases.reduce((total: number, p: any) => total + (p.tasks?.length || 0), 0)) * 100
                    }
                    sx={{ 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: 'rgba(255,255,255,0.3)',
                      mt: 0.5
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
              '&:hover': {
                transform: 'translateY(-4px)',
                transition: 'all 0.3s ease-in-out',
                boxShadow: 6
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ScheduleIcon sx={{ fontSize: 32, mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Progresso
                  </Typography>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {project.progress}%
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9, mb: 2 }}>
                  Progresso geral do projeto
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={project.progress}
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: 'rgba(255,255,255,0.3)'
                  }}
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Cronograma Detalhado por Fases */}
        <Typography variant="h6" gutterBottom sx={{ mt: 4, mb: 2 }}>
          Detalhamento por Fases
        </Typography>
        
        {/* Filtros e Estatísticas */}
        <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="primary">
                Fases Ativas: {phases.filter((p: any) => p.status === 'em_andamento').length}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="success.main">
                Fases Concluídas: {phases.filter((p: any) => p.status === 'concluido').length}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="warning.main">
                Fases Pendentes: {phases.filter((p: any) => p.status === 'nao_iniciado').length}
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="subtitle2" color="info.main">
                Total de Tarefas: {phases.reduce((total: number, p: any) => total + (p.tasks?.length || 0), 0)}
              </Typography>
            </Grid>
          </Grid>
        </Box>
        
        {phases.map((phase: any, phaseIndex: number) => {
          const isExpanded = expandedPhases.has(phase.id);
          const hasTasks = phase.tasks && phase.tasks.length > 0;
          
          return (
            <Card key={phase.id || phaseIndex} sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" color="primary">
                      {phase.name || `Fase ${phaseIndex + 1}`}
                    </Typography>
                    {hasTasks && (
                      <IconButton
                        size="small"
                        onClick={() => togglePhase(phase.id)}
                        sx={{ ml: 1 }}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </Box>
                  <Chip
                    label={phase.status || 'Não iniciado'}
                    color={
                      phase.status === 'concluido' ? 'success' :
                      phase.status === 'em_andamento' ? 'primary' :
                      phase.status === 'nao_iniciado' ? 'warning' : 'default'
                    }
                    size="small"
                  />
                </Box>
              
              {/* Datas da Fase */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">
                    <CalendarIcon sx={{ mr: 1, fontSize: 14 }} />
                    Início: {phase.startDate ? formatDate(phase.startDate) : 'Não definido'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="textSecondary">
                    <CalendarIcon sx={{ mr: 1, fontSize: 14 }} />
                    Fim: {phase.endDate ? formatDate(phase.endDate) : 'Não definido'}
                  </Typography>
                </Grid>
              </Grid>
              
              {/* Progresso da Fase */}
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="textSecondary">
                    Progresso da Fase
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {phase.progress || 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={phase.progress || 0}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              
              {/* Tarefas da Fase */}
              {phase.tasks && phase.tasks.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="primary">
                      Tarefas da Fase ({phase.tasks.length})
                    </Typography>
                    <Chip 
                      label={isExpanded ? 'Recolher' : 'Expandir'} 
                      size="small" 
                      onClick={() => togglePhase(phase.id)}
                      icon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                  {isExpanded && (
                    <Box sx={{ mt: 2 }}>
                      {phase.tasks.map((task: any, taskIndex: number) => (
                        <Card 
                          key={task.id || taskIndex} 
                          sx={{ 
                            mb: 2, 
                            borderLeft: `4px solid ${getStatusColor(task.status)}`,
                            '&:hover': {
                              boxShadow: 3,
                              transform: 'translateY(-2px)',
                              transition: 'all 0.2s ease-in-out'
                            }
                          }}
                        >
                          <CardContent>
                            <Grid container spacing={2}>
                              {/* Coluna Principal - Nome e Descrição */}
                              <Grid item xs={12} md={6}>
                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                  <Avatar sx={{ 
                                    backgroundColor: getStatusColor(task.status),
                                    width: 40,
                                    height: 40
                                  }}>
                                    <AssignmentIcon />
                                  </Avatar>
                                  <Box sx={{ flex: 1 }}>
                                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                      {task.name || `Tarefa ${taskIndex + 1}`}
                                    </Typography>
                                    {task.description && (
                                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                        {task.description}
                                      </Typography>
                                    )}
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                      <Chip
                                        label={getStatusLabel(task.status)}
                                        size="small"
                                        sx={{ 
                                          backgroundColor: getStatusColor(task.status),
                                          color: 'white'
                                        }}
                                      />
                                      <Chip
                                        label={getPriorityLabel(task.priority)}
                                        size="small"
                                        sx={{ 
                                          backgroundColor: getPriorityColor(task.priority),
                                          color: 'white'
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                </Box>
                              </Grid>

                              {/* Coluna de Informações - Datas e Responsável */}
                              <Grid item xs={12} md={6}>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                  {/* Datas */}
                                  <Box>
                                    <Grid container spacing={1}>
                                      {task.startDate && (
                                        <Grid item xs={6}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <CalendarIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                                            <Box>
                                              <Typography variant="caption" color="textSecondary">
                                                Início
                                              </Typography>
                                              <Typography variant="body2" fontWeight="medium">
                                                {formatDate(task.startDate)}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      )}
                                      {task.plannedEndDate && (
                                        <Grid item xs={6}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <CalendarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                                            <Box>
                                              <Typography variant="caption" color="textSecondary">
                                                Prazo
                                              </Typography>
                                              <Typography variant="body2" fontWeight="medium">
                                                {formatDate(task.plannedEndDate)}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      )}
                                      {task.actualEndDate && (
                                        <Grid item xs={6}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                            <Box>
                                              <Typography variant="caption" color="textSecondary">
                                                Concluída
                                              </Typography>
                                              <Typography variant="body2" fontWeight="medium" color="success.main">
                                                {formatDate(task.actualEndDate)}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      )}
                                      {task.estimatedHours && (
                                        <Grid item xs={6}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <ScheduleIcon sx={{ fontSize: 16, color: 'info.main' }} />
                                            <Box>
                                              <Typography variant="caption" color="textSecondary">
                                                Estimativa
                                              </Typography>
                                              <Typography variant="body2" fontWeight="medium">
                                                {task.estimatedHours}h
                                                {task.actualHours && ` / ${task.actualHours}h`}
                                              </Typography>
                                            </Box>
                                          </Box>
                                        </Grid>
                                      )}
                                    </Grid>
                                  </Box>

                                  {/* Responsável */}
                                  {task.responsible && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <PersonIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                                      <Box>
                                        <Typography variant="caption" color="textSecondary">
                                          Responsável
                                        </Typography>
                                        <Typography variant="body2" fontWeight="medium">
                                          {task.responsible}
                                        </Typography>
                                      </Box>
                                    </Box>
                                  )}

                                  {/* Progresso */}
                                  {task.progress !== undefined && (
                                    <Box>
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="caption" color="textSecondary">
                                          Progresso
                                        </Typography>
                                        <Typography variant="body2" fontWeight="bold" color="primary">
                                          {task.progress}%
                                        </Typography>
                                      </Box>
                                      <LinearProgress
                                        variant="determinate"
                                        value={task.progress}
                                        sx={{ 
                                          height: 8, 
                                          borderRadius: 4,
                                          backgroundColor: 'grey.200',
                                          '& .MuiLinearProgress-bar': {
                                            backgroundColor: getStatusColor(task.status)
                                          }
                                        }}
                                      />
                                    </Box>
                                  )}
                                </Box>
                              </Grid>

                              {/* Observações */}
                              {task.observations && (
                                <Grid item xs={12}>
                                  <Box sx={{ 
                                    p: 1.5, 
                                    backgroundColor: 'grey.50', 
                                    borderRadius: 1,
                                    borderLeft: '3px solid',
                                    borderColor: 'primary.main'
                                  }}>
                                    <Typography variant="caption" color="textSecondary" sx={{ fontWeight: 'bold' }}>
                                      Observações:
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                      {task.observations}
                                    </Typography>
                                  </Box>
                                </Grid>
                              )}

                              {/* Subtarefas */}
                              {task.subtasks && task.subtasks.length > 0 && (
                                <Grid item xs={12}>
                                  <Box sx={{ 
                                    mt: 2, 
                                    pl: 2, 
                                    borderLeft: '3px solid',
                                    borderColor: 'primary.light',
                                    backgroundColor: 'grey.50',
                                    borderRadius: 1
                                  }}>
                                    <Typography variant="subtitle2" gutterBottom color="primary" sx={{ fontWeight: 'bold', mb: 1.5 }}>
                                      Subtarefas ({task.subtasks.length})
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                      {task.subtasks.map((subtask: any, subtaskIndex: number) => (
                                        <Card 
                                          key={subtask.id || subtaskIndex}
                                          variant="outlined" 
                                          sx={{ 
                                            p: 1.5,
                                            backgroundColor: 'white',
                                            borderLeft: `4px solid ${getStatusColor(subtask.status)}`,
                                            '&:hover': {
                                              boxShadow: 2,
                                              backgroundColor: 'grey.50'
                                            }
                                          }}
                                        >
                                          <Grid container spacing={2} alignItems="center">
                                            {/* Nome e Descrição */}
                                            <Grid item xs={12} md={4}>
                                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                                <CheckCircleIcon 
                                                  sx={{ 
                                                    fontSize: 18, 
                                                    color: subtask.status === 'completed' || subtask.status === 'concluido' ? 'success.main' : 'text.secondary',
                                                    mt: 0.5
                                                  }} 
                                                />
                                                <Box sx={{ flex: 1 }}>
                                                  <Typography variant="body2" fontWeight="bold">
                                                    {subtask.title || subtask.name}
                                                  </Typography>
                                                  {subtask.description && (
                                                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                                                      {subtask.description}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              </Box>
                                            </Grid>

                                            {/* Status e Prioridade */}
                                            <Grid item xs={12} md={2}>
                                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                <Chip
                                                  label={getStatusLabel(subtask.status)}
                                                  size="small"
                                                  sx={{ 
                                                    fontSize: '0.7rem',
                                                    backgroundColor: getStatusColor(subtask.status),
                                                    color: 'white'
                                                  }}
                                                />
                                                {subtask.priority && (
                                                  <Chip
                                                    label={getPriorityLabel(subtask.priority)}
                                                    size="small"
                                                    sx={{ 
                                                      fontSize: '0.7rem',
                                                      backgroundColor: getPriorityColor(subtask.priority),
                                                      color: 'white'
                                                    }}
                                                  />
                                                )}
                                              </Box>
                                            </Grid>

                                            {/* Datas */}
                                            <Grid item xs={12} md={3}>
                                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                {subtask.startDate && (
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <CalendarIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                                                    <Typography variant="caption" color="textSecondary">
                                                      Início: {formatDate(subtask.startDate)}
                                                    </Typography>
                                                  </Box>
                                                )}
                                                {subtask.dueDate && (
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <CalendarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                                                    <Typography variant="caption" color="textSecondary">
                                                      Prazo: {formatDate(subtask.dueDate)}
                                                    </Typography>
                                                  </Box>
                                                )}
                                                {subtask.actualEndDate && (
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <CheckCircleIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                                    <Typography variant="caption" color="success.main">
                                                      Concluída: {formatDate(subtask.actualEndDate)}
                                                    </Typography>
                                                  </Box>
                                                )}
                                              </Box>
                                            </Grid>

                                            {/* Responsável e Progresso */}
                                            <Grid item xs={12} md={3}>
                                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                {subtask.assignee && (
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                                    <Typography variant="caption" color="textSecondary">
                                                      {subtask.assignee}
                                                    </Typography>
                                                  </Box>
                                                )}
                                                {subtask.progress !== undefined && (
                                                  <Box>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                                      <Typography variant="caption" color="textSecondary">
                                                        Progresso
                                                      </Typography>
                                                      <Typography variant="caption" fontWeight="bold" color="primary">
                                                        {subtask.progress}%
                                                      </Typography>
                                                    </Box>
                                                    <LinearProgress
                                                      variant="determinate"
                                                      value={subtask.progress}
                                                      sx={{ 
                                                        height: 6, 
                                                        borderRadius: 3,
                                                        backgroundColor: 'grey.200',
                                                        '& .MuiLinearProgress-bar': {
                                                          backgroundColor: getStatusColor(subtask.status)
                                                        }
                                                      }}
                                                    />
                                                  </Box>
                                                )}
                                                {subtask.estimatedHours && (
                                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <ScheduleIcon sx={{ fontSize: 14, color: 'info.main' }} />
                                                    <Typography variant="caption" color="textSecondary">
                                                      {subtask.estimatedHours}h
                                                      {subtask.actualHours && ` / ${subtask.actualHours}h`}
                                                    </Typography>
                                                  </Box>
                                                )}
                                              </Box>
                                            </Grid>
                                          </Grid>
                                        </Card>
                                      ))}
                                    </Box>
                                  </Box>
                                </Grid>
                              )}
                            </Grid>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
          );
        })}
        
        {/* Marcos Importantes do Projeto */}
        {project.milestones && project.milestones?.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Marcos Importantes (Milestones)
            </Typography>
            <Grid container spacing={2}>
              {project.milestones.map((milestone: any, index: number) => (
                <Grid item xs={12} md={6} key={milestone.id || index}>
                  <Card sx={{ 
                    border: milestone.completed ? '2px solid' : '1px solid',
                    borderColor: milestone.completed ? 'success.main' : 'divider',
                    backgroundColor: milestone.completed ? 'success.50' : 'background.paper'
                  }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Avatar sx={{ 
                          backgroundColor: milestone.completed ? 'success.main' : 'warning.main',
                          width: 32,
                          height: 32,
                          mr: 1
                        }}>
                          {milestone.completed ? <CheckCircleIcon /> : <ScheduleIcon />}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" color={milestone.completed ? 'success.main' : 'text.primary'}>
                            {milestone.title}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {milestone.description}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="textSecondary">
                          <CalendarIcon sx={{ mr: 1, fontSize: 14 }} />
                          Prazo: {formatDate(milestone.dueDate)}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          Status: {milestone.completed ? 'Concluído' : 'Pendente'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Box>
    );
  };

  const renderIndicators = () => {
    if (!project.timeline || !project.timeline.phases || project.timeline.phases.length === 0) {
      return (
        <Alert severity="info">
          Nenhum cronograma configurado para este projeto. Configure o cronograma para visualizar indicadores.
        </Alert>
      );
    }

    const phases = project.timeline.phases;
    const tasks = phases.flatMap((phase: any) =>
      (phase.tasks || []).map((task: any) => ({
        ...task,
        phaseName: phase.name || 'Fase sem nome',
        type: 'task' as const
      }))
    );
    const calculateSubtaskProgress = (subtask: any) => {
      switch (subtask.status) {
        case 'pending':
        case 'todo':
        case 'nao_iniciado':
        case 'não iniciado':
        case 'not_started':
        case 'aguardando':
          return 0;
        case 'in_progress':
        case 'em_andamento':
        case 'em andamento':
        case 'in-progress':
        case 'ongoing':
        case 'andamento':
          return 50;
        case 'completed':
        case 'concluido':
        case 'concluida':
        case 'concluída':
        case 'finalizado':
        case 'finalizada':
        case 'done':
          return 100;
        case 'blocked':
          return 25;
        default:
          return 0;
      }
    };
    const subtasks = phases.flatMap((phase: any) =>
      (phase.tasks || []).flatMap((task: any) =>
        (task.subtasks || []).map((subtask: any) => ({
          ...subtask,
          id: subtask.id || `${task.id || task.name}-subtask-${subtask.title || subtask.name}`,
          name: subtask.title || subtask.name || 'Subtarefa sem nome',
          phaseName: phase.name || 'Fase sem nome',
          taskName: task.name || task.title || 'Tarefa sem nome',
          taskId: task.id,
          plannedEndDate: subtask.plannedEndDate || subtask.dueDate,
          actualEndDate: subtask.actualEndDate,
          responsible: subtask.responsible || subtask.assignee,
          progress:
            typeof subtask.progress === 'number'
              ? subtask.progress
              : Number(subtask.progress) || calculateSubtaskProgress(subtask),
          type: 'subtask' as const
        }))
      )
    );
    const allItems = [...tasks, ...subtasks];

    if (allItems.length === 0) {
      return (
        <Alert severity="info">
          Nenhuma tarefa cadastrada no cronograma. Adicione tarefas para acompanhar os indicadores.
        </Alert>
      );
    }

    const now = new Date();
    const completedStatuses = ['completed', 'concluido', 'concluida', 'concluída', 'finalizado', 'finalizada', 'done'];
    const inProgressStatuses = ['in_progress', 'em_andamento', 'em andamento', 'in-progress', 'ongoing', 'andamento'];
    const pendingStatuses = ['pending', 'todo', 'nao_iniciado', 'não iniciado', 'not_started', 'aguardando'];

    const parseDate = (value?: string | null) => {
      if (!value || value === 'null' || value === 'undefined') return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const categorized = allItems.reduce(
      (acc, item) => {
        const status = (item.status || '').toString().toLowerCase();
        const planned = parseDate(item.plannedEndDate || item.dueDate);
        const actual = parseDate(item.actualEndDate);
        const progress =
          typeof item.progress === 'number'
            ? item.progress
            : Number(item.progress) || (item.type === 'subtask' ? calculateSubtaskProgress(item) : 0);
        const isCompleted = completedStatuses.includes(status) || progress === 100;
        const isInProgressStatus = inProgressStatuses.includes(status);
        const isPendingStatus = pendingStatuses.includes(status);
        const isDelayed =
          !!planned &&
          ((isCompleted && actual && actual > planned) ||
            (!isCompleted && now > planned));

        let category: 'delayed' | 'inProgress' | 'onTime';

        if (isDelayed) {
          category = 'delayed';
        } else if (isCompleted) {
          category = 'onTime';
        } else if (isInProgressStatus || isPendingStatus || progress > 0) {
          category = 'inProgress';
        } else {
          category = 'inProgress';
        }

        acc[category].push({
          ...item,
          plannedDate: planned,
          actualDate: actual,
          progress
        });
        return acc;
      },
      {
        delayed: [] as any[],
        inProgress: [] as any[],
        onTime: [] as any[]
      }
    );

    const totalTasks = tasks.length;
    const totalSubtasks = subtasks.length;
    const totalItems = allItems.length;
    const totalDelayed = categorized.delayed.length;
    const totalInProgress = categorized.inProgress.length;
    const totalOnTime = categorized.onTime.length;

    const categoryConfig: Record<
      'delayed' | 'inProgress' | 'onTime',
      {
        title: string;
        subtitle: string;
        palette: 'error' | 'warning' | 'success';
        icon: typeof WarningIcon;
      }
    > = {
      delayed: {
        title: 'Tarefas Atrasadas',
        subtitle: 'Exigem atenção imediata',
        palette: 'error',
        icon: WarningIcon
      },
      inProgress: {
        title: 'Em Andamento',
        subtitle: 'Dentro do prazo ou aguardando',
        palette: 'warning',
        icon: ScheduleIcon
      },
      onTime: {
        title: 'Entregues no Prazo',
        subtitle: 'Concluídas com sucesso',
        palette: 'success',
        icon: CheckCircleIcon
      }
    };

    const getResponsibleName = (task: any) => {
      if (!task) return 'Não informado';
      if (typeof task.responsible === 'string' && task.responsible.trim().length > 0) {
        return task.responsible;
      }
      if (task.assignee) {
        if (typeof task.assignee === 'string') return task.assignee;
        return task.assignee.nome || task.assignee.name || 'Não informado';
      }
      if (task.responsible?.nome || task.responsible?.name) {
        return task.responsible.nome || task.responsible.name;
      }
      return 'Não informado';
    };

    const summaryCards = [
      {
        key: 'delayed' as const,
        value: totalDelayed,
        percentage: totalItems ? Math.round((totalDelayed / totalItems) * 100) : 0
      },
      {
        key: 'inProgress' as const,
        value: totalInProgress,
        percentage: totalItems ? Math.round((totalInProgress / totalItems) * 100) : 0
      },
      {
        key: 'onTime' as const,
        value: totalOnTime,
        percentage: totalItems ? Math.round((totalOnTime / totalItems) * 100) : 0
      }
    ];

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Indicadores do Cronograma
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Acompanhe o desempenho das tarefas e subtarefas do projeto em tempo real. Os indicadores abaixo consideram status, prazo previsto e data de conclusão de cada item.
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {summaryCards.map(card => {
            const config = categoryConfig[card.key];
            const IconComponent = config.icon;
            return (
              <Grid item xs={12} md={4} key={card.key}>
                <Card
                  sx={{
                    borderTop: 4,
                    borderColor: `${config.palette}.main`,
                    boxShadow: '0px 4px 12px rgba(0,0,0,0.05)'
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: `${config.palette}.main`, width: 36, height: 36 }}>
                        <IconComponent fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {config.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {config.subtitle}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" color={`${config.palette}.main`}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {card.percentage}% dos itens ({totalTasks} tarefa{totalTasks === 1 ? '' : 's'} + {totalSubtasks} subtarefa{totalSubtasks === 1 ? '' : 's'})
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {(['delayed', 'inProgress', 'onTime'] as const).map(categoryKey => {
          const categoryTasks = categorized[categoryKey];
          const config = categoryConfig[categoryKey];
          const IconComponent = config.icon;

          return (
            <Card key={categoryKey} sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: `${config.palette}.main`, width: 40, height: 40 }}>
                      <IconComponent />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" color={`${config.palette}.main`}>
                        {config.title}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {config.subtitle}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={`${categoryTasks.length} item${categoryTasks.length === 1 ? '' : 's'}`}
                    color={config.palette}
                    variant="outlined"
                  />
                </Box>

                {categoryTasks.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Nenhum item nesta categoria.
                  </Typography>
                ) : (
                  <List>
                    {categoryTasks.map((task, index) => (
                      <React.Fragment key={task.id || `${task.name}-${task.phaseName}`}>
                        <ListItem
                          alignItems="flex-start"
                          sx={{
                            borderRadius: 1,
                            mb: 1,
                            '&:hover': {
                              backgroundColor: 'grey.50'
                            }
                          }}
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: `${config.palette}.light`, color: `${config.palette}.dark` }}>
                              <IconComponent fontSize="small" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                  {task.name || (task.type === 'subtask' ? 'Subtarefa sem nome' : 'Tarefa sem nome')}
                                </Typography>
                                {task.type === 'subtask' && (
                                  <Chip label="Subtarefa" size="small" variant="outlined" />
                                )}
                                {task.priority && (
                                  <Chip
                                    label={getPriorityLabel(task.priority)}
                                    size="small"
                                    sx={{ backgroundColor: getPriorityColor(task.priority), color: 'white' }}
                                  />
                                )}
                                {task.status && (
                                  <Chip
                                    label={getStatusLabel(task.status)}
                                    size="small"
                                    variant="outlined"
                                    sx={{ borderColor: `${config.palette}.main`, color: `${config.palette}.main` }}
                                  />
                                )}
                              </Box>
                            }
                            secondary={
                              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                <Typography variant="body2" color="textSecondary">
                                  Fase: <strong>{task.phaseName}</strong>
                                </Typography>
                                {task.type === 'subtask' && task.taskName && (
                                  <Typography variant="body2" color="textSecondary">
                                    Tarefa: <strong>{task.taskName}</strong>
                                  </Typography>
                                )}
                                {task.plannedDate && (
                                  <Typography variant="body2" color="textSecondary">
                                    Prazo: <strong>{formatDate(task.plannedDate.toISOString())}</strong>
                                  </Typography>
                                )}
                                {task.actualDate && (
                                  <Typography variant="body2" color="textSecondary">
                                    Conclusão: <strong>{formatDate(task.actualDate.toISOString())}</strong>
                                  </Typography>
                                )}
                                <Typography variant="body2" color="textSecondary">
                                  Responsável: <strong>{getResponsibleName(task)}</strong>
                                </Typography>
                                {typeof task.progress === 'number' && (
                                  <Typography variant="body2" color="textSecondary">
                                    Progresso: <strong>{task.progress}%</strong>
                                  </Typography>
                                )}
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < categoryTasks.length - 1 && <Divider component="li" />}
                      </React.Fragment>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>
    );
  };

  const renderGantt = () => {
    console.log('🔍 Rendering Gantt, project.timeline:', project.timeline);
    
    if (!project.timeline || !project.timeline.phases || project.timeline.phases?.length === 0) {
      return (
        <Alert severity="info">
          Nenhum cronograma configurado para este projeto.
          {project.timeline ? `Timeline existe: ${!!project.timeline}, Fases: ${project.timeline.phases?.length || 0}` : 'Timeline é null/undefined'}
        </Alert>
      );
    }

    const phases = project.timeline.phases;

    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Gráfico de Gantt - Cronograma Visual
        </Typography>
        
        {/* Informações do Gantt */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Informações do Gantt
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Visualização gráfica completa do cronograma do projeto, incluindo:
                </Typography>
                <List dense>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'primary.main', width: 24, height: 24 }}>
                        <CalendarIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Fases do projeto"
                      secondary="Com datas de início e fim"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'secondary.main', width: 24, height: 24 }}>
                        <AssignmentIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Tarefas e subtarefas"
                      secondary="Com dependências e responsáveis"
                    />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'success.main', width: 24, height: 24 }}>
                        <CheckCircleIcon sx={{ fontSize: 14 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary="Marcos importantes"
                      secondary="Pontos de controle do projeto"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Estatísticas do Cronograma
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Total de Fases: <strong>{phases.length}</strong>
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Total de Tarefas: <strong>{project.tasks?.length || 0}</strong>
                  </Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Marcos: <strong>{project.milestones?.length || 0}</strong>
                  </Typography>
                </Box>

              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Gráfico de Gantt */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Visualização do Cronograma
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Gráfico de Gantt interativo mostrando a sequência temporal de todas as atividades do projeto.
        </Typography>
        <ProjectGantt
          phases={phases}
          projectStartDate={project.startDate}
          projectEndDate={project.endDate}
        />
          </CardContent>
        </Card>

        {/* Legenda do Gantt */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="primary">
              Legenda do Gráfico
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: 'primary.main', mr: 1, borderRadius: 1 }} />
                  <Typography variant="body2">Fases do Projeto</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: 'secondary.main', mr: 1, borderRadius: 1 }} />
                  <Typography variant="body2">Tarefas Principais</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: 'success.main', mr: 1, borderRadius: 1 }} />
                  <Typography variant="body2">Marcos (Milestones)</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 20, height: 20, backgroundColor: 'warning.main', mr: 1, borderRadius: 1 }} />
                  <Typography variant="body2">Tarefas em Andamento</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    );
  };

  const renderTeam = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Membros da Equipe ({project.members?.length || 0})
              </Typography>
              <List>
                {(project.members || []).map((member, index) => (
                  <React.Fragment key={member.id}>
                    <ListItem>
                      <ListItemAvatar>
                        <Avatar>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.user.name}
                        secondary={member.role}
                      />
                    </ListItem>
                    {index < (project.members?.length || 0) - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Membros Externos ({project.externalMembers?.length || 0})
              </Typography>
              {(project.externalMembers?.length || 0) > 0 ? (
                <List>
                  {(project.externalMembers || []).map((member, index) => (
                    <React.Fragment key={member.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={member.name}
                          secondary={`${member.role}${member.company ? ` • ${member.company}` : ''}`}
                        />
                      </ListItem>
                      {index < (project.externalMembers?.length || 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Nenhum membro externo configurado.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderResources = () => (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Tarefas ({project.tasks?.length || 0})
              </Typography>
              {(project.tasks?.length || 0) > 0 ? (
                <List>
                  {(project.tasks || []).map((task, index) => (
                    <React.Fragment key={task.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ backgroundColor: getStatusColor(task.status) }}>
                            <AssignmentIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={task.title}
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                {getStatusLabel(task.status)} • {getPriorityLabel(task.priority)}
                              </Typography>
                              {task.dueDate && (
                                <Typography variant="body2" component="div" color="textSecondary">
                                  Prazo: {formatDate(task.dueDate)}
                                </Typography>
                              )}
                              {task.assignee && (
                                <Typography variant="body2" component="div" color="textSecondary">
                                  Responsável: {task.assignee.nome}
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < (project.tasks?.length || 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Nenhuma tarefa configurada.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Marcos ({project.milestones?.length || 0})
              </Typography>
              {(project.milestones?.length || 0) > 0 ? (
                <List>
                  {(project.milestones || []).map((milestone, index) => (
                    <React.Fragment key={milestone.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ backgroundColor: milestone.completed ? '#4caf50' : '#ff9800' }}>
                            {milestone.completed ? <CheckCircleIcon /> : <ScheduleIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={milestone.title}
                          secondary={
                            <Box>
                              <Typography variant="body2" component="span">
                                {milestone.completed ? 'Concluído' : 'Pendente'}
                              </Typography>
                              <Typography variant="body2" component="div" color="textSecondary">
                                Prazo: {formatDate(milestone.dueDate)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < (project.milestones?.length || 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Nenhum marco configurado.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderTabContent = () => {
    const currentTab = availableTabs[activeTab];
    console.log('🔍 Rendering tab:', currentTab?.key, 'Active tab index:', activeTab);
    console.log('🔍 Available tabs:', availableTabs);
    console.log('🔍 Current project data:', project);
    
    if (!currentTab) return null;

    switch (currentTab.key) {
      case 'overview':
        console.log('🎯 Rendering Overview tab');
        return renderOverview();
      case 'timeline':
        console.log('🎯 Rendering Timeline tab');
        return renderTimeline();
      case 'indicators':
        console.log('🎯 Rendering Indicators tab');
        return renderIndicators();
      case 'gantt':
        console.log('🎯 Rendering Gantt tab');
        return renderGantt();
      case 'team':
        console.log('🎯 Rendering Team tab');
        return renderTeam();
      case 'resources':
        console.log('🎯 Rendering Resources tab');
        return renderResources();
      default:
        console.log('❌ Unknown tab:', currentTab.key);
        return null;
    }
  };

  return (
    <Box sx={{ backgroundColor: '#f5f5f5', minHeight: '100vh', py: 3 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h4" gutterBottom>
                {project.name}
              </Typography>
              {shareInfo && (
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  Compartilhado por: {shareInfo.name}
                  {shareInfo.description && ` - ${shareInfo.description}`}
                </Typography>
              )}
              <Typography variant="body2" color="textSecondary">
                Criado em: {formatDateTime(shareInfo?.createdAt || '')}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <ShareIcon color="primary" />
              <Typography variant="body2" color="primary">
                Visualização Pública
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Tabs */}
        {availableTabs.length > 1 && (
          <Paper sx={{ mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {availableTabs.map((tab, index) => (
                <Tab key={tab.key} label={tab.label} />
              ))}
            </Tabs>
          </Paper>
        )}

        {/* Tab Content */}
        <Paper sx={{ p: 3 }}>
          {renderTabContent()}
        </Paper>
      </Container>
    </Box>
  );
};

export default ShareProject;
