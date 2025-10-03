// Script para testar especificamente a exclusão de áreas
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAreasSpecific() {
  try {
    console.log('🔍 Testando exclusão específica de áreas...')
    
    // Primeiro, criar uma área de teste
    console.log('📝 Criando área de teste...')
    const testArea = await prisma.area.create({
      data: {
        nome: 'Área de Teste - ' + Date.now()
      }
    })
    console.log(`✅ Área criada: ${testArea.nome} (ID: ${testArea.id})`)
    
    // Verificar se a área foi criada
    const areas = await prisma.area.findMany()
    console.log(`📋 Total de áreas: ${areas.length}`)
    
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
    } else {
      console.log('✅ Área não possui dependências, pode ser excluída')
      
      // Tentar excluir
      console.log('🗑️ Tentando excluir área...')
      const result = await prisma.area.delete({ where: { id: testArea.id } })
      console.log('✅ Área excluída com sucesso:', result)
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar exclusão de áreas:', error)
    console.error('❌ Detalhes do erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testAreasSpecific()
