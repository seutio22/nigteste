/**
 * Script para corrigir status "EM ANDAMENT" -> "Em Andamento"
 * Apenas 1 caso na tabela Demanda
 */

// Tentar carregar variáveis de ambiente do arquivo .env se existir
try {
  require('dotenv').config()
} catch (e) {
  // dotenv não instalado, usar variáveis de ambiente do sistema
}

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixStatus() {
  console.log('🔍 Procurando registros com status "EM ANDAMENT"...')
  
  try {
    // Verificar quantos registros existem
    const count = await prisma.demanda.count({
      where: {
        status: 'EM ANDAMENT'
      }
    })
    
    console.log(`📊 Encontrados ${count} registro(s) com status "EM ANDAMENT"`)
    
    if (count === 0) {
      console.log('✅ Nenhum registro encontrado. Pode já ter sido corrigido.')
      return
    }
    
    // Mostrar os registros que serão alterados
    const registros = await prisma.demanda.findMany({
      where: {
        status: 'EM ANDAMENT'
      },
      select: {
        id: true,
        ticket: true,
        status: true,
        descricao: true
      }
    })
    
    console.log('\n📋 Registros que serão alterados:')
    registros.forEach((reg, index) => {
      console.log(`  ${index + 1}. ID: ${reg.id}, Ticket: ${reg.ticket || 'N/A'}, Status: ${reg.status}`)
    })
    
    // Atualizar
    const result = await prisma.demanda.updateMany({
      where: {
        status: 'EM ANDAMENT'
      },
      data: {
        status: 'Em Andamento',
        updatedAt: new Date()
      }
    })
    
    console.log(`\n✅ ${result.count} registro(s) atualizado(s) com sucesso!`)
    console.log('✨ Status alterado de "EM ANDAMENT" para "Em Andamento"')
    
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
fixStatus()
  .then(() => {
    console.log('\n✅ Processo concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no processo:', error)
    process.exit(1)
  })

