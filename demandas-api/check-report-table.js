const { PrismaClient } = require('@prisma/client')

async function checkReportTable() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Verificando se a tabela Report existe...')
    
    // Tentar buscar todos os reports
    const reports = await prisma.report.findMany()
    console.log(`✅ Tabela Report encontrada com ${reports.length} registros`)
    
    // Tentar criar um report de teste
    console.log('🧪 Testando criação de report...')
    const testReport = await prisma.report.create({
      data: {
        titulo: 'Teste',
        analista: 'test-analyst'
      }
    })
    console.log('✅ Report de teste criado:', testReport.id)
    
    // Remover o report de teste
    await prisma.report.delete({
      where: { id: testReport.id }
    })
    console.log('✅ Report de teste removido')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    
    if (error.message.includes('Unknown model')) {
      console.log('💡 Solução: Execute "npx prisma generate" e "npx prisma db push"')
    }
  } finally {
    await prisma.$disconnect()
  }
}

checkReportTable()
