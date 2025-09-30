import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ProjectTeamManager from '../../components/ProjectTeamManager'
import ProjectGantt from '../../components/ProjectGantt'
import ShareProjectModal from '../../components/ShareProjectModal'

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
  CircularProgress
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
  Business,
  Share,

} from '@mui/icons-material'
import { api } from '../../lib/api.local'

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
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState<any>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
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
  const [forceRender, setForceRender] = useState(0)
  const [isSavingTask, setIsSavingTask] = useState(false)
  const [isSavingSubtask, setIsSavingSubtask] = useState(false)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [externalMembers, setExternalMembers] = useState<any[]>([])
  const [loadingTeam, setLoadingTeam] = useState(false)


  // Função para buscar membros da equipe
  const fetchTeamMembers = async () => {
    if (!id || id === '1') return
    
    setLoadingTeam(true)
    try {
      // Buscar membros da equipe (internos e externos)
      const response = await api.get(`/projects/${id}/members`)
      if (response.ok) {
        setTeamMembers(response.data?.internal || [])
        setExternalMembers(response.data?.external || [])
      }
    } catch (error) {
      console.error('Erro ao buscar membros da equipe:', error)
    } finally {
      setLoadingTeam(false)
    }
  }

  // Buscar membros da equipe quando o componente montar
  useEffect(() => {
    fetchTeamMembers()
  }, [id])

  // Função para registrar log de atividade
  const logActivity = (action: string, itemType: string, itemName: string, details?: any) => {
    try {
      console.log('📝 logActivity chamada com:', { action, itemType, itemName, details })
      console.log('📊 Estado do projeto na logActivity:', project)
      
      if (!project) {
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

      const updatedProject = { ...project }
      if (!updatedProject.activities) {
        updatedProject.activities = []
      }
      updatedProject.activities.unshift(activity)
      
      // Manter apenas as últimas 100 atividades
      if (updatedProject.activities.length > 100) {
        updatedProject.activities = updatedProject.activities.slice(0, 100)
      }
      
      console.log('📝 Projeto atualizado com atividade:', updatedProject)
      setProject(updatedProject)
      console.log('✅ Atividade registrada com sucesso')
    } catch (error) {
      console.error('❌ Erro ao registrar atividade:', error)
    }
  }

  // Dados para novos itens
  const [newPhaseData, setNewPhaseData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    status: 'pending'
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
  const handleAddPhase = () => {
    // Abrir o diálogo
    setShowAddPhaseDialog(true)
    
    // Resetar o estado com valores padrão
    setNewPhaseData({
      name: '',
      startDate: '',
      endDate: '',
      status: 'pending'
    })
  }

  const handleAddTask = (phaseId: string) => {
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
  }

  const handleAddSubtask = (phaseId: string, taskId: string) => {
    console.log('🎯 FUNÇÃO handleAddSubtask CHAMADA!')
    console.log('🔍 Adicionando subtarefa - Fase ID:', phaseId, 'Tarefa ID:', taskId)
    console.log('🔍 Estado atual de selectedPhase:', selectedPhase)
    console.log('🔍 Estado atual de selectedTask:', selectedTask)
    
    console.log('🔍 Chamando setSelectedPhase com:', phaseId)
    setSelectedPhase(phaseId)
    console.log('🔍 Chamando setSelectedTask com:', taskId)
    setSelectedTask(taskId)
    console.log('🔍 Chamando setShowAddSubtaskDialog com:', true)
    setShowAddSubtaskDialog(true)
    
    console.log('🔍 Estados definidos - selectedPhase:', phaseId, 'selectedTask:', taskId)
    console.log('🔍 Dialog aberto:', true)
    
    console.log('🔍 Resetando dados da subtarefa...')
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
    console.log('🔍 Dados da subtarefa resetados')
    console.log('🔍 Função handleAddSubtask concluída')
  }

  const handleSavePhase = async () => {
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
      
      // SALVAR NO BANCO DE DADOS
      console.log('💾 Salvando fase no banco de dados...')
      try {
        console.log('💾 Projeto para salvar:', updatedProject)
        console.log('💾 Fase criada:', newPhase)
        
        // Chamar API para salvar o projeto atualizado
        const savedProject = await api.updateProject(project.id, updatedProject)
        
        console.log('✅ Fase salva com sucesso no banco de dados!')
        console.log('✅ Projeto retornado do banco:', savedProject)
        
        // Atualizar o estado local com os dados reais do banco
        if (savedProject) {
          setProject(savedProject)
          console.log('✅ Estado local atualizado com dados do banco')
        } else {
          // Fallback: usar dados locais se a API não retornar dados
          setProject(updatedProject)
          console.log('⚠️ Usando dados locais como fallback')
        }
        
        // Forçar re-renderização
        setForceRender(prev => prev + 1)
      } catch (error) {
        console.error('❌ Erro ao salvar fase no banco:', error)
        alert('Erro ao salvar fase no banco de dados: ' + error)
        return
      }
      
      // Fechar o diálogo e limpar erros
      setShowAddPhaseDialog(false)
      setErrors({})
      
    } catch (error) {
      console.error('❌ Erro ao salvar fase:', error)
      alert('Erro ao salvar fase: ' + error)
    }
  }

  const handleSaveTask = async () => {
    if (!newTaskData.name || !newTaskData.responsible) {
      setErrors({ task: 'Nome da tarefa e responsável são obrigatórios' })
      return
    }

    setIsSavingTask(true)

    try {
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

    // ATUALIZAR ESTADO LOCAL IMEDIATAMENTE para UI responsiva
    console.log('🚀 Atualizando estado local imediatamente...')
    setProject(updatedProject)
    console.log('✅ Estado local atualizado, tarefa deve aparecer agora')

    // SALVAR NO BANCO DE DADOS
    console.log('💾 Salvando tarefa no banco de dados...')
    try {
      console.log('💾 Projeto para salvar:', updatedProject)
      console.log('💾 Tarefa criada:', newTask)
      
      // Chamar API para salvar o projeto atualizado
      const savedProject = await api.updateProject(project.id, updatedProject)
      
      console.log('✅ Tarefa salva com sucesso no banco de dados!')
      console.log('✅ Projeto retornado do banco:', savedProject)
      
      // Sincronizar com dados do servidor se disponível
      if (savedProject) {
        // FORÇAR atualização do estado para garantir re-render
        setProject(null) // Limpar primeiro
        setTimeout(() => {
          setProject(savedProject) // Re-definir com delay
          console.log('🔄 Estado sincronizado com servidor')
        }, 100)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar tarefa no banco:', error)
      alert('Erro ao salvar tarefa no banco de dados: ' + error)
      // Não retornar aqui, manter dados locais
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
    
    console.log('🎉 Tarefa criada e interface atualizada!')
  } catch (error) {
    console.error('❌ Erro geral ao salvar tarefa:', error)
    alert('Erro ao salvar tarefa: ' + error)
  } finally {
    setIsSavingTask(false)
  }

  const handleSaveSubtask = async () => {
    console.log('🎯 FUNÇÃO handleSaveSubtask CHAMADA!')
    console.log('🔍 Iniciando criação de subtarefa')
    console.log('🔍 Dados:', { newSubtaskData, selectedPhase, selectedTask })
    console.log('🔍 Projeto atual:', project)
    console.log('🔍 Timeline:', project?.timeline)
    console.log('🔍 Fases:', project?.timeline?.phases)
    
    // Verificar se os estados estão corretos
    console.log('🔍 selectedPhase:', selectedPhase, 'tipo:', typeof selectedPhase)
    console.log('🔍 selectedTask:', selectedTask, 'tipo:', typeof selectedTask)
    console.log('🔍 showAddSubtaskDialog:', showAddSubtaskDialog)
    
    console.log('🔍 Validando nome da subtarefa:', newSubtaskData.name)
    if (!newSubtaskData.name) {
      console.log('❌ Nome da subtarefa está vazio, retornando...')
      setErrors({ subtask: 'Nome da subtarefa é obrigatório' })
      return
    }
    console.log('✅ Nome da subtarefa válido')

    console.log('🔍 Validando projeto:', project)
    if (!project) {
      console.error('❌ Projeto é nulo')
      alert('Erro: Projeto não carregado')
      return
    }
    console.log('✅ Projeto válido')

    console.log('🔍 Validando timeline:', project.timeline)
    if (!project.timeline) {
      console.error('❌ Timeline do projeto é nulo')
      alert('Erro: Timeline do projeto não está disponível')
      return
    }
    console.log('✅ Timeline válida')

    console.log('🔍 Validando fases:', project.timeline.phases)
    if (!project.timeline.phases) {
      console.error('❌ Fases do projeto são nulas')
      alert('Erro: Fases do projeto não estão disponíveis')
      return
    }
    console.log('✅ Fases válidas')

    console.log('🔍 Criando objeto da nova subtarefa...')
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
      progress: 0,
      dependencies: [],
      order: 0,
      code: '',
      attachments: [],
      comments: [],
      observations: newSubtaskData.observations || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    console.log('🔍 Objeto da subtarefa criado com sucesso')

    console.log('🔍 Nova subtarefa criada:', newSubtask)
    
    // Criar uma cópia profunda do projeto para evitar problemas de mutação
    console.log('🔍 Criando cópia profunda do projeto...')
    const updatedProject = JSON.parse(JSON.stringify(project))
    console.log('🔍 Cópia criada:', updatedProject)
    
    // Encontrar a fase específica
    console.log('🔍 Procurando fase com ID:', selectedPhase)
    console.log('🔍 Tipo de selectedPhase:', typeof selectedPhase)
    console.log('🔍 Fases disponíveis:', updatedProject.timeline.phases.map((p: any) => ({ id: p.id, name: p.name, tipo: typeof p.id })))
    
    const phaseIndex = updatedProject.timeline.phases.findIndex((p: any) => {
      const match = String(p.id) === String(selectedPhase)
      console.log('🔍 Comparando fase:', p.id, 'com', selectedPhase, '→', match)
      return match
    })
    
    if (phaseIndex === -1) {
      console.error('❌ Fase não encontrada:', selectedPhase)
      console.error('❌ Fases disponíveis:', updatedProject.timeline.phases.map((p: any) => p.id))
      alert('Erro: Fase não encontrada')
      return
    }
    
    console.log('🔍 Fase encontrada no índice:', phaseIndex)
    const targetPhase = updatedProject.timeline.phases[phaseIndex]
    console.log('🔍 Fase encontrada:', targetPhase)
    
    // Encontrar a tarefa específica
    console.log('🔍 Procurando tarefa com ID:', selectedTask)
    console.log('🔍 Tipo de selectedTask:', typeof selectedTask)
    console.log('🔍 Tarefas disponíveis na fase:', targetPhase.tasks.map((t: any) => ({ id: t.id, name: t.name, tipo: typeof t.id })))
    
    const taskIndex = targetPhase.tasks.findIndex((t: any) => {
      const match = String(t.id) === String(selectedTask)
      console.log('🔍 Comparando tarefa:', t.id, 'com', selectedTask, '→', match)
      return match
    })
    
    if (taskIndex === -1) {
      console.error('❌ Tarefa não encontrada:', selectedTask)
      console.error('❌ Tarefas disponíveis:', targetPhase.tasks.map((t: any) => t.id))
      alert('Erro: Tarefa não encontrada')
      return
    }
    
    console.log('🔍 Tarefa encontrada no índice:', taskIndex)
    const targetTask = targetPhase.tasks[taskIndex]
    
    // Garantir que a tarefa tenha um array de subtarefas
    console.log('🔍 Verificando se tarefa tem subtarefas...')
    if (!targetTask.subtasks) {
      console.log('🔍 Tarefa não tem subtarefas, criando array vazio...')
      targetTask.subtasks = []
    }
    
    console.log('🔍 Subtarefas existentes:', targetTask.subtasks)
    console.log('🔍 Tipo de subtarefas:', typeof targetTask.subtasks)
    console.log('🔍 É array?', Array.isArray(targetTask.subtasks))
    
    // Adicionar a nova subtarefa
    console.log('🔍 Adicionando subtarefa ao array...')
    targetTask.subtasks.push(newSubtask)
    
    console.log('🔍 Subtarefas após adição:', targetTask.subtasks)
    console.log('🔍 Tarefa atualizada:', targetTask)
    console.log('🔍 Array de subtarefas é array?', Array.isArray(targetTask.subtasks))
    console.log('🔍 Número de subtarefas:', targetTask.subtasks.length)
    
    console.log('🔍 Projeto final atualizado:', updatedProject)
    
    // ATUALIZAR ESTADO LOCAL IMEDIATAMENTE para UI responsiva
    console.log('🚀 Atualizando estado local imediatamente...')
    setProject(updatedProject)
    console.log('✅ Estado local atualizado, subtarefa deve aparecer agora')

    // SALVAR NO BANCO DE DADOS
    console.log('💾 Salvando subtarefa no banco de dados...')
    try {
      console.log('💾 Projeto para salvar:', updatedProject)
      console.log('💾 Subtarefa criada:', newSubtask)
      
      // Chamar API para salvar o projeto atualizado
      const savedProject = await api.updateProject(project.id, updatedProject)
      
      console.log('✅ Subtarefa salva com sucesso no banco de dados!')
      console.log('✅ Projeto retornado do banco:', savedProject)
      
      // Sincronizar com dados do servidor se disponível
      if (savedProject) {
        // FORÇAR atualização do estado para garantir re-render
        setProject(null) // Limpar primeiro
        setTimeout(() => {
          setProject(savedProject) // Re-definir com delay
          console.log('🔄 Estado sincronizado com servidor')
        }, 100)
      }
    } catch (error) {
      console.error('❌ Erro ao salvar subtarefa no banco:', error)
      alert('Erro ao salvar subtarefa no banco de dados: ' + error)
      // Não retornar aqui, manter dados locais
    }
    
    // Forçar re-renderização
    setForceRender(prev => prev + 1)
    console.log('🔍 Forçando re-renderização com forceRender')

    // Registrar log de criação da subtarefa
    console.log('🔍 Registrando log de atividade...')
    const parentTask = updatedProject.timeline.phases
      .find((p: any) => String(p.id) === String(selectedPhase))
      ?.tasks.find((t: any) => String(t.id) === String(selectedTask))
    
    console.log('🔍 Tarefa pai encontrada:', parentTask)
    
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
    console.log('🔍 Chamando updateAllTaskProgress em 100ms...')
    setTimeout(() => {
      console.log('🔍 Executando updateAllTaskProgress...')
      updateAllTaskProgress()
    }, 100)

    console.log('🔍 Fechando diálogo de subtarefa...')
    setShowAddSubtaskDialog(false)
    console.log('🔍 Limpando erros...')
    setErrors({})
    
    console.log('✅ Subtarefa criada com sucesso!')
  }

  const handleCloseDialogs = () => {
    setShowAddPhaseDialog(false)
    setShowAddTaskDialog(false)
    setShowAddSubtaskDialog(false)
    setErrors({})
  }

  // Função para deletar subtarefa
  const handleDeleteSubtask = async (phaseId: string, taskId: string, subtaskId: string) => {
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
        
        // SALVAR NO BANCO DE DADOS
        console.log('💾 Salvando exclusão de subtarefa no banco de dados...')
        try {
          console.log('💾 Projeto para salvar:', updatedProject)
          
          // Chamar API para salvar o projeto atualizado
          const savedProject = await api.updateProject(project.id, updatedProject)
          
          console.log('✅ Exclusão de subtarefa salva com sucesso no banco de dados!')
          console.log('✅ Projeto retornado do banco:', savedProject)
          
          // Atualizar o estado local com os dados reais do banco
          if (savedProject) {
            setProject(savedProject)
            console.log('✅ Estado local atualizado com dados do banco')
          } else {
            // Fallback: usar dados locais se a API não retornar dados
            setProject(updatedProject)
            console.log('⚠️ Usando dados locais como fallback')
          }
          
          setDeleteLoading(false)
          alert('Subtarefa excluída com sucesso!')
        } catch (error) {
          console.error('❌ Erro ao salvar exclusão de subtarefa no banco:', error)
          alert('Erro ao salvar exclusão de subtarefa no banco de dados: ' + error)
          setDeleteLoading(false)
        }
        
      } catch (error) {
        console.error('❌ Erro ao excluir subtarefa:', error)
        alert('Erro ao excluir subtarefa: ' + error)
        setDeleteLoading(false)
      }
    }
  }

  // Função para deletar tarefa (incluindo subtarefas)
  const handleDeleteTask = async (phaseId: string, taskId: string) => {
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
        
        // SALVAR NO BANCO DE DADOS
        console.log('💾 Salvando exclusão de tarefa no banco de dados...')
        try {
          console.log('💾 Projeto para salvar:', updatedProject)
          
          // Chamar API para salvar o projeto atualizado
          const savedProject = await api.updateProject(project.id, updatedProject)
          
          console.log('✅ Exclusão de tarefa salva com sucesso no banco de dados!')
          console.log('✅ Projeto retornado do banco:', savedProject)
          
          // Atualizar o estado local com os dados reais do banco
          if (savedProject) {
            setProject(savedProject)
            console.log('✅ Estado local atualizado com dados do banco')
          } else {
            // Fallback: usar dados locais se a API não retornar dados
            setProject(updatedProject)
            console.log('⚠️ Usando dados locais como fallback')
          }
          
          alert(`Tarefa excluída com sucesso! ${subtaskCount} subtarefa(s) também foram removida(s).`)
        } catch (error) {
          console.error('❌ Erro ao salvar exclusão de tarefa no banco:', error)
          alert('Erro ao salvar exclusão de tarefa no banco de dados: ' + error)
        }
        
      } catch (error) {
        console.error('❌ Erro ao excluir tarefa:', error)
        alert('Erro ao excluir tarefa: ' + error)
      }
    }
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
    setEditingTask({ ...task })
  }

  // Função para editar subtarefa
  const handleEditSubtask = (subtask: any, task: any) => {
    setEditingSubtask({ ...subtask })
    setSelectedTask(task)
  }

  // Função para salvar edição de tarefa
  const handleSaveTaskEdit = async () => {
    if (editingTask) {
      // Atualizar o projeto com a tarefa editada
      const updatedProject = { ...project }
      updatedProject.timeline.phases.forEach((phase: any) => {
        phase.tasks.forEach((task: any) => {
          if (task.id === editingTask.id) {
            // Garantir que as datas sejam null se estiverem vazias
            const updatedTask = {
              ...editingTask,
              startDate: editingTask.startDate || null,
              plannedEndDate: editingTask.plannedEndDate || null
            }
            
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
          }
        })
      })
      
      // SALVAR NO BANCO DE DADOS
      console.log('💾 Salvando edição de tarefa no banco de dados...')
      try {
        console.log('💾 Projeto para salvar:', updatedProject)
        
        // Chamar API para salvar o projeto atualizado
        const savedProject = await api.updateProject(project.id, updatedProject)
        
        console.log('✅ Edição de tarefa salva com sucesso no banco de dados!')
        console.log('✅ Projeto retornado do banco:', savedProject)
        
        // Atualizar o estado local com os dados reais do banco
        if (savedProject) {
          setProject(savedProject)
          console.log('✅ Estado local atualizado com dados do banco')
        } else {
          // Fallback: usar dados locais se a API não retornar dados
          setProject(updatedProject)
          console.log('⚠️ Usando dados locais como fallback')
        }
        
        setEditingTask(null)
        
        // Atualizar progresso automaticamente após edição
        setTimeout(() => updateAllTaskProgress(), 100)
      } catch (error) {
        console.error('❌ Erro ao salvar edição de tarefa no banco:', error)
        alert('Erro ao salvar edição de tarefa no banco de dados: ' + error)
      }
    }
  }

  // Função para salvar edição de subtarefa
  const handleSaveSubtaskEdit = async () => {
    if (editingSubtask && selectedTask) {
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
                  startDate: editingSubtask.startDate || null,
                  dueDate: editingSubtask.dueDate || null
                }
                
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
      
      // SALVAR NO BANCO DE DADOS
      console.log('💾 Salvando edição de subtarefa no banco de dados...')
      try {
        console.log('💾 Projeto para salvar:', updatedProject)
        
        // Chamar API para salvar o projeto atualizado
        const savedProject = await api.updateProject(project.id, updatedProject)
        
        console.log('✅ Edição de subtarefa salva com sucesso no banco de dados!')
        console.log('✅ Projeto retornado do banco:', savedProject)
        
        // Atualizar o estado local com os dados reais do banco
        if (savedProject) {
          setProject(savedProject)
          console.log('✅ Estado local atualizado com dados do banco')
        } else {
          // Fallback: usar dados locais se a API não retornar dados
          setProject(updatedProject)
          console.log('⚠️ Usando dados locais como fallback')
        }
        
        setEditingSubtask(null)
        setSelectedTask(null)
        
        // Atualizar progresso automaticamente após edição
        setTimeout(() => updateAllTaskProgress(), 100)
      } catch (error) {
        console.error('❌ Erro ao salvar edição de subtarefa no banco:', error)
        alert('Erro ao salvar edição de subtarefa no banco de dados: ' + error)
      }
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
  const handleDeletePhase = async (phaseId: string) => {
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
        
        // SALVAR NO BANCO DE DADOS
        console.log('💾 Salvando exclusão de fase no banco de dados...')
        try {
          console.log('💾 Projeto para salvar:', updatedProject)
          
          // Chamar API para salvar o projeto atualizado
          const savedProject = await api.updateProject(project.id, updatedProject)
          
          console.log('✅ Exclusão de fase salva com sucesso no banco de dados!')
          console.log('✅ Projeto retornado do banco:', savedProject)
          
          // Atualizar o estado local com os dados reais do banco
          if (savedProject) {
            setProject(savedProject)
            console.log('✅ Estado local atualizado com dados do banco')
          } else {
            // Fallback: usar dados locais se a API não retornar dados
            setProject(updatedProject)
            console.log('⚠️ Usando dados locais como fallback')
          }
          
          alert(`Fase excluída com sucesso! ${taskCount} tarefa(s) e ${subtaskCount} subtarefa(s) também foram removida(s).`)
        } catch (error) {
          console.error('❌ Erro ao salvar exclusão de fase no banco:', error)
          alert('Erro ao salvar exclusão de fase no banco de dados: ' + error)
        }
        
      } catch (error) {
        console.error('❌ Erro ao excluir fase:', error)
        alert('Erro ao excluir fase: ' + error)
      }
    }
  }

  // Função para salvar edição de fase
  const handleSavePhaseEdit = async () => {
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
      
      // SALVAR NO BANCO DE DADOS
      console.log('💾 Salvando edição de fase no banco de dados...')
      try {
        console.log('💾 Projeto para salvar:', updatedProject)
        
        // Chamar API para salvar o projeto atualizado
        const savedProject = await api.updateProject(project.id, updatedProject)
        
        console.log('✅ Edição de fase salva com sucesso no banco de dados!')
        console.log('✅ Projeto retornado do banco:', savedProject)
        
        // Atualizar o estado local com os dados reais do banco
        if (savedProject) {
          setProject(savedProject)
          console.log('✅ Estado local atualizado com dados do banco')
        } else {
          // Fallback: usar dados locais se a API não retornar dados
          setProject(updatedProject)
          console.log('⚠️ Usando dados locais como fallback')
        }
        
        setEditingPhase(null)
        
        // Atualizar progresso automaticamente após edição
        setTimeout(() => updateAllTaskProgress(), 100)
      } catch (error) {
        console.error('❌ Erro ao salvar edição de fase no banco:', error)
        alert('Erro ao salvar edição de fase no banco de dados: ' + error)
      }
    }
  }

  // Diálogo de Edição de Tarefa
  const renderEditTaskDialog = () => (
    <Dialog open={!!editingTask} onClose={handleCancelEdit} maxWidth="md" fullWidth>
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
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Horas Estimadas"
                type="number"
                value={editingTask.estimatedHours}
                onChange={(e) => setEditingTask({ ...editingTask, estimatedHours: Number(e.target.value) })}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Observações"
                value={editingTask.observations}
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
    <Dialog open={!!editingSubtask} onClose={handleCancelEdit} maxWidth="md" fullWidth>
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
                  <MenuItem value="pending">Pendente</MenuItem>
                  <MenuItem value="active">Ativa</MenuItem>
                  <MenuItem value="completed">Concluída</MenuItem>
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

  // Função para buscar o projeto do banco de dados
  const fetchProject = async () => {
    if (!id) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Buscando projeto:', id)
      const response = await api.getProject(id)
      console.log('🔍 Resposta da API:', response)
      
      if (response) {
        console.log('✅ Projeto carregado:', response)
              // Garantir que o projeto tenha uma estrutura básica
      const projectWithTimeline = {
        ...response,
        timeline: response.timeline || { phases: [] },
        activities: response.activities || []
      }
      
      setProject(projectWithTimeline)
      setEditData({ ...projectWithTimeline })
      }
    } catch (error) {
      console.error('❌ Erro ao carregar projeto:', error)
      setError('Erro ao carregar projeto. Verifique se o ID está correto.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Buscar projeto do banco de dados
    fetchProject()
  }, [id])

  // Monitorar mudanças no projeto e forçar re-renderização
  useEffect(() => {
    console.log('🔍 useEffect: Projeto mudou:', project)
    if (project) {
      console.log('🔍 Projeto atualizado, forçando re-renderização...')
      setForceRender(prev => prev + 1)
    }
  }, [project])

  const handleEdit = () => {
    setEditData({ ...project })
    setEditing(true)
  }

  const handleSave = () => {
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

    setProject(editData)
    setEditing(false)
    alert('Projeto atualizado com sucesso!')
  }

  const handleCancel = () => {
    setEditing(false)
    setEditData({ ...project })
  }

  const handleDelete = () => {
    // Registrar log de exclusão do projeto
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
    alert('Projeto deletado com sucesso!')
    navigate('/projetos')
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
      default: return <Schedule />
    }
  }

  const getTaskStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluída'
      case 'in_progress': return 'Em Andamento'
      case 'pending': return 'Não iniciado'
      case 'overdue': return 'Em atraso'
      default: return status
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': return 'primary'
      case 'pending': return 'warning'
      case 'overdue': return 'error'
      default: return 'default'
    }
  }

  // Função específica para cores de subtarefas (cores mais suaves)
  const getSubtaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success'
      case 'in_progress': return 'info' // Azul mais claro
      case 'pending': return 'default' // Cinza neutro
      case 'overdue': return 'warning' // Laranja em vez de vermelho
      default: return 'default'
    }
  }

  // Função específica para ícones de subtarefas (tamanho menor)
  const getSubtaskStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle color="success" sx={{ fontSize: '0.9rem' }} />
      case 'in_progress': return <Schedule color="info" sx={{ fontSize: '0.9rem' }} />
      case 'pending': return <Warning color="action" sx={{ fontSize: '0.9rem' }} />
      case 'overdue': return <Warning color="warning" sx={{ fontSize: '0.9rem' }} />
      default: return <Schedule sx={{ fontSize: '0.9rem' }} />
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleDateString('pt-BR')
    } catch (error) {
      console.error('❌ Erro ao formatar data:', dateString, error)
      return '-'
    }
  }

  // Função para formatar data para input type="date"
  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return ''
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toISOString().split('T')[0] // Retorna yyyy-MM-dd
    } catch (error) {
      console.error('❌ Erro ao formatar data para input:', dateString, error)
      return ''
    }
  }

  // Função para verificar se uma tarefa está em atraso
  const checkOverdueStatus = (item: any) => {
    if (item.status === 'completed') return item.status // Não alterar status de tarefas concluídas
    
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

  // Função para calcular progresso automático da tarefa baseado nas subtarefas
  const calculateTaskProgress = (task: any) => {
    if (!task.subtasks || task.subtasks.length === 0) {
      return task.progress || 0 // Manter progresso manual se não houver subtarefas
    }
    
    // Calcular média do progresso das subtarefas
    const totalProgress = task.subtasks.reduce((sum: number, subtask: any) => {
      return sum + (subtask.progress || 0)
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
  const updateAllTaskProgress = () => {
    console.log('🔍 updateAllTaskProgress executando...')
    console.log('🔍 Projeto:', project)
    console.log('🔍 Timeline:', project?.timeline)
    console.log('🔍 Fases:', project?.timeline?.phases)
    
    if (!project || !project.timeline || !project.timeline.phases) {
      console.log('⚠️ Projeto ou timeline é nulo, pulando atualização de progresso')
      return
    }
    
    const updatedProject = { ...project }
    console.log('🔍 Projeto copiado para atualização:', updatedProject)
    
    updatedProject.timeline.phases.forEach((phase: any) => {
      if (!phase.tasks) {
        phase.tasks = []
        phase.progress = 0
        return
      }
      
      phase.tasks.forEach((task: any) => {
        // Verificar se o progresso mudou
        const oldProgress = task.progress
        const newProgress = calculateTaskProgress(task)
        
        // Atualizar progresso da tarefa baseado nas subtarefas
        task.progress = newProgress
        
        // Registrar log se o progresso mudou automaticamente
        if (oldProgress !== newProgress && task.subtasks && task.subtasks.length > 0) {
          logActivity(
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
        
        // Registrar log se o progresso da fase mudou
        if (oldPhaseProgress !== phase.progress) {
          logActivity(
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
      logActivity(
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
    
    console.log('🔍 Projeto atualizado, chamando setProject...')
    setProject(updatedProject)
    console.log('🔍 setProject executado')
  }

  const renderTimelineView = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Cronograma do Projeto
        </Typography>
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


      </Box>


      {project.timeline && project.timeline.phases && project.timeline.phases.length > 0 ? (
        project.timeline.phases.map((phase: any, phaseIndex: number) => (
        <Accordion key={phase.id} defaultExpanded={phaseIndex === 0}>
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
                  label={phase.status === 'completed' ? 'Concluída' : 
                         phase.status === 'active' ? 'Ativa' : 'Pendente'}
                  color={phase.status === 'completed' ? 'success' : 
                         phase.status === 'active' ? 'primary' : 'warning'}
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
                
                {/* Botões de ação da fase */}
                <Box sx={{ display: 'flex', gap: 0.5 }}>
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
              </Box>
            </Box>
          </AccordionSummary>
          
          <AccordionDetails>
            <TableContainer>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Tarefas da Fase
                </Typography>
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
                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Progresso</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>Horas</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '150px' }}>Observações</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', width: '80px' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {phase.tasks.map((task: any, taskIndex: number) => (
                    <React.Fragment key={task.id}>
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
                              {task.responsible}
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
                            {task.actualEndDate ? formatDate(task.actualEndDate) : '-'}
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
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
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
                      </TableRow>
                      
                      {/* Subtarefas da Tarefa Atual */}
                      {console.log('🔍 Renderizando subtarefas para tarefa:', task.id, 'Subtarefas:', task.subtasks, 'Tipo:', typeof task.subtasks, 'É array:', Array.isArray(task.subtasks))}
                      {task.subtasks && task.subtasks.length > 0 && (
                        task.subtasks.map((subtask: any, subtaskIndex: number) => (
                          <TableRow key={`${task.id}-${subtask.id}`} hover sx={{ 
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
                                  {subtask.assignee || 'Não atribuído'}
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
                                {subtask.actualEndDate ? formatDate(subtask.actualEndDate) : '-'}
                              </Typography>
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
                            
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
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
                          </TableRow>
                        ))
                      )}
                      
                      {/* Linha para adicionar nova subtarefa se não houver nenhuma */}
                      {console.log('🔍 Verificando se não há subtarefas para tarefa:', task.id, 'Subtarefas:', task.subtasks, 'Tipo:', typeof task.subtasks, 'É array:', Array.isArray(task.subtasks))}
                      {(!task.subtasks || task.subtasks.length === 0) && (
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
          Gerente: {project.manager?.name || 'Não definido'}
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
                        primary={member.user?.name || 'Nome não informado'}
                        secondary={`${member.role} • ${member.user?.email || 'Email não informado'}`}
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
                        primary={member.name}
                        secondary={`${member.role} • ${member.company || 'Empresa não informada'} • ${member.email || 'Email não informado'}`}
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

  // Função para renderizar a aba de atividades
  const renderActivitiesView = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
        Histórico de Atividades
      </Typography>
      
      {(!project.activities || project.activities.length === 0) ? (
        <Alert severity="info">
          Nenhuma atividade registrada ainda. As atividades aparecerão aqui conforme você interagir com o projeto.
        </Alert>
      ) : (
        <Paper>
          <List>
            {project.activities.map((activity: any) => (
              <ListItem key={activity.id} divider>
                <ListItemIcon>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                    <Assignment />
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        {activity.action}
                      </Typography>
                      <Chip 
                        label={activity.itemType} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.primary">
                        {activity.itemName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(activity.timestamp).toLocaleString('pt-BR')} • {activity.user}
                      </Typography>
                      {activity.details && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            {Object.entries(activity.details).map(([key, value]) => 
                              `${key}: ${JSON.stringify(value)}`
                            ).join(' • ')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  )

  // Função para verificar se uma subtarefa pode ser editada (sempre retorna true agora)
  const canEditSubtask = (subtask: any) => {
    return true // Todas as subtarefas podem ser editadas
  }

  // Função para verificar se uma tarefa pode ser editada (sempre retorna true agora)
  const canEditTask = (task: any) => {
    return true // Todas as tarefas podem ser editadas
  }

  // Loading state



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
                  <Typography variant="body1" color="text.secondary">
                    ID: {project?.id || 'N/A'}
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
                      startIcon={<Edit />}
                      onClick={handleEdit}
                    >
                      Editar
                    </Button>

                    <Button
                      variant="outlined"
                      startIcon={<Delete />}
                      onClick={() => setDeleteDialogOpen(true)}
                      color="error"
                    >
                      Excluir
                    </Button>
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
          <Tab label="Gantt" />
          <Tab label="Stakeholders" />
          <Tab label="Equipe" />
          <Tab label="Atividades" />
            </Tabs>
          </Paper>

          {/* Conteúdo das Tabs */}
          {activeTab === 0 && (
            <Grid container spacing={3}>
              {/* Informações Principais */}
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, mb: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                    Informações do Projeto
                  </Typography>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Nome do Projeto"
                        value={editing ? editData.name : project.name}
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
                        value={editing ? editData.description : project.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        disabled={!editing}
                        multiline
                        rows={4}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth disabled={!editing}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={editing ? editData.status : project.status}
                          label="Status"
                          onChange={(e) => handleInputChange('status', e.target.value)}
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
                          <MenuItem value="active">Ativo</MenuItem>
                          <MenuItem value="paused">Pausado</MenuItem>
                          <MenuItem value="completed">Concluído</MenuItem>
                          <MenuItem value="cancelled">Cancelado</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <FormControl fullWidth disabled={!editing}>
                        <InputLabel>Prioridade</InputLabel>
                        <Select
                          value={editing ? editData.priority : project.priority}
                          label="Prioridade"
                          onChange={(e) => handleInputChange('priority', e.target.value)}
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
                        label="Data de Início"
                        type="date"
                        value={editing ? editData.startDate : project.startDate}
                        onChange={(e) => handleInputChange('startDate', e.target.value)}
                        disabled={!editing}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Data de Término"
                        type="date"
                        value={editing ? editData.endDate : project.endDate}
                        onChange={(e) => handleInputChange('endDate', e.target.value)}
                        disabled={!editing}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Gerente"
                        value={editing ? editData.manager : project.manager}
                        onChange={(e) => handleInputChange('manager', e.target.value)}
                        disabled={!editing}
                      />
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="Orçamento (R$)"
                        type="number"
                        value={editing ? editData.budget : project.budget}
                        onChange={(e) => handleInputChange('budget', Number(e.target.value))}
                        disabled={!editing}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Grid>
                    

                  </Grid>
                </Paper>
              </Grid>

              {/* Sidebar */}
              <Grid item xs={12} md={4}>
                {/* Resumo do Cronograma */}
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Resumo do Cronograma
                  </Typography>
                  
                  <Stack spacing={2}>
                    {project.timeline && project.timeline.phases && project.timeline.phases.length > 0 ? (
                      project.timeline.phases.map((phase: any) => (
                        <Box key={phase.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="body2" fontWeight="bold">
                              {phase.name.split(':')[0]}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {calculatePhaseProgress(phase)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={calculatePhaseProgress(phase)}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                        </Box>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma fase cadastrada para este projeto.
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          )}

          {activeTab === 1 && renderTimelineView()}
          {activeTab === 2 && renderGanttView()}
          {activeTab === 3 && renderStakeholdersView()}
          {activeTab === 4 && <ProjectTeamManager projectId={project.id} />}
          {activeTab === 5 && renderActivitiesView()}

          {/* Dialog de Confirmação de Exclusão */}
          <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogContent>
              <Typography>
                Tem certeza que deseja excluir o projeto "{project?.name || 'Projeto'}"? Esta ação não pode ser desfeita.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleDelete} color="error" variant="contained">
                Excluir
              </Button>
            </DialogActions>
          </Dialog>

          {/* Diálogo para Nova Etapa */}
          <Dialog 
            open={showAddPhaseDialog} 
            onClose={handleCloseDialogs} 
            maxWidth="sm" 
            fullWidth
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
                    <MenuItem value="pending">Pendente</MenuItem>
                    <MenuItem value="active">Ativa</MenuItem>
                    <MenuItem value="completed">Concluída</MenuItem>
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
          <Dialog open={showAddTaskDialog} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
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
              <Button 
          onClick={handleSaveTask} 
          variant="contained"
          disabled={isSavingTask}
        >
          {isSavingTask ? 'Salvando...' : 'Salvar'}
        </Button>
            </DialogActions>
          </Dialog>

          {/* Diálogo para Nova Subtarefa */}
          <Dialog open={showAddSubtaskDialog} onClose={handleCloseDialogs} maxWidth="md" fullWidth>
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
          {renderEditPhaseDialog()}
          
          <ShareProjectModal
            open={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            projectId={project.id}
            projectName={project.name}
          />
        </Box>
      )
    }
  }