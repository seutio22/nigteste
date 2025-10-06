const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearMonitoringData() {
  try {
    console.log('🧹 Iniciando limpeza dos dados de monitoramento...')
    
    // Limpar dados de atividades
    const deletedActivities = await prisma.userActivity.deleteMany({})
    console.log(`✅ Removidas ${deletedActivities.count} atividades`)
    
    // Limpar dados de sessões
    const deletedSessions = await prisma.userSession.deleteMany({})
    console.log(`✅ Removidas ${deletedSessions.count} sessões`)
    
    // Limpar dados de monitoramento
    const deletedMonitoring = await prisma.userMonitoring.deleteMany({})
    console.log(`✅ Removidos ${deletedMonitoring.count} registros de monitoramento`)
    
    console.log('🎯 Dados de monitoramento zerados! Sistema pronto para começar a contar a partir de agora.')
    
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearMonitoringData()
