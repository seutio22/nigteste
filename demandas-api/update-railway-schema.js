// Script para atualizar schema no Railway
const { execSync } = require('child_process');

console.log('🔄 Atualizando schema do banco de dados no Railway...');
console.log('');

try {
  // Gera o cliente Prisma
  console.log('📦 Gerando cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // Aplica as mudanças no banco
  console.log('');
  console.log('🗄️  Aplicando mudanças no banco de dados...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  
  console.log('');
  console.log('✅ Schema atualizado com sucesso!');
  console.log('');
  console.log('📋 Mudanças aplicadas:');
  console.log('  - Adicionado campo "email" na tabela Analista');
  console.log('  - Adicionado campo "telefone" na tabela Analista');
  console.log('  - Adicionado campo "cargo" na tabela Analista');
  
} catch (error) {
  console.error('❌ Erro ao atualizar schema:', error.message);
  process.exit(1);
}

