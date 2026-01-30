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
  Timeline as TimelineIcon,
  Group as GroupIcon,
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Settings as SettingsIcon,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  Visibility as VisibilityIcon,
  AccessTime as AccessTimeIcon,
  DonutLarge as DonutLargeIcon
} from '@mui/icons-material';
import { api } from '../lib/api.local';
import ProjectGantt from '../components/ProjectGantt';

// Componente de Sidebar Moderna
const ModernSidebar: React.FC<{
  activeTab: number;
  onTabChange: (index: number) => void;
  availableTabs: Array<{ key: string; label: string; icon: React.ReactNode }>;
}> = ({ activeTab, onTabChange, availableTabs }) => {
  const iconMap: { [key: string]: React.ReactNode } = {
    overview: <DashboardIcon />,
    timeline: <DateRangeIcon />,
    indicators: <TrendingUpIcon />,
    gantt: <BarChartIcon />,
    team: <GroupIcon />,
    resources: <AssignmentIcon />
  };

  return (
    <Box
      sx={{
        width: 72,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 3,
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 100,
        boxShadow: '2px 0 8px rgba(0,0,0,0.04)'
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 4,
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
        }}
      >
        <ShareIcon sx={{ color: 'white', fontSize: 24 }} />
      </Box>

      {/* Navigation Icons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
        {availableTabs.map((tab, index) => (
          <Tooltip key={tab.key} title={tab.label} placement="right" arrow>
            <IconButton
              onClick={() => onTabChange(index)}
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2,
                backgroundColor: activeTab === index ? 'rgba(102, 126, 234, 0.12)' : 'transparent',
                color: activeTab === index ? '#667eea' : '#94a3b8',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.08)',
                  color: '#667eea',
                  transform: 'scale(1.05)'
                }
              }}
            >
              {iconMap[tab.key] || <DashboardIcon />}
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      {/* Settings Icon at bottom */}
      <Box sx={{ mt: 'auto' }}>
        <IconButton
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            color: '#94a3b8',
            '&:hover': {
              backgroundColor: 'rgba(102, 126, 234, 0.08)',
              color: '#667eea'
            }
          }}
        >
          <SettingsIcon />
        </IconButton>
      </Box>
    </Box>
  );
};

// Componente de Card Estatístico Moderno
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, subtitle, icon, gradient, trend }) => (
  <Card
    sx={{
      borderRadius: 3,
      background: gradient,
      color: 'white',
      boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      transition: 'all 0.3s ease-in-out',
      overflow: 'visible',
      position: 'relative',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)'
      }
    }}
  >
    <CardContent sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}
        >
          {icon}
        </Box>
        {trend && (
          <Chip
            label={`${trend.isPositive ? '+' : ''}${trend.value}%`}
            size="small"
            sx={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}
          />
        )}
      </Box>
      <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5, letterSpacing: '-0.02em' }}>
        {value}
      </Typography>
      <Typography variant="body1" sx={{ opacity: 0.9, fontWeight: 500 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </CardContent>
  </Card>
);

// Componente de Progress Ring
const ProgressRing: React.FC<{
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}> = ({ value, size = 120, strokeWidth = 10, color = '#667eea' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
          {value}%
        </Typography>
        <Typography variant="caption" sx={{ color: '#64748b' }}>
          Concluído
        </Typography>
      </Box>
    </Box>
  );
};

// Componente de Mini Gráfico de Barras
const MiniBarChart: React.FC<{
  data: Array<{ label: string; value: number; color: string }>;
}> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {data.map((item, index) => (
        <Box key={index}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
              {item.label}
            </Typography>
            <Typography variant="caption" sx={{ color: '#1e293b', fontWeight: 600 }}>
              {item.value}
            </Typography>
          </Box>
          <Box
            sx={{
              height: 8,
              backgroundColor: 'rgba(0,0,0,0.06)',
              borderRadius: 4,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color,
                borderRadius: 4,
                transition: 'width 0.5s ease-in-out'
              }}
            />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

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
    const totalSubtasks = phases.reduce((acc: number, p: any) => 
      acc + (p.tasks?.reduce((sum: number, t: any) => sum + (t.subtasks?.length ?? 0), 0) ?? 0), 0
    );
    const completedTasks = phases.reduce((acc: number, p: any) => 
      acc + (p.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'concluido').length ?? 0), 0
    );
    const inProgressTasks = phases.reduce((acc: number, p: any) => 
      acc + (p.tasks?.filter((t: any) => t.status === 'in_progress' || t.status === 'em_andamento').length ?? 0), 0
    );

    // Dados para o gráfico de distribuição
    const statusDistribution = [
      { label: 'Concluídas', value: completedTasks, color: '#10b981' },
      { label: 'Em Andamento', value: inProgressTasks, color: '#f59e0b' },
      { label: 'Pendentes', value: totalTasks - completedTasks - inProgressTasks, color: '#6366f1' }
    ];

    return (
      <Box>
        {/* Cards de Estatísticas - Estilo Dashboard Moderno */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Progresso Geral"
              value={`${project.progress ?? 0}%`}
              subtitle="do projeto concluído"
              icon={<TrendingUpIcon sx={{ color: 'white', fontSize: 24 }} />}
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              trend={{ value: project.progress ?? 0, isPositive: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total de Fases"
              value={phases.length}
              subtitle={`${phases.filter((p: any) => p.status === 'concluido').length} concluídas`}
              icon={<DateRangeIcon sx={{ color: 'white', fontSize: 24 }} />}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Tarefas"
              value={totalTasks}
              subtitle={`${completedTasks} finalizadas`}
              icon={<AssignmentIcon sx={{ color: 'white', fontSize: 24 }} />}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Subtarefas"
              value={totalSubtasks}
              subtitle="total de subtarefas"
              icon={<CheckCircleIcon sx={{ color: 'white', fontSize: 24 }} />}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Coluna Principal - Cards Brancos Modernos */}
          <Grid item xs={12} lg={8}>
            {/* Card de Progresso com Gráfico Ring */}
            <Card
              sx={{
                mb: 3,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.04)',
                overflow: 'hidden'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                      Progresso do Projeto
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Visão geral do andamento
                    </Typography>
                  </Box>
                  <Chip
                    label={getStatusLabel(project.status)}
                    sx={{
                      backgroundColor: getStatusColor(project.status),
                      color: 'white',
                      fontWeight: 600,
                      px: 1
                    }}
                  />
                </Box>

                <Grid container spacing={4} alignItems="center">
                  <Grid item xs={12} md={5}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <ProgressRing value={project.progress ?? 0} size={160} strokeWidth={12} color="#667eea" />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b', mb: 2 }}>
                        Distribuição de Tarefas
                      </Typography>
                      <MiniBarChart data={statusDistribution} />
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Card de Informações do Projeto */}
            <Card
              sx={{
                mb: 3,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.04)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <AssignmentIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Informações do Projeto
                  </Typography>
                </Box>

                <Typography variant="body1" sx={{ color: '#475569', mb: 3, lineHeight: 1.7 }}>
                  {project.description || 'Sem descrição disponível para este projeto.'}
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: 'rgba(102, 126, 234, 0.08)',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                        Status
                      </Typography>
                      <Chip
                        label={getStatusLabel(project.status)}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(project.status),
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: 'rgba(245, 158, 11, 0.08)',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                        Prioridade
                      </Typography>
                      <Chip
                        label={getPriorityLabel(project.priority)}
                        size="small"
                        sx={{
                          backgroundColor: getPriorityColor(project.priority),
                          color: 'white',
                          fontWeight: 600
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                        Início
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formatDate(project.startDate)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                        Término
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                        {formatDate(project.endDate)}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Card de Orçamento (se existir) */}
            {project.budget != null && project.budget > 0 && (
              <Card
                sx={{
                  mb: 3,
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  border: '1px solid rgba(0,0,0,0.04)',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        backgroundColor: 'rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <NotesIcon sx={{ color: '#d97706', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#92400e' }}>
                      Orçamento do Projeto
                    </Typography>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#78350f' }}>
                    R$ {Number(project.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Grid>

          {/* Sidebar Direita - Resumos */}
          <Grid item xs={12} lg={4}>
            {/* Card de Resumo Rápido */}
            <Card
              sx={{
                mb: 3,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.04)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <BarChartIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Resumo Rápido
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { label: 'Fases', value: phases.length, color: '#667eea', icon: <DateRangeIcon sx={{ fontSize: 18 }} /> },
                    { label: 'Tarefas', value: totalTasks, color: '#f59e0b', icon: <AssignmentIcon sx={{ fontSize: 18 }} /> },
                    { label: 'Subtarefas', value: totalSubtasks, color: '#10b981', icon: <CheckCircleIcon sx={{ fontSize: 18 }} /> },
                    { label: 'Membros', value: project.members?.length ?? 0, color: '#ec4899', icon: <GroupIcon sx={{ fontSize: 18 }} /> }
                  ].map((item, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderRadius: 2,
                        backgroundColor: `${item.color}10`,
                        border: `1px solid ${item.color}20`
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ color: item.color }}>{item.icon}</Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#475569' }}>
                          {item.label}
                        </Typography>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: item.color }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* Card de Progresso por Fase */}
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.04)'
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <TimelineIcon sx={{ color: 'white', fontSize: 20 }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Progresso por Fase
                  </Typography>
                </Box>

                {phases.length > 0 ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {phases.slice(0, 5).map((phase: any, index: number) => {
                      const progress = calculatePhaseProgress(phase);
                      const colors = ['#667eea', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];
                      const color = colors[index % colors.length];
                      
                      return (
                        <Box key={phase.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 600,
                                color: '#1e293b',
                                maxWidth: '70%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                            >
                              {phase.name?.split(':')[0] ?? phase.name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700, color }}>
                              {progress}%
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                              height: 8,
                              backgroundColor: 'rgba(0,0,0,0.06)',
                              borderRadius: 4,
                              overflow: 'hidden'
                            }}
                          >
                            <Box
                              sx={{
                                height: '100%',
                                width: `${progress}%`,
                                backgroundColor: color,
                                borderRadius: 4,
                                transition: 'width 0.5s ease-in-out'
                              }}
                            />
                          </Box>
                        </Box>
                      );
                    })}
                    {phases.length > 5 && (
                      <Typography variant="caption" sx={{ color: '#64748b', textAlign: 'center' }}>
                        +{phases.length - 5} fases adicionais
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 3 }}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Nenhuma fase cadastrada.
                    </Typography>
                  </Box>
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
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3
            }}
          >
            <DateRangeIcon sx={{ color: 'white', fontSize: 40 }} />
          </Box>
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600, mb: 1 }}>
            Nenhum cronograma configurado
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Este projeto ainda não possui um cronograma detalhado.
          </Typography>
        </Box>
      );
    }

    const phases = project.timeline.phases;
    const totalTasks = phases.reduce((t: number, p: any) => t + (p.tasks?.length ?? 0), 0);
    const completedTasks = phases.reduce((t: number, p: any) => 
      t + (p.tasks?.filter((task: any) => task.status === 'completed' || task.status === 'concluido').length ?? 0), 0
    );

    return (
      <Box>
        {/* Header do Cronograma - Estilo Moderno */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
            mb: 4
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)'
              }}
            >
              <DateRangeIcon sx={{ color: 'white', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', letterSpacing: '-0.02em' }}>
                Cronograma Detalhado
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                {phases.length} fases · {totalTasks} tarefas · {completedTasks} concluídas
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button
              size="small"
              startIcon={<UnfoldMoreIcon />}
              onClick={expandAllPhases}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                color: '#667eea',
                border: '1px solid rgba(102, 126, 234, 0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(102, 126, 234, 0.2)'
                }
              }}
            >
              Expandir Todas
            </Button>
            <Button
              size="small"
              startIcon={<UnfoldLessIcon />}
              onClick={collapseAllPhases}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                backgroundColor: 'rgba(100, 116, 139, 0.1)',
                color: '#64748b',
                border: '1px solid rgba(100, 116, 139, 0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(100, 116, 139, 0.2)'
                }
              }}
            >
              Recolher Todas
            </Button>
          </Box>
        </Box>

        {/* Cards de Estatísticas - Estilo Dashboard */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Datas do Projeto"
              value={formatDate(project.startDate)}
              subtitle={`até ${formatDate(project.endDate)}`}
              icon={<CalendarIcon sx={{ color: 'white', fontSize: 24 }} />}
              gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Total de Fases"
              value={phases.length}
              subtitle={`${phases.filter((p: any) => p.status === 'em_andamento' || p.status === 'in-progress').length} em andamento`}
              icon={<AssignmentIcon sx={{ color: 'white', fontSize: 24 }} />}
              gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Tarefas"
              value={totalTasks}
              subtitle={`${completedTasks} concluídas`}
              icon={<CheckCircleIcon sx={{ color: 'white', fontSize: 24 }} />}
              gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
            />
          </Grid>
          <Grid item xs={12} sm={6} lg={3}>
            <StatCard
              title="Progresso Geral"
              value={`${project.progress}%`}
              subtitle="do projeto concluído"
              icon={<TrendingUpIcon sx={{ color: 'white', fontSize: 24 }} />}
              gradient="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
              trend={{ value: project.progress, isPositive: true }}
            />
          </Grid>
        </Grid>

        {/* Resumo de Status das Fases */}
        <Card
          sx={{
            mb: 4,
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.04)'
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <DonutLargeIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Resumo por Status
              </Typography>
            </Box>
            <Grid container spacing={2}>
              {[
                { label: 'Em Andamento', count: phases.filter((p: any) => p.status === 'em_andamento' || p.status === 'in-progress').length, color: '#667eea', bg: 'rgba(102, 126, 234, 0.1)' },
                { label: 'Concluídas', count: phases.filter((p: any) => p.status === 'concluido' || p.status === 'completed').length, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
                { label: 'Pendentes', count: phases.filter((p: any) => p.status === 'nao_iniciado' || p.status === 'not_started' || !p.status).length, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
                { label: 'Total Tarefas', count: totalTasks, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' }
              ].map((item, index) => (
                <Grid item xs={6} sm={3} key={index}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      backgroundColor: item.bg,
                      border: `1px solid ${item.color}20`,
                      textAlign: 'center'
                    }}
                  >
                    <Typography variant="h4" sx={{ fontWeight: 700, color: item.color, mb: 0.5 }}>
                      {item.count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                      {item.label}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        {/* Lista de Fases - Estilo Moderno */}
        {phases.map((phase: any, phaseIndex: number) => {
          const isExpanded = expandedPhases.has(phase.id);
          const hasTasks = phase.tasks && phase.tasks.length > 0;
          const phaseColors = ['#667eea', '#f59e0b', '#10b981', '#ec4899', '#6366f1', '#14b8a6'];
          const phaseColor = phaseColors[phaseIndex % phaseColors.length];

          return (
            <Card
              key={phase.id || phaseIndex}
              sx={{
                mb: 3,
                borderRadius: 3,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                border: '1px solid rgba(0,0,0,0.04)',
                overflow: 'hidden',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)'
                }
              }}
            >
              {/* Barra colorida no topo */}
              <Box sx={{ height: 4, background: `linear-gradient(90deg, ${phaseColor} 0%, ${phaseColor}80 100%)` }} />
              
              <CardContent sx={{ p: 3 }}>
                {/* Header da Fase */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        backgroundColor: `${phaseColor}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: phaseColor,
                        fontSize: '1.25rem'
                      }}
                    >
                      {phaseIndex + 1}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                        {phase.name || `Fase ${phaseIndex + 1}`}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <CalendarIcon sx={{ fontSize: 14 }} />
                          {phase.startDate ? formatDate(phase.startDate) : 'Não definido'}
                          {' → '}
                          {phase.endDate ? formatDate(phase.endDate) : 'Não definido'}
                        </Typography>
                        {hasTasks && (
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {phase.tasks.length} tarefa{phase.tasks.length > 1 ? 's' : ''}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      label={getStatusLabel(phase.status || 'nao_iniciado')}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(phase.status || 'nao_iniciado'),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                    {hasTasks && (
                      <IconButton
                        onClick={() => togglePhase(phase.id)}
                        sx={{
                          width: 36,
                          height: 36,
                          backgroundColor: isExpanded ? `${phaseColor}15` : 'transparent',
                          color: isExpanded ? phaseColor : '#64748b',
                          '&:hover': {
                            backgroundColor: `${phaseColor}15`,
                            color: phaseColor
                          }
                        }}
                      >
                        {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    )}
                  </Box>
                </Box>
              
                {/* Barra de Progresso da Fase */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Progresso da Fase
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: phaseColor }}>
                      {phase.progress || 0}%
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 10,
                      backgroundColor: 'rgba(0,0,0,0.06)',
                      borderRadius: 5,
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        height: '100%',
                        width: `${phase.progress || 0}%`,
                        background: `linear-gradient(90deg, ${phaseColor} 0%, ${phaseColor}80 100%)`,
                        borderRadius: 5,
                        transition: 'width 0.5s ease-in-out'
                      }}
                    />
                  </Box>
                </Box>
              
              {/* Tarefas da Fase */}
              {hasTasks && (
                <Box>
                  {isExpanded && (
                    <Box sx={{ mt: 2 }}>
                      {phase.tasks.map((task: any, taskIndex: number) => {
                        const taskColor = getStatusColor(task.status);
                        
                        return (
                          <Card
                            key={task.id || taskIndex}
                            sx={{
                              mb: 2,
                              borderRadius: 2,
                              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                              border: '1px solid rgba(0,0,0,0.04)',
                              overflow: 'hidden',
                              transition: 'all 0.2s ease-in-out',
                              '&:hover': {
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                transform: 'translateY(-2px)'
                              }
                            }}
                          >
                            {/* Barra lateral colorida */}
                            <Box sx={{ display: 'flex' }}>
                              <Box sx={{ width: 4, backgroundColor: taskColor }} />
                              <CardContent sx={{ flex: 1, p: 2.5 }}>
                                <Grid container spacing={2}>
                                  {/* Coluna Principal - Nome e Descrição */}
                                  <Grid item xs={12} md={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                      <Box
                                        sx={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: 2,
                                          backgroundColor: `${taskColor}20`,
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          flexShrink: 0
                                        }}
                                      >
                                        <AssignmentIcon sx={{ color: taskColor, fontSize: 20 }} />
                                      </Box>
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5 }}>
                                          {task.name || `Tarefa ${taskIndex + 1}`}
                                        </Typography>
                                        {task.description && (
                                          <Typography variant="body2" sx={{ color: '#64748b', mb: 1.5, lineHeight: 1.5 }}>
                                            {task.description}
                                          </Typography>
                                        )}
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                          <Chip
                                            label={getStatusLabel(task.status)}
                                            size="small"
                                            sx={{
                                              backgroundColor: taskColor,
                                              color: 'white',
                                              fontWeight: 600,
                                              fontSize: '0.7rem'
                                            }}
                                          />
                                          <Chip
                                            label={getPriorityLabel(task.priority)}
                                            size="small"
                                            sx={{
                                              backgroundColor: getPriorityColor(task.priority),
                                              color: 'white',
                                              fontWeight: 600,
                                              fontSize: '0.7rem'
                                            }}
                                          />
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Grid>

                                  {/* Coluna de Informações - Datas e Responsável */}
                                  <Grid item xs={12} md={6}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      {/* Informações em Grid */}
                                      <Grid container spacing={1.5}>
                                        {task.startDate && (
                                          <Grid item xs={6}>
                                            <Box
                                              sx={{
                                                p: 1.5,
                                                borderRadius: 1.5,
                                                backgroundColor: 'rgba(102, 126, 234, 0.06)',
                                                border: '1px solid rgba(102, 126, 234, 0.1)'
                                              }}
                                            >
                                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                                Início
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                                {formatDate(task.startDate)}
                                              </Typography>
                                            </Box>
                                          </Grid>
                                        )}
                                        {task.plannedEndDate && (
                                          <Grid item xs={6}>
                                            <Box
                                              sx={{
                                                p: 1.5,
                                                borderRadius: 1.5,
                                                backgroundColor: 'rgba(245, 158, 11, 0.06)',
                                                border: '1px solid rgba(245, 158, 11, 0.1)'
                                              }}
                                            >
                                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                                Prazo
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                                {formatDate(task.plannedEndDate)}
                                              </Typography>
                                            </Box>
                                          </Grid>
                                        )}
                                        {task.actualEndDate && (
                                          <Grid item xs={6}>
                                            <Box
                                              sx={{
                                                p: 1.5,
                                                borderRadius: 1.5,
                                                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                                                border: '1px solid rgba(16, 185, 129, 0.1)'
                                              }}
                                            >
                                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                                Concluída
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                                                {formatDate(task.actualEndDate)}
                                              </Typography>
                                            </Box>
                                          </Grid>
                                        )}
                                        {task.responsible && (
                                          <Grid item xs={6}>
                                            <Box
                                              sx={{
                                                p: 1.5,
                                                borderRadius: 1.5,
                                                backgroundColor: 'rgba(236, 72, 153, 0.06)',
                                                border: '1px solid rgba(236, 72, 153, 0.1)'
                                              }}
                                            >
                                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 0.5 }}>
                                                Responsável
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                                                {task.responsible}
                                              </Typography>
                                            </Box>
                                          </Grid>
                                        )}
                                      </Grid>

                                      {/* Progresso */}
                                      {task.progress !== undefined && (
                                        <Box>
                                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                                              Progresso da Tarefa
                                            </Typography>
                                            <Typography variant="body2" sx={{ fontWeight: 700, color: taskColor }}>
                                              {task.progress}%
                                            </Typography>
                                          </Box>
                                          <Box
                                            sx={{
                                              height: 8,
                                              backgroundColor: 'rgba(0,0,0,0.06)',
                                              borderRadius: 4,
                                              overflow: 'hidden'
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                height: '100%',
                                                width: `${task.progress}%`,
                                                backgroundColor: taskColor,
                                                borderRadius: 4,
                                                transition: 'width 0.5s ease-in-out'
                                              }}
                                            />
                                          </Box>
                                        </Box>
                                      )}
                                    </Box>
                                  </Grid>

                                  {/* Observações */}
                                  {task.observations && (
                                    <Grid item xs={12}>
                                      <Box
                                        sx={{
                                          p: 2,
                                          borderRadius: 2,
                                          backgroundColor: 'rgba(99, 102, 241, 0.06)',
                                          borderLeft: '3px solid #6366f1'
                                        }}
                                      >
                                        <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600, display: 'block', mb: 0.5 }}>
                                          Observações
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
                                          {task.observations}
                                        </Typography>
                                      </Box>
                                    </Grid>
                                  )}

                                  {/* Subtarefas */}
                                  {task.subtasks && task.subtasks.length > 0 && (
                                    <Grid item xs={12}>
                                      <Box
                                        sx={{
                                          mt: 2,
                                          p: 2,
                                          borderRadius: 2,
                                          backgroundColor: 'rgba(0,0,0,0.02)',
                                          border: '1px solid rgba(0,0,0,0.06)'
                                        }}
                                      >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                          <Box
                                            sx={{
                                              width: 28,
                                              height: 28,
                                              borderRadius: 1.5,
                                              backgroundColor: `${taskColor}15`,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center'
                                            }}
                                          >
                                            <CheckCircleIcon sx={{ color: taskColor, fontSize: 16 }} />
                                          </Box>
                                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                            Subtarefas ({task.subtasks.length})
                                          </Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                          {task.subtasks.map((subtask: any, subtaskIndex: number) => {
                                            const subtaskColor = getStatusColor(subtask.status);
                                            const isCompleted = subtask.status === 'completed' || subtask.status === 'concluido';
                                            
                                            return (
                                              <Box
                                                key={subtask.id || subtaskIndex}
                                                sx={{
                                                  p: 2,
                                                  borderRadius: 2,
                                                  backgroundColor: 'white',
                                                  border: '1px solid rgba(0,0,0,0.06)',
                                                  borderLeft: `3px solid ${subtaskColor}`,
                                                  transition: 'all 0.2s ease-in-out',
                                                  '&:hover': {
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                                    backgroundColor: 'rgba(0,0,0,0.01)'
                                                  }
                                                }}
                                              >
                                                <Grid container spacing={2} alignItems="center">
                                                  {/* Nome e Descrição */}
                                                  <Grid item xs={12} md={5}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                                                      <Box
                                                        sx={{
                                                          width: 24,
                                                          height: 24,
                                                          borderRadius: '50%',
                                                          backgroundColor: isCompleted ? '#10b981' : 'transparent',
                                                          border: `2px solid ${isCompleted ? '#10b981' : '#cbd5e1'}`,
                                                          display: 'flex',
                                                          alignItems: 'center',
                                                          justifyContent: 'center',
                                                          flexShrink: 0,
                                                          mt: 0.25
                                                        }}
                                                      >
                                                        {isCompleted && <CheckCircleIcon sx={{ color: 'white', fontSize: 14 }} />}
                                                      </Box>
                                                      <Box sx={{ flex: 1 }}>
                                                        <Typography
                                                          variant="body2"
                                                          sx={{
                                                            fontWeight: 600,
                                                            color: '#1e293b',
                                                            textDecoration: isCompleted ? 'line-through' : 'none',
                                                            opacity: isCompleted ? 0.7 : 1
                                                          }}
                                                        >
                                                          {subtask.title || subtask.name}
                                                        </Typography>
                                                        {subtask.description && (
                                                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                                                            {subtask.description}
                                                          </Typography>
                                                        )}
                                                      </Box>
                                                    </Box>
                                                  </Grid>

                                                  {/* Status e Prioridade */}
                                                  <Grid item xs={6} md={2}>
                                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                                      <Chip
                                                        label={getStatusLabel(subtask.status)}
                                                        size="small"
                                                        sx={{
                                                          fontSize: '0.65rem',
                                                          height: 22,
                                                          backgroundColor: subtaskColor,
                                                          color: 'white',
                                                          fontWeight: 600
                                                        }}
                                                      />
                                                    </Box>
                                                  </Grid>

                                                  {/* Datas e Responsável */}
                                                  <Grid item xs={6} md={3}>
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                      {subtask.dueDate && (
                                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                          <CalendarIcon sx={{ fontSize: 12 }} />
                                                          {formatDate(subtask.dueDate)}
                                                        </Typography>
                                                      )}
                                                      {subtask.assignee && (
                                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                          <PersonIcon sx={{ fontSize: 12 }} />
                                                          {subtask.assignee}
                                                        </Typography>
                                                      )}
                                                    </Box>
                                                  </Grid>

                                                  {/* Progresso */}
                                                  <Grid item xs={12} md={2}>
                                                    {subtask.progress !== undefined && (
                                                      <Box>
                                                        <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                          <span>Progresso</span>
                                                          <strong style={{ color: subtaskColor }}>{subtask.progress}%</strong>
                                                        </Typography>
                                                        <Box
                                                          sx={{
                                                            height: 6,
                                                            backgroundColor: 'rgba(0,0,0,0.06)',
                                                            borderRadius: 3,
                                                            overflow: 'hidden'
                                                          }}
                                                        >
                                                          <Box
                                                            sx={{
                                                              height: '100%',
                                                              width: `${subtask.progress}%`,
                                                              backgroundColor: subtaskColor,
                                                              borderRadius: 3
                                                            }}
                                                          />
                                                        </Box>
                                                      </Box>
                                                    )}
                                                  </Grid>
                                                </Grid>
                                              </Box>
                                            );
                                          })}
                                        </Box>
                                      </Box>
                                    </Grid>
                                  )}
                                </Grid>
                              </CardContent>
                            </Box>
                          </Card>
                        );
                      })}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ScheduleIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold" color="text.primary">
                Indicadores do Cronograma
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Desempenho das tarefas e subtarefas por status, prazo e conclusão.
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {summaryCards.map(card => {
            const config = categoryConfig[card.key];
            const IconComponent = config.icon;
            return (
              <Grid item xs={12} md={4} key={card.key}>
                <Card
                  sx={{
                    borderRadius: 2,
                    boxShadow: 2,
                    borderTop: 4,
                    borderColor: `${config.palette}.main`,
                    '&:hover': { boxShadow: 4 }
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
            <Card key={categoryKey} sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
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

    const totalTasksGantt = phases.reduce((acc: number, p: any) => acc + (p.tasks?.length ?? 0), 0);

    return (
      <Box>
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <TimelineIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold" color="text.primary">
                Gráfico de Gantt
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cronograma visual do projeto · {phases.length} fases · {totalTasksGantt} tarefas
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AssignmentIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">Informações do Gantt</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Visualização gráfica do cronograma: fases, tarefas e subtarefas com datas e responsáveis.
                </Typography>
                <List dense disablePadding>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'primary.main', width: 28, height: 28 }}>
                        <CalendarIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Fases" secondary="Datas de início e fim" />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'secondary.main', width: 28, height: 28 }}>
                        <AssignmentIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Tarefas e subtarefas" secondary="Responsáveis e prazos" />
                  </ListItem>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ backgroundColor: 'success.main', width: 28, height: 28 }}>
                        <CheckCircleIcon sx={{ fontSize: 16 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText primary="Marcos" secondary="Pontos de controle" />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <ScheduleIcon color="primary" />
                  <Typography variant="h6" fontWeight="bold">Estatísticas</Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Fases</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">{phases.length}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Tarefas (cronograma)</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">{totalTasksGantt}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Marcos</Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">{project.milestones?.length || 0}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DateRangeIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">Visualização do Cronograma</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Gráfico de Gantt interativo com a sequência temporal das atividades.
            </Typography>
            <ProjectGantt
              phases={phases}
              projectStartDate={project.startDate}
              projectEndDate={project.endDate}
            />
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom color="primary.main">Legenda</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: 'primary.main', borderRadius: 0.5 }} />
                  <Typography variant="body2">Fases</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: 'secondary.main', borderRadius: 0.5 }} />
                  <Typography variant="body2">Tarefas</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: 'success.main', borderRadius: 0.5 }} />
                  <Typography variant="body2">Marcos</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 16, height: 16, backgroundColor: 'warning.main', borderRadius: 0.5 }} />
                  <Typography variant="body2">Em andamento</Typography>
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GroupIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold" color="text.primary">
              Equipe do Projeto
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Membros internos e externos vinculados ao projeto
            </Typography>
          </Box>
        </Box>
      </Paper>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Membros da Equipe ({project.members?.length || 0})
                </Typography>
              </Box>
              <List disablePadding>
                {(project.members || []).map((member, index) => (
                  <React.Fragment key={member.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <PersonIcon />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={member.user.name}
                        secondary={member.role}
                        primaryTypographyProps={{ fontWeight: 600 }}
                      />
                    </ListItem>
                    {index < (project.members?.length || 0) - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
              {(project.members?.length || 0) === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Nenhum membro da equipe configurado.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <PersonIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Membros Externos ({project.externalMembers?.length || 0})
                </Typography>
              </Box>
              {(project.externalMembers?.length || 0) > 0 ? (
                <List disablePadding>
                  {(project.externalMembers || []).map((member, index) => (
                    <React.Fragment key={member.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'secondary.main' }}>
                            <PersonIcon />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={member.name}
                          secondary={`${member.role}${member.company ? ` • ${member.company}` : ''}`}
                          primaryTypographyProps={{ fontWeight: 600 }}
                        />
                      </ListItem>
                      {index < (project.externalMembers?.length || 0) - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary">
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5" fontWeight="bold" color="text.primary">
              Stakeholders e Marcos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tarefas de alto nível e marcos do projeto
            </Typography>
          </Box>
        </Box>
      </Paper>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AssignmentIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Tarefas ({project.tasks?.length || 0})
                </Typography>
              </Box>
              {(project.tasks?.length || 0) > 0 ? (
                <List disablePadding>
                  {(project.tasks || []).map((task, index) => (
                    <React.Fragment key={task.id}>
                      <ListItem sx={{ px: 0, alignItems: 'flex-start' }}>
                        <ListItemAvatar>
                          <Avatar sx={{ backgroundColor: getStatusColor(task.status) }}>
                            <AssignmentIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={task.title}
                          primaryTypographyProps={{ fontWeight: 600 }}
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Chip label={getStatusLabel(task.status)} size="small" sx={{ mr: 0.5, mb: 0.5, backgroundColor: getStatusColor(task.status), color: 'white' }} />
                              <Chip label={getPriorityLabel(task.priority)} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5 }} />
                              {task.dueDate && (
                                <Typography variant="body2" color="text.secondary" display="block">
                                  Prazo: {formatDate(task.dueDate)}
                                </Typography>
                              )}
                              {task.assignee && (
                                <Typography variant="body2" color="text.secondary">
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
                <Typography variant="body2" color="text.secondary">
                  Nenhuma tarefa configurada.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircleIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Marcos ({project.milestones?.length || 0})
                </Typography>
              </Box>
              {(project.milestones?.length || 0) > 0 ? (
                <List disablePadding>
                  {(project.milestones || []).map((milestone, index) => (
                    <React.Fragment key={milestone.id}>
                      <ListItem sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ backgroundColor: milestone.completed ? 'success.main' : 'warning.main' }}>
                            {milestone.completed ? <CheckCircleIcon sx={{ fontSize: 20 }} /> : <ScheduleIcon sx={{ fontSize: 20 }} />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={milestone.title}
                          primaryTypographyProps={{ fontWeight: 600 }}
                          secondary={
                            <Box sx={{ mt: 0.5 }}>
                              <Chip
                                label={milestone.completed ? 'Concluído' : 'Pendente'}
                                size="small"
                                color={milestone.completed ? 'success' : 'warning'}
                                sx={{ mr: 0.5 }}
                              />
                              <Typography variant="body2" color="text.secondary" component="span">
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
                <Typography variant="body2" color="text.secondary">
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

  // Adicionar ícones às tabs
  const tabsWithIcons = availableTabs.map(tab => ({
    ...tab,
    icon: {
      overview: <DashboardIcon />,
      timeline: <DateRangeIcon />,
      indicators: <TrendingUpIcon />,
      gantt: <BarChartIcon />,
      team: <GroupIcon />,
      resources: <AssignmentIcon />
    }[tab.key] || <DashboardIcon />
  }));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #fdf2f8 0%, #ede9fe 25%, #e0f2fe 50%, #ecfdf5 75%, #fef3c7 100%)',
        display: 'flex'
      }}
    >
      {/* Sidebar Moderna - Desktop */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <ModernSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          availableTabs={tabsWithIcons}
        />
      </Box>

      {/* Conteúdo Principal */}
      <Box
        sx={{
          flex: 1,
          ml: { xs: 0, md: '72px' },
          minHeight: '100vh'
        }}
      >
        {/* Header Moderno Flutuante */}
        <Box sx={{ p: { xs: 2, sm: 3 }, pb: 0 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3 },
              mb: 3,
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)'
            }}
          >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Logo/Avatar do Projeto */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 3,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)'
                  }}
                >
                  <ShareIcon sx={{ color: 'white', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b', mb: 0.5, letterSpacing: '-0.02em' }}>
                    {project.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                    {shareInfo && (
                      <Typography variant="body2" sx={{ color: '#64748b' }}>
                        Compartilhado por <strong>{shareInfo.name}</strong>
                      </Typography>
                    )}
                    {shareInfo?.createdAt && (
                      <>
                        <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#cbd5e1' }} />
                        <Typography variant="body2" sx={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <AccessTimeIcon sx={{ fontSize: 14 }} />
                          {formatDateTime(shareInfo.createdAt)}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Badges */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  icon={<VisibilityIcon sx={{ fontSize: 16 }} />}
                  label="Visualização Pública"
                  sx={{
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    color: '#667eea',
                    fontWeight: 600,
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    '& .MuiChip-icon': { color: '#667eea' }
                  }}
                />
                <Chip
                  label={getStatusLabel(project.status)}
                  sx={{
                    backgroundColor: getStatusColor(project.status),
                    color: 'white',
                    fontWeight: 600
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Abas Modernas - Estilo Pills */}
          {availableTabs.length > 1 && (
            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 1,
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                display: { xs: 'block', md: 'none' } // Só mostra em mobile
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, newValue) => setActiveTab(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 48,
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    minHeight: 40,
                    borderRadius: 2,
                    mx: 0.5,
                    color: '#64748b',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.08)',
                      color: '#667eea'
                    }
                  },
                  '& .Mui-selected': {
                    fontWeight: 700,
                    backgroundColor: 'rgba(102, 126, 234, 0.12) !important',
                    color: '#667eea !important'
                  },
                  '& .MuiTabs-indicator': { display: 'none' }
                }}
              >
                {availableTabs.map((tab) => (
                  <Tab key={tab.key} label={tab.label} />
                ))}
              </Tabs>
            </Paper>
          )}

          {/* Conteúdo Principal */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              borderRadius: 3,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.8)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.06)',
              minHeight: 'calc(100vh - 200px)'
            }}
          >
            {renderTabContent()}
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default ShareProject;
