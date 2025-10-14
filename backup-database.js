// Script para criar backup do banco de dados PostgreSQL
// Execute: node backup-database.js

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// URL do banco de dados Railway (pegar de railway.app)
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@containers-us-west-123.railway.app:1234/railway';

// Criar pasta de backups se não existir
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Nome do arquivo de backup com timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

console.log('🔄 Iniciando backup do banco de dados...');
console.log('📁 Arquivo de backup:', backupFile);

// Comando pg_dump para criar backup
const command = `pg_dump "${DATABASE_URL}" > "${backupFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Erro ao criar backup:', error.message);
    console.error('💡 Certifique-se de que o PostgreSQL está instalado (pg_dump)');
    console.error('💡 Instale com: npm install -g pg');
    return;
  }
  
  if (stderr) {
    console.warn('⚠️ Avisos:', stderr);
  }
  
  console.log('✅ Backup criado com sucesso!');
  console.log('📦 Arquivo:', backupFile);
  console.log('📊 Tamanho:', (fs.statSync(backupFile).size / 1024).toFixed(2), 'KB');
});

