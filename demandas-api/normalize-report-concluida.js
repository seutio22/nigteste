/**
 * Script para normalizar status "concluido" -> "Concluída" na tabela Report (usada pela página Analytics)
 * Execute: npx @railway/cli run --service nigteste node normalize-report-concluida.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function normalizeStatus() {
  console.log('🔍 Verificando status na tabela Report (Analytics)...\n')
  
  try {
    // Verificar todos os status na tabela Report
    const todasReports = await prisma.report.findMany({
      select: {
        status: true
      }
    })
    
    // Agrupar por status
    const statusCount = {}
    todasReports.forEach(r => {
      const status = r.status || '(vazio)'
      statusCount[status] = (statusCount[status] || 0) + 1
    })
    
    console.log('📊 Todos os status encontrados na tabela Report:\n')
    Object.keys(statusCount).sort().forEach(status => {
      console.log(`  "${status}": ${statusCount[status]} registro(s)`)
    })
    
    // Verificar variações de "concluido"
    const countCONCLUIDO = await prisma.report.count({
      where: {
        status: 'CONCLUIDO'
      }
    })
    
    const countConcluido = await prisma.report.count({
      where: {
        status: 'Concluido'
      }
    })
    
    const countConcluida = await prisma.report.count({
      where: {
        status: 'Concluída'
      }
    })
    
    const countConcluidoMinusculo = await prisma.report.count({
      where: {
        status: 'concluido'
      }
    })
    
    console.log(`\n📊 Variações de "concluido" encontradas:`)
    console.log(`  "CONCLUIDO" (todo maiúsculo): ${countCONCLUIDO} registro(s)`)
    console.log(`  "Concluido" (sem acento): ${countConcluido} registro(s)`)
    console.log(`  "concluido" (todo minúsculo): ${countConcluidoMinusculo} registro(s)`)
    console.log(`  "Concluída" (padrão nativo): ${countConcluida} registro(s)`)
    console.log(`  Total a normalizar: ${countCONCLUIDO + countConcluido + countConcluidoMinusculo} registro(s)\n`)
    
    const totalParaNormalizar = countCONCLUIDO + countConcluido + countConcluidoMinusculo
    
    if (totalParaNormalizar === 0) {
      console.log('✅ Nenhum registro encontrado com variações de "concluido" para normalizar.')
      if (countConcluida > 0) {
        console.log(`✅ Todos os ${countConcluida} registros já estão com o padrão "Concluída"!`)
      }
      await prisma.$disconnect()
      return
    }
    
    // Mostrar exemplos dos registros que serão alterados
    const exemplos = await prisma.report.findMany({
      where: {
        status: {
          in: ['CONCLUIDO', 'Concluido', 'concluido'].filter(s => {
            if (s === 'CONCLUIDO' && countCONCLUIDO > 0) return true
            if (s === 'Concluido' && countConcluido > 0) return true
            if (s === 'concluido' && countConcluidoMinusculo > 0) return true
            return false
          })
        }
      },
      select: {
        id: true,
        ticket: true,
        status: true,
        titulo: true,
        updatedAt: true
      },
      take: 5
    })
    
    if (exemplos.length > 0) {
      console.log('📋 Exemplos de registros que serão normalizados:')
      exemplos.forEach((reg, index) => {
        console.log(`  ${index + 1}. ID: ${reg.id}`)
        console.log(`     Título: ${reg.titulo || 'N/A'}`)
        console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
        console.log(`     Status atual: "${reg.status}"`)
        console.log(`     Atualizado: ${reg.updatedAt}`)
        console.log('')
      })
      
      if (totalParaNormalizar > 5) {
        console.log(`  ... e mais ${totalParaNormalizar - 5} registro(s)\n`)
      }
    }
    
    // Normalizar "CONCLUIDO" -> "Concluída"
    if (countCONCLUIDO > 0) {
      console.log(`✨ Normalizando ${countCONCLUIDO} registro(s) de "CONCLUIDO" para "Concluída"...`)
      
      const result1 = await prisma.report.updateMany({
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
      
      const result2 = await prisma.report.updateMany({
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
    
    // Normalizar "concluido" -> "Concluída"
    if (countConcluidoMinusculo > 0) {
      console.log(`\n✨ Normalizando ${countConcluidoMinusculo} registro(s) de "concluido" para "Concluída"...`)
      
      const result3 = await prisma.report.updateMany({
        where: {
          status: 'concluido'
        },
        data: {
          status: 'Concluída',
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ ${result3.count} registro(s) normalizado(s)!`)
    }
    
    // Verificar resultado final
    const countFinalCONCLUIDO = await prisma.report.count({
      where: {
        status: 'CONCLUIDO'
      }
    })
    
    const countFinalConcluido = await prisma.report.count({
      where: {
        status: 'Concluido'
      }
    })
    
    const countFinalConcluidoMinusculo = await prisma.report.count({
      where: {
        status: 'concluido'
      }
    })
    
    const countFinalConcluida = await prisma.report.count({
      where: {
        status: 'Concluída'
      }
    })
    
    console.log('\n📊 Resultado final:')
    console.log(`  "Concluída" (padrão nativo): ${countFinalConcluida} registro(s)`)
    
    if (countFinalCONCLUIDO > 0 || countFinalConcluido > 0 || countFinalConcluidoMinusculo > 0) {
      console.log(`  "CONCLUIDO" (ainda existe): ${countFinalCONCLUIDO} registro(s)`)
      console.log(`  "Concluido" (ainda existe): ${countFinalConcluido} registro(s)`)
      console.log(`  "concluido" (ainda existe): ${countFinalConcluidoMinusculo} registro(s)`)
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

