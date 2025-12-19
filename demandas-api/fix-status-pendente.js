/**
 * Script para alterar status "Pendente" -> "Em andamento"
 * Execute: npx @railway/cli run --service nigteste node fix-status-pendente.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixStatus() {
  console.log('🔍 Procurando registros com status "Pendente"...\n')
  
  try {
    // Verificar quantos registros existem
    const count = await prisma.demanda.count({
      where: {
        status: 'Pendente'
      }
    })
    
    console.log(`📊 Encontrados ${count} registro(s) com status "Pendente"`)
    
    if (count === 0) {
      console.log('✅ Nenhum registro encontrado com status "Pendente".')
      await prisma.$disconnect()
      return
    }
    
    // Mostrar alguns exemplos dos registros que serão alterados
    const exemplos = await prisma.demanda.findMany({
      where: {
        status: 'Pendente'
      },
      select: {
        id: true,
        ticket: true,
        status: true,
        createdAt: true
      },
      take: 5
    })
    
    console.log('\n📋 Exemplos de registros que serão alterados (mostrando 5 primeiros):')
    exemplos.forEach((reg, index) => {
      console.log(`  ${index + 1}. ID: ${reg.id}`)
      console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
      console.log(`     Status atual: "${reg.status}"`)
      console.log(`     Criado em: ${reg.createdAt}`)
      console.log('')
    })
    
    if (count > 5) {
      console.log(`  ... e mais ${count - 5} registro(s)\n`)
    }
    
    // Atualizar
    console.log(`✨ Executando alteração de ${count} registro(s)...\n`)
    const result = await prisma.demanda.updateMany({
      where: {
        status: 'Pendente'
      },
      data: {
        status: 'Em andamento',
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ ${result.count} registro(s) atualizado(s) com sucesso!`)
    console.log('✨ Status alterado de "Pendente" para "Em andamento"\n')
    
    // Verificar resultado - contar quantos agora têm "Em andamento"
    const countEmAndamento = await prisma.demanda.count({
      where: {
        status: 'Em andamento'
      }
    })
    
    console.log(`📊 Total de registros com status "Em andamento" agora: ${countEmAndamento}`)
    
    // Verificar se ainda há algum "Pendente"
    const countPendente = await prisma.demanda.count({
      where: {
        status: 'Pendente'
      }
    })
    
    if (countPendente === 0) {
      console.log('✅ Todos os registros "Pendente" foram alterados!')
    } else {
      console.log(`⚠️  Ainda existem ${countPendente} registro(s) com status "Pendente"`)
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

