// Script para verificar e remover TODAS as constraints/índices únicos do campo numero
const { PrismaClient } = require('@prisma/client');

process.env.DATABASE_URL = 'postgresql://postgres:hQecKMnfKGEXUUHnXBXuFOqNSapcDTAM@trolley.proxy.rlwy.net:54166/railway';

async function checkAndFixConstraints() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    console.log('🔍 Verificando constraints e índices únicos na tabela Contrato...');
    
    await prisma.$connect();
    console.log('✅ Conectado ao banco de dados');
    
    // 1. Verificar constraints únicas
    console.log('\n📋 Verificando constraints únicas...');
    const constraints = await prisma.$queryRawUnsafe(`
      SELECT 
        constraint_name,
        constraint_type
      FROM information_schema.table_constraints 
      WHERE table_name = 'Contrato' 
      AND constraint_type = 'UNIQUE'
    `);
    
    console.log('📊 Constraints únicas encontradas:', constraints.length);
    constraints.forEach(c => {
      console.log(`  - ${c.constraint_name} (${c.constraint_type})`);
    });
    
    // 2. Verificar índices únicos
    console.log('\n📋 Verificando índices únicos...');
    const indexes = await prisma.$queryRawUnsafe(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'Contrato'
      AND indexdef LIKE '%UNIQUE%'
    `);
    
    console.log('📊 Índices únicos encontrados:', indexes.length);
    indexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
      console.log(`    Definição: ${idx.indexdef}`);
    });
    
    // 3. Verificar especificamente o campo numero
    console.log('\n📋 Verificando constraints/índices no campo numero...');
    const numeroConstraints = await prisma.$queryRawUnsafe(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'Contrato'
      AND kcu.column_name = 'numero'
      AND tc.constraint_type = 'UNIQUE'
    `);
    
    console.log('📊 Constraints únicas no campo numero:', numeroConstraints.length);
    numeroConstraints.forEach(c => {
      console.log(`  - ${c.constraint_name} (${c.constraint_type})`);
    });
    
    // 4. Remover TODAS as constraints únicas do campo numero
    console.log('\n🔧 Removendo constraints únicas do campo numero...');
    for (const constraint of numeroConstraints) {
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Contrato" DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}";
        `);
        console.log(`✅ Constraint ${constraint.constraint_name} removida`);
      } catch (error) {
        console.log(`⚠️ Erro ao remover ${constraint.constraint_name}: ${error.message}`);
      }
    }
    
    // 5. Remover índices únicos relacionados ao numero
    console.log('\n🔧 Removendo índices únicos do campo numero...');
    for (const idx of indexes) {
      if (idx.indexdef.includes('numero')) {
        try {
          await prisma.$executeRawUnsafe(`
            DROP INDEX IF EXISTS "${idx.indexname}";
          `);
          console.log(`✅ Índice ${idx.indexname} removido`);
        } catch (error) {
          console.log(`⚠️ Erro ao remover índice ${idx.indexname}: ${error.message}`);
        }
      }
    }
    
    // 6. Verificar novamente após remoção
    console.log('\n🔍 Verificando novamente após remoção...');
    const remainingConstraints = await prisma.$queryRawUnsafe(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'Contrato'
      AND kcu.column_name = 'numero'
      AND tc.constraint_type = 'UNIQUE'
    `);
    
    if (remainingConstraints.length === 0) {
      console.log('✅ Nenhuma constraint única restante no campo numero!');
    } else {
      console.log('⚠️ Ainda existem constraints únicas:');
      remainingConstraints.forEach(c => {
        console.log(`  - ${c.constraint_name}`);
      });
    }
    
    // 7. Verificar índices restantes
    const remainingIndexes = await prisma.$queryRawUnsafe(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes 
      WHERE tablename = 'Contrato'
      AND indexdef LIKE '%UNIQUE%'
      AND indexdef LIKE '%numero%'
    `);
    
    if (remainingIndexes.length === 0) {
      console.log('✅ Nenhum índice único restante no campo numero!');
    } else {
      console.log('⚠️ Ainda existem índices únicos:');
      remainingIndexes.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Desconectado do banco de dados');
  }
}

checkAndFixConstraints()
  .then(() => {
    console.log('\n🎉 Verificação e correção concluídas!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  });
