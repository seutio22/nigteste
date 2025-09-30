const { PrismaClient } = require('@prisma/client')

async function testAnalytics() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testando endpoint /analytics...')
    
    // Testar se o modelo report existe
    console.log('📊 Verificando modelo Report...')
    const reports = await prisma.report.findMany()
    console.log(`✅ Modelo Report encontrado com ${reports.length} registros`)
    
    // Testar criação de um report
    console.log('🧪 Testando criação de report...')
    const testReport = await prisma.report.create({
      data: {
        titulo: 'Relatório de Teste',
        descricao: 'Teste de criação',
        analista: 'test-analyst',
        tipo: 'mensal',
        status: 'PENDENTE'
      }
    })
    console.log('✅ Report criado:', testReport.id)
    
    // Testar busca de todos os reports
    console.log('📋 Buscando todos os reports...')
    const allReports = await prisma.report.findMany({
      orderBy: { createdAt: 'desc' }
    })
    console.log(`✅ Encontrados ${allReports.length} reports:`)
    allReports.forEach(report => {
      console.log(`  - ${report.titulo} (${report.status}) - ${report.createdAt}`)
    })
    
    // Limpar o teste
    await prisma.report.delete({
      where: { id: testReport.id }
    })
    console.log('✅ Report de teste removido')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testAnalytics()
