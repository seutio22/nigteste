const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco SQLite (mesmo do schema: file:./prisma/dev.db)
const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');

// Conectar ao banco
const db = new sqlite3.Database(dbPath);

console.log('🚀 Inserindo projetos no banco de dados...');

// Função para inserir projetos
function insertProjects() {
  return new Promise((resolve, reject) => {
    // Projeto 1: Sistema de Gestão
    const project1 = {
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
    };

    // Projeto 2: App Mobile
    const project2 = {
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
    };

    // Inserir projetos
    const insertProject = db.prepare(`
      INSERT OR REPLACE INTO Project (
        id, name, description, status, priority, startDate, endDate, 
        progress, budget, clientId, managerId, team, tags, color, 
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProject.run([
      project1.id, project1.name, project1.description, project1.status, 
      project1.priority, project1.startDate, project1.endDate, project1.progress, 
      project1.budget, project1.clientId, project1.managerId, project1.team, 
      project1.tags, project1.color, project1.createdAt, project1.updatedAt
    ]);

    insertProject.run([
      project2.id, project2.name, project2.description, project2.status, 
      project2.priority, project2.startDate, project2.endDate, project2.progress, 
      project2.budget, project2.clientId, project2.managerId, project2.team, 
      project2.tags, project2.color, project2.createdAt, project2.updatedAt
    ]);

    insertProject.finalize();
    console.log('✅ Projetos inseridos com sucesso!');
    resolve();
  });
}

// Executar inserção
insertProjects()
  .then(() => {
    console.log('🎉 Inserção concluída!');
    db.close();
  })
  .catch((error) => {
    console.error('❌ Erro:', error);
    db.close();
  });
