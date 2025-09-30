const { PrismaClient } = require('@prisma/client');

async function testReports() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testando busca direta de relatórios...');
    
    // Testar se o modelo report existe
    console.log('🔍 Prisma disponível:', !!prisma);
    console.log('🔍 Modelo report disponível:', !!prisma.report);
    
    if (!prisma.report) {
      console.log('❌ Modelo Report não encontrado!');
      return;
    }
    
    // Buscar relatórios
    const reports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ Relatórios encontrados: ${reports.length}`);
    
    if (reports.length > 0) {
      console.log('📋 Primeiro relatório:');
      console.log('  - ID:', reports[0].id);
      console.log('  - Título:', reports[0].titulo);
      console.log('  - Analista:', reports[0].analista);
      console.log('  - Criado em:', reports[0].createdAt);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testReports();
