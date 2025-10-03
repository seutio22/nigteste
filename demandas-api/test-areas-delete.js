// Script para testar exclusão de áreas
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAreasDelete() {
  try {
    console.log('🔍 Testando exclusão de áreas...')
    
    // Listar todas as áreas
    const areas = await prisma.area.findMany()
    console.log(`📋 Áreas encontradas: ${areas.length}`)
    
    if (areas.length === 0) {
      console.log('❌ Nenhuma área encontrada para testar')
      return
    }
    
    // Pegar a primeira área para testar
    const testArea = areas[0]
    console.log(`🎯 Testando exclusão da área: ${testArea.nome} (ID: ${testArea.id})`)
    
    // Verificar dependências
    const [demandas, atendimentos, manutencoes] = await Promise.all([
      prisma.demanda.count({ where: { areaId: testArea.id } }),
      prisma.atendimento.count({ where: { areaId: testArea.id } }),
      prisma.manutencao.count({ where: { areaId: testArea.id } })
    ])
    
    console.log(`📊 Dependências encontradas:`)
    console.log(`  - Demandas: ${demandas}`)
    console.log(`  - Atendimentos: ${atendimentos}`)
    console.log(`  - Manutenções: ${manutencoes}`)
    
    const hasDependencies = demandas > 0 || atendimentos > 0 || manutencoes > 0
    
    if (hasDependencies) {
      console.log('⚠️ Área possui dependências, não pode ser excluída')
      return
    }
    
    // Tentar excluir
    console.log('🗑️ Tentando excluir área...')
    const result = await prisma.area.delete({ where: { id: testArea.id } })
    console.log('✅ Área excluída com sucesso:', result)
    
  } catch (error) {
    console.error('❌ Erro ao testar exclusão de áreas:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAreasDelete()
