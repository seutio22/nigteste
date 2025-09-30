const { PrismaClient } = require('@prisma/client');

async function testDatabaseSchema() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:password@containers-us-west-146.railway.app:6543/railway"
      }
    }
  });
  
  try {
    console.log('🔍 Testando schema do banco de dados...');
    
    // 1. Verificar se a tabela Analista existe
    console.log('1️⃣ Verificando tabela Analista...');
    const analistaTable = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Analista'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Colunas da tabela Analista:');
    analistaTable.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // 2. Verificar se há dados na tabela
    console.log('2️⃣ Verificando dados na tabela Analista...');
    const analistas = await prisma.analista.findMany({
      select: {
        id: true,
        nome: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    console.log('📊 Analistas encontrados:', analistas.length);
    analistas.forEach((analista, index) => {
      console.log(`  ${index + 1}. ${analista.nome} (${analista.id})`);
    });
    
    // 3. Testar query que está falhando
    console.log('3️⃣ Testando query que está falhando...');
    try {
      const testQuery = await prisma.analista.findMany({
        include: {
          atendimentos: true
        }
      });
      console.log('✅ Query com include funcionou!');
    } catch (error) {
      console.log('❌ Query com include falhou:', error.message);
    }
    
    console.log('🎉 Teste do schema concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseSchema();
