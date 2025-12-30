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
    
    // Lista de todas as variações possíveis de "concluido" que devem ser normalizadas
    const VARIACOES_PARA_NORMALIZAR = [
      'CONCLUIDO',
      'Concluido',
      'concluido',
      'CONCLUIDA',
      'Concluida',
      'concluida',
      'CONCLUÍDO',
      'Concluído',
      'concluído',
      'CONCLUÍDA',
      'concluída'
    ]
    
    // Verificar quantos registros têm cada variação que precisa ser normalizada
    const variacoesEncontradas = {}
    let totalParaNormalizar = 0
    
    for (const variacao of VARIACOES_PARA_NORMALIZAR) {
      const count = await prisma.report.count({
        where: {
          status: variacao
        }
      })
      
      if (count > 0) {
        variacoesEncontradas[variacao] = count
        totalParaNormalizar += count
      }
    }
    
    const countConcluida = await prisma.report.count({
      where: {
        status: 'Concluída'
      }
    })
    
    console.log(`\n📊 Variações de "concluido" encontradas:`)
    Object.entries(variacoesEncontradas).forEach(([variacao, count]) => {
      console.log(`  "${variacao}": ${count} registro(s)`)
    })
    console.log(`  "Concluída" (padrão nativo): ${countConcluida} registro(s)`)
    console.log(`  Total a normalizar: ${totalParaNormalizar} registro(s)\n`)
    
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
          in: Object.keys(variacoesEncontradas).filter(v => v !== 'Concluída')
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
    
    // Normalizar cada variação encontrada
    let totalNormalizado = 0
    
    for (const [variacao, count] of Object.entries(variacoesEncontradas)) {
      if (variacao === 'Concluída') {
        continue
      }
      
      console.log(`✨ Normalizando ${count} registro(s) de "${variacao}" para "Concluída"...`)
      
      const result = await prisma.report.updateMany({
        where: {
          status: variacao
        },
        data: {
          status: 'Concluída',
          updatedAt: new Date()
        }
      })
      
      console.log(`✅ ${result.count} registro(s) normalizado(s)!`)
      totalNormalizado += result.count
    }
    
    // Verificar resultado final
    const countFinalConcluida = await prisma.report.count({
      where: {
        status: 'Concluída'
      }
    })
    
    // Verificar se ainda há variações não normalizadas
    const variacoesRestantes = {}
    for (const variacao of VARIACOES_PARA_NORMALIZAR) {
      if (variacao === 'Concluída') continue
      
      const count = await prisma.report.count({
        where: {
          status: variacao
        }
      })
      
      if (count > 0) {
        variacoesRestantes[variacao] = count
      }
    }
    
    console.log('\n📊 Resultado final:')
    console.log(`  "Concluída" (padrão correto): ${countFinalConcluida} registro(s)`)
    
    if (Object.keys(variacoesRestantes).length > 0) {
      console.log(`\n  ⚠️  Ainda há variações não normalizadas:`)
      Object.entries(variacoesRestantes).forEach(([variacao, count]) => {
        console.log(`    "${variacao}": ${count} registro(s)`)
      })
    } else {
      console.log(`\n  ✅ Todos os registros foram normalizados para "Concluída"!`)
      console.log(`  📈 Total de registros normalizados: ${totalNormalizado}`)
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

