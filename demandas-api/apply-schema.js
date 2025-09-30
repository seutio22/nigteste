const { execSync } = require('child_process');

console.log('🔄 Aplicando schema no banco de dados...');

try {
  // Aplicar mudanças do schema
  console.log('📝 Executando prisma db push...');
  execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
  
  console.log('✅ Schema aplicado com sucesso!');
  console.log('🎉 Campos adicionados ao model Analista:');
  console.log('  - email (String?)');
  console.log('  - telefone (String?)');
  console.log('  - cargo (String?)');
  
} catch (error) {
  console.error('❌ Erro ao aplicar schema:', error.message);
  process.exit(1);
}
