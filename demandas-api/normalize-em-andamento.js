/**
 * Script para normalizar status "Em Andamento" -> "Em andamento"
 * Execute: npx @railway/cli run --service nigteste node normalize-em-andamento.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function normalizeStatus() {
  console.log('🔍 Verificando variações de status "Em Andamento"...\n')
  
  try {
    // Verificar quantos registros têm cada variação
    const countEmAndamento = await prisma.demanda.count({
      where: {
        status: 'Em Andamento'
      }
    })
    
    const countEmAndamentoMinusculo = await prisma.demanda.count({
      where: {
        status: 'Em andamento'
      }
    })
    
    console.log(`📊 Status encontrados:`)
    console.log(`  "Em Andamento" (com A maiúsculo): ${countEmAndamento} registro(s)`)
    console.log(`  "Em andamento" (com a minúsculo): ${countEmAndamentoMinusculo} registro(s)`)
    console.log(`  Total: ${countEmAndamento + countEmAndamentoMinusculo} registro(s)\n`)
    
    if (countEmAndamento === 0 && countEmAndamentoMinusculo === 0) {
      console.log('✅ Nenhum registro encontrado para normalizar.')
      await prisma.$disconnect()
      return
    }
    
    // Mostrar exemplos dos registros que serão alterados
    if (countEmAndamento > 0) {
      const exemplos = await prisma.demanda.findMany({
        where: {
          status: 'Em Andamento'
        },
        select: {
          id: true,
          ticket: true,
          status: true,
          updatedAt: true
        },
        take: 5
      })
      
      console.log('📋 Registros com "Em Andamento" que serão normalizados:')
      exemplos.forEach((reg, index) => {
        console.log(`  ${index + 1}. ID: ${reg.id}`)
        console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
        console.log(`     Status atual: "${reg.status}"`)
        console.log('')
      })
      
      if (countEmAndamento > 5) {
        console.log(`  ... e mais ${countEmAndamento - 5} registro(s)\n`)
      }
    }
    
    // Normalizar: alterar "Em Andamento" para "Em andamento"
    if (countEmAndamento > 0) {
      console.log(`✨ Normalizando ${countEmAndamento} registro(s) de "Em Andamento" para "Em andamento"...\n`)
      
      const result = await prisma.demanda.updateMany({
        where: {
          status: 'Em Andamento'
        },
        data: {
          status: 'Em andamento',
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ ${result.count} registro(s) normalizado(s) com sucesso!`)
      console.log('✨ Status alterado de "Em Andamento" para "Em andamento"\n')
    }
    
    // Verificar resultado final
    const countFinal = await prisma.demanda.count({
      where: {
        status: 'Em andamento'
      }
    })
    
    const countFinalMaiusculo = await prisma.demanda.count({
      where: {
        status: 'Em Andamento'
      }
    })
    
    console.log('📊 Resultado final:')
    console.log(`  "Em andamento" (padrão): ${countFinal} registro(s)`)
    
    if (countFinalMaiusculo > 0) {
      console.log(`  "Em Andamento" (ainda existe): ${countFinalMaiusculo} registro(s)`)
      console.log(`  ⚠️  Ainda há variações não normalizadas!`)
    } else {
      console.log(`  ✅ Todos os registros foram normalizados para "Em andamento"!`)
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

