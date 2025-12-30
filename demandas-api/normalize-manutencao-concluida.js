/**
 * Script para normalizar status de Manutenção: todas variações de "CONCLUIDO" -> "Concluída"
 * Execute: npx @railway/cli run --service nigteste node normalize-manutencao-concluida.js
 * OU localmente: cd demandas-api && node normalize-manutencao-concluida.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

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
  'Concluída', // Já está no padrão, mas vamos manter para garantir
  'concluída'
]

async function normalizeStatus() {
  console.log('🔍 Normalizando status de Manutenções...\n')
  
  try {
    // Primeiro, buscar todas as manutenções para ver quais status existem
    const todasManutencoes = await prisma.manutencao.findMany({
      select: {
        status: true
      }
    })
    
    // Agrupar por status
    const statusCount = {}
    todasManutencoes.forEach(m => {
      const status = m.status || '(vazio)'
      statusCount[status] = (statusCount[status] || 0) + 1
    })
    
    console.log('📊 Status encontrados na tabela Manutencao:\n')
    Object.keys(statusCount).sort().forEach(status => {
      console.log(`  "${status}": ${statusCount[status]} registro(s)`)
    })
    
    // Verificar quantos registros têm cada variação que precisa ser normalizada
    console.log('\n🔍 Verificando variações de "concluido" que precisam ser normalizadas...\n')
    
    const variacoesEncontradas = {}
    let totalParaNormalizar = 0
    
    for (const variacao of VARIACOES_PARA_NORMALIZAR) {
      const count = await prisma.manutencao.count({
        where: {
          status: variacao
        }
      })
      
      if (count > 0) {
        variacoesEncontradas[variacao] = count
        totalParaNormalizar += count
        console.log(`  "${variacao}": ${count} registro(s)`)
      }
    }
    
    const countConcluida = await prisma.manutencao.count({
      where: {
        status: 'Concluída'
      }
    })
    
    console.log(`\n  "Concluída" (padrão correto): ${countConcluida} registro(s)`)
    console.log(`\n  Total a normalizar: ${totalParaNormalizar} registro(s)\n`)
    
    if (totalParaNormalizar === 0) {
      console.log('✅ Nenhum registro encontrado para normalizar.')
      await prisma.$disconnect()
      return
    }
    
    // Normalizar cada variação encontrada
    let totalNormalizado = 0
    
    for (const [variacao, count] of Object.entries(variacoesEncontradas)) {
      if (variacao === 'Concluída') {
        // Já está no padrão correto, pular
        continue
      }
      
      console.log(`✨ Normalizando ${count} registro(s) de "${variacao}" para "Concluída"...`)
      
      const result = await prisma.manutencao.updateMany({
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
    console.log('\n📊 Verificando resultado final...\n')
    
    const countFinalConcluida = await prisma.manutencao.count({
      where: {
        status: 'Concluída'
      }
    })
    
    // Verificar se ainda há variações não normalizadas
    const variacoesRestantes = {}
    for (const variacao of VARIACOES_PARA_NORMALIZAR) {
      if (variacao === 'Concluída') continue
      
      const count = await prisma.manutencao.count({
        where: {
          status: variacao
        }
      })
      
      if (count > 0) {
        variacoesRestantes[variacao] = count
      }
    }
    
    console.log('📊 Resultado final:')
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

