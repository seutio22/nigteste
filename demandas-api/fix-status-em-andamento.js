/**
 * Script para corrigir status "EM ANDAMENTO" -> "Em Andamento"
 * Execute: npx @railway/cli run --service nigteste node fix-status-em-andamento.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixStatus() {
  console.log('🔍 Procurando registros com status "EM ANDAMENTO"...\n')
  
  try {
    // Verificar quantos registros existem
    const count = await prisma.demanda.count({
      where: {
        status: 'EM ANDAMENTO'
      }
    })
    
    console.log(`📊 Encontrados ${count} registro(s) com status "EM ANDAMENTO"`)
    
    if (count === 0) {
      console.log('✅ Nenhum registro encontrado. Pode já ter sido corrigido.')
      await prisma.$disconnect()
      return
    }
    
    // Mostrar os registros que serão alterados
    const registros = await prisma.demanda.findMany({
      where: {
        status: 'EM ANDAMENTO'
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
    
    console.log('\n📋 Registro(s) que será(ão) alterado(s):')
    registros.forEach((reg, index) => {
      console.log(`  ${index + 1}. ID: ${reg.id}`)
      console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
      console.log(`     Status atual: "${reg.status}"`)
      console.log(`     Criado em: ${reg.createdAt}`)
      console.log('')
    })
    
    // Atualizar
    console.log('✨ Executando correção...\n')
    const result = await prisma.demanda.updateMany({
      where: {
        status: 'EM ANDAMENTO'
      },
      data: {
        status: 'Em Andamento',
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ ${result.count} registro(s) atualizado(s) com sucesso!`)
    console.log('✨ Status alterado de "EM ANDAMENTO" para "Em Andamento"\n')
    
    // Verificar resultado
    const verificacao = await prisma.demanda.findFirst({
      where: {
        id: registros[0].id
      },
      select: {
        id: true,
        status: true,
        ticket: true,
        updatedAt: true
      }
    })
    
    if (verificacao) {
      console.log('📋 Verificação - Registro atualizado:')
      console.log(`  ID: ${verificacao.id}`)
      console.log(`  Ticket: ${verificacao.ticket || 'N/A'}`)
      console.log(`  Status: "${verificacao.status}"`)
      console.log(`  Atualizado em: ${verificacao.updatedAt}`)
    }
    
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

