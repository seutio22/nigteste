/**
 * Script para normalizar status "Em andamento" na tabela Manutencao
 * Execute: npx @railway/cli run --service nigteste node normalize-manutencao-em-andamento.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function normalizeStatus() {
  console.log('🔍 Verificando variações de status "Em andamento" em Manutenções...\n')
  
  try {
    // Verificar quantos registros têm cada variação
    const countEMANDAMENTO = await prisma.manutencao.count({
      where: {
        status: 'EM ANDAMENTO'
      }
    })
    
    const countEmAndamento = await prisma.manutencao.count({
      where: {
        status: 'Em andamento'
      }
    })
    
    const countEmAndamentoMaiusculo = await prisma.manutencao.count({
      where: {
        status: 'Em Andamento'
      }
    })
    
    console.log(`📊 Status encontrados:`)
    console.log(`  "EM ANDAMENTO" (todo maiúsculo): ${countEMANDAMENTO} registro(s)`)
    console.log(`  "Em andamento" (padrão): ${countEmAndamento} registro(s)`)
    console.log(`  "Em Andamento" (com A maiúsculo): ${countEmAndamentoMaiusculo} registro(s)`)
    console.log(`  Total a normalizar: ${countEMANDAMENTO + countEmAndamentoMaiusculo} registro(s)\n`)
    
    if (countEMANDAMENTO === 0 && countEmAndamentoMaiusculo === 0) {
      console.log('✅ Nenhum registro encontrado para normalizar.')
      if (countEmAndamento > 0) {
        console.log(`✅ Todos os ${countEmAndamento} registros já estão com o padrão "Em andamento"!`)
      }
      await prisma.$disconnect()
      return
    }
    
    // Normalizar "EM ANDAMENTO" -> "Em andamento"
    if (countEMANDAMENTO > 0) {
      console.log(`✨ Normalizando ${countEMANDAMENTO} registro(s) de "EM ANDAMENTO" para "Em andamento"...`)
      
      const result1 = await prisma.manutencao.updateMany({
        where: {
          status: 'EM ANDAMENTO'
        },
        data: {
          status: 'Em andamento',
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ ${result1.count} registro(s) normalizado(s)!`)
    }
    
    // Normalizar "Em Andamento" -> "Em andamento"
    if (countEmAndamentoMaiusculo > 0) {
      console.log(`\n✨ Normalizando ${countEmAndamentoMaiusculo} registro(s) de "Em Andamento" para "Em andamento"...`)
      
      const result2 = await prisma.manutencao.updateMany({
        where: {
          status: 'Em Andamento'
        },
        data: {
          status: 'Em andamento',
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ ${result2.count} registro(s) normalizado(s)!`)
    }
    
    // Verificar resultado final
    const countFinalEMANDAMENTO = await prisma.manutencao.count({
      where: {
        status: 'EM ANDAMENTO'
      }
    })
    
    const countFinalEmAndamento = await prisma.manutencao.count({
      where: {
        status: 'Em andamento'
      }
    })
    
    const countFinalEmAndamentoMaiusculo = await prisma.manutencao.count({
      where: {
        status: 'Em Andamento'
      }
    })
    
    console.log('\n📊 Resultado final:')
    console.log(`  "Em andamento" (padrão nativo): ${countFinalEmAndamento} registro(s)`)
    
    if (countFinalEMANDAMENTO > 0 || countFinalEmAndamentoMaiusculo > 0) {
      console.log(`  "EM ANDAMENTO" (ainda existe): ${countFinalEMANDAMENTO} registro(s)`)
      console.log(`  "Em Andamento" (ainda existe): ${countFinalEmAndamentoMaiusculo} registro(s)`)
      console.log(`  ⚠️  Ainda há variações não normalizadas!`)
    } else {
      console.log(`  ✅ Todos os registros foram normalizados para "Em andamento"!`)
      console.log(`  📈 Total de registros com status "Em andamento": ${countFinalEmAndamento}`)
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

