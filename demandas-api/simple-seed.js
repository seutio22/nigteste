const fs = require('fs');
const path = require('path');

console.log('🚀 Criando dados de exemplo para projetos...');

// Dados dos projetos
const projects = [
  {
    id: 'proj-1',
    name: 'Sistema de Gestão',
    description: 'Sistema completo de gestão empresarial com módulos integrados',
    status: 'active',
    priority: 'high',
    startDate: '2024-08-01T00:00:00.000Z',
    endDate: '2024-12-31T00:00:00.000Z',
    progress: 65,
    budget: 50000.00,
    clientId: 'cliente-1',
    managerId: 'analista-1',
    team: '["analista-1", "analista-2", "analista-3"]',
    tags: '["desenvolvimento", "sistema", "gestão"]',
    color: '#3B82F6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'proj-2',
    name: 'App Mobile',
    description: 'Aplicativo mobile para iOS e Android com funcionalidades avançadas',
    status: 'active',
    priority: 'medium',
    startDate: '2024-09-01T00:00:00.000Z',
    endDate: '2025-02-28T00:00:00.000Z',
    progress: 25,
    budget: 30000.00,
    clientId: 'cliente-2',
    managerId: 'analista-2',
    team: '["analista-2", "analista-3"]',
    tags: '["mobile", "app", "ios", "android"]',
    color: '#10B981',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Dados das tarefas
const tasks = [
  {
    id: 'task-1',
    projectId: 'proj-1',
    title: 'Análise de Requisitos',
    description: 'Levantamento e documentação dos requisitos do sistema',
    status: 'done',
    priority: 'high',
    assigneeId: 'analista-1',
    dueDate: '2024-08-15T00:00:00.000Z',
    estimatedHours: 40.0,
    actualHours: 38.0,
    dependencies: '[]',
    subtasks: '[]',
    attachments: '[]',
    comments: '[]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'task-2',
    projectId: 'proj-1',
    title: 'Design da Interface',
    description: 'Criação dos wireframes e protótipos',
    status: 'in_progress',
    priority: 'medium',
    assigneeId: 'analista-2',
    dueDate: '2024-08-30T00:00:00.000Z',
    estimatedHours: 60.0,
    actualHours: 25.0,
    dependencies: '["task-1"]',
    subtasks: '[]',
    attachments: '[]',
    comments: '[]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Dados dos marcos
const milestones = [
  {
    id: 'milestone-1',
    projectId: 'proj-1',
    title: 'Fase 1 - Análise e Design',
    description: 'Conclusão da análise de requisitos e design da interface',
    dueDate: '2024-08-31T00:00:00.000Z',
    completed: false,
    tasks: '["task-1", "task-2"]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'milestone-2',
    projectId: 'proj-2',
    title: 'Setup Inicial',
    description: 'Configuração completa do ambiente de desenvolvimento',
    dueDate: '2024-09-15T00:00:00.000Z',
    completed: true,
    tasks: '["task-3"]',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Criar arquivo de dados
const data = {
  projects,
  tasks,
  milestones,
  timestamp: new Date().toISOString()
};

// Salvar em arquivo JSON
const outputPath = path.join(__dirname, 'project-data.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

console.log('✅ Dados de projetos criados e salvos em:', outputPath);
console.log(`   - Projetos: ${projects.length}`)
console.log(`   - Tarefas: ${tasks.length}`)
console.log(`   - Marcos: ${milestones.length}`)
console.log('🎉 Arquivo de dados criado com sucesso!')
console.log('')
console.log('📋 Para inserir no banco, use o Prisma Studio ou execute:')
console.log('   npx prisma studio --port 5555')
console.log('')
console.log('🌐 Acesse: http://localhost:5555')
console.log('📁 Tabelas: Project, ProjectTask, ProjectMilestone')
