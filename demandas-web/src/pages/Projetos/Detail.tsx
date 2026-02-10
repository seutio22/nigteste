import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ProjectTeamManager from '../../components/ProjectTeamManager'
import ProjectGantt from '../../components/ProjectGantt'
import ShareProjectModal from '../../components/ShareProjectModal'
import ExportProjectModal from '../../components/ExportProjectModal'

import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Chip,
  Stack,
  LinearProgress,
  Divider,
  IconButton,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  Badge,
  Tabs,
  Tab,
  Alert,
  InputAdornment,
  CircularProgress,
  FormControlLabel,
  Switch
} from '@mui/material'
import {
  ArrowBack,
  Edit,
  Save,
  Cancel,
  Delete,
  Add,
  Person,
  CalendarToday,
  AttachMoney,
  Flag,
  CheckCircle,
  Schedule,
  Warning,
  ExpandMore,
  Timeline,
  Assignment,
  Group,
  DateRange,
  Notes,
  PlayArrow,
  Pause,
  Stop,
  MoreVert,
  Visibility,
  VisibilityOff,
  DragIndicator,
  KeyboardArrowUp,
  KeyboardArrowDown,
  Business,
  Share,
  Download as DownloadIcon
} from '@mui/icons-material'
import { api } from '../../lib/api.local'
import { useProjectStore } from '../../store/projectStore'
import { useAuthStore } from '../../store/authStore'
import { useMasterDataStore } from '../../store/masterDataStore'
// Removido dados mockados - usar apenas dados reais do banco
/* const mockProject = {
  id: 'proj-001',
  name: 'Sistema de E-commerce',
  description: 'Desenvolvimento de plataforma completa de e-commerce com painel administrativo, sistema de pagamentos e gestão de estoque',
  status: 'active',
  priority: 'high',
  progress: 75,
  manager: 'João Silva',
  team: [],
  startDate: '2024-01-15',
  endDate: '2024-07-30',
  budget: 85000,
  tasks: { total: 24, completed: 18, inProgress: 4, pending: 2 },
  isFavorite: true,
  tags: ['Frontend', 'Backend', 'Mobile'],
  lastActivity: '2024-04-15T10:30:00Z',
  
  // Cronograma robusto
  timeline: {
    phases: [
      {
        id: 'phase1',
        name: 'Fase 1: Análise e Planejamento',
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        progress: 100,
        status: 'completed',
        tasks: [
          {
            id: 'task1',
            name: 'Análise de Requisitos',
            description: 'Levantamento detalhado dos requisitos funcionais e não funcionais',
            responsible: 'João Silva',
            startDate: '2024-01-15',
            plannedEndDate: '2024-01-25',
            actualEndDate: '2024-01-23',
            status: 'completed',
            progress: 100,
            priority: 'high',
            estimatedHours: 40,
            actualHours: 38,
            dependencies: [],
            observations: 'Requisitos aprovados pelo cliente em 23/01. Documentação completa entregue.',
            subtasks: [
              { 
                id: 'sub1', 
                title: 'Entrevistas com stakeholders', 
                description: 'Realizar entrevistas com todos os stakeholders do projeto',
                status: 'completed', 
                priority: 'high',
                assignee: 'João Silva',
                startDate: '2024-01-15',
                dueDate: '2024-01-20',
                actualEndDate: '2024-01-18',
                estimatedHours: 16,
                actualHours: 16,
                progress: 100,
                dependencies: [],
                order: 1,
                code: '1.1.1',
                attachments: [],
                comments: [],
                observations: 'Entrevistas concluídas com sucesso',
                createdAt: '2024-01-15T00:00:00Z',
                updatedAt: '2024-01-18T00:00:00Z'
              },
              { 
                id: 'sub2', 
                title: 'Documentação de requisitos', 
                description: 'Elaborar documentação completa dos requisitos funcionais',
                status: 'completed', 
                priority: 'high',
                assignee: 'João Silva',
                startDate: '2024-01-19',
                dueDate: '2024-01-23',
                actualEndDate: '2024-01-22',
                estimatedHours: 12,
                actualHours: 12,
                progress: 100,
                dependencies: ['sub1'],
                order: 2,
                code: '1.1.2',
                attachments: [],
                comments: [],
                observations: 'Documentação aprovada pelo cliente',
                createdAt: '2024-01-19T00:00:00Z',
                updatedAt: '2024-01-22T00:00:00Z'
              },
              { 
                id: 'sub3', 
                title: 'Validação com cliente', 
                description: 'Apresentar e validar requisitos com o cliente',
                status: 'completed', 
                priority: 'medium',
                assignee: 'João Silva',
                startDate: '2024-01-23',
                dueDate: '2024-01-25',
                actualEndDate: '2024-01-23',
                estimatedHours: 10,
                actualHours: 10,
                progress: 100,
                dependencies: ['sub2'],
                order: 3,
                code: '1.1.3',
                attachments: [],
                comments: [],
                observations: 'Validação aprovada pelo cliente',
                createdAt: '2024-01-23T00:00:00Z',
                updatedAt: '2024-01-23T00:00:00Z'
              }
            ]
          },
          {
            id: 'task2',
            name: 'Planejamento de Arquitetura',
            description: 'Definição da arquitetura técnica e escolha das tecnologias',
            responsible: 'Maria Santos',
            startDate: '2024-01-26',
            plannedEndDate: '2024-02-10',
            actualEndDate: '2024-02-08',
            status: 'completed',
            progress: 100,
            priority: 'high',
            estimatedHours: 32,
            actualHours: 30,
            dependencies: ['task1'],
            observations: 'Arquitetura definida e aprovada pela equipe técnica. Documentação arquitetural criada.',
            subtasks: [
              { 
                id: 'sub4', 
                title: 'Análise de tecnologias', 
                description: 'Avaliar e selecionar as melhores tecnologias para o projeto',
                status: 'completed', 
                priority: 'high',
                assignee: 'Maria Santos',
                startDate: '2024-01-26',
                dueDate: '2024-02-05',
                actualEndDate: '2024-02-03',
                estimatedHours: 12,
                actualHours: 12,
                progress: 100,
                dependencies: [],
                order: 1,
                code: '1.2.1',
                attachments: [],
                comments: [],
                observations: 'Tecnologias selecionadas e aprovadas',
                createdAt: '2024-01-26T00:00:00Z',
                updatedAt: '2024-02-03T00:00:00Z'
              },
              { 
                id: 'sub5', 
                title: 'Design de arquitetura', 
                description: 'Criar o design da arquitetura técnica do sistema',
                status: 'completed', 
                priority: 'high',
                assignee: 'Maria Santos',
                startDate: '2024-02-06',
                dueDate: '2024-02-10',
                actualEndDate: '2024-02-08',
                estimatedHours: 18,
                actualHours: 18,
                progress: 100,
                dependencies: ['sub4'],
                order: 2,
                code: '1.2.2',
                attachments: [],
                comments: [],
                observations: 'Arquitetura aprovada pela equipe técnica',
                createdAt: '2024-02-06T00:00:00Z',
                updatedAt: '2024-02-08T00:00:00Z'
              }
            ]
          },
          {
            id: 'task3',
            name: 'Cronograma Detalhado',
            description: 'Criação do cronograma detalhado com marcos e dependências',
            responsible: 'João Silva',
            startDate: '2024-02-11',
            plannedEndDate: '2024-02-15',
            actualEndDate: '2024-02-14',
            status: 'completed',
            progress: 100,
            priority: 'medium',
            estimatedHours: 20,
            actualHours: 18,
            dependencies: ['task2'],
            observations: 'Cronograma aprovado pela diretoria. Recursos alocados conforme planejado.',
            subtasks: [
              { 
                id: 'sub6', 
                title: 'Definição de marcos', 
                description: 'Definir os marcos principais do projeto',
                status: 'completed', 
                priority: 'medium',
                assignee: 'João Silva',
                startDate: '2024-02-11',
                dueDate: '2024-02-13',
                actualEndDate: '2024-02-12',
                estimatedHours: 8,
                actualHours: 8,
                progress: 100,
                dependencies: [],
                order: 1,
                code: '1.3.1',
                attachments: [],
                comments: [],
                observations: 'Marcos definidos e aprovados',
                createdAt: '2024-02-11T00:00:00Z',
                updatedAt: '2024-02-12T00:00:00Z'
              },
              { 
                id: 'sub7', 
                title: 'Alocação de recursos', 
                description: 'Alocar recursos humanos e materiais para o projeto',
                status: 'completed', 
                priority: 'medium',
                assignee: 'João Silva',
                startDate: '2024-02-13',
                dueDate: '2024-02-15',
                actualEndDate: '2024-02-14',
                estimatedHours: 10,
                actualHours: 10,
                progress: 100,
                dependencies: ['sub6'],
                order: 2,
                code: '1.3.2',
                attachments: [],
                comments: [],
                observations: 'Recursos alocados conforme planejado',
                createdAt: '2024-02-13T00:00:00Z',
                updatedAt: '2024-02-14T00:00:00Z'
              }
            ]
          }
        ]
      },
      {
        id: 'phase2',
        name: 'Fase 2: Design e Prototipagem',
        startDate: '2024-02-16',
        endDate: '2024-03-31',
        progress: 85,
        status: 'active',
        tasks: [
          {
            id: 'task4',
            name: 'Design de Interface',
            description: 'Criação dos wireframes e protótipos de alta fidelidade',
            responsible: 'Ana Oliveira',
            startDate: '2024-02-16',
            plannedEndDate: '2024-01-10',
            actualEndDate: null,
            status: 'pending',
            progress: 90,
            priority: 'high',
            estimatedHours: 60,
            actualHours: 54,
            dependencies: ['task3'],
            observations: 'Designs aprovados pelo cliente. Aguardando feedback final para finalização.',
            subtasks: [
              { 
                id: 'sub8', 
                title: 'Wireframes', 
                description: 'Criar wireframes de baixa fidelidade para todas as telas',
                status: 'completed', 
                priority: 'high',
                assignee: 'Ana Oliveira',
                startDate: '2024-02-16',
                dueDate: '2024-02-25',
                actualEndDate: '2024-02-23',
                estimatedHours: 20,
                actualHours: 20,
                progress: 100,
                dependencies: [],
                order: 1,
                code: '2.1.1',
                attachments: [],
                comments: [],
                observations: 'Wireframes aprovados pelo cliente',
                createdAt: '2024-02-16T00:00:00Z',
                updatedAt: '2024-02-23T00:00:00Z'
              },
              { 
                id: 'sub9', 
                title: 'Protótipos', 
                description: 'Desenvolver protótipos de alta fidelidade interativos',
                status: 'completed', 
                priority: 'high',
                assignee: 'Ana Oliveira',
                startDate: '2024-02-26',
                dueDate: '2024-03-05',
                actualEndDate: '2024-03-03',
                estimatedHours: 24,
                actualHours: 24,
                progress: 100,
                dependencies: ['sub8'],
                order: 2,
                code: '2.1.2',
                attachments: [],
                comments: [],
                observations: 'Protótipos funcionais criados',
                createdAt: '2024-02-26T00:00:00Z',
                updatedAt: '2024-03-03T00:00:00Z'
              },
              { 
                id: 'sub10', 
                title: 'Validação com usuários', 
                description: 'Realizar testes de usabilidade com usuários finais',
                status: 'pending', 
                priority: 'medium',
                assignee: 'Ana Oliveira',
                startDate: '2024-03-06',
                dueDate: '2024-01-15', // Data passada para testar atraso
                actualEndDate: null,
                estimatedHours: 10,
                actualHours: 6,
                progress: 60,
                dependencies: ['sub9'],
                order: 3,
                code: '2.1.3',
                attachments: [],
                comments: [],
                observations: 'Testes em andamento, feedback positivo até agora',
                createdAt: '2024-03-06T00:00:00Z',
                updatedAt: '2024-03-08T00:00:00Z'
              }
            ]
          },
          {
            id: 'task5',
            name: 'Design de Banco de Dados',
            description: 'Modelagem conceitual e lógica do banco de dados',
            responsible: 'Pedro Costa',
            startDate: '2024-02-20',
            plannedEndDate: '2024-03-15',
            actualEndDate: null,
            status: 'in_progress',
            progress: 75,
            priority: 'high',
            estimatedHours: 45,
            actualHours: 34,
            dependencies: ['task2'],
            observations: 'Modelo conceitual aprovado. Implementando modelo lógico e físico.',
            subtasks: [
              { 
                id: 'sub11', 
                title: 'Modelo conceitual', 
                description: 'Criar modelo conceitual do banco de dados',
                status: 'completed', 
                priority: 'high',
                assignee: 'Pedro Costa',
                startDate: '2024-02-20',
                dueDate: '2024-02-28',
                actualEndDate: '2024-02-26',
                estimatedHours: 16,
                actualHours: 16,
                progress: 100,
                dependencies: [],
                order: 1,
                code: '2.2.1',
                attachments: [],
                comments: [],
                observations: 'Modelo conceitual aprovado pela equipe',
                createdAt: '2024-02-20T00:00:00Z',
                updatedAt: '2024-02-26T00:00:00Z'
              },
              { 
                id: 'sub12', 
                title: 'Modelo lógico', 
                description: 'Desenvolver modelo lógico do banco de dados',
                status: 'in_progress', 
                priority: 'high',
                assignee: 'Pedro Costa',
                startDate: '2024-02-27',
                dueDate: '2024-03-10',
                actualEndDate: null,
                estimatedHours: 18,
                actualHours: 18,
                progress: 100,
                dependencies: ['sub11'],
                order: 2,
                code: '2.2.2',
                attachments: [],
                comments: [],
                observations: 'Modelo lógico em desenvolvimento',
                createdAt: '2024-02-27T00:00:00Z',
                updatedAt: '2024-03-08T00:00:00Z'
              }
            ]
          }
        ]
      },
      {
        id: 'phase3',
        name: 'Fase 3: Desenvolvimento',
        startDate: '2024-04-01',
        endDate: '2024-06-30',
        progress: 60,
        status: 'active',
        tasks: [
          {
            id: 'task6',
            name: 'Desenvolvimento Backend',
            description: 'Implementação da API REST e lógica de negócio',
            responsible: 'Maria Santos',
            startDate: '2024-04-01',
            plannedEndDate: '2024-05-31',
            actualEndDate: null,
            status: 'in_progress',
            progress: 70,
            priority: 'high',
            estimatedHours: 160,
            actualHours: 112,
            dependencies: ['task4', 'task5'],
            observations: 'API base implementada. Módulos de usuário e produtos funcionando. Implementando módulo de pagamentos.',
            subtasks: [
              { 
                id: 'sub13', 
                title: 'API base', 
                description: 'Implementar estrutura base da API REST',
                status: 'completed', 
                priority: 'high',
                assignee: 'Maria Santos',
                startDate: '2024-04-01',
                dueDate: '2024-04-15',
                actualEndDate: '2024-04-12',
                estimatedHours: 40,
                actualHours: 40,
                progress: 100,
                dependencies: [],
                order: 1,
                code: '3.1.1',
                attachments: [],
                comments: [],
                observations: 'API base implementada com sucesso',
                createdAt: '2024-04-01T00:00:00Z',
                updatedAt: '2024-04-12T00:00:00Z'
              },
              { 
                id: 'sub14', 
                title: 'Módulo de usuários', 
                description: 'Desenvolver sistema de autenticação e gestão de usuários',
                status: 'completed', 
                priority: 'high',
                assignee: 'Maria Santos',
                startDate: '2024-04-16',
                dueDate: '2024-04-25',
                actualEndDate: '2024-04-23',
                estimatedHours: 32,
                actualHours: 32,
                progress: 100,
                dependencies: ['sub13'],
                order: 2,
                code: '3.1.2',
                attachments: [],
                comments: [],
                observations: 'Módulo de usuários funcionando perfeitamente',
                createdAt: '2024-04-16T00:00:00Z',
                updatedAt: '2024-04-23T00:00:00Z'
              },
              { 
                id: 'sub15', 
                title: 'Módulo de produtos', 
                description: 'Implementar CRUD completo de produtos',
                status: 'completed', 
                priority: 'high',
                assignee: 'Maria Santos',
                startDate: '2024-04-26',
                dueDate: '2024-05-10',
                actualEndDate: '2024-05-08',
                estimatedHours: 40,
                actualHours: 40,
                progress: 100,
                dependencies: ['sub14'],
                order: 3,
                code: '3.1.3',
                attachments: [],
                comments: [],
                observations: 'Módulo de produtos implementado com sucesso',
                createdAt: '2024-04-26T00:00:00Z',
                updatedAt: '2024-05-08T00:00:00Z'
              },
              { 
                id: 'sub16', 
                title: 'Módulo de pagamentos', 
                description: 'Integrar sistema de pagamentos com gateways',
                status: 'in_progress', 
                priority: 'high',
                assignee: 'Maria Santos',
                startDate: '2024-05-11',
                dueDate: '2024-05-31',
                actualEndDate: null,
                estimatedHours: 48,
                actualHours: 0,
                progress: 0,
                dependencies: ['sub15'],
                order: 4,
                code: '3.1.4',
                attachments: [],
                comments: [],
                observations: 'Iniciando implementação do módulo de pagamentos',
                createdAt: '2024-05-11T00:00:00Z',
                updatedAt: '2024-05-11T00:00:00Z'
              }
            ]
          },
          {
            id: 'task7',
            name: 'Desenvolvimento Frontend',
            description: 'Implementação da interface do usuário e painel administrativo',
            responsible: 'Ana Oliveira',
            startDate: '2024-04-15',
            plannedEndDate: '2024-06-15',
            actualEndDate: null,
            status: 'in_progress',
            progress: 50,
            priority: 'high',
            estimatedHours: 140,
            actualHours: 70,
            dependencies: ['task4'],
            observations: 'Interface principal implementada. Implementando painel administrativo e funcionalidades avançadas.',
            subtasks: [
              { 
                id: 'sub17', 
                title: 'Interface principal', 
                description: 'Desenvolver interface principal do usuário',
                status: 'completed', 
                priority: 'high',
                assignee: 'Ana Oliveira',
                startDate: '2024-04-15',
                dueDate: '2024-05-15',
                actualEndDate: '2024-05-10',
                estimatedHours: 50,
                actualHours: 50,
                progress: 100,
                dependencies: [],
                order: 1,
                code: '3.2.1',
                attachments: [],
                comments: [],
                observations: 'Interface principal implementada com sucesso',
                createdAt: '2024-04-15T00:00:00Z',
                updatedAt: '2024-05-10T00:00:00Z'
              },
              { 
                id: 'sub18', 
                title: 'Painel administrativo', 
                description: 'Criar painel administrativo completo',
                status: 'in_progress', 
                priority: 'high',
                assignee: 'Ana Oliveira',
                startDate: '2024-05-16',
                dueDate: '2024-06-15',
                actualEndDate: null,
                estimatedHours: 90,
                actualHours: 20,
                progress: 22,
                dependencies: ['sub17'],
                order: 2,
                code: '3.2.2',
                attachments: [],
                comments: [],
                observations: 'Painel administrativo em desenvolvimento',
                createdAt: '2024-05-16T00:00:00Z',
                updatedAt: '2024-05-20T00:00:00Z'
              }
            ]
          }
        ]
      },
      {
        id: 'phase4',
        name: 'Fase 4: Testes e Deploy',
        startDate: '2024-07-01',
        endDate: '2024-07-30',
        progress: 0,
        status: 'pending',
        tasks: [
          {
            id: 'task8',
            name: 'Testes de Integração',
            description: 'Testes end-to-end e validação de funcionalidades',
            responsible: 'Carlos Lima',
            startDate: '2024-07-01',
            plannedEndDate: '2024-07-15',
            actualEndDate: null,
            status: 'pending',
            progress: 0,
            priority: 'medium',
            estimatedHours: 80,
            actualHours: 0,
            dependencies: ['task6', 'task7'],
            observations: 'Aguardando conclusão do desenvolvimento para iniciar testes.',
            subtasks: [
              { 
                id: 'sub19', 
                title: 'Testes unitários', 
                description: 'Implementar testes unitários para todos os módulos',
                status: 'pending', 
                priority: 'medium',
                assignee: 'Carlos Lima',
                startDate: '2024-07-01',
                dueDate: '2024-07-05',
                actualEndDate: null,
                estimatedHours: 20,
                actualHours: 0,
                progress: 0,
                dependencies: [],
                order: 1,
                code: '4.1.1',
                attachments: [],
                comments: [],
                observations: 'Aguardando conclusão do desenvolvimento',
                createdAt: '2024-07-01T00:00:00Z',
                updatedAt: '2024-07-01T00:00:00Z'
              },
              { 
                id: 'sub20', 
                title: 'Testes de integração', 
                description: 'Realizar testes de integração entre módulos',
                status: 'pending', 
                priority: 'medium',
                assignee: 'Carlos Lima',
                startDate: '2024-07-06',
                dueDate: '2024-07-10',
                actualEndDate: null,
                estimatedHours: 30,
                actualHours: 0,
                progress: 0,
                dependencies: ['sub19'],
                order: 2,
                code: '4.1.2',
                attachments: [],
                comments: [],
                observations: 'Aguardando conclusão dos testes unitários',
                createdAt: '2024-07-06T00:00:00Z',
                updatedAt: '2024-07-06T00:00:00Z'
              },
              { 
                id: 'sub21', 
                title: 'Testes de usuário', 
                description: 'Conduzir testes de usabilidade com usuários finais',
                status: 'pending', 
                priority: 'medium',
                assignee: 'Carlos Lima',
                startDate: '2024-07-11',
                dueDate: '2024-07-15',
                actualEndDate: null,
                estimatedHours: 30,
                actualHours: 0,
                progress: 0,
                dependencies: ['sub20'],
                order: 3,
                code: '4.1.3',
                attachments: [],
                comments: [],
                observations: 'Aguardando conclusão dos testes de integração',
                createdAt: '2024-07-11T00:00:00Z',
                updatedAt: '2024-07-11T00:00:00Z'
              }
            ]
          },
          {
            id: 'task9',
            name: 'Deploy e Configuração',
            description: 'Deploy em produção e configuração do ambiente',
            responsible: 'Pedro Costa',
            startDate: '2024-07-16',
            plannedEndDate: '2024-07-30',
            actualEndDate: null,
            status: 'pending',
            progress: 0,
            priority: 'medium',
            estimatedHours: 40,
            actualHours: 0,
            dependencies: ['task8'],
            observations: 'Ambiente de produção preparado. Aguardando conclusão dos testes.',
            subtasks: [
              { 
                id: 'sub22', 
                title: 'Preparação do ambiente', 
                description: 'Configurar ambiente de produção',
                status: 'pending', 
                priority: 'medium',
                assignee: 'Pedro Costa',
                startDate: '2024-07-16',
                dueDate: '2024-07-20',
                actualEndDate: null,
                estimatedHours: 15,
                actualHours: 0,
                progress: 0,
                dependencies: [],
                order: 1,
                code: '4.2.1',
                attachments: [],
                comments: [],
                observations: 'Ambiente de produção preparado',
                createdAt: '2024-07-16T00:00:00Z',
                updatedAt: '2024-07-16T00:00:00Z'
              },
              { 
                id: 'sub23', 
                title: 'Deploy da aplicação', 
                description: 'Realizar deploy da aplicação em produção',
                status: 'pending', 
                priority: 'medium',
                assignee: 'Pedro Costa',
                startDate: '2024-07-21',
                dueDate: '2024-07-25',
                actualEndDate: null,
                estimatedHours: 15,
                actualHours: 0,
                progress: 0,
                dependencies: ['sub22'],
                order: 2,
                code: '4.2.2',
                attachments: [],
                comments: [],
                observations: 'Aguardando preparação do ambiente',
                createdAt: '2024-07-21T00:00:00Z',
                updatedAt: '2024-07-21T00:00:00Z'
              },
              { 
                id: 'sub24', 
                title: 'Configuração final', 
                description: 'Configurações finais e validação do sistema',
                status: 'pending', 
                priority: 'medium',
                assignee: 'Pedro Costa',
                startDate: '2024-07-26',
                dueDate: '2024-07-30',
                actualEndDate: null,
                estimatedHours: 10,
                actualHours: 0,
                progress: 0,
                dependencies: ['sub23'],
                order: 3,
                code: '4.2.3',
                attachments: [],
                comments: [],
                observations: 'Aguardando deploy da aplicação',
                createdAt: '2024-07-26T00:00:00Z',
                updatedAt: '2024-07-26T00:00:00Z'
              }
            ]
          }
        ]
      }
    ]
  },
  
  // Atividades de exemplo
  activities: [
    {
      id: 'activity1',
      timestamp: '2024-04-15T10:30:00Z',
      action: 'Criação do Projeto',
      itemType: 'Projeto',
      itemName: 'Sistema de E-commerce',
      details: {
        criador: 'João Silva',
        dataCriacao: '2024-01-15'
      },
      user: 'João Silva'
    },
    {
      id: 'activity2',
      timestamp: '2024-04-15T09:15:00Z',
      action: 'Criação de Fase',
      itemType: 'Fase',
      itemName: 'Fase 1: Análise e Planejamento',
      details: {
        dataInicio: '2024-01-15',
        dataFim: '2024-02-15'
      },
      user: 'João Silva'
    },
    {
      id: 'activity3',
      timestamp: '2024-04-15T08:45:00Z',
      action: 'Criação de Tarefa',
      itemType: 'Tarefa',
      itemName: 'Análise de Requisitos',
      details: {
        responsavel: 'João Silva',
        prioridade: 'high',
        horasEstimadas: 40
      },
      user: 'João Silva'
    }
  ]
} */

export default function ProjectDetailPage() {

  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { remove: removeProject, upsert: upsertProject, syncFromApi } = useProjectStore()
  const user = useAuthStore(s => s.user)
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [showTimeline, setShowTimeline] = useState(true)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editingSubtask, setEditingSubtask] = useState<any>(null)
  const [editingPhase, setEditingPhase] = useState<any>(null)
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false)
  const [showAddSubtaskDialog, setShowAddSubtaskDialog] = useState(false)
  const [showAddPhaseDialog, setShowAddPhaseDialog] = useState(false)
  
  const [selectedPhase, setSelectedPhase] = useState<any>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [errors, setErrors] = useState<any>({})
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [forceRender, setForceRender] = useState(0)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [externalMembers, setExternalMembers] = useState<any[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [projectCanEdit, setProjectCanEdit] = useState<boolean | null>(null)

  // Função auxiliar para parsear campos JSON do projeto retornado pela API
  const parseProjectFromApi = React.useCallback((project: any) => {
    if (!project) return project
    
    const parsedProject = { ...project }
    
    // Parsear timeline se for string
    if (parsedProject.timeline && typeof parsedProject.timeline === 'string') {
      try {
        parsedProject.timeline = JSON.parse(parsedProject.timeline)
      } catch (e) {
        parsedProject.timeline = { phases: [] }
      }
    }
    
    // Parsear activities se for string
    if (parsedProject.activities && typeof parsedProject.activities === 'string') {
      try {
        parsedProject.activities = JSON.parse(parsedProject.activities)
      } catch (e) {
        parsedProject.activities = []
      }
    } else if (!parsedProject.activities) {
      parsedProject.activities = []
    }
    
    // Parsear team se for string
    if (parsedProject.team && typeof parsedProject.team === 'string') {
      try {
        parsedProject.team = JSON.parse(parsedProject.team)
      } catch (e) {
        parsedProject.team = []
      }
    } else if (!parsedProject.team) {
      parsedProject.team = []
    }
    
    // Parsear tags se for string
    if (parsedProject.tags && typeof parsedProject.tags === 'string') {
      try {
        parsedProject.tags = JSON.parse(parsedProject.tags)
      } catch (e) {
        parsedProject.tags = []
      }
    } else if (!parsedProject.tags) {
      parsedProject.tags = []
    }
    
    return parsedProject
  }, [])

  // Função para buscar membros da equipe
  const fetchTeamMembers = React.useCallback(async () => {
    if (!id || id === '1') return
    
    setLoadingTeam(true)
    try {
      // Buscar membros da equipe (internos e externos)
      const response = await api.getProjectMembers(id)
      if (response) {
        setTeamMembers(response.internal || [])
        setExternalMembers(response.external || [])
      }
    } catch (error) {
      // Erro ao buscar membros da equipe
    } finally {
      setLoadingTeam(false)
    }
  }, [id])

  // Buscar membros da equipe quando o componente montar
  useEffect(() => {
    fetchTeamMembers()
  }, [id])

  // Dados para novos itens
  const [newPhaseData, setNewPhaseData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'nao_iniciado'
  })

  const [newTaskData, setNewTaskData] = useState({
    name: '',
    description: '',
    responsible: '',
    startDate: '',
    plannedEndDate: '',
    priority: 'medium',
    estimatedHours: '',
    observations: ''
  })

  const [newSubtaskData, setNewSubtaskData] = useState({
    name: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    assignee: '',
    hours: '',
    startDate: '',
    dueDate: '',
    observations: ''
  })

  // Funções para adicionar novos itens
  const handleAddPhase = React.useCallback(() => {
    // Abrir o diálogo
    setShowAddPhaseDialog(true)
    
    // Resetar o estado com valores padrão
    setNewPhaseData({
      name: '',
      startDate: '',
      endDate: '',
      status: 'nao_iniciado'
    })
  }, [])

  const handleAddTask = React.useCallback((phaseId: string) => {
    setSelectedPhase(phaseId)
    setShowAddTaskDialog(true)
    setNewTaskData({
      name: '',
      description: '',
      responsible: '',
      startDate: '',
      plannedEndDate: '',
      priority: 'medium',
      estimatedHours: '',
      observations: ''
    })
  }, [])

  const handleAddSubtask = React.useCallback((phaseId: string, taskId: string) => {
    setSelectedPhase(phaseId)
    setSelectedTask(taskId)
    setShowAddSubtaskDialog(true)
    
    setNewSubtaskData({
      name: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      assignee: '',
      hours: '',
      startDate: '',
      dueDate: '',
      observations: ''
    })
  }, [selectedPhase, selectedTask])

  const handleSavePhase = React.useCallback(async () => {
    // Validação simples dos campos obrigatórios
    if (!newPhaseData.name) {
      setErrors({ phase: 'Nome da etapa é obrigatório' })
      return
    }

    if (!project) {
      console.error('❌ Projeto é nulo')
      alert('Erro: Projeto não carregado')
      return
    }
    
    try {
      const newPhase = {
        id: `phase_${Date.now()}`,
        name: newPhaseData.name,
        startDate: newPhaseData.startDate || null,
        endDate: newPhaseData.endDate || null,
        progress: 0,
        status: newPhaseData.status,
        tasks: []
      }

      // Criar uma cópia profunda do projeto para garantir que o React detecte a mudança
      const updatedProject = JSON.parse(JSON.stringify(project))
      if (!updatedProject.timeline) {
        updatedProject.timeline = { phases: [] }
      }
      if (!updatedProject.timeline.phases) {
        updatedProject.timeline.phases = []
      }
      
      updatedProject.timeline.phases.push(newPhase)
      
      // Preparar dados para envio: incluir apenas campos válidos do schema Prisma
      const projectDataToSend: any = {
        name: updatedProject.name,
        description: updatedProject.description,
        status: updatedProject.status,
        priority: updatedProject.priority,
        startDate: updatedProject.startDate,
        endDate: updatedProject.endDate,
        progress: updatedProject.progress ?? 0,
        budget: updatedProject.budget ?? null,
        clientId: updatedProject.clientId ?? null,
        managerId: updatedProject.managerId ?? null,
        ownerId: updatedProject.ownerId ?? null,
        team: updatedProject.team ?? [],
        tags: updatedProject.tags ?? [],
        color: updatedProject.color ?? '#1976d2',
        isPrivate: updatedProject.isPrivate ?? false,
        timeline: updatedProject.timeline ?? { phases: [] },
        activities: updatedProject.activities ?? []
      }
      
      // Remover campos undefined/null desnecessários
      Object.keys(projectDataToSend).forEach((key) => {
        if (projectDataToSend[key] === undefined) {
          delete projectDataToSend[key]
        }
      })
      
      // SALVAR NO BANCO DE DADOS
      try {
        // Chamar API para salvar o projeto atualizado
        const savedProject = await api.updateProject(project.id, projectDataToSend)
        
        // Garantir que o projeto retornado tenha campos JSON parseados
        let projectToUpdate
        if (savedProject) {
          projectToUpdate = parseProjectFromApi(savedProject)
        } else {
          projectToUpdate = updatedProject
        }
        
        // Atualizar estado usando uma nova referência para garantir re-renderização
        setProject(prevProject => {
          return { ...projectToUpdate }
        })
        
        // Forçar re-renderização para garantir que a UI seja atualizada
        setForceRender(prev => prev + 1)
      } catch (error) {
        console.error('❌ Erro ao salvar fase no banco:', error)
        alert('Erro ao salvar fase no banco de dados: ' + error)
        return
      }
      
      // Fechar o diálogo e limpar erros
      setShowAddPhaseDialog(false)
      setErrors({})
      
      // Limpar dados do formulário para próxima criação
      setNewPhaseData({
        name: '',
        startDate: '',
        endDate: '',
        status: 'nao_iniciado'
      })
      
    } catch (error) {
      console.error('❌ Erro ao salvar fase:', error)
      alert('Erro ao salvar fase: ' + error)
    }
  }, [project, newPhaseData, setErrors, setShowAddPhaseDialog, setForceRender])

  const handleSaveTask = React.useCallback(async () => {
    if (!newTaskData.name || !newTaskData.responsible) {
      setErrors({ task: 'Nome da tarefa e responsável são obrigatórios' })
      return
    }

    if (!project) {
      console.error('❌ Projeto é nulo')
      alert('Erro: Projeto não carregado')
      return
    }

    if (!project.timeline) {
      console.error('❌ Timeline do projeto é nulo')
      alert('Erro: Timeline do projeto não está disponível')
      return
    }

    if (!project.timeline.phases) {
      console.error('❌ Fases do projeto são nulas')
      alert('Erro: Fases do projeto não estão disponíveis')
      return
    }

    const newTask = {
      id: `task${Date.now()}`,
      name: newTaskData.name,
      description: newTaskData.description,
      responsible: newTaskData.responsible,
      startDate: newTaskData.startDate || null,
      plannedEndDate: newTaskData.plannedEndDate || null,
      actualEndDate: null,
      status: 'pending',
      progress: 0,
      priority: newTaskData.priority,
      estimatedHours: parseInt(newTaskData.estimatedHours) || 0,
      actualHours: 0,
      dependencies: [],
      observations: newTaskData.observations,
      subtasks: []
    }

    const updatedPhases = project.timeline.phases.map((phase: any) => {
      if (phase.id === selectedPhase) {
        return {
          ...phase,
          tasks: [...phase.tasks, newTask]
        }
      }
      return phase
    })

    const updatedProject = {
      ...project,
      timeline: {
        ...project.timeline,
        phases: updatedPhases
      }
    }

          // SALVAR NO BANCO DE DADOS
      console.log('💾 Salvando tarefa no banco de dados...')
      try {
        console.log('💾 Projeto para salvar:', updatedProject)
        console.log('💾 Tarefa criada:', newTask)
        
        // Chamar API para salvar o projeto atualizado
        const savedProject = await api.updateProject(project.id, updatedProject)
        
        console.log('✅ Tarefa salva com sucesso no banco de dados!')
        console.log('✅ Projeto retornado da API:', savedProject)
        
        // Atualizar estado local com o projeto retornado da API
        if (savedProject) {
          const parsedProject = parseProjectFromApi(savedProject)
          setProject(parsedProject)
          console.log('✅ Estado local atualizado com dados da API')
        } else {
          // Fallback: usar o projeto atualizado localmente se a API não retornar dados
          setProject(updatedProject)
          console.log('⚠️ API não retornou dados, usando estado local')
        }
      } catch (error) {
        console.error('❌ Erro ao salvar tarefa no banco:', error)
        alert('Erro ao salvar tarefa no banco de dados: ' + error)
        return
      }

    // Registrar log de criação da tarefa
    logActivity(
      'Criação de Tarefa',
      'Tarefa',
      newTask.name,
      {
        fase: project.timeline.phases.find((p: any) => p.id === selectedPhase)?.name,
        responsavel: newTask.responsible,
        prioridade: newTask.priority,
        horasEstimadas: newTask.estimatedHours
      }
    )

    // Atualizar progresso automaticamente após adicionar tarefa
    setTimeout(() => updateAllTaskProgress(), 100)

    setShowAddTaskDialog(false)
    setErrors({})
  }, [project, newTaskData, selectedPhase, setErrors, setShowAddTaskDialog, setForceRender])

  const handleSaveSubtask = React.useCallback(async () => {
    // Validações básicas
    
    if (!newSubtaskData.name) {
      setErrors({ subtask: 'Nome da subtarefa é obrigatório' })
      return
    }

    if (!project) {
      console.error('❌ Projeto é nulo')
      alert('Erro: Projeto não carregado')
      return
    }

    if (!project.timeline) {
      console.error('❌ Timeline do projeto é nulo')
      alert('Erro: Timeline do projeto não está disponível')
      return
    }

    if (!project.timeline.phases) {
      console.error('❌ Fases do projeto são nulas')
      alert('Erro: Fases do projeto não estão disponíveis')
      return
    }

    const newSubtask = {
      id: `sub${Date.now()}`,
      title: newSubtaskData.name,
      description: newSubtaskData.description || '',
      status: newSubtaskData.status,
      priority: newSubtaskData.priority || 'medium',
      assignee: newSubtaskData.assignee || undefined,
      startDate: newSubtaskData.startDate || null,
      dueDate: newSubtaskData.dueDate || null,
      actualEndDate: null,
      estimatedHours: parseInt(newSubtaskData.hours) || 0,
      actualHours: 0,
      progress: calculateSubtaskProgress({ status: newSubtaskData.status }),
      dependencies: [],
      order: 0,
      code: '',
      attachments: [],
      comments: [],
      observations: newSubtaskData.observations || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    // Criar uma cópia profunda do projeto para evitar problemas de mutação
    const updatedProject = JSON.parse(JSON.stringify(project))
    
    // Encontrar a fase específica
    
    const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => {
      return String(p.id) === String(selectedPhase)
    })
    
    if (phaseIndex === -1) {
      console.error('❌ Fase não encontrada:', selectedPhase)
      alert('Erro: Fase não encontrada')
      return
    }
    
    const targetPhase = updatedProject.timeline.phases[phaseIndex]
    
    // Encontrar a tarefa específica
    
    const taskIndex = targetPhase.tasks.findIndex((t: any) => {
      return String(t.id) === String(selectedTask)
    })
    
    if (taskIndex === -1) {
      console.error('❌ Tarefa não encontrada:', selectedTask)
      alert('Erro: Tarefa não encontrada')
      return
    }
    
    const targetTask = targetPhase.tasks[taskIndex]
    
    // Garantir que a tarefa tenha um array de subtarefas
    if (!targetTask.subtasks) {
      targetTask.subtasks = []
    }
    
    // Adicionar a nova subtarefa
    targetTask.subtasks.push(newSubtask)
    
    // SALVAR NO BANCO DE DADOS
    try {
      console.log('💾 handleSaveSubtask: Salvando subtarefa no banco...')
      console.log('💾 handleSaveSubtask: Subtarefa criada:', newSubtask)
      console.log('💾 handleSaveSubtask: Projeto atualizado:', {
        id: updatedProject.id,
        fases: updatedProject.timeline.phases.length,
        tarefasNaFase: targetPhase.tasks.length,
        subtarefasNaTarefa: targetTask.subtasks.length
      })
      
      // Chamar API para salvar o projeto atualizado
      const savedProject = await api.updateProject(project.id, updatedProject)
      
      console.log('✅ handleSaveSubtask: Resposta da API:', savedProject)
      console.log('✅ handleSaveSubtask: Subtarefa salva no banco com sucesso!')
      
      // Atualizar estado local com o projeto retornado da API
      if (savedProject) {
        const parsedProject = parseProjectFromApi(savedProject)
        console.log('✅ handleSaveSubtask: Projeto parseado da API:', {
          id: parsedProject.id,
          fases: parsedProject.timeline?.phases?.length,
          primeiraFase: parsedProject.timeline?.phases?.[0]?.name,
          tarefasNaPrimeiraFase: parsedProject.timeline?.phases?.[0]?.tasks?.length
        })
        
        // Verificar se as subtarefas estão no projeto parseado
        const firstPhase = parsedProject.timeline?.phases?.[0]
        const tasksWithSubtasks = firstPhase?.tasks?.filter((t: any) => t.subtasks && t.subtasks.length > 0)
        console.log('🔍 handleSaveSubtask: Tarefas com subtarefas:', tasksWithSubtasks?.length)
        if (tasksWithSubtasks && tasksWithSubtasks.length > 0) {
          const firstTask = tasksWithSubtasks[0]
          console.log('🔍 handleSaveSubtask: Primeira tarefa com subtarefas:', {
            tarefa: firstTask.name,
            subtarefas: firstTask.subtasks.length,
            subtarefasDetalhadas: firstTask.subtasks.map((s: any) => ({
              id: s.id,
              title: s.title,
              name: s.name,
              status: s.status,
              progress: s.progress
            }))
          })
        }
        
        // Logar TODAS as fases, tarefas e subtarefas
        console.log('🔍 handleSaveSubtask: ESTRUTURA COMPLETA do projeto parseado:')
        parsedProject.timeline?.phases?.forEach((phase: any, pIdx: number) => {
          console.log(`  Fase ${pIdx + 1}: ${phase.name} (${phase.tasks?.length || 0} tarefas)`)
          phase.tasks?.forEach((task: any, tIdx: number) => {
            console.log(`    Tarefa ${tIdx + 1}: ${task.name} (${task.subtasks?.length || 0} subtarefas)`)
            task.subtasks?.forEach((sub: any, sIdx: number) => {
              console.log(`      Subtarefa ${sIdx + 1}: ${sub.title || sub.name} [${sub.status}]`)
            })
          })
        })
        
        setProject(parsedProject)
        console.log('✅ handleSaveSubtask: Estado atualizado com parsedProject')
      } else {
        // Fallback: usar o projeto atualizado localmente se a API não retornar dados
        console.log('⚠️ handleSaveSubtask: API não retornou dados, usando estado local')
        setProject(updatedProject)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar subtarefa no banco:', error)
      alert('Erro ao salvar subtarefa no banco de dados: ' + error)
      return
    }
    
    // Forçar re-renderização
    setForceRender(prev => prev + 1)

    // Registrar log de criação da subtarefa
    const parentTask = updatedProject.timeline.phases
      .find((p: any) => String(p.id) === String(selectedPhase))
      ?.tasks.find((t: any) => String(t.id) === String(selectedTask))
    
    logActivity(
      'Criação de Subtarefa',
      'Subtarefa',
      newSubtask.title,
      {
        tarefaPai: parentTask?.name,
        fase: updatedProject.timeline.phases.find((p: any) => String(p.id) === String(selectedPhase))?.name,
        responsavel: newSubtask.assignee || 'Não atribuído',
        prioridade: newSubtask.priority,
        horasEstimadas: newSubtask.estimatedHours
      }
    )
    
    console.log('🔍 Log de atividade registrado')

    // Atualizar progresso automaticamente após adicionar subtarefa
    setTimeout(() => updateAllTaskProgress(), 100)

    setShowAddSubtaskDialog(false)
    setErrors({})
  }, [project, newSubtaskData, selectedPhase, selectedTask, setErrors, setShowAddSubtaskDialog, setForceRender])

  const handleCloseDialogs = () => {
    setShowAddPhaseDialog(false)
    setShowAddTaskDialog(false)
    setShowAddSubtaskDialog(false)
    setErrors({})
  }

  // Função para deletar subtarefa
  const handleDeleteSubtask = (phaseId: string, taskId: string, subtaskId: string) => {
    if (!project) {
      console.error('❌ Projeto é nulo, não é possível excluir subtarefa')
      alert('Erro: Projeto não carregado')
      return
    }
    
    if (confirm('Tem certeza que deseja excluir esta subtarefa?')) {
      setDeleteLoading(true)
      
      try {
        // Criar uma cópia profunda do projeto
        const updatedProject = JSON.parse(JSON.stringify(project))
        
        // Encontrar a fase específica
        const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => p.id === phaseId)
        if (phaseIndex === -1) {
          alert('Erro: Fase não encontrada')
          setDeleteLoading(false)
          return
        }
        
        // Encontrar a tarefa específica
        const taskIndex = updatedProject.timeline.phases[phaseIndex].tasks.findIndex((t: any) => t.id === taskId)
        if (taskIndex === -1) {
          alert('Erro: Tarefa não encontrada')
          setDeleteLoading(false)
          return
        }
        
        // Verificar se a tarefa tem subtarefas
        const currentTask = updatedProject.timeline.phases[phaseIndex].tasks[taskIndex]
        
        if (!currentTask.subtasks) {
          alert('Erro: Tarefa não tem subtarefas')
          setDeleteLoading(false)
          return
        }
        
        // Encontrar e remover a subtarefa
        const subtaskIndex = currentTask.subtasks.findIndex((s: any) => s.id === subtaskId)
        if (subtaskIndex === -1) {
          alert('Erro: Subtarefa não encontrada')
          setDeleteLoading(false)
          return
        }
        
        // Remover a subtarefa
        currentTask.subtasks.splice(subtaskIndex, 1)
        
        // Atualizar o estado do projeto de forma segura
        setProject(updatedProject)
        
        // Salvar no banco de dados
        upsertProject(updatedProject).catch(error => {
          console.error('❌ Erro ao salvar exclusão de subtarefa no banco:', error)
          alert('Erro ao salvar exclusão no banco de dados')
        })
        
        setDeleteLoading(false)
        alert('Subtarefa excluída com sucesso!')
        
      } catch (error) {
        console.error('❌ Erro ao excluir subtarefa:', error)
        alert('Erro ao excluir subtarefa: ' + error)
        setDeleteLoading(false)
      }
    }
  }

  // Função para deletar tarefa (incluindo subtarefas)
  const handleDeleteTask = (phaseId: string, taskId: string) => {
    if (!project) {
      console.error('❌ Projeto é nulo, não é possível excluir tarefa')
      alert('Erro: Projeto não carregado')
      return
    }
    
    if (confirm('Tem certeza que deseja excluir esta tarefa? Todas as subtarefas vinculadas também serão excluídas.')) {
      try {
        // Criar uma cópia profunda do projeto
        const updatedProject = JSON.parse(JSON.stringify(project))
        
        // Encontrar a fase específica
        const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => p.id === phaseId)
        if (phaseIndex === -1) {
          alert('Erro: Fase não encontrada')
          return
        }
        
        // Encontrar a tarefa específica
        const taskIndex = updatedProject.timeline.phases[phaseIndex].tasks.findIndex((t: any) => t.id === taskId)
        if (taskIndex === -1) {
          alert('Erro: Tarefa não encontrada')
          return
        }
        
        // Obter informações da tarefa antes de excluir
        const taskToDelete = updatedProject.timeline.phases[phaseIndex].tasks[taskIndex]
        const subtaskCount = taskToDelete.subtasks ? taskToDelete.subtasks.length : 0
        
        // Remover a tarefa (incluindo todas as subtarefas automaticamente)
        updatedProject.timeline.phases[phaseIndex].tasks.splice(taskIndex, 1)
        
        // Atualizar o estado do projeto de forma segura
        setProject(updatedProject)
        
        // Salvar no banco de dados
        upsertProject(updatedProject).catch(error => {
          console.error('❌ Erro ao salvar exclusão de tarefa no banco:', error)
          alert('Erro ao salvar exclusão no banco de dados')
        })
        
        alert(`Tarefa excluída com sucesso! ${subtaskCount} subtarefa(s) também foram removida(s).`)
        
      } catch (error) {
        console.error('❌ Erro ao excluir tarefa:', error)
        alert('Erro ao excluir tarefa: ' + error)
      }
    }
  }

  // Função para subir tarefa (e suas subtarefas) na ordem
  const handleMoveTaskUp = (phaseId: string, taskIndex: number) => {
    if (!project || taskIndex <= 0) return
    const updatedProject = JSON.parse(JSON.stringify(project))
    const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => p.id === phaseId)
    if (phaseIndex === -1 || !updatedProject.timeline.phases[phaseIndex].tasks?.length) return
    const tasks = updatedProject.timeline.phases[phaseIndex].tasks
    ;[tasks[taskIndex - 1], tasks[taskIndex]] = [tasks[taskIndex], tasks[taskIndex - 1]]
    setProject(updatedProject)
    upsertProject(updatedProject).catch((err: any) => {
      console.error('❌ Erro ao salvar ordem da tarefa:', err)
      alert('Erro ao salvar ordem no banco de dados')
    })
  }

  // Função para descer tarefa (e suas subtarefas) na ordem
  const handleMoveTaskDown = (phaseId: string, taskIndex: number) => {
    if (!project) return
    const phase = project.timeline?.phases?.find((p: any) => p.id === phaseId)
    const taskCount = phase?.tasks?.length ?? 0
    if (taskIndex < 0 || taskIndex >= taskCount - 1) return
    const updatedProject = JSON.parse(JSON.stringify(project))
    const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => p.id === phaseId)
    if (phaseIndex === -1 || !updatedProject.timeline.phases[phaseIndex].tasks?.length) return
    const tasks = updatedProject.timeline.phases[phaseIndex].tasks
    ;[tasks[taskIndex], tasks[taskIndex + 1]] = [tasks[taskIndex + 1], tasks[taskIndex]]
    setProject(updatedProject)
    upsertProject(updatedProject).catch((err: any) => {
      console.error('❌ Erro ao salvar ordem da tarefa:', err)
      alert('Erro ao salvar ordem no banco de dados')
    })
  }

  // Função para subir subtarefa na ordem
  const handleMoveSubtaskUp = (phaseId: string, taskId: string, subtaskIndex: number) => {
    if (!project || subtaskIndex <= 0) return
    const updatedProject = JSON.parse(JSON.stringify(project))
    const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => p.id === phaseId)
    if (phaseIndex === -1) return
    const taskIndex = updatedProject.timeline.phases[phaseIndex].tasks.findIndex((t: any) => t.id === taskId)
    if (taskIndex === -1 || !updatedProject.timeline.phases[phaseIndex].tasks[taskIndex].subtasks?.length) return
    const subtasks = updatedProject.timeline.phases[phaseIndex].tasks[taskIndex].subtasks
    ;[subtasks[subtaskIndex - 1], subtasks[subtaskIndex]] = [subtasks[subtaskIndex], subtasks[subtaskIndex - 1]]
    setProject(updatedProject)
    upsertProject(updatedProject).catch((err: any) => {
      console.error('❌ Erro ao salvar ordem da subtarefa:', err)
      alert('Erro ao salvar ordem no banco de dados')
    })
  }

  // Função para descer subtarefa na ordem
  const handleMoveSubtaskDown = (phaseId: string, taskId: string, subtaskIndex: number) => {
    if (!project) return
    const phase = project.timeline?.phases?.find((p: any) => p.id === phaseId)
    const task = phase?.tasks?.find((t: any) => t.id === taskId)
    const subtaskCount = task?.subtasks?.length ?? 0
    if (subtaskIndex < 0 || subtaskIndex >= subtaskCount - 1) return
    const updatedProject = JSON.parse(JSON.stringify(project))
    const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => p.id === phaseId)
    if (phaseIndex === -1) return
    const taskIndex = updatedProject.timeline.phases[phaseIndex].tasks.findIndex((t: any) => t.id === taskId)
    if (taskIndex === -1 || !updatedProject.timeline.phases[phaseIndex].tasks[taskIndex].subtasks?.length) return
    const subtasks = updatedProject.timeline.phases[phaseIndex].tasks[taskIndex].subtasks
    ;[subtasks[subtaskIndex], subtasks[subtaskIndex + 1]] = [subtasks[subtaskIndex + 1], subtasks[subtaskIndex]]
    setProject(updatedProject)
    upsertProject(updatedProject).catch((err: any) => {
      console.error('❌ Erro ao salvar ordem da subtarefa:', err)
      alert('Erro ao salvar ordem no banco de dados')
    })
  }

  // Função para subir etapa (fase) na ordem
  const handleMovePhaseUp = (phaseIndex: number) => {
    if (!project || phaseIndex <= 0) return
    const updatedProject = JSON.parse(JSON.stringify(project))
    const phases = updatedProject.timeline.phases
    ;[phases[phaseIndex - 1], phases[phaseIndex]] = [phases[phaseIndex], phases[phaseIndex - 1]]
    setProject(updatedProject)
    upsertProject(updatedProject).catch((err: any) => {
      console.error('❌ Erro ao salvar ordem da etapa:', err)
      alert('Erro ao salvar ordem no banco de dados')
    })
  }

  // Função para descer etapa (fase) na ordem
  const handleMovePhaseDown = (phaseIndex: number) => {
    if (!project) return
    const phaseCount = project.timeline?.phases?.length ?? 0
    if (phaseIndex < 0 || phaseIndex >= phaseCount - 1) return
    const updatedProject = JSON.parse(JSON.stringify(project))
    const phases = updatedProject.timeline.phases
    ;[phases[phaseIndex], phases[phaseIndex + 1]] = [phases[phaseIndex + 1], phases[phaseIndex]]
    setProject(updatedProject)
    upsertProject(updatedProject).catch((err: any) => {
      console.error('❌ Erro ao salvar ordem da etapa:', err)
      alert('Erro ao salvar ordem no banco de dados')
    })
  }

  // Função para gerar numeração hierárquica
  const generateTaskNumber = (phaseIndex: number, taskIndex: number) => {
    return `${phaseIndex + 1}.${taskIndex + 1}`
  }

  const generateSubtaskNumber = (phaseIndex: number, taskIndex: number, subtaskIndex: number) => {
    return `${phaseIndex + 1}.${taskIndex + 1}.${subtaskIndex + 1}`
  }

  // Função para editar tarefa
  const handleEditTask = (task: any) => {
    console.log('🔍 Editando tarefa:', task)
    console.log('🔍 Campos da tarefa:', {
      id: task.id,
      name: task.name,
      startDate: task.startDate,
      plannedEndDate: task.plannedEndDate,
      actualEndDate: task.actualEndDate,
      status: task.status,
      priority: task.priority
    })
    
    // Garantir que todos os campos de data estejam definidos
    const taskWithDates = {
      ...task,
      startDate: task.startDate && task.startDate !== 'null' ? task.startDate : null,
      plannedEndDate: task.plannedEndDate && task.plannedEndDate !== 'null' ? task.plannedEndDate : null,
      actualEndDate: task.actualEndDate && task.actualEndDate !== 'null' ? task.actualEndDate : null,
      priority: task.priority || 'medium',
      estimatedHours: task.estimatedHours || 0,
      actualHours: task.actualHours || 0,
      observations: task.observations || ''
    }
    
    setEditingTask(taskWithDates)
  }

  // Função para editar subtarefa
  const handleEditSubtask = (subtask: any, task: any) => {
    
    // Garantir que todos os campos de data estejam definidos
    const subtaskWithDates = {
      ...subtask,
      startDate: subtask.startDate && subtask.startDate !== 'null' ? subtask.startDate : null,
      dueDate: subtask.dueDate && subtask.dueDate !== 'null' ? subtask.dueDate : null,
      actualEndDate: subtask.actualEndDate && subtask.actualEndDate !== 'null' ? subtask.actualEndDate : null
    }
    
    setEditingSubtask(subtaskWithDates)
    setSelectedTask(task)
  }

  // Função para salvar edição de tarefa
  const handleSaveTaskEdit = () => {
    if (editingTask) {
      // Validação de datas
      if (editingTask.actualEndDate && editingTask.startDate) {
        const startDate = new Date(editingTask.startDate)
        const endDate = new Date(editingTask.actualEndDate)
        
        if (endDate < startDate) {
          alert('❌ A data de finalização não pode ser anterior à data de início!')
          return
        }
      }
      
      if (editingTask.actualEndDate && editingTask.plannedEndDate) {
        const plannedDate = new Date(editingTask.plannedEndDate)
        const endDate = new Date(editingTask.actualEndDate)
        
        if (endDate > plannedDate) {
          const confirmLate = confirm('⚠️ A data de finalização é posterior à data de entrega prevista. Deseja continuar?')
          if (!confirmLate) {
            return
          }
        }
      }
      // Atualizar o projeto com a tarefa editada
      const updatedProject = { ...project }
      updatedProject.timeline.phases.forEach((phase: any) => {
        phase.tasks.forEach((task: any) => {
          if (task.id === editingTask.id) {
            // Garantir que as datas sejam null se estiverem vazias
            const updatedTask = {
              ...editingTask,
              startDate: editingTask.startDate && editingTask.startDate !== '' ? editingTask.startDate : null,
              plannedEndDate: editingTask.plannedEndDate && editingTask.plannedEndDate !== '' ? editingTask.plannedEndDate : null,
              actualEndDate: editingTask.actualEndDate && editingTask.actualEndDate !== '' ? editingTask.actualEndDate : null
            }
            
            // Se a data de finalização foi definida e não for Cancelado, marcar como concluída
            if (updatedTask.actualEndDate && updatedTask.status !== 'completed' && updatedTask.status !== 'cancelado') {
              updatedTask.status = 'completed'
              updatedTask.progress = 100
              console.log('✅ Tarefa marcada como concluída automaticamente:', updatedTask.name)
            }
            // Status Cancelado não exige data de conclusão; progresso 0
            if (updatedTask.status === 'cancelado') {
              updatedTask.progress = 0
            }
            
            console.log('🔍 Tarefa atualizada:', {
              id: updatedTask.id,
              name: updatedTask.name,
              startDate: updatedTask.startDate,
              plannedEndDate: updatedTask.plannedEndDate,
              actualEndDate: updatedTask.actualEndDate,
              status: updatedTask.status,
              progress: updatedTask.progress
            })
            
            // Registrar log de atividade antes de atualizar
            logActivity(
              'Edição de Tarefa',
              'Tarefa',
              updatedTask.name,
              {
                campo: 'Dados da tarefa',
                valorAnterior: task,
                valorNovo: updatedTask
              }
            )
            
            Object.assign(task, updatedTask)
            console.log('✅ Tarefa atualizada com sucesso:', updatedTask.name)
          }
        })
      })
      setProject(updatedProject)
      setEditingTask(null)
      
      // Salvar no banco de dados
      upsertProject(updatedProject).catch(error => {
        console.error('❌ Erro ao salvar tarefa no banco:', error)
        alert('Erro ao salvar tarefa no banco de dados')
      })
      
      // Atualizar progresso automaticamente após edição
      setTimeout(() => updateAllTaskProgress(), 100)
    }
  }

  // Função para salvar edição de subtarefa
  const handleSaveSubtaskEdit = () => {
    if (editingSubtask && selectedTask) {
      // Validação de datas
      if (editingSubtask.actualEndDate && editingSubtask.startDate) {
        const startDate = new Date(editingSubtask.startDate)
        const endDate = new Date(editingSubtask.actualEndDate)
        
        if (endDate < startDate) {
          alert('❌ A data de finalização não pode ser anterior à data de início!')
          return
        }
      }
      
      if (editingSubtask.actualEndDate && editingSubtask.dueDate) {
        const dueDate = new Date(editingSubtask.dueDate)
        const endDate = new Date(editingSubtask.actualEndDate)
        
        if (endDate > dueDate) {
          const confirmLate = confirm('⚠️ A data de finalização é posterior à data de entrega prevista. Deseja continuar?')
          if (!confirmLate) {
            return
          }
        }
      }
      // Atualizar o projeto com a subtarefa editada
      const updatedProject = { ...project }
      updatedProject.timeline.phases.forEach((phase: any) => {
        phase.tasks.forEach((task: any) => {
          if (task.id === selectedTask.id) {
            task.subtasks.forEach((subtask: any) => {
              if (subtask.id === editingSubtask.id) {
                // Garantir que as datas sejam null se estiverem vazias
                const updatedSubtask = {
                  ...editingSubtask,
                  startDate: editingSubtask.startDate && editingSubtask.startDate !== '' ? editingSubtask.startDate : null,
                  dueDate: editingSubtask.dueDate && editingSubtask.dueDate !== '' ? editingSubtask.dueDate : null,
                  actualEndDate: editingSubtask.actualEndDate && editingSubtask.actualEndDate !== '' ? editingSubtask.actualEndDate : null
                }
                
                // Se a data de finalização foi definida e não for Cancelado, marcar como concluída
                if (updatedSubtask.actualEndDate && updatedSubtask.status !== 'completed' && updatedSubtask.status !== 'cancelado') {
                  updatedSubtask.status = 'completed'
                }
                
                // Recalcular progresso baseado no status atual (Cancelado = 0, não exige data de conclusão)
                updatedSubtask.progress = calculateSubtaskProgress(updatedSubtask)
                
                
                // Registrar log de atividade antes de atualizar
                logActivity(
                  'Edição de Subtarefa',
                  'Subtarefa',
                  updatedSubtask.title || updatedSubtask.name,
                  {
                    tarefaPai: task.name,
                    campo: 'Dados da subtarefa',
                    valorAnterior: subtask,
                    valorNovo: updatedSubtask
                  }
                )
                
                Object.assign(subtask, updatedSubtask)
              }
            })
          }
        })
      })
      setProject(updatedProject)
      setEditingSubtask(null)
      setSelectedTask(null)
      
      // Salvar no banco de dados
      upsertProject(updatedProject).catch(error => {
        console.error('❌ Erro ao salvar subtarefa no banco:', error)
        alert('Erro ao salvar subtarefa no banco de dados')
      })
      
      // Atualizar progresso automaticamente após edição
      setTimeout(() => updateAllTaskProgress(), 100)
    }
  }

  // Função para cancelar edições
  const handleCancelEdit = () => {
    setEditingTask(null)
    setEditingSubtask(null)
    setEditingPhase(null)
  }

  // Função para editar fase
  const handleEditPhase = (phase: any) => {
    setEditingPhase({ ...phase })
  }

  // Função para deletar fase
  const handleDeletePhase = (phaseId: string) => {
    if (!project) {
      console.error('❌ Projeto é nulo, não é possível excluir fase')
      alert('Erro: Projeto não carregado')
      return
    }
    
    if (confirm('Tem certeza que deseja excluir esta fase? Todas as tarefas e subtarefas vinculadas também serão excluídas.')) {
      try {
        // Criar uma cópia profunda do projeto
        const updatedProject = JSON.parse(JSON.stringify(project))
        
        // Encontrar a fase específica
        const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => p.id === phaseId)
        if (phaseIndex === -1) {
          alert('Erro: Fase não encontrada')
          return
        }
        
        // Obter informações da fase antes de excluir
        const phaseToDelete = updatedProject.timeline.phases[phaseIndex]
        const taskCount = phaseToDelete.tasks ? phaseToDelete.tasks.length : 0
        let subtaskCount = 0
        
        // Contar subtarefas
        if (phaseToDelete.tasks) {
          phaseToDelete.tasks.forEach((task: any) => {
            if (task.subtasks) {
              subtaskCount += task.subtasks.length
            }
          })
        }
        
        // Remover a fase (incluindo todas as tarefas e subtarefas automaticamente)
        updatedProject.timeline.phases.splice(phaseIndex, 1)
        
        // Atualizar o estado do projeto de forma segura
        setProject(updatedProject)
        
        // Salvar no banco de dados
        upsertProject(updatedProject).catch(error => {
          console.error('❌ Erro ao salvar exclusão de fase no banco:', error)
          alert('Erro ao salvar exclusão no banco de dados')
        })
        
        alert(`Fase excluída com sucesso! ${taskCount} tarefa(s) e ${subtaskCount} subtarefa(s) também foram removida(s).`)
        
      } catch (error) {
        console.error('❌ Erro ao excluir fase:', error)
        alert('Erro ao excluir fase: ' + error)
      }
    }
  }

  // Função para salvar edição de fase
  const handleSavePhaseEdit = () => {
    if (editingPhase) {
      // Atualizar o projeto com a fase editada
      const updatedProject = { ...project }
      updatedProject.timeline.phases.forEach((phase: any) => {
        if (phase.id === editingPhase.id) {
          // Garantir que as datas sejam null se estiverem vazias
          const updatedPhase = {
            ...editingPhase,
            startDate: editingPhase.startDate || null,
            endDate: editingPhase.endDate || null
          }
          
          // Registrar log de atividade antes de atualizar
          logActivity(
            'Edição de Fase',
            'Fase',
            updatedPhase.name,
            {
              campo: 'Dados da fase',
              valorAnterior: phase,
              valorNovo: updatedPhase
            }
          )
          
          Object.assign(phase, updatedPhase)
        }
      })
      setProject(updatedProject)
      setEditingPhase(null)
      
      // Salvar no banco de dados
      upsertProject(updatedProject).catch(error => {
        console.error('❌ Erro ao salvar fase no banco:', error)
        alert('Erro ao salvar fase no banco de dados')
      })
      
      // Não chamar updateAllTaskProgress após editar fase manualmente
      // pois isso pode sobrescrever mudanças manuais do usuário (como status)
      // O progresso será atualizado automaticamente quando necessário (ex: ao editar tarefas)
    }
  }

  // Diálogo de Edição de Tarefa
  const renderEditTaskDialog = () => (
    <Dialog 
      open={!!editingTask} 
      onClose={handleCancelEdit} 
      maxWidth="md" 
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>Editar Tarefa</DialogTitle>
      <DialogContent>
        {editingTask && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Tarefa"
                value={editingTask.name}
                onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={editingTask.description}
                onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Responsável"
                value={editingTask.responsible}
                onChange={(e) => setEditingTask({ ...editingTask, responsible: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingTask.status}
                  label="Status"
                  onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        zIndex: 1300
                      }
                    },
                    slotProps: {
                      paper: {
                        style: {
                          zIndex: 1300
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="pending">Não iniciado</MenuItem>
                  <MenuItem value="in_progress">Em Andamento</MenuItem>
                  <MenuItem value="completed">Concluída</MenuItem>
                  <MenuItem value="overdue">Em atraso</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horas Estimadas"
                type="number"
                value={editingTask.estimatedHours || 0}
                onChange={(e) => setEditingTask({ ...editingTask, estimatedHours: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horas Reais"
                type="number"
                value={editingTask.actualHours || 0}
                onChange={(e) => setEditingTask({ ...editingTask, actualHours: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Início"
                type="date"
                value={formatDateForInput(editingTask.startDate)}
                onChange={(e) => setEditingTask({ ...editingTask, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Entrega"
                type="date"
                value={formatDateForInput(editingTask.plannedEndDate)}
                onChange={(e) => setEditingTask({ ...editingTask, plannedEndDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Finalização"
                type="date"
                value={formatDateForInput(editingTask.actualEndDate || '')}
                onChange={(e) => setEditingTask({ ...editingTask, actualEndDate: e.target.value || undefined })}
                InputLabelProps={{ shrink: true }}
                helperText={editingTask.status === 'cancelado' ? 'Opcional para status Cancelado' : 'Data real de conclusão da tarefa'}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={editingTask.priority || 'medium'}
                  label="Prioridade"
                  onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        zIndex: 1300
                      }
                    },
                    slotProps: {
                      paper: {
                        style: {
                          zIndex: 1300
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="low">Baixa</MenuItem>
                  <MenuItem value="medium">Média</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                value={editingTask.observations || ''}
                onChange={(e) => setEditingTask({ ...editingTask, observations: e.target.value })}
                multiline
                rows={3}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelEdit}>Cancelar</Button>
        <Button onClick={handleSaveTaskEdit} variant="contained" color="primary">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )

  // Diálogo de Edição de Subtarefa
  const renderEditSubtaskDialog = () => (
    <Dialog 
      open={!!editingSubtask} 
      onClose={handleCancelEdit} 
      maxWidth="md" 
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      disableRestoreFocus
    >
      <DialogTitle>Editar Subtarefa</DialogTitle>
      <DialogContent>
        {editingSubtask && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Subtarefa"
                value={editingSubtask.title || editingSubtask.name}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, title: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={3}
                value={editingSubtask.description || ''}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, description: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingSubtask.status}
                  label="Status"
                  onChange={(e) => setEditingSubtask({ ...editingSubtask, status: e.target.value })}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        zIndex: 1300
                      }
                    },
                    slotProps: {
                      paper: {
                        style: {
                          zIndex: 1300
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="pending">Não iniciado</MenuItem>
                  <MenuItem value="in_progress">Em Andamento</MenuItem>
                  <MenuItem value="completed">Concluída</MenuItem>
                  <MenuItem value="overdue">Em atraso</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Prioridade</InputLabel>
                <Select
                  value={editingSubtask.priority || 'medium'}
                  label="Prioridade"
                  onChange={(e) => setEditingSubtask({ ...editingSubtask, priority: e.target.value })}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        zIndex: 1300
                      }
                    },
                    slotProps: {
                      paper: {
                        style: {
                          zIndex: 1300
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="low">Baixa</MenuItem>
                  <MenuItem value="medium">Média</MenuItem>
                  <MenuItem value="high">Alta</MenuItem>
                  <MenuItem value="urgent">Urgente</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Responsável"
                value={editingSubtask.assignee || ''}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, assignee: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horas Estimadas"
                type="number"
                value={editingSubtask.estimatedHours || editingSubtask.hours || 0}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, estimatedHours: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horas Reais"
                type="number"
                value={editingSubtask.actualHours || 0}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, actualHours: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Início"
                type="date"
                value={formatDateForInput(editingSubtask.startDate)}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Entrega"
                type="date"
                value={formatDateForInput(editingSubtask.dueDate)}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, dueDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Finalização"
                type="date"
                value={formatDateForInput(editingSubtask.actualEndDate || '')}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, actualEndDate: e.target.value || undefined })}
                InputLabelProps={{ shrink: true }}
                helperText={editingSubtask.status === 'cancelado' ? 'Opcional para status Cancelado' : 'Data real de conclusão da subtarefa'}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                multiline
                rows={3}
                value={editingSubtask.observations || ''}
                onChange={(e) => setEditingSubtask({ ...editingSubtask, observations: e.target.value })}
              />
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelEdit}>Cancelar</Button>
        <Button onClick={handleSaveSubtaskEdit} variant="contained" color="primary">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )

  // Diálogo de Edição de Fase
  const renderEditPhaseDialog = () => (
    <Dialog 
      open={!!editingPhase} 
      onClose={handleCancelEdit} 
      maxWidth="sm" 
      fullWidth
      sx={{ 
        '& .MuiDialog-paper': {
          zIndex: 1300
        }
      }}
    >
      <DialogTitle>Editar Fase</DialogTitle>
      <DialogContent>
        {editingPhase && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nome da Fase"
                value={editingPhase.name}
                onChange={(e) => setEditingPhase({ ...editingPhase, name: e.target.value })}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Início"
                type="date"
                value={formatDateForInput(editingPhase.startDate)}
                onChange={(e) => setEditingPhase({ ...editingPhase, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de Fim"
                type="date"
                value={formatDateForInput(editingPhase.endDate)}
                onChange={(e) => setEditingPhase({ ...editingPhase, endDate: e.target.value })}
                InputLabelProps={{ 
                  shrink: true 
                }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editingPhase.status}
                  label="Status"
                  onChange={(e) => setEditingPhase({ ...editingPhase, status: e.target.value })}
                  MenuProps={{
                    PaperProps: {
                      style: {
                        zIndex: 1300
                      }
                    },
                    slotProps: {
                      paper: {
                        style: {
                          zIndex: 1300
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="nao_iniciado">Não iniciado</MenuItem>
                  <MenuItem value="em_andamento">Em andamento</MenuItem>
                  <MenuItem value="concluido">Concluído</MenuItem>
                  <MenuItem value="pendente">Pendente</MenuItem>
                  <MenuItem value="cancelado">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCancelEdit}>Cancelar</Button>
        <Button onClick={handleSavePhaseEdit} variant="contained" color="primary">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  )

  // Função para migrar status antigos das fases para os novos valores
  const migratePhaseStatuses = (projectData: any) => {
    if (!projectData?.timeline?.phases) return projectData
    
    const migratedProject = { ...projectData }
    
    console.log('🔄 Migrando status das fases...')
    
    migratedProject.timeline.phases.forEach((phase: any) => {
      const oldStatus = phase.status
      
      // Migrar status antigos para novos valores
      if (phase.status === 'pending') {
        phase.status = 'nao_iniciado'
        console.log(`🔄 Fase "${phase.name}": ${oldStatus} → nao_iniciado`)
      } else if (phase.status === 'active') {
        phase.status = 'em_andamento'
        console.log(`🔄 Fase "${phase.name}": ${oldStatus} → em_andamento`)
      } else if (phase.status === 'completed') {
        phase.status = 'concluido'
        console.log(`🔄 Fase "${phase.name}": ${oldStatus} → concluido`)
      } else if (phase.status === 'planning') {
        phase.status = 'nao_iniciado'
        console.log(`🔄 Fase "${phase.name}": ${oldStatus} → nao_iniciado`)
      }
      
      // Se não tiver status definido, definir como 'nao_iniciado'
      if (!phase.status) {
        phase.status = 'nao_iniciado'
        console.log(`🔄 Fase "${phase.name}": sem status → nao_iniciado`)
      }
    })
    
    console.log('✅ Migração de status das fases concluída')
    return migratedProject
  }

  // Função para buscar o projeto do banco de dados
  const fetchProject = React.useCallback(async () => {
    if (!id) return
    
    setLoading(true)
    setError(null)
    setProjectCanEdit(null)
    
    try {
      console.log('🔍 Buscando projeto:', id)
      const [response, canEditRes] = await Promise.all([
        api.getProject(id),
        api.getProjectCanEdit(id).catch(() => ({ canEdit: false }))
      ])
      console.log('🔍 Resposta da API:', response)
      console.log('🔍 can-edit:', canEditRes)
      
      setProjectCanEdit(canEditRes.canEdit)
      
      if (response) {
        console.log('✅ Projeto carregado:', response)
        const parsedProject = parseProjectFromApi(response)
        const projectWithTimeline = {
          ...parsedProject,
          timeline: parsedProject.timeline || { phases: [] },
          activities: parsedProject.activities || []
        }
        const migratedProject = migratePhaseStatuses(projectWithTimeline)
        setProject(migratedProject)
        setEditData({ ...migratedProject })
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar projeto:', error)
      const msg = (error?.message || '').toString()
      const is403 = msg.includes('403') || error?.status === 403
      setError(is403 ? 'Acesso negado a este projeto.' : 'Erro ao carregar projeto. Verifique se o ID está correto.')
      setProjectCanEdit(false)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    // Buscar projeto do banco de dados
    fetchProject()
  }, [id])

  const handleEdit = () => {
    setEditData({ ...project })
    setEditing(true)
  }

  const handleSave = async () => {
    try {
      // Registrar log de edição do projeto
      logActivity(
        'Edição do Projeto',
        'Projeto',
        editData.name,
        {
          campo: 'Dados gerais do projeto',
          valorAnterior: project,
          valorNovo: editData
        }
      )

      // Salvar no banco de dados via store
      await upsertProject(editData)
      console.log('✅ Projeto salvo no banco de dados')

      // Atualizar estado local
      setProject(editData)
      setEditing(false)
      alert('Projeto atualizado com sucesso!')
    } catch (error) {
      console.error('❌ Erro ao salvar projeto:', error)
      alert(`Erro ao salvar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setEditData({ ...project })
  }

  const handleDelete = async () => {
    console.log('🚀 handleDelete chamada - Início')
    console.log('🚀 Project ID:', project?.id)
    
    if (!project?.id) {
      alert('Erro: ID do projeto não encontrado')
      return
    }

    try {
      // Mostrar loading
      setDeletingProject(true)
      
      console.log('🔍 Tentando deletar projeto:', project.id)
      console.log('🔍 Timestamp:', new Date().toISOString())
      
      // Chamar API para deletar o projeto
      const response = await api.deleteProject(project.id)
      
      console.log('🔍 Resposta da API:', response)
      
      // Verificar se a resposta indica sucesso
      if (response.error) {
        console.log('🔍 Resposta contém erro:', response.error)
        throw new Error(response.error + (response.details ? `: ${response.details}` : ''))
      }
      
      // Verificar se há informações de limpeza
      if (response.cleanup) {
        
        // Criar mensagem detalhada sobre o que foi deletado
        const cleanupDetails = []
        if (response.cleanup.subtasks > 0) cleanupDetails.push(`${response.cleanup.subtasks} subtarefas`)
        if (response.cleanup.tasks > 0) cleanupDetails.push(`${response.cleanup.tasks} tarefas`)
        if (response.cleanup.milestones > 0) cleanupDetails.push(`${response.cleanup.milestones} marcos`)
        if (response.cleanup.timelines > 0) cleanupDetails.push(`${response.cleanup.timelines} timelines`)
        if (response.cleanup.externalMembers > 0) cleanupDetails.push(`${response.cleanup.externalMembers} membros externos`)
        if (response.cleanup.members > 0) cleanupDetails.push(`${response.cleanup.members} membros da equipe`)
        if (response.cleanup.shareTokens > 0) cleanupDetails.push(`${response.cleanup.shareTokens} tokens de compartilhamento`)
        
        const cleanupMessage = cleanupDetails.length > 0 
          ? `\n\n🧹 Limpeza automática realizada:\n• ${cleanupDetails.join('\n• ')}`
          : ''
        
        // Registrar log de exclusão do projeto com detalhes da limpeza
        logActivity(
          'Exclusão do Projeto',
          'Projeto',
          project.name,
          {
            motivo: 'Exclusão manual pelo usuário com limpeza automática',
            dadosProjeto: project,
            limpeza: response.cleanup
          }
        )

        setDeleteDialogOpen(false)
        alert(`✅ Projeto deletado com sucesso!${cleanupMessage}`)
      } else {
        // Fallback para projetos sem relacionamentos
        logActivity(
          'Exclusão do Projeto',
          'Projeto',
          project.name,
          {
            motivo: 'Exclusão manual pelo usuário',
            dadosProjeto: project
          }
        )

        setDeleteDialogOpen(false)
        alert('✅ Projeto deletado com sucesso!')
      }
      
      // Atualizar o store local removendo o projeto excluído
      await removeProject(project.id)
      
      // Redirecionar para a lista de projetos
      navigate('/projetos')
      
    } catch (error) {
      console.error('❌ Erro ao deletar projeto:', error)
      alert(`Erro ao deletar projeto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setDeletingProject(false)
    }
  }

  const handleInputChange = (field: string, value: string | number) => {
    setEditData((prev: any) => ({
      ...prev,
      [field]: value
    }))
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors((prev: any) => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success'
      case 'paused': return 'warning'
      case 'completed': return 'primary'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'error'
      case 'high': return 'warning'
      case 'medium': return 'info'
      case 'low': return 'success'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <PlayArrow color="success" />
      case 'paused': return <Pause color="warning" />
      case 'completed': return <CheckCircle color="primary" />
      case 'cancelled': return <Stop color="error" />
      default: return <Schedule />
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo'
      case 'paused': return 'Pausado'
      case 'completed': return 'Concluído'
      case 'cancelled': return 'Cancelado'
      default: return status
    }
  }

  const getPhaseStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido': return 'Concluído'
      case 'em_andamento': return 'Em andamento'
      case 'nao_iniciado': return 'Não iniciado'
      case 'pendente': return 'Pendente'
      case 'cancelado': return 'Cancelado'
      default: return status || 'Pendente'
    }
  }

  const getPhaseStatusColor = (status: string) => {
    switch (status) {
      case 'concluido': return 'success'
      case 'em_andamento': return 'primary'
      case 'nao_iniciado': return 'warning'
      case 'pendente': return 'info'
      case 'cancelado': return 'default'
      default: return 'default'
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

  const getTaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" />
      case 'in_progress': return <Schedule color="primary" />
      case 'pending': return <Warning color="warning" />
      case 'overdue': return <Warning color="error" />
      case 'cancelado': return <Cancel color="action" />
      default: return <Schedule />
    }
  }

  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluída'
      case 'in_progress': return 'Em Andamento'
      case 'pending': return 'Não iniciado'
      case 'overdue': return 'Em atraso'
      case 'cancelado': return 'Cancelado'
      default: return status
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': return 'primary'
      case 'pending': return 'warning'
      case 'overdue': return 'error'
      case 'cancelado': return 'default'
      default: return 'default'
    }
  }

  // Função específica para cores de subtarefas (cores mais suaves)
  const getSubtaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': return 'info'
      case 'pending': return 'default'
      case 'overdue': return 'warning'
      case 'cancelado': return 'default'
      default: return 'default'
    }
  }

  const getSubtaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" sx={{ fontSize: '0.9rem' }} />
      case 'in_progress': return <Schedule color="info" sx={{ fontSize: '0.9rem' }} />
      case 'pending': return <Warning color="action" sx={{ fontSize: '0.9rem' }} />
      case 'overdue': return <Warning color="warning" sx={{ fontSize: '0.9rem' }} />
      case 'cancelado': return <Cancel color="action" sx={{ fontSize: '0.9rem' }} />
      default: return <Schedule sx={{ fontSize: '0.9rem' }} />
    }
  }

  const getResponsibleName = (task: any) => {
    if (!task) return 'Não informado'
    if (typeof task.responsible === 'string' && task.responsible.trim().length > 0) return task.responsible
    if (task.assignee) {
      if (typeof task.assignee === 'string') return task.assignee
      return task.assignee.nome || task.assignee.name || 'Não informado'
    }
    if (task.responsible?.nome || task.responsible?.name) return task.responsible.nome || task.responsible.name
    return 'Não informado'
  }

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
  }

  // Função para formatar data para input type="date"
  // CORRIGIDA: Evita problemas de timezone extraindo diretamente a data
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString || dateString === 'null' || dateString === '') return ''
    try {
      // Se já está no formato YYYY-MM-DD, retorna diretamente
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString
      }
      
      // Se tem hora (formato ISO), extrai apenas a parte da data
      if (typeof dateString === 'string' && dateString.includes('T')) {
        return dateString.split('T')[0]
      }
      
      // Para outros formatos, usa Date mas com cuidado com timezone
      // Usa getFullYear, getMonth, getDate para evitar problemas de timezone
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      
      // Usa métodos locais para evitar conversão de timezone
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    } catch (error) {
      console.error('❌ Erro ao formatar data para input:', dateString, error)
      return ''
    }
  }

  // Função para verificar se uma tarefa está em atraso
  const checkOverdueStatus = (item: any) => {
    if (item.status === 'completed' || item.status === 'cancelado') return item.status
    
    const today = new Date()
    let dueDate: Date | null = null
    
    try {
      if (item.dueDate) {
        dueDate = new Date(item.dueDate)
      } else if (item.plannedEndDate) {
        dueDate = new Date(item.plannedEndDate)
      }
    } catch (error) {
      console.error('❌ Erro ao processar data:', item.dueDate || item.plannedEndDate, error)
      return item.status
    }
    
    if (dueDate && !isNaN(dueDate.getTime()) && today > dueDate && item.status !== 'completed') {
      return 'overdue'
    }
    
    return item.status
  }

  // Função para aplicar verificação de atraso em todas as tarefas e subtarefas
  const updateOverdueStatuses = () => {
    if (!project || !project.timeline || !project.timeline.phases) {
      console.log('⚠️ Projeto ou timeline é nulo, pulando verificação de atraso')
      return
    }
    
    const updatedProject = { ...project }
    
    updatedProject.timeline.phases.forEach((phase: any) => {
      if (!phase.tasks) {
        phase.tasks = []
        return
      }
      
      phase.tasks.forEach((task: any) => {
        // Verificar status da tarefa principal
        const oldStatus = task.status
        task.status = checkOverdueStatus(task)
        
        // Registrar log se o status mudou automaticamente
        if (oldStatus !== task.status && task.status === 'overdue') {
          logActivity(
            'Mudança Automática de Status',
            'Tarefa',
            task.name,
            {
              statusAnterior: oldStatus,
              statusNovo: task.status,
              motivo: 'Data de entrega ultrapassada automaticamente',
              tarefa: task.name,
              fase: phase.name
            }
          )
        }
        
        // Verificar status das subtarefas
        if (task.subtasks) {
          task.subtasks.forEach((subtask: any) => {
            const oldSubtaskStatus = subtask.status
            subtask.status = checkOverdueStatus(subtask)
            
            // Registrar log se o status da subtarefa mudou automaticamente
            if (oldSubtaskStatus !== subtask.status && subtask.status === 'overdue') {
              logActivity(
                'Mudança Automática de Status',
                'Subtarefa',
                subtask.title || subtask.name,
                {
                  statusAnterior: oldSubtaskStatus,
                  statusNovo: subtask.status,
                  motivo: 'Data de entrega ultrapassada automaticamente',
                  subtarefa: subtask.title || subtask.name,
                  tarefaPai: task.name,
                  fase: phase.name
                }
              )
            }
          })
        }
      })
    })
    
    setProject(updatedProject)
  }

  // Função para calcular progresso automático da subtarefa baseado no status
  const calculateSubtaskProgress = (subtask: any) => {
    switch (subtask.status) {
      case 'pending':
        return 0
      case 'in_progress':
        return 50
      case 'completed':
        return 100
      case 'blocked':
        return 25
      case 'cancelado':
        return 0
      default:
        return 0
    }
  }

  // Função para calcular progresso automático da tarefa baseado nas subtarefas
  const calculateTaskProgress = (task: any) => {
    if (!task.subtasks || task.subtasks.length === 0) {
      const completedStatuses = ['completed', 'concluída', 'concluido', 'concluida']
      if (String(task.status).toLowerCase() === 'cancelado') return 0
      const isCompletedWithDate =
        completedStatuses.includes(String(task.status).toLowerCase()) &&
        !!task.actualEndDate
      if (isCompletedWithDate) return 100
      return task.progress || 0
    }
    
    // Calcular média do progresso das subtarefas baseado no status
    const totalProgress = task.subtasks.reduce((sum: number, subtask: any) => {
      const subtaskProgress = calculateSubtaskProgress(subtask)
      return sum + subtaskProgress
    }, 0)
    
    const averageProgress = Math.round(totalProgress / task.subtasks.length)
    return averageProgress
  }

  // Função para calcular progresso automático da fase baseado nas tarefas
  const calculatePhaseProgress = (phase: any) => {
    if (!phase.tasks || phase.tasks.length === 0) return 0
    
    // Calcular média do progresso das tarefas (que já inclui o cálculo automático das subtarefas)
    const totalProgress = phase.tasks.reduce((sum: number, task: any) => {
      return sum + calculateTaskProgress(task)
    }, 0)
    
    return Math.round(totalProgress / phase.tasks.length)
  }

  // Função para atualizar progresso de todas as tarefas automaticamente
  const updateAllTaskProgress = React.useCallback(() => {
    console.log('🔍 updateAllTaskProgress executando...')
    
    // Usar setProject com função para pegar o estado mais recente
    setProject((currentProject: any) => {
      console.log('🔍 Projeto ATUAL no momento do cálculo:', currentProject)
      console.log('🔍 Timeline:', currentProject?.timeline)
      console.log('🔍 Fases:', currentProject?.timeline?.phases)
      
      if (!currentProject || !currentProject.timeline || !currentProject.timeline.phases) {
        console.log('⚠️ Projeto ou timeline é nulo, pulando atualização de progresso')
        return currentProject
      }
      
      const updatedProject = JSON.parse(JSON.stringify(currentProject))
      console.log('🔍 Projeto copiado para atualização:', updatedProject)
      
      // Array para coletar atividades geradas durante a atualização
      const activitiesToAdd: any[] = []
      
      // Função auxiliar para criar atividade e adicionar à lista
      const createActivity = (action: string, itemType: string, itemName: string, details?: any) => {
        const activity = {
          id: `activity${Date.now()}-${Math.random()}`,
          timestamp: new Date().toISOString(),
          action,
          itemType,
          itemName,
          details,
          user: 'Usuário Atual'
        }
        activitiesToAdd.push(activity)
        return activity
      }
      
      updatedProject.timeline.phases.forEach((phase: any) => {
        if (!phase.tasks) {
          phase.tasks = []
          phase.progress = 0
          return
        }
        
        phase.tasks.forEach((task: any) => {
          // Atualizar progresso das subtarefas baseado no status
          if (task.subtasks && task.subtasks.length > 0) {
            task.subtasks.forEach((subtask: any) => {
              const subtaskProgress = calculateSubtaskProgress(subtask)
              if (subtask.progress !== subtaskProgress) {
                subtask.progress = subtaskProgress
              }
            })
          }
          
          // Verificar se o progresso mudou
          const oldProgress = task.progress
          const newProgress = calculateTaskProgress(task)
          
          // Atualizar progresso da tarefa baseado nas subtarefas
          task.progress = newProgress
          
          // Registrar log se o progresso mudou automaticamente
          if (oldProgress !== newProgress && task.subtasks && task.subtasks.length > 0) {
            createActivity(
              'Atualização Automática de Progresso',
              'Tarefa',
              task.name,
              {
                progressoAnterior: oldProgress,
                progressoNovo: newProgress,
                motivo: 'Cálculo automático baseado no progresso das subtarefas',
                tarefa: task.name,
                fase: phase.name,
                subtarefas: task.subtasks.length
              }
            )
          }
          
          // Atualizar progresso da fase
          const oldPhaseProgress = phase.progress
          phase.progress = calculatePhaseProgress(phase)
          
          // Função auxiliar para determinar o status esperado baseado no progresso
          const getExpectedStatusFromProgress = (progress: number) => {
            if (progress === 0) return 'nao_iniciado'
            if (progress === 100) return 'concluido'
            if (progress > 0) return 'em_andamento'
            return 'pendente'
          }
          
          // Não alterar status de fases Canceladas
          const oldPhaseStatus = phase.status
          const didProgressChange = oldPhaseProgress !== phase.progress
          if (phase.status !== 'cancelado') {
            const expectedStatus = getExpectedStatusFromProgress(phase.progress)
            const isStatusInconsistent = phase.status !== expectedStatus
            if (didProgressChange && isStatusInconsistent) {
              phase.status = expectedStatus
            }
          }
          
          // Registrar log se o progresso da fase mudou
          if (didProgressChange) {
            createActivity(
              'Atualização Automática de Progresso',
              'Fase',
              phase.name,
              {
                progressoAnterior: oldPhaseProgress,
                progressoNovo: phase.progress,
                motivo: 'Cálculo automático baseado no progresso das tarefas',
                fase: phase.name,
                tarefas: phase.tasks.length
              }
            )
          }
          
          // Registrar log se o status da fase mudou automaticamente
          if (oldPhaseStatus !== phase.status && didProgressChange) {
            createActivity(
              'Mudança Automática de Status',
              'Fase',
              phase.name,
              {
                statusAnterior: oldPhaseStatus,
                statusNovo: phase.status,
                motivo: 'Atualização automática baseada no progresso',
                fase: phase.name,
                progresso: phase.progress
              }
            )
          }
        })
      })
      
      // Calcular progresso geral do projeto
      const oldProjectProgress = updatedProject.progress
      const totalProjectProgress = updatedProject.timeline.phases.reduce((sum: number, phase: any) => {
        return sum + phase.progress
      }, 0)
      
      updatedProject.progress = Math.round(totalProjectProgress / updatedProject.timeline.phases.length)
      
      // Registrar log se o progresso do projeto mudou
      if (oldProjectProgress !== updatedProject.progress) {
        createActivity(
          'Atualização Automática de Progresso',
          'Projeto',
          updatedProject.name,
          {
            progressoAnterior: oldProjectProgress,
            progressoNovo: updatedProject.progress,
            motivo: 'Cálculo automático baseado no progresso das fases',
            projeto: updatedProject.name,
            fases: updatedProject.timeline.phases.length
          }
        )
      }
      
      // Adicionar todas as atividades ao projeto
      if (activitiesToAdd.length > 0) {
        if (!updatedProject.activities) {
          updatedProject.activities = []
        }
        // Adicionar no início do array
        updatedProject.activities.unshift(...activitiesToAdd)
        
        // Manter apenas as últimas 100 atividades
        if (updatedProject.activities.length > 100) {
          updatedProject.activities = updatedProject.activities.slice(0, 100)
        }
        
        console.log(`📝 ${activitiesToAdd.length} atividade(s) adicionada(s) ao projeto`)
      }
    
      console.log('🔍 Projeto atualizado, retornando novo estado...')
      
      // Salvar progresso calculado no banco de dados
      upsertProject(updatedProject).catch(error => {
        console.error('❌ Erro ao salvar progresso no banco:', error)
      })
      
      return updatedProject
    })
  }, [])

  const renderTimelineView = (readOnly: boolean) => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Cronograma do Projeto
        </Typography>
        {!readOnly && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            size="medium"
            onClick={() => {
              console.log('🎯 CLIQUE NO BOTÃO NOVA ETAPA DETECTADO!')
              console.log('📊 Estado atual do projeto:', project)
              console.log('📊 Estado atual de showAddPhaseDialog:', showAddPhaseDialog)
              handleAddPhase()
            }}
            sx={{
              backgroundColor: '#1976d2',
              color: 'white',
              '&:hover': {
                backgroundColor: '#1565c0'
              },
              fontWeight: 'bold',
              boxShadow: 2
            }}
          >
            Nova Etapa
          </Button>
        )}
      </Box>

      {project.timeline && project.timeline.phases && project.timeline.phases.length > 0 ? (
        project.timeline.phases.map((phase: any, phaseIndex: number) => (
        <Accordion key={`${phase.id}-${forceRender}`} defaultExpanded={phaseIndex === 0}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  {phase.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip
                  label={getPhaseStatusLabel(phase.status)}
                  color={getPhaseStatusColor(phase.status)}
                  size="small"
                />
                <Typography variant="body2" fontWeight="bold">
                  {calculatePhaseProgress(phase)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={calculatePhaseProgress(phase)}
                  sx={{ width: 100, height: 8, borderRadius: 4 }}
                />
                
                {/* Botões de ação da fase - apenas para quem pode editar */}
                {!readOnly && (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Subir etapa">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleMovePhaseUp(phaseIndex)}
                          disabled={phaseIndex === 0}
                          color="default"
                          sx={{ width: 28, height: 28 }}
                        >
                          <KeyboardArrowUp sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Descer etapa">
                      <span>
                        <IconButton
                          size="small"
                          onClick={() => handleMovePhaseDown(phaseIndex)}
                          disabled={phaseIndex === (project.timeline?.phases?.length ?? 0) - 1}
                          color="default"
                          sx={{ width: 28, height: 28 }}
                        >
                          <KeyboardArrowDown sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => handleEditPhase(phase)}
                      color="primary"
                      sx={{ width: 28, height: 28 }}
                    >
                      <Edit sx={{ fontSize: '1rem' }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeletePhase(phase.id)}
                      color="error"
                      sx={{ width: 28, height: 28 }}
                    >
                      <Delete sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Box>
                )}
              </Box>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Tarefas da Fase
                </Typography>
                {!readOnly && (
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => handleAddTask(phase.id)}
                    variant="outlined"
                    color="primary"
                    sx={{ fontSize: '0.8rem' }}
                  >
                    Nova Tarefa
                  </Button>
                )}
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f8f9fa' }}>
                    <TableCell sx={{ fontWeight: 'bold', width: '60px' }}>Nº</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tarefa</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Responsável</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Início</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Previsão</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Conclusão</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '120px' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Prioridade</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Progresso</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Horas</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Observações</TableCell>
                    {!readOnly && <TableCell sx={{ fontWeight: 'bold', width: '140px' }}>Ações</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {phase.tasks.map((task: any, taskIndex: number) => (
                    <React.Fragment key={`${task.id}-${forceRender}`}>
                      {/* Linha da Tarefa Principal */}
                      <TableRow hover sx={{ backgroundColor: '#ffffff' }}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="bold" color="primary">
                            {generateTaskNumber(phaseIndex, taskIndex)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {task.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {task.description}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24 }}>
                              <Person />
                            </Avatar>
                            <Typography variant="body2">
                              {getUserName(task.responsible)}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(task.startDate)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(task.plannedEndDate)}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2">
                            {task.actualEndDate && task.actualEndDate !== 'null' && task.actualEndDate !== '' ? formatDate(task.actualEndDate) : '-'}
                          </Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            icon={getTaskStatusIcon(task.status)}
                            label={getTaskStatusLabel(task.status)}
                            color={getTaskStatusColor(task.status)}
                            size="small"
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Chip
                            label={task.priority || 'Média'}
                            size="small"
                            color={
                              task.priority === 'high' || task.priority === 'urgent' ? 'error' :
                              task.priority === 'medium' ? 'warning' : 'success'
                            }
                            variant="outlined"
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {task.progress}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={task.progress}
                              sx={{ width: 60, height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" fontWeight="bold">
                              {task.actualHours}/{task.estimatedHours}h
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Estimado: {task.estimatedHours}h
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Tooltip title={task.observations} placement="top">
                            <Typography variant="body2" sx={{ 
                              maxWidth: 150, 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {task.observations}
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        
                        {!readOnly && (
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                              <Tooltip title="Subir tarefa">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleMoveTaskUp(phase.id, taskIndex)}
                                    disabled={taskIndex === 0}
                                    color="default"
                                    sx={{ width: 28, height: 28 }}
                                  >
                                    <KeyboardArrowUp />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <Tooltip title="Descer tarefa">
                                <span>
                                  <IconButton
                                    size="small"
                                    onClick={() => handleMoveTaskDown(phase.id, taskIndex)}
                                    disabled={taskIndex === phase.tasks.length - 1}
                                    color="default"
                                    sx={{ width: 28, height: 28 }}
                                  >
                                    <KeyboardArrowDown />
                                  </IconButton>
                                </span>
                              </Tooltip>
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditTask(task)}
                                color="primary"
                              >
                                <Edit />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                onClick={() => handleDeleteTask(phase.id, task.id)}
                                color="error"
                              >
                                <Delete />
                              </IconButton>
                            </Box>
                          </TableCell>
                        )}
                      </TableRow>
                      
                      {/* Subtarefas da Tarefa Atual */}
                      {task.subtasks && task.subtasks.length > 0 && (
                        task.subtasks.map((subtask: any, subtaskIndex: number) => (
                          <TableRow key={`${task.id}-${subtask.id}-${forceRender}`} hover sx={{ 
                            backgroundColor: '#f8f9fa',
                            borderLeft: '4px solid #e3f2fd',
                            '&:hover': {
                              backgroundColor: '#e8f4fd'
                            }
                          }}>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="caption" fontWeight="bold" color="info.main">
                                  {generateSubtaskNumber(phaseIndex, taskIndex, subtaskIndex)}
                                </Typography>
                                {!readOnly && (
                                  <Button
                                    size="small"
                                    startIcon={<Add />}
                                    onClick={() => {
                                      console.log('🎯 BOTÃO + SUBTAREFA CLICADO!')
                                      console.log('🔍 Fase ID:', phase.id, 'Tarefa ID:', task.id)
                                      console.log('🔍 Tipo da fase ID:', typeof phase.id, 'Tipo da tarefa ID:', typeof task.id)
                                      handleAddSubtask(phase.id, task.id)
                                    }}
                                    variant="outlined"
                                    color="info"
                                    sx={{ fontSize: '0.6rem', py: 0, ml: 1 }}
                                  >
                                    +
                                  </Button>
                                )}
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Box>
                                <Typography variant="body2" fontWeight="bold">
                                  {subtask.title || subtask.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {subtask.description || 'Sem descrição'}
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ width: 24, height: 24 }}>
                                  <Person />
                                </Avatar>
                                <Typography variant="body2">
                                  {getUserName(subtask.assignee)}
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="body2">
                                {subtask.startDate ? formatDate(subtask.startDate) : '-'}
                              </Typography>
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="body2">
                                {subtask.dueDate ? formatDate(subtask.dueDate) : '-'}
                              </Typography>
                            </TableCell>
                            
                            <TableCell>
                              <Typography variant="body2">
                                {subtask.actualEndDate && subtask.actualEndDate !== 'null' && subtask.actualEndDate !== '' ? formatDate(subtask.actualEndDate) : '-'}
                              </Typography>
                              {subtask.actualEndDate && subtask.actualEndDate !== 'null' && subtask.actualEndDate !== '' && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Concluída
                                </Typography>
                              )}
                            </TableCell>
                            
                            <TableCell>
                              <Chip
                                icon={getSubtaskStatusIcon(subtask.status)}
                                label={getTaskStatusLabel(subtask.status)}
                                color={getSubtaskStatusColor(subtask.status)}
                                size="small"
                              />
                            </TableCell>
                            
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" fontWeight="bold" color="text.secondary">
                                  {subtask.progress || 0}%
                                </Typography>
                                <LinearProgress
                                  variant="determinate"
                                  value={subtask.progress || 0}
                                  sx={{ 
                                    width: 60, 
                                    height: 4, 
                                    borderRadius: 2,
                                    backgroundColor: '#e0e0e0',
                                    '& .MuiLinearProgress-bar': {
                                      backgroundColor: '#90caf9'
                                    }
                                  }}
                                />
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {subtask.actualHours || 0}/{subtask.estimatedHours || 0}h
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Estimado: {subtask.estimatedHours || 0}h
                                </Typography>
                              </Box>
                            </TableCell>
                            
                            <TableCell>
                              <Tooltip title={subtask.observations || 'Sem observações'} placement="top">
                                <Typography variant="body2" sx={{ 
                                  maxWidth: 150, 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {subtask.observations || 'Sem observações'}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            
                            {!readOnly && (
                              <TableCell>
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                  <Tooltip title="Subir subtarefa">
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleMoveSubtaskUp(phase.id, task.id, subtaskIndex)}
                                        disabled={subtaskIndex === 0}
                                        color="default"
                                        sx={{ width: 20, height: 20 }}
                                      >
                                        <KeyboardArrowUp sx={{ fontSize: '0.8rem' }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title="Descer subtarefa">
                                    <span>
                                      <IconButton
                                        size="small"
                                        onClick={() => handleMoveSubtaskDown(phase.id, task.id, subtaskIndex)}
                                        disabled={subtaskIndex === (task.subtasks?.length ?? 1) - 1}
                                        color="default"
                                        sx={{ width: 20, height: 20 }}
                                      >
                                        <KeyboardArrowDown sx={{ fontSize: '0.8rem' }} />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => handleEditSubtask(subtask, task)}
                                    color="primary"
                                    sx={{ width: 20, height: 20 }}
                                  >
                                    <Edit sx={{ fontSize: '0.8rem' }} />
                                  </IconButton>
                                  <IconButton 
                                    size="small" 
                                    onClick={() => {
                                      console.log('🔍 IDs para exclusão:', { 
                                        phaseId: phase.id, 
                                        taskId: task.id, 
                                        subtaskId: subtask.id 
                                      })
                                      handleDeleteSubtask(phase.id, task.id, subtask.id)
                                    }}
                                    color="error"
                                    disabled={deleteLoading}
                                    sx={{ width: 20, height: 20 }}
                                  >
                                    {deleteLoading ? (
                                      <CircularProgress size={16} color="error" />
                                    ) : (
                                      <Delete sx={{ fontSize: '0.8rem' }} />
                                    )}
                                  </IconButton>
                                </Box>
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      )}
                      
                      {/* Linha para adicionar nova subtarefa se não houver nenhuma */}
                      {!readOnly && (!task.subtasks || task.subtasks.length === 0) && (
                        <TableRow sx={{ 
                          backgroundColor: '#f8f9fa',
                          borderLeft: '4px solid #e3f2fd'
                        }}>
                          <TableCell>
                            <Typography variant="caption" fontWeight="bold" color="info.main">
                              {generateTaskNumber(phaseIndex, taskIndex)}.1
                            </Typography>
                          </TableCell>
                          <TableCell colSpan={10}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                Nenhuma subtarefa criada ainda
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<Add />}
                                onClick={() => {
                                  console.log('🎯 BOTÃO INCLUIR PRIMEIRA SUBTAREFA CLICADO!')
                                  console.log('🔍 Fase ID:', phase.id, 'Tarefa ID:', task.id)
                                  console.log('🔍 Tipo da fase ID:', typeof phase.id, 'Tipo da tarefa ID:', typeof task.id)
                                  handleAddSubtask(phase.id, task.id)
                                }}
                                variant="outlined"
                                color="info"
                                sx={{ fontSize: '0.7rem', py: 0.5 }}
                              >
                                Incluir Primeira Subtarefa
                              </Button>
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))
      ) : (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Nenhuma fase cadastrada para este projeto.
          </Typography>
        </Box>
      )}
    </Box>
  )

  const renderIndicatorsView = () => {
    if (!project?.timeline?.phases || project.timeline.phases.length === 0) {
      return (
        <Alert severity="info">
          Nenhum cronograma configurado para este projeto. Adicione fases e tarefas para visualizar os indicadores.
        </Alert>
      )
    }

    const phases = project.timeline.phases
    const tasks = phases.flatMap((phase: any) =>
      (phase.tasks || []).map((task: any) => ({
        ...task,
        phaseName: phase.name || 'Fase sem nome',
        type: 'task' as const
      }))
    )
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
    )
    const allItems = [...tasks, ...subtasks]

    if (allItems.length === 0) {
      return (
        <Alert severity="info">
          Nenhuma tarefa cadastrada no cronograma. Adicione tarefas para acompanhar os indicadores.
        </Alert>
      )
    }

    const now = new Date()
    const completedStatuses = ['completed', 'concluido', 'concluida', 'concluída', 'finalizado', 'finalizada', 'done']
    const inProgressStatuses = ['in_progress', 'em_andamento', 'em andamento', 'in-progress', 'ongoing', 'andamento', 'pendente', 'pending']

    const parseDate = (value?: string | null) => {
      if (!value || value === 'null' || value === 'undefined') return null
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date
    }

    const categorized = allItems.reduce(
      (acc, item) => {
        const status = (item.status || '').toString().toLowerCase()
        const planned = parseDate(item.plannedEndDate || item.dueDate)
        const actual = parseDate(item.actualEndDate)
        const progress =
          typeof item.progress === 'number'
            ? item.progress
            : Number(item.progress) || (item.type === 'subtask' ? calculateSubtaskProgress(item) : 0)
        const isCancelled = status === 'cancelado'
        const isCompleted = !isCancelled && (completedStatuses.includes(status) || progress >= 100 || !!actual)
        const isInProgress = inProgressStatuses.includes(status) || progress > 0
        const isDelayed = !!planned && !isCompleted && !isCancelled && now > planned
        const isCompletedLate = isCompleted && !!planned && !!actual && actual > planned
        const isCompletedOnTime = isCompleted && !isCompletedLate

        let category: 'delayed' | 'inProgress' | 'completedOnTime' | 'completedLate' | 'cancelled'

        if (isCancelled) {
          category = 'cancelled'
        } else if (isDelayed) {
          category = 'delayed'
        } else if (isCompletedLate) {
          category = 'completedLate'
        } else if (isCompletedOnTime) {
          category = 'completedOnTime'
        } else {
          category = 'inProgress'
        }

        acc[category].push({
          ...item,
          plannedDate: planned,
          actualDate: actual,
          normalizedStatus: status,
          progress
        })
        return acc
      },
      {
        delayed: [] as any[],
        inProgress: [] as any[],
        completedOnTime: [] as any[],
        completedLate: [] as any[],
        cancelled: [] as any[]
      }
    )

    const totalTasks = tasks.length
    const totalSubtasks = subtasks.length
    const totalItems = allItems.length
    const totalDelayed = categorized.delayed.length
    const totalInProgress = categorized.inProgress.length
    const totalCancelled = categorized.cancelled.length
    const totalFinalized = categorized.completedOnTime.length + categorized.completedLate.length + totalCancelled

    const categoryConfig: Record<
      'delayed' | 'inProgress' | 'completedOnTime' | 'completedLate' | 'cancelled',
      {
        title: string
        subtitle: string
        palette: 'error' | 'warning' | 'success' | 'default'
        icon: typeof Warning
      }
    > = {
      delayed: {
        title: 'Tarefas Atrasadas',
        subtitle: 'Ainda não concluídas e fora do prazo',
        palette: 'error',
        icon: Warning
      },
      inProgress: {
        title: 'Em Andamento',
        subtitle: 'Dentro do prazo ou aguardando',
        palette: 'warning',
        icon: Schedule
      },
      completedOnTime: {
        title: 'Entregues no Prazo',
        subtitle: 'Concluídas dentro do prazo',
        palette: 'success',
        icon: CheckCircle
      },
      completedLate: {
        title: 'Entregues com Atraso',
        subtitle: 'Concluídas após o prazo',
        palette: 'success',
        icon: CheckCircle
      },
      cancelled: {
        title: 'Cancelado',
        subtitle: 'Itens cancelados (sem data de conclusão)',
        palette: 'default',
        icon: Cancel
      }
    }

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
        key: 'finalized' as const,
        value: totalFinalized,
        percentage: totalItems ? Math.round((totalFinalized / totalItems) * 100) : 0
      }
    ]

    const summaryCardConfig: Record<'delayed' | 'inProgress' | 'finalized', { title: string; subtitle: string; palette: 'error' | 'warning' | 'success'; icon: typeof Warning }> = {
      delayed: categoryConfig.delayed,
      inProgress: categoryConfig.inProgress,
      finalized: {
        title: 'Finalizadas',
        subtitle: 'Entregues no prazo, com atraso e cancelados',
        palette: 'success',
        icon: CheckCircle
      }
    }

    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
          Indicadores do Cronograma
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Visualize rapidamente o status das tarefas e subtarefas do projeto. Os indicadores consideram o status atual, o prazo planejado e a data de conclusão (quando houver).
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          {summaryCards.map(card => {
            const config = summaryCardConfig[card.key]
            const IconComponent = config.icon
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: `${config.palette}.main`, width: 36, height: 36 }}>
                        <IconComponent fontSize="small" />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {config.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {config.subtitle}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="h4" fontWeight="bold" color={`${config.palette}.main`}>
                      {card.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {card.percentage}% dos itens ({totalTasks} tarefa{totalTasks === 1 ? '' : 's'} + {totalSubtasks} subtarefa{totalSubtasks === 1 ? '' : 's'})
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        {(['delayed', 'inProgress'] as const).map(categoryKey => {
          const categoryTasks = categorized[categoryKey]
          const config = categoryConfig[categoryKey]
          const IconComponent = config.icon

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
                      <Typography variant="body2" color="text.secondary">
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
                  <Typography variant="body2" color="text.secondary">
                    Nenhum item nesta categoria.
                  </Typography>
                ) : (
                  <List>
                    {categoryTasks
                      .sort((a, b) => {
                        const aDate = a.plannedDate ? a.plannedDate.getTime() : 0
                        const bDate = b.plannedDate ? b.plannedDate.getTime() : 0
                        return aDate - bDate
                      })
                      .map((task, index) => {
                        const plannedDateString = task.plannedDate ? formatDate(task.plannedDate.toISOString()) : 'Sem previsão'
                        const actualDateString = task.actualDate ? formatDate(task.actualDate.toISOString()) : null

                        return (
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
                              <ListItemIcon sx={{ minWidth: 44 }}>
                                <Avatar sx={{ bgcolor: `${config.palette}.light`, color: `${config.palette}.dark` }}>
                                  <IconComponent fontSize="small" />
                                </Avatar>
                              </ListItemIcon>
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
                                        label={getTaskStatusLabel(task.status)}
                                        size="small"
                                        variant="outlined"
                                        sx={{ borderColor: `${config.palette}.main`, color: `${config.palette}.main` }}
                                      />
                                    )}
                                  </Box>
                                }
                                secondary={
                                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                      Fase: <strong>{task.phaseName}</strong>
                                    </Typography>
                                    {task.type === 'subtask' && task.taskName && (
                                      <Typography variant="body2" color="text.secondary">
                                        Tarefa: <strong>{task.taskName}</strong>
                                      </Typography>
                                    )}
                                    <Typography variant="body2" color="text.secondary">
                                      Prazo: <strong>{plannedDateString}</strong>
                                    </Typography>
                                    {actualDateString && (
                                      <Typography variant="body2" color="text.secondary">
                                        Conclusão: <strong>{actualDateString}</strong>
                                      </Typography>
                                    )}
                                    <Typography variant="body2" color="text.secondary">
                                      Responsável: <strong>{getResponsibleName(task)}</strong>
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Progresso: <strong>{task.progress}%</strong>
                                    </Typography>
                                  </Box>
                                }
                              />
                            </ListItem>
                            {index < categoryTasks.length - 1 && <Divider component="li" />}
                          </React.Fragment>
                        )
                      })}
                  </List>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Card Finalizadas - com sub-status Entregues no Prazo e Entregues com Atraso */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ bgcolor: 'success.main', width: 40, height: 40 }}>
                  <CheckCircle />
                </Avatar>
                <Box>
                  <Typography variant="h6" color="success.main">
                    Finalizadas
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Entregues no prazo, com atraso e cancelados
                  </Typography>
                </Box>
              </Box>
              <Chip
                label={`${totalFinalized} item${totalFinalized === 1 ? '' : 's'}`}
                color="success"
                variant="outlined"
              />
            </Box>

            {totalFinalized === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nenhum item nesta categoria.
              </Typography>
            ) : (
              <Box>
                {(['completedOnTime', 'completedLate', 'cancelled'] as const).map(subKey => {
                  const subTasks = categorized[subKey]
                  const subConfig = categoryConfig[subKey]
                  const SubIcon = subConfig.icon
                  if (subTasks.length === 0) return null
                  return (
                    <Box key={subKey} sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" fontWeight="bold" color="text.secondary" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SubIcon fontSize="small" />
                        {subConfig.title} ({subTasks.length})
                      </Typography>
                      <List>
                        {subTasks
                          .sort((a, b) => {
                            const aDate = a.plannedDate ? a.plannedDate.getTime() : 0
                            const bDate = b.plannedDate ? b.plannedDate.getTime() : 0
                            return aDate - bDate
                          })
                          .map((task, index) => {
                            const plannedDateString = task.plannedDate ? formatDate(task.plannedDate.toISOString()) : 'Sem previsão'
                            const actualDateString = task.actualDate ? formatDate(task.actualDate.toISOString()) : null
                            return (
                              <React.Fragment key={task.id || `${task.name}-${task.phaseName}`}>
                                <ListItem
                                  alignItems="flex-start"
                                  sx={{ borderRadius: 1, mb: 1, '&:hover': { backgroundColor: 'grey.50' } }}
                                >
                                  <ListItemIcon sx={{ minWidth: 44 }}>
                                    <Avatar sx={{ bgcolor: subKey === 'cancelled' ? 'grey.400' : 'success.light', color: subKey === 'cancelled' ? 'grey.800' : 'success.dark' }}>
                                      <SubIcon fontSize="small" />
                                    </Avatar>
                                  </ListItemIcon>
                                  <ListItemText
                                    primary={
                                      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="subtitle1" fontWeight="bold">
                                          {task.name || (task.type === 'subtask' ? 'Subtarefa sem nome' : 'Tarefa sem nome')}
                                        </Typography>
                                        {task.type === 'subtask' && <Chip label="Subtarefa" size="small" variant="outlined" />}
                                        {task.priority && (
                                          <Chip label={getPriorityLabel(task.priority)} size="small" sx={{ backgroundColor: getPriorityColor(task.priority), color: 'white' }} />
                                        )}
                                        {task.status && (
                                          <Chip label={getTaskStatusLabel(task.status)} size="small" variant="outlined" sx={task.status === 'cancelado' ? { borderColor: 'grey.500', color: 'grey.700' } : { borderColor: 'success.main', color: 'success.main' }} />
                                        )}
                                      </Box>
                                    }
                                    secondary={
                                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                        <Typography variant="body2" color="text.secondary">Fase: <strong>{task.phaseName}</strong></Typography>
                                        {task.type === 'subtask' && task.taskName && (
                                          <Typography variant="body2" color="text.secondary">Tarefa: <strong>{task.taskName}</strong></Typography>
                                        )}
                                        <Typography variant="body2" color="text.secondary">Prazo: <strong>{plannedDateString}</strong></Typography>
                                        {actualDateString && (
                                          <Typography variant="body2" color="text.secondary">Conclusão: <strong>{actualDateString}</strong></Typography>
                                        )}
                                        <Typography variant="body2" color="text.secondary">Responsável: <strong>{getResponsibleName(task)}</strong></Typography>
                                        <Typography variant="body2" color="text.secondary">Progresso: <strong>{task.progress}%</strong></Typography>
                                      </Box>
                                    }
                                  />
                                </ListItem>
                                {index < subTasks.length - 1 && <Divider component="li" />}
                              </React.Fragment>
                            )
                          })}
                      </List>
                    </Box>
                  )
                })}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    )
  }

  const renderGanttView = () => (
    <ProjectGantt
      phases={project.timeline && project.timeline.phases ? project.timeline.phases : []}
      projectStartDate={project.startDate}
      projectEndDate={project.endDate}
    />
  )

  const renderStakeholdersView = () => (
    <Box sx={{ p: 3 }}>
              <Typography variant="h4" gutterBottom>Stakeholders</Typography>
      
      {/* Stakeholders */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Stakeholders</Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Gerente: {getUserName(project.manager?.name || project.manager)}
        </Typography>
      </Paper>

              {/* Stakeholders */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>Membros da Equipe</Typography>
        
        {loadingTeam ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        ) : teamMembers.length === 0 && externalMembers.length === 0 ? (
          <Alert severity="info">
            Nenhum membro da equipe cadastrado ainda.
            <br />
            Use a aba "Equipe" para adicionar membros internos e externos ao projeto.
          </Alert>
        ) : (
          <>
            {/* Membros Internos */}
            {teamMembers.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                  Membros Internos ({teamMembers.length})
                </Typography>
                <List>
                  {teamMembers.map((member) => (
                    <ListItem key={member.id}>
                      <ListItemIcon>
                        <Avatar>
                          <Person />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={getUserName(member.user?.name) || 'Nome não informado'}
                        secondary={`${member.role} • ${getUserName(member.user?.email) || 'Email não informado'}`}
                      />
                      <Chip
                        label={member.isActive ? "Ativo" : "Inativo"}
                        color={member.isActive ? "success" : "default"}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            {/* Membros Externos */}
            {externalMembers.length > 0 && (
              <>
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                  Membros Externos ({externalMembers.length})
                </Typography>
                <List>
                  {externalMembers.map((member) => (
                    <ListItem key={member.id}>
                      <ListItemIcon>
                        <Avatar>
                          <Business />
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={getUserName(member.name)}
                        secondary={`${getUserName(member.role)} • ${getUserName(member.company) || 'Empresa não informada'} • ${getUserName(member.email) || 'Email não informado'}`}
                      />
                      <Chip
                        label={member.isActive ? "Ativo" : "Inativo"}
                        color={member.isActive ? "success" : "default"}
                        size="small"
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </>
        )}
      </Paper>

      {/* Recursos Financeiros */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Recursos Financeiros</Typography>
        <Typography variant="body2" color="text.secondary">
          Orçamento: R$ {project.budget || 'Não definido'}
        </Typography>
      </Paper>

      {/* Recursos Materiais */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Recursos Materiais</Typography>
        <Typography variant="body2" color="text.secondary">
          Equipamentos e materiais necessários para o projeto.
        </Typography>
      </Paper>
    </Box>
  )

  // Estado para mapeamento responsável -> departamento e filtro (persistido no timeline)
  const [responsibleDepartments, setResponsibleDepartments] = React.useState<Record<string, string>>(() =>
    (project?.timeline as any)?.responsibleDepartments || (project as any)?.responsibleDepartments || {}
  )
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('')
  const [editDepartmentFor, setEditDepartmentFor] = React.useState<string | null>(null)
  const { areas, syncFromApi: syncMasterData } = useMasterDataStore()

  React.useEffect(() => {
    if (activeTab === 6 && areas.length === 0 && syncMasterData) {
      syncMasterData({ entities: ['areas'] }).catch(() => {})
    }
  }, [activeTab, areas.length, syncMasterData])

  React.useEffect(() => {
    const rd = (project?.timeline as any)?.responsibleDepartments || (project as any)?.responsibleDepartments
    if (rd && typeof rd === 'object') setResponsibleDepartments(rd)
  }, [project])

  const handleSaveDepartment = (responsibleName: string, department: string) => {
    const updated = { ...responsibleDepartments, [responsibleName]: department || '' }
    setResponsibleDepartments(updated)
    setEditDepartmentFor(null)
    const timeline = { ...(project?.timeline || {}), responsibleDepartments: updated } as any
    const updatedProject = { ...project, timeline } as any
    setProject(updatedProject)
    upsertProject(updatedProject).catch(() => {})
  }

  // Função para renderizar a aba de atividades (por responsável e departamento)
  const renderActivitiesView = () => {
    if (!project?.timeline?.phases || project.timeline.phases.length === 0) {
      return (
        <Box>
          <Alert severity="info">
            Nenhum cronograma configurado. Adicione fases e tarefas para visualizar as atividades por responsável.
          </Alert>
        </Box>
      )
    }
    const phases = project.timeline.phases
    const allItems = phases.flatMap((phase: any) => {
      const tasks = (phase.tasks || []).map((task: any) => ({
        ...task,
        name: task.name || task.title || 'Tarefa sem nome',
        phaseName: phase.name || 'Fase sem nome',
        type: 'task' as const,
        responsible: getResponsibleName({ responsible: task.responsible, assignee: task.assignee })
      }))
      const subtasks = (phase.tasks || []).flatMap((task: any) =>
        (task.subtasks || []).map((subtask: any) => ({
          ...subtask,
          name: subtask.title || subtask.name || 'Subtarefa sem nome',
          phaseName: phase.name || 'Fase sem nome',
          taskName: task.name || task.title || 'Tarefa sem nome',
          type: 'subtask' as const,
          responsible: getResponsibleName({ responsible: subtask.responsible, assignee: subtask.assignee })
        }))
      )
      return [...tasks, ...subtasks]
    }).filter((item: any) => item.responsible && item.responsible !== 'Não informado')

    const grouped = allItems.reduce((acc: Record<string, any[]>, item: any) => {
      const key = item.responsible
      if (!acc[key]) acc[key] = []
      acc[key].push(item)
      return acc
    }, {})

    let groupedEntries = Object.entries(grouped)
    if (departmentFilter) {
      groupedEntries = groupedEntries.filter(([resp]) => responsibleDepartments[resp] === departmentFilter)
    }
    groupedEntries.sort((a, b) => a[0].localeCompare(b[0]))

    return (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
          Atividades por Responsável
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tarefas e subtarefas do cronograma organizadas por responsável. Vincule cada responsável a um departamento para filtrar.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filtrar por departamento</InputLabel>
            <Select
              value={departmentFilter}
              label="Filtrar por departamento"
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {areas.map((area) => (
                <MenuItem key={area.id} value={area.nome}>{area.nome}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {groupedEntries.length === 0 ? (
          <Alert severity="info">
            {departmentFilter
              ? `Nenhum responsável vinculado ao departamento "${departmentFilter}".`
              : 'Nenhuma tarefa ou subtarefa com responsável atribuído.'}
          </Alert>
        ) : (
          <Stack spacing={2}>
            {groupedEntries.map(([responsibleName, items]) => {
              const dept = responsibleDepartments[responsibleName] || ''
              return (
                <Card key={responsibleName} sx={{ overflow: 'visible' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <Person />
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight="bold">{responsibleName}</Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            {editDepartmentFor === responsibleName ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Select
                                  size="small"
                                  value={dept}
                                  onChange={(e) => handleSaveDepartment(responsibleName, e.target.value)}
                                  sx={{ minWidth: 140 }}
                                  autoFocus
                                >
                                  <MenuItem value="">Sem departamento</MenuItem>
                                  {areas.map((area) => (
                                    <MenuItem key={area.id} value={area.nome}>{area.nome}</MenuItem>
                                  ))}
                                </Select>
                                <IconButton size="small" onClick={() => setEditDepartmentFor(null)}><Cancel fontSize="small" /></IconButton>
                              </Box>
                            ) : (
                              <>
                                {dept ? (
                                  <Chip label={dept} size="small" color="primary" variant="outlined" icon={<Business sx={{ fontSize: 16 }} />} />
                                ) : (
                                  <Typography variant="caption" color="text.secondary">Sem departamento</Typography>
                                )}
                                <IconButton size="small" onClick={() => setEditDepartmentFor(responsibleName)} title="Vincular departamento">
                                  <Edit sx={{ fontSize: 18 }} />
                                </IconButton>
                              </>
                            )}
                          </Box>
                        </Box>
                      </Box>
                      <Chip label={`${items.length} atividade${items.length === 1 ? '' : 's'}`} color="primary" variant="outlined" />
                    </Box>
                    <List dense>
                      {items
                        .sort((a: any, b: any) => {
                          const ad = a.plannedEndDate || a.dueDate || ''
                          const bd = b.plannedEndDate || b.dueDate || ''
                          return (ad || '').localeCompare(bd || '')
                        })
                        .map((item: any) => (
                          <ListItem key={item.id || `${item.name}-${item.phaseName}`} divider sx={{ py: 1 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: item.type === 'subtask' ? 'grey.400' : 'primary.light' }}>
                                <Assignment sx={{ fontSize: 18 }} />
                              </Avatar>
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight="bold">{item.name}</Typography>
                                  {item.type === 'subtask' && <Chip label="Subtarefa" size="small" variant="outlined" />}
                                  {item.status && (
                                    <Chip
                                      label={item.status}
                                      size="small"
                                      color={item.status?.toLowerCase().includes('conclu') ? 'success' : 'default'}
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                  <Typography variant="caption" color="text.secondary">Fase: {item.phaseName}</Typography>
                                  {item.type === 'subtask' && item.taskName && (
                                    <Typography variant="caption" color="text.secondary">Tarefa: {item.taskName}</Typography>
                                  )}
                                  {(item.plannedEndDate || item.dueDate) && (
                                    <Typography variant="caption" color="text.secondary">
                                      Prazo: {formatDate(String(item.plannedEndDate || item.dueDate || ''))}
                                    </Typography>
                                  )}
                                  {typeof item.progress === 'number' && (
                                    <Typography variant="caption" color="text.secondary">Progresso: {item.progress}%</Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                        ))}
                    </List>
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        )}

        {project?.activities && project.activities.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              Histórico de Atividades
            </Typography>
            <Paper>
              <List>
                {project.activities.slice(0, 20).map((activity: any) => (
                  <ListItem key={activity.id} divider>
                    <ListItemIcon>
                      <Avatar sx={{ width: 40, height: 40, bgcolor: 'grey.400' }}>
                        <Assignment />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="bold">{activity.action}</Typography>
                          <Chip label={activity.itemType} size="small" color="default" variant="outlined" />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {activity.itemName} • {new Date(activity.timestamp).toLocaleString('pt-BR')}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Box>
        )}
      </Box>
    )
  }

  // Função para registrar log de atividade
  // projectParam: projeto opcional para usar quando chamado de dentro de callbacks de setState
  const logActivity = React.useCallback((action: string, itemType: string, itemName: string, details?: any, projectParam?: any) => {
    try {
      console.log('📝 logActivity chamada com:', { action, itemType, itemName, details })
      
      // Usar o projeto passado como parâmetro ou o projeto do estado
      const projectToUse = projectParam || project
      
      if (!projectToUse) {
        console.warn('⚠️ Tentativa de log de atividade com projeto nulo')
        return
      }

      const activity = {
        id: `activity${Date.now()}`,
        timestamp: new Date().toISOString(),
        action,
        itemType,
        itemName,
        details,
        user: 'Usuário Atual' // Em produção, pegar do contexto de autenticação
      }

      console.log('📝 Atividade criada:', activity)

      // Se um projeto foi passado como parâmetro, adicionar a atividade diretamente nele
      // Caso contrário, usar setProject com callback
      if (projectParam) {
        // Quando chamado de dentro de updateAllTaskProgress, o projeto já está sendo atualizado
        // então não precisamos fazer nada aqui, a atividade será adicionada depois
        return activity
      }

      // Usar setProject com callback para evitar loops
      setProject((prevProject: any) => {
        if (!prevProject) return prevProject
        
        const updatedProject = { ...prevProject }
        if (!updatedProject.activities) {
          updatedProject.activities = []
        }
        updatedProject.activities.unshift(activity)
        
        // Manter apenas as últimas 100 atividades
        if (updatedProject.activities.length > 100) {
          updatedProject.activities = updatedProject.activities.slice(0, 100)
        }
        
        console.log('📝 Projeto atualizado com atividade:', updatedProject)
        return updatedProject
      })
      
      console.log('✅ Atividade registrada com sucesso')
    } catch (error) {
      console.error('❌ Erro ao registrar atividade:', error)
    }
  }, [project])

  // Função para verificar se uma subtarefa pode ser editada (sempre retorna true agora)
  const canEditSubtask = (subtask: any) => {
    return true // Todas as subtarefas podem ser editadas
  }

  // Função para mapear ID de usuário para nome
  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return 'Não atribuído'
    
    // Se for um ID (UUID), retornar um nome amigável
    if (typeof userId === 'string' && userId.length > 20) {
      // Mapear IDs conhecidos para nomes (temporário - em produção usar API)
      const userMap: { [key: string]: string } = {
        '7d2c34d1-0dd1-42b6-8760-fc94cbc4c714': 'João Silva',
        'manager-id-1': 'Maria Santos',
        'analyst-id-1': 'Pedro Costa',
        'developer-id-1': 'Ana Oliveira'
      }
      
      return userMap[userId] || `Usuário ${userId.slice(0, 8)}...`
    }
    
    // Se já for um nome, retornar como está
    return userId
  }

  // Função para verificar se uma tarefa pode ser editada (sempre retorna true agora)
  const canEditTask = (task: any) => {
    return true // Todas as tarefas podem ser editadas
  }

  // Pode editar: prioridade ao endpoint can-edit (fonte única). Fallback local se ainda não carregou.
  const fallbackCanEdit = project && user?.id && (
    (project as any).canEdit === true ||
    (project as any).isPrivate === true ||
    (user as any)?.role === 'admin' ||
    String((project as any).ownerId || '').trim() === String(user.id).trim() ||
    String((project as any).managerId || '').trim() === String(user.id).trim() ||
    ((project as any).ownerName && (user as any)?.name &&
      String((project as any).ownerName).trim().toLowerCase().split(/\s+/)[0] ===
      String((user as any).name).trim().toLowerCase().split(/\s+/)[0])
  )
  const userCanEdit = projectCanEdit === true || (projectCanEdit === null && !!fallbackCanEdit)

  // Loading state
  if (loading) {
    return (
      <Box sx={{ p: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Carregando projeto...</Typography>
      </Box>
    )
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => navigate('/projetos')} sx={{ mt: 2 }}>
          Voltar para Projetos
        </Button>
      </Box>
    )
  }

  // Verificação de segurança para evitar renderização com projeto nulo
  if (!project) {
    return (
      <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Projeto não encontrado
        </Typography>
        <Button variant="contained" onClick={() => navigate('/projetos')} sx={{ mt: 2 }}>
          Voltar para Projetos
        </Button>
      </Box>
    )
  }

  const readOnly = !userCanEdit

  return (
    <Box sx={{ p: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/projetos')}
                  sx={{ mr: 2 }}
                >
                  Voltar
                </Button>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                    {editing ? editData.name : project.name}
                  </Typography>
                </Box>
              </Box>
              
              <Stack direction="row" spacing={2}>
                {editing ? (
                  <>
                    <Button
                      variant="contained"
                      startIcon={<Save />}
                      onClick={handleSave}
                      color="success"
                    >
                      Salvar
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Cancel />}
                      onClick={handleCancel}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      startIcon={<Share />}
                      onClick={() => setShareModalOpen(true)}
                      color="primary"
                    >
                      Compartilhar
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<DownloadIcon />}
                      onClick={() => setExportModalOpen(true)}
                      color="secondary"
                    >
                      Exportar
                    </Button>

                    {userCanEdit && (
                      <Button
                        variant="outlined"
                        startIcon={<Edit />}
                        onClick={handleEdit}
                      >
                        Editar
                      </Button>
                    )}
                    {userCanEdit && (
                      <Button
                        variant="outlined"
                        startIcon={<Delete />}
                        onClick={() => setDeleteDialogOpen(true)}
                        color="error"
                        disabled={deletingProject}
                      >
                        {deletingProject ? 'Excluindo...' : 'Excluir'}
                      </Button>
                    )}
                  </>
                )}
              </Stack>
            </Box>

            {/* Status e Progresso */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Chip
                label={getStatusLabel(editing ? editData.status : project.status)}
                color={getStatusColor(editing ? editData.status : project.status)}
                size="medium"
              />
              <Chip
                label={getPriorityLabel(editing ? editData.priority : project.priority)}
                color={getPriorityColor(editing ? editData.priority : project.priority)}
                size="medium"
              />
              <Chip
                label={`${editing ? editData.progress : project.progress}% Concluído`}
                color="primary"
                size="medium"
              />
            </Box>

            {/* Barra de Progresso */}
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={editing ? editData.progress : project.progress}
                sx={{ height: 10, borderRadius: 5 }}
              />
            </Box>
          </Paper>

          {/* Tabs de Conteúdo */}
          <Paper sx={{ mb: 3 }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Visão Geral" />
          <Tab label="Cronograma" />
          <Tab label="Indicadores" />
          <Tab label="Gantt" />
          <Tab label="Stakeholders" />
          <Tab label="Equipe" />
          <Tab label="Atividades" />
            </Tabs>
          </Paper>

          {/* Conteúdo das Tabs */}
          {activeTab === 0 && (
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
                      {editing ? (editData.name || project.name) : (project.name || 'Sem nome')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                      <Chip
                        size="small"
                        label={project.status === 'active' ? 'Ativo' : project.status === 'completed' ? 'Concluído' : project.status === 'paused' ? 'Pausado' : 'Cancelado'}
                        color={project.status === 'active' ? 'success' : project.status === 'completed' ? 'primary' : project.status === 'paused' ? 'warning' : 'default'}
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={project.priority === 'urgent' ? 'Urgente' : project.priority === 'high' ? 'Alta' : project.priority === 'medium' ? 'Média' : 'Baixa'}
                        color={project.priority === 'urgent' || project.priority === 'high' ? 'error' : 'default'}
                      />
                      {(project as any)?.isPrivate && (
                        <Chip size="small" icon={<VisibilityOff sx={{ fontSize: 16 }} />} label="Privado" variant="outlined" />
                      )}
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
                        {project.timeline?.phases?.length ?? 0} fases · {(project.timeline?.phases ?? []).reduce((acc: number, p: any) => acc + (p.tasks?.length ?? 0), 0)} tarefas
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
                        <Assignment color="primary" />
                        <Typography variant="h6" fontWeight="bold">Informações do Projeto</Typography>
                      </Box>
                      <Grid container spacing={3}>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Nome do Projeto"
                            value={editing ? (editData.name || '') : (project.name || '')}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            disabled={!editing}
                            multiline
                            rows={2}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField
                            fullWidth
                            label="Descrição"
                            value={editing ? (editData.description || '') : (project.description || '')}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            disabled={!editing}
                            multiline
                            rows={4}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Flag color="primary" />
                        <Typography variant="h6" fontWeight="bold">Status e Datas</Typography>
                      </Box>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth disabled={!editing}>
                            <InputLabel>Status</InputLabel>
                            <Select
                              value={editing ? editData.status : project.status || 'active'}
                              label="Status"
                              onChange={(e) => handleInputChange('status', e.target.value)}
                              MenuProps={{
                                PaperProps: { style: { zIndex: 1300 } },
                                slotProps: { paper: { style: { zIndex: 1300 } } }
                              }}
                            >
                              <MenuItem value="active">Ativo</MenuItem>
                              <MenuItem value="paused">Pausado</MenuItem>
                              <MenuItem value="completed">Concluído</MenuItem>
                              <MenuItem value="cancelled">Cancelado</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth disabled={!editing}>
                            <InputLabel>Prioridade</InputLabel>
                            <Select
                              value={editing ? editData.priority : project.priority || 'medium'}
                              label="Prioridade"
                              onChange={(e) => handleInputChange('priority', e.target.value)}
                              MenuProps={{
                                PaperProps: { style: { zIndex: 1300 } },
                                slotProps: { paper: { style: { zIndex: 1300 } } }
                              }}
                            >
                              <MenuItem value="low">Baixa</MenuItem>
                              <MenuItem value="medium">Média</MenuItem>
                              <MenuItem value="high">Alta</MenuItem>
                              <MenuItem value="urgent">Urgente</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Data de Início"
                            type="date"
                            value={editing ? formatDateForInput(editData.startDate) : formatDateForInput(project.startDate) || ''}
                            onChange={(e) => handleInputChange('startDate', e.target.value)}
                            disabled={!editing}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Data de Término"
                            type="date"
                            value={editing ? formatDateForInput(editData.endDate) : formatDateForInput(project.endDate) || ''}
                            onChange={(e) => handleInputChange('endDate', e.target.value)}
                            disabled={!editing}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>

                  <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Notes color="primary" />
                        <Typography variant="h6" fontWeight="bold">Outros</Typography>
                      </Box>
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Gerente"
                            value={editing ? (editData.manager || '') : (project.manager || '')}
                            onChange={(e) => handleInputChange('manager', e.target.value)}
                            disabled={!editing}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Orçamento (R$)"
                            type="number"
                            value={editing ? (editData.budget || '') : (project.budget || '')}
                            onChange={(e) => handleInputChange('budget', Number(e.target.value))}
                            disabled={!editing}
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={Boolean(editing ? (editData as any)?.isPrivate : (project as any)?.isPrivate)}
                                onChange={(e) => {
                                  if (!editing) return
                                  setEditData((prev: any) => ({ ...prev, isPrivate: e.target.checked }))
                                }}
                                disabled={!editing}
                              />
                            }
                            label="Projeto privado (visível só para mim)"
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            fullWidth
                            label="Dono do projeto"
                            value={(project as any)?.ownerName || (project as any)?.ownerId || '—'}
                            disabled
                          />
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Sidebar */}
                <Grid item xs={12} md={4}>
                  <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <Timeline color="primary" />
                        <Typography variant="h6" fontWeight="bold">Resumo Rápido</Typography>
                      </Box>
                      <Stack spacing={2}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Fases</Typography>
                          <Typography variant="h6" fontWeight="bold" color="primary.main">
                            {project.timeline?.phases?.length ?? 0}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Tarefas</Typography>
                          <Typography variant="h6" fontWeight="bold" color="primary.main">
                            {(project.timeline?.phases ?? []).reduce((acc: number, p: any) => acc + (p.tasks?.length ?? 0), 0)}
                          </Typography>
                        </Box>
                        <Divider />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" color="text.secondary">Progresso</Typography>
                          <Typography variant="h6" fontWeight="bold" color="success.main">
                            {project.progress ?? 0}%
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                        <DateRange color="primary" />
                        <Typography variant="h6" fontWeight="bold">Resumo do Cronograma</Typography>
                      </Box>
                      <Stack spacing={2}>
                        {project.timeline?.phases?.length ? (
                          project.timeline.phases.map((phase: any) => (
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
                          ))
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            Nenhuma fase cadastrada.
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          )}

          {activeTab === 1 && renderTimelineView(readOnly)}
          {activeTab === 2 && renderIndicatorsView()}
          {activeTab === 3 && renderGanttView()}
          {activeTab === 4 && renderStakeholdersView()}
          {activeTab === 5 && <ProjectTeamManager projectId={project.id} readOnly={readOnly} />}
          {activeTab === 6 && renderActivitiesView()}

          {/* Dialog de Confirmação de Exclusão */}
          <Dialog 
            open={deleteDialogOpen} 
            onClose={() => setDeleteDialogOpen(false)}
            disableEnforceFocus
            disableAutoFocus
            disableRestoreFocus
          >
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent>
              <Typography gutterBottom>
                Tem certeza que deseja excluir o projeto "{project?.name || 'Projeto'}"? Esta ação não pode ser desfeita.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                🧹 <strong>Limpeza automática:</strong> Todos os relacionamentos (tarefas, membros, marcos, etc.) serão deletados automaticamente antes da exclusão do projeto.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
              <Button 
                onClick={handleDelete} 
                color="error" 
                variant="contained"
                disabled={deletingProject}
              >
                {deletingProject ? 'Excluindo...' : 'Excluir'}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Diálogo para Nova Etapa */}
          <Dialog 
            open={showAddPhaseDialog} 
            onClose={handleCloseDialogs} 
            maxWidth="sm" 
            fullWidth
            disableEnforceFocus
            disableAutoFocus
            disableRestoreFocus
            sx={{ 
              '& .MuiDialog-paper': {
                zIndex: 1300
              }
            }}
          >
            <DialogTitle>Nova Etapa</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <TextField
                  fullWidth
                  label="Nome da Etapa"
                  value={newPhaseData.name}
                  onChange={(e) => setNewPhaseData({ ...newPhaseData, name: e.target.value })}
                  sx={{ mb: 2 }}
                  error={!!errors.phase}
                  helperText={errors.phase}
                />
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Data de Início (Opcional)"
                      type="date"
                      value={formatDateForInput(newPhaseData.startDate)}
                      onChange={(e) => setNewPhaseData({ ...newPhaseData, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Data de Fim (Opcional)"
                      type="date"
                      value={formatDateForInput(newPhaseData.endDate)}
                      onChange={(e) => setNewPhaseData({ ...newPhaseData, endDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </Grid>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    value={newPhaseData.status}
                    onChange={(e) => setNewPhaseData({ ...newPhaseData, status: e.target.value })}
                    label="Status"
                    MenuProps={{
                      PaperProps: {
                        style: {
                          zIndex: 1300
                        }
                      },
                      slotProps: {
                        paper: {
                          style: {
                            zIndex: 1300
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem value="nao_iniciado">Não iniciado</MenuItem>
                    <MenuItem value="em_andamento">Em andamento</MenuItem>
                    <MenuItem value="concluido">Concluído</MenuItem>
                    <MenuItem value="pendente">Pendente</MenuItem>
                    <MenuItem value="cancelado">Cancelado</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialogs}>Cancelar</Button>
              <Button 
                onClick={handleSavePhase} 
                variant="contained"
              >
                Salvar
              </Button>
            </DialogActions>
          </Dialog>

          {/* Diálogo para Nova Tarefa */}
          <Dialog 
            open={showAddTaskDialog} 
            onClose={handleCloseDialogs} 
            maxWidth="md" 
            fullWidth
            disableEnforceFocus
            disableAutoFocus
            disableRestoreFocus
          >
            <DialogTitle>Nova Tarefa</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nome da Tarefa"
                      value={newTaskData.name}
                      onChange={(e) => setNewTaskData({ ...newTaskData, name: e.target.value })}
                      error={!!errors.task}
                      helperText={errors.task}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Descrição"
                      multiline
                      rows={3}
                      value={newTaskData.description}
                      onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Responsável"
                      value={newTaskData.responsible}
                      onChange={(e) => setNewTaskData({ ...newTaskData, responsible: e.target.value })}
                      error={!!errors.task}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel>Prioridade</InputLabel>
                      <Select
                        value={newTaskData.priority}
                        onChange={(e) => setNewTaskData({ ...newTaskData, priority: e.target.value })}
                        label="Prioridade"
                        MenuProps={{
                          PaperProps: {
                            style: {
                              zIndex: 1300
                            }
                          }
                        }}
                      >
                        <MenuItem value="low">Baixa</MenuItem>
                        <MenuItem value="medium">Média</MenuItem>
                        <MenuItem value="high">Alta</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Data de Início"
                      type="date"
                      value={formatDateForInput(newTaskData.startDate)}
                      onChange={(e) => setNewTaskData({ ...newTaskData, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.task}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Data de Previsão"
                      type="date"
                      value={formatDateForInput(newTaskData.plannedEndDate)}
                      onChange={(e) => setNewTaskData({ ...newTaskData, plannedEndDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                      error={!!errors.task}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Horas Estimadas"
                      type="number"
                      value={newTaskData.estimatedHours}
                      onChange={(e) => setNewTaskData({ ...newTaskData, estimatedHours: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observações"
                      multiline
                      rows={2}
                      value={newTaskData.observations}
                      onChange={(e) => setNewTaskData({ ...newTaskData, observations: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialogs}>Cancelar</Button>
              <Button onClick={handleSaveTask} variant="contained">Salvar</Button>
            </DialogActions>
          </Dialog>

          {/* Diálogo para Nova Subtarefa */}
          <Dialog 
            open={showAddSubtaskDialog} 
            onClose={handleCloseDialogs} 
            maxWidth="md" 
            fullWidth
            disableEnforceFocus
            disableAutoFocus
            disableRestoreFocus
          >
            <DialogTitle>Nova Subtarefa</DialogTitle>
            <DialogContent>
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Nome da Subtarefa"
                      value={newSubtaskData.name}
                      onChange={(e) => setNewSubtaskData({ ...newSubtaskData, name: e.target.value })}
                      error={!!errors.subtask}
                      helperText={errors.subtask}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Descrição"
                      multiline
                      rows={3}
                      value={newSubtaskData.description || ''}
                      onChange={(e) => setNewSubtaskData({ ...newSubtaskData, description: e.target.value })}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={newSubtaskData.status}
                        onChange={(e) => setNewSubtaskData({ ...newSubtaskData, status: e.target.value })}
                        label="Status"
                        MenuProps={{
                          PaperProps: {
                            style: {
                              zIndex: 1300
                            }
                          }
                        }}
                      >
                        <MenuItem value="pending">Não iniciado</MenuItem>
                        <MenuItem value="in_progress">Em Andamento</MenuItem>
                        <MenuItem value="completed">Concluída</MenuItem>
                        <MenuItem value="overdue">Em atraso</MenuItem>
                        <MenuItem value="cancelado">Cancelado</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <FormControl fullWidth>
                      <InputLabel>Prioridade</InputLabel>
                      <Select
                        value={newSubtaskData.priority || 'medium'}
                        onChange={(e) => setNewSubtaskData({ ...newSubtaskData, priority: e.target.value })}
                        label="Prioridade"
                        MenuProps={{
                          PaperProps: {
                            style: {
                              zIndex: 1300
                            }
                          }
                        }}
                      >
                        <MenuItem value="low">Baixa</MenuItem>
                        <MenuItem value="medium">Média</MenuItem>
                        <MenuItem value="high">Alta</MenuItem>
                        <MenuItem value="urgent">Urgente</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Responsável"
                      value={newSubtaskData.assignee || ''}
                      onChange={(e) => setNewSubtaskData({ ...newSubtaskData, assignee: e.target.value })}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Horas Estimadas"
                      type="number"
                      value={newSubtaskData.hours}
                      onChange={(e) => setNewSubtaskData({ ...newSubtaskData, hours: e.target.value })}
                      inputProps={{ min: 0 }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Data de Início"
                      type="date"
                      value={formatDateForInput(newSubtaskData.startDate)}
                      onChange={(e) => setNewSubtaskData({ ...newSubtaskData, startDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Data de Entrega"
                      type="date"
                      value={formatDateForInput(newSubtaskData.dueDate)}
                      onChange={(e) => setNewSubtaskData({ ...newSubtaskData, dueDate: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Observações"
                      multiline
                      rows={2}
                      value={newSubtaskData.observations || ''}
                      onChange={(e) => setNewSubtaskData({ ...newSubtaskData, observations: e.target.value })}
                    />
                  </Grid>
                </Grid>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialogs}>Cancelar</Button>
              <Button 
                onClick={() => {
                  console.log('🎯 BOTÃO SALVAR SUBTAREFA CLICADO!')
                  console.log('🔍 Estados antes de chamar handleSaveSubtask:')
                  console.log('🔍 selectedPhase:', selectedPhase)
                  console.log('🔍 selectedTask:', selectedTask)
                  console.log('🔍 newSubtaskData:', newSubtaskData)
                  handleSaveSubtask()
                }} 
                variant="contained"
              >
                Salvar
              </Button>
            </DialogActions>
          </Dialog>

          {renderEditTaskDialog()}
          {renderEditSubtaskDialog()}
          {renderEditPhaseDialog()}
          
          <ShareProjectModal
            open={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            projectId={project.id}
            projectName={project.name}
          />

          <ExportProjectModal
            open={exportModalOpen}
            onClose={() => setExportModalOpen(false)}
            project={project}
          />
        </Box>
    )
  }

