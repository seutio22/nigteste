const { PrismaClient } = require('@prisma/client');

async function checkReports() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando relatórios na tabela Report...');
    
    const reports = await prisma.report.findMany();
    console.log(`📊 Total de relatórios encontrados: ${reports.length}`);
    
    if (reports.length > 0) {
      console.log('📋 Relatórios:');
      reports.forEach((report, index) => {
        console.log(`${index + 1}. ${report.titulo} - ${report.analista} - ${report.createdAt}`);
      });
    } else {
      console.log('⚠️ Nenhum relatório encontrado na tabela');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar relatórios:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkReports();
