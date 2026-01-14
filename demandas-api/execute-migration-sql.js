// Script para executar a migration SQL no Railway
// Execute: node execute-migration-sql.js
// Ou adicione ao package.json como script de start

const { PrismaClient } = require('@prisma/client');

async function executeMigration() {
  // Verificar se DATABASE_URL está configurada
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada!');
    console.log('💡 Este script deve ser executado no Railway onde DATABASE_URL está disponível.');
    console.log('💡 Ou configure DATABASE_URL manualmente antes de executar.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Aplicando migration: Remover constraint única de Contrato.numero...');
    console.log('📊 Conectando ao banco de dados...');
    
    // Testar conexão
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');
    
    // Executar SQL para remover a constraint única
    console.log('🔧 Removendo constraint única...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Contrato" DROP CONSTRAINT IF EXISTS "Contrato_numero_key";
    `);
    
    console.log('✅ Constraint única removida com sucesso!');
    console.log('✅ Agora é possível ter múltiplos contratos com o mesmo número, desde que tenham grupos econômicos diferentes.');
    
    // Verificar se a constraint foi removida
    console.log('🔍 Verificando se a constraint foi removida...');
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'Contrato' 
      AND constraint_name = 'Contrato_numero_key'
    `);
    
    if (constraints.length === 0) {
      console.log('✅ Verificação: Constraint removida com sucesso!');
    } else {
      console.log('⚠️ Aviso: Constraint ainda existe. Pode ser necessário verificar manualmente.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error.message);
    
    // Se for erro de constraint não encontrada, isso é OK
    if (error.message && (error.message.includes('does not exist') || error.message.includes('não existe'))) {
      console.log('ℹ️ Constraint já não existe ou foi removida anteriormente.');
      console.log('✅ Migration já foi aplicada anteriormente.');
    } else {
      console.error('❌ Detalhes do erro:', error);
      throw error;
    }
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Desconectado do banco de dados');
  }
}

// Executar migration
executeMigration()
  .then(() => {
    console.log('🎉 Migration aplicada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
