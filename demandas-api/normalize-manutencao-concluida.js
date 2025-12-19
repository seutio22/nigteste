/**
 * Script para normalizar status de Manutenção: "CONCLUIDO" e "Concluido" -> "Concluída"
 * Execute: npx @railway/cli run --service nigteste node normalize-manutencao-concluida.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function normalizeStatus() {
  console.log('🔍 Normalizando status de Manutenções...\n')
  
  try {
    // Verificar quantos registros têm cada variação
    const countCONCLUIDO = await prisma.manutencao.count({
      where: {
        status: 'CONCLUIDO'
      }
    })
    
    const countConcluido = await prisma.manutencao.count({
      where: {
        status: 'Concluido'
      }
    })
    
    const countConcluida = await prisma.manutencao.count({
      where: {
        status: 'Concluída'
      }
    })
    
    console.log(`📊 Status encontrados:`)
    console.log(`  "CONCLUIDO" (todo maiúsculo): ${countCONCLUIDO} registro(s)`)
    console.log(`  "Concluido" (sem acento): ${countConcluido} registro(s)`)
    console.log(`  "Concluída" (padrão nativo): ${countConcluida} registro(s)`)
    console.log(`  Total a normalizar: ${countCONCLUIDO + countConcluido} registro(s)\n`)
    
    if (countCONCLUIDO === 0 && countConcluido === 0) {
      console.log('✅ Nenhum registro encontrado para normalizar.')
      await prisma.$disconnect()
      return
    }
    
    // Normalizar "CONCLUIDO" -> "Concluída"
    if (countCONCLUIDO > 0) {
      console.log(`✨ Normalizando ${countCONCLUIDO} registro(s) de "CONCLUIDO" para "Concluída"...`)
      
      const result1 = await prisma.manutencao.updateMany({
        where: {
          status: 'CONCLUIDO'
        },
        data: {
          status: 'Concluída',
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ ${result1.count} registro(s) normalizado(s)!`)
    }
    
    // Normalizar "Concluido" -> "Concluída"
    if (countConcluido > 0) {
      console.log(`\n✨ Normalizando ${countConcluido} registro(s) de "Concluido" para "Concluída"...`)
      
      const result2 = await prisma.manutencao.updateMany({
        where: {
          status: 'Concluido'
        },
        data: {
          status: 'Concluída',
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ ${result2.count} registro(s) normalizado(s)!`)
    }
    
    // Verificar resultado final
    const countFinalCONCLUIDO = await prisma.manutencao.count({
      where: {
        status: 'CONCLUIDO'
      }
    })
    
    const countFinalConcluido = await prisma.manutencao.count({
      where: {
        status: 'Concluido'
      }
    })
    
    const countFinalConcluida = await prisma.manutencao.count({
      where: {
        status: 'Concluída'
      }
    })
    
    console.log('\n📊 Resultado final:')
    console.log(`  "Concluída" (padrão nativo): ${countFinalConcluida} registro(s)`)
    
    if (countFinalCONCLUIDO > 0 || countFinalConcluido > 0) {
      console.log(`  "CONCLUIDO" (ainda existe): ${countFinalCONCLUIDO} registro(s)`)
      console.log(`  "Concluido" (ainda existe): ${countFinalConcluido} registro(s)`)
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

