/**
 * Script para normalizar status "CONCLUIDO" -> "Concluída" na tabela Validacao
 * Execute: npx @railway/cli run --service nigteste node normalize-validacao-concluida.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function normalizeStatus() {
  console.log('🔍 Verificando status na tabela Validacao...\n')
  
  try {
    // Verificar quantos registros têm cada variação
    const countCONCLUIDO = await prisma.validacao.count({
      where: {
        status: 'CONCLUIDO'
      }
    })
    
    const countConcluida = await prisma.validacao.count({
      where: {
        status: 'Concluída'
      }
    })
    
    // Verificar todos os status para entender o padrão
    const todasValidacoes = await prisma.validacao.findMany({
      select: {
        status: true
      }
    })
    
    // Agrupar por status
    const statusCount = {}
    todasValidacoes.forEach(v => {
      const status = v.status || '(vazio)'
      statusCount[status] = (statusCount[status] || 0) + 1
    })
    
    console.log('📊 Todos os status encontrados na tabela Validacao:\n')
    Object.keys(statusCount).sort().forEach(status => {
      console.log(`  "${status}": ${statusCount[status]} registro(s)`)
    })
    
    console.log(`\n📊 Status encontrados:`)
    console.log(`  "CONCLUIDO" (todo maiúsculo): ${countCONCLUIDO} registro(s)`)
    console.log(`  "Concluída" (padrão nativo): ${countConcluida} registro(s)`)
    console.log(`  Total a normalizar: ${countCONCLUIDO} registro(s)\n`)
    
    if (countCONCLUIDO === 0) {
      console.log('✅ Nenhum registro encontrado com status "CONCLUIDO" para normalizar.')
      if (countConcluida > 0) {
        console.log(`✅ Todos os ${countConcluida} registros já estão com o padrão "Concluída"!`)
      }
      await prisma.$disconnect()
      return
    }
    
    // Mostrar exemplos dos registros que serão alterados
    const exemplos = await prisma.validacao.findMany({
      where: {
        status: 'CONCLUIDO'
      },
      select: {
        id: true,
        ticket: true,
        status: true,
        updatedAt: true
      },
      take: 5
    })
    
    console.log('📋 Registros com "CONCLUIDO" que serão normalizados:')
    exemplos.forEach((reg, index) => {
      console.log(`  ${index + 1}. ID: ${reg.id}`)
      console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
      console.log(`     Status atual: "${reg.status}"`)
      console.log(`     Atualizado: ${reg.updatedAt}`)
      console.log('')
    })
    
    if (countCONCLUIDO > 5) {
      console.log(`  ... e mais ${countCONCLUIDO - 5} registro(s)\n`)
    }
    
    // Normalizar "CONCLUIDO" -> "Concluída"
    console.log(`✨ Normalizando ${countCONCLUIDO} registro(s) de "CONCLUIDO" para "Concluída"...\n`)
    
    const result = await prisma.validacao.updateMany({
      where: {
        status: 'CONCLUIDO'
      },
      data: {
        status: 'Concluída',
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ ${result.count} registro(s) normalizado(s) com sucesso!`)
    console.log(`✨ Status alterado de "CONCLUIDO" para "Concluída"\n`)
    
    // Verificar resultado final
    const countFinalCONCLUIDO = await prisma.validacao.count({
      where: {
        status: 'CONCLUIDO'
      }
    })
    
    const countFinalConcluida = await prisma.validacao.count({
      where: {
        status: 'Concluída'
      }
    })
    
    console.log('📊 Resultado final:')
    console.log(`  "Concluída" (padrão nativo): ${countFinalConcluida} registro(s)`)
    
    if (countFinalCONCLUIDO > 0) {
      console.log(`  "CONCLUIDO" (ainda existe): ${countFinalCONCLUIDO} registro(s)`)
      console.log(`  ⚠️  Ainda há variações não normalizadas!`)
    } else {
      console.log(`  ✅ Todos os registros foram normalizados para "Concluída"!`)
      console.log(`  📈 Total de registros com status "Concluída": ${countFinalConcluida}`)
    }
    
  } catch (error) {
    console.error('❌ Erro ao normalizar status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
normalizeStatus()
  .then(() => {
    console.log('\n✅ Processo concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no processo:', error)
    process.exit(1)
  })

