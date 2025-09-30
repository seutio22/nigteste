const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkData() {
  try {
    console.log('🔍 Verificando dados nas tabelas...\n')
    
    // Verificar Solicitantes
    const solicitantes = await prisma.solicitante.findMany()
    console.log(`📋 Solicitantes: ${solicitantes.length} registros`)
    if (solicitantes.length > 0) {
      console.log('   Dados:', solicitantes.map(s => ({ id: s.id, nome: s.nome })))
    }
    
    // Verificar Relatórios
    const relatorios = await prisma.relatorio.findMany()
    console.log(`📊 Relatórios: ${relatorios.length} registros`)
    if (relatorios.length > 0) {
      console.log('   Dados:', relatorios.map(r => ({ id: r.id, nome: r.nome })))
    }
    
    // Verificar Modelos
    const modelos = await prisma.modelo.findMany()
    console.log(`📝 Modelos: ${modelos.length} registros`)
    if (modelos.length > 0) {
      console.log('   Dados:', modelos.map(m => ({ id: m.id, nome: m.nome })))
    }
    
    console.log('\n✅ Verificação concluída!')
    
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkData()
