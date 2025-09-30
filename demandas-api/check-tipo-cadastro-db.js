// Verificar dados na tabela TipoCadastro

const { PrismaClient } = require('@prisma/client')

async function checkTipoCadastroDB() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Verificando dados na tabela TipoCadastro...')
    
    // Verificar se a tabela existe e tem dados
    const tiposCadastro = await prisma.tipoCadastro.findMany()
    console.log('📋 Tipos de cadastro encontrados:', tiposCadastro.length)
    
    if (tiposCadastro.length > 0) {
      console.log('📋 Dados:')
      tiposCadastro.forEach((tipo, index) => {
        console.log(`  ${index + 1}. ID: ${tipo.id}, Nome: ${tipo.nome}`)
      })
    } else {
      console.log('📋 Nenhum dado encontrado na tabela TipoCadastro')
    }
    
    // Verificar também a tabela TipoDemanda para comparar
    console.log('\n🔍 Verificando dados na tabela TipoDemanda...')
    const tiposDemanda = await prisma.tipoDemanda.findMany()
    console.log('📋 Tipos de demanda encontrados:', tiposDemanda.length)
    
    if (tiposDemanda.length > 0) {
      console.log('📋 Primeiros 3 dados:')
      tiposDemanda.slice(0, 3).forEach((tipo, index) => {
        console.log(`  ${index + 1}. ID: ${tipo.id}, Nome: ${tipo.nome}, tipoServicoId: ${tipo.tipoServicoId}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

checkTipoCadastroDB()
