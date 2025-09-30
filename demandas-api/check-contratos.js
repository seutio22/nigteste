const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkContratos() {
  try {
    console.log('🔍 Verificando contratos no banco de dados...')
    
    // Buscar todos os contratos
    const contratos = await prisma.contrato.findMany({
      include: {
        cliente: true
      }
    })
    
    console.log(`📊 Total de contratos encontrados: ${contratos.length}`)
    
    if (contratos.length > 0) {
      console.log('\n📋 Lista de contratos:')
      contratos.forEach((contrato, index) => {
        console.log(`${index + 1}. ID: ${contrato.id}`)
        console.log(`   Número: ${contrato.numero}`)
        console.log(`   Código: ${contrato.codigo}`)
        console.log(`   Cliente: ${contrato.cliente?.nome || 'N/A'}`)
        console.log(`   Cliente ID: ${contrato.clienteId}`)
        console.log(`   Grupo Econômico: ${contrato.grupoEconomico}`)
        console.log('---')
      })
    } else {
      console.log('❌ Nenhum contrato encontrado no banco de dados!')
    }
    
    // Verificar o contrato específico que está falhando
    const contratoId = '68599ce3-2f76-437f-bbbe-a28da0e4292a'
    console.log(`\n🔍 Verificando contrato específico: ${contratoId}`)
    
    const contratoEspecifico = await prisma.contrato.findUnique({
      where: { id: contratoId },
      include: { cliente: true }
    })
    
    if (contratoEspecifico) {
      console.log('✅ Contrato encontrado:')
      console.log(`   Número: ${contratoEspecifico.numero}`)
      console.log(`   Cliente: ${contratoEspecifico.cliente?.nome}`)
    } else {
      console.log('❌ Contrato não encontrado!')
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar contratos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkContratos()
