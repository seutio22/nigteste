const { PrismaClient } = require('@prisma/client');

async function applyMigration() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Aplicando migration: Remover constraint única de Contrato.numero...');
    
    // Executar SQL para remover a constraint única
    // Para PostgreSQL
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Contrato" DROP CONSTRAINT IF EXISTS "Contrato_numero_key";
    `);
    
    console.log('✅ Constraint única removida com sucesso!');
    console.log('✅ Agora é possível ter múltiplos contratos com o mesmo número, desde que tenham grupos econômicos diferentes.');
    
    // Verificar se a constraint foi removida
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
    console.error('❌ Erro ao aplicar migration:', error);
    
    // Se for erro de constraint não encontrada, isso é OK
    if (error.message && error.message.includes('does not exist')) {
      console.log('ℹ️ Constraint já não existe ou foi removida anteriormente.');
    } else {
      throw error;
    }
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration()
  .then(() => {
    console.log('🎉 Migration aplicada com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
