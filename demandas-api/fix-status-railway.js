/**
 * Script para corrigir status "EM ANDAMENT" -> "Em Andamento" via Railway
 * Execute: npx @railway/cli run --service nigteste node fix-status-railway.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixStatus() {
  console.log('🔍 Procurando registros com status "EM ANDAMENT"...\n')
  
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
      await prisma.$disconnect()
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
        descricao: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    console.log('\n📋 Registros que serão alterados:')
    registros.forEach((reg, index) => {
      console.log(`  ${index + 1}. ID: ${reg.id}`)
      console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
      console.log(`     Status atual: ${reg.status}`)
      console.log(`     Criado em: ${reg.createdAt}`)
      console.log('')
    })
    
    // Atualizar
    console.log('✨ Executando correção...\n')
    const result = await prisma.demanda.updateMany({
      where: {
        status: 'EM ANDAMENT'
      },
      data: {
        status: 'Em Andamento',
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ ${result.count} registro(s) atualizado(s) com sucesso!`)
    console.log('✨ Status alterado de "EM ANDAMENT" para "Em Andamento"\n')
    
    // Verificar resultado
    const verificacao = await prisma.demanda.findMany({
      where: {
        status: 'Em Andamento'
      },
      select: {
        id: true,
        status: true,
        ticket: true,
        updatedAt: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 5
    })
    
    console.log('📋 Verificação - Últimos 5 registros com status "Em Andamento":')
    verificacao.forEach((reg, index) => {
      console.log(`  ${index + 1}. ID: ${reg.id}, Ticket: ${reg.ticket || 'N/A'}, Atualizado: ${reg.updatedAt}`)
    })
    
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

