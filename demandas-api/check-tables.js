const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o banco SQLite (mesmo do schema: file:./prisma/dev.db)
const dbPath = path.join(__dirname, 'prisma', 'prisma', 'dev.db');

// Conectar ao banco
const db = new sqlite3.Database(dbPath);

console.log('🔍 Verificando tabelas no banco de dados...');

// Função para listar todas as tabelas
function listTables() {
  return new Promise((resolve, reject) => {
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Função para verificar estrutura de uma tabela
function describeTable(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Executar verificação
async function checkDatabase() {
  try {
    const tables = await listTables();
    console.log('📋 Tabelas encontradas no banco:');
    tables.forEach(table => {
      console.log(`   - ${table.name}`);
    });

    console.log('\n🔍 Verificando tabelas específicas...');
    
    // Verificar se as tabelas de projetos existem
    const projectTables = ['Project', 'ProjectTask', 'ProjectMilestone', 'ProjectTimeline'];
    for (const tableName of projectTables) {
      const structure = await describeTable(tableName);
      if (!structure || structure.length === 0) {
        console.log(`❌ Tabela ${tableName} NÃO existe`);
      } else {
        console.log(`✅ Tabela ${tableName} existe com ${structure.length} colunas`);
      }
    }

    // Verificar outras tabelas importantes
    const otherTables = ['Comunicado', 'Demanda', 'Atendimento'];
    for (const tableName of otherTables) {
      const structure = await describeTable(tableName);
      if (!structure || structure.length === 0) {
        console.log(`❌ Tabela ${tableName} NÃO existe`);
      } else {
        console.log(`✅ Tabela ${tableName} existe com ${structure.length} colunas`);
      }
    }

  } catch (error) {
    console.error('❌ Erro ao verificar banco:', error);
  } finally {
    db.close();
  }
}

checkDatabase();
