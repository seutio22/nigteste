/**
 * Script para verificar todos os status da tabela Manutencao
 * Execute: npx @railway/cli run --service nigteste node check-manutencao-status.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkStatus() {
  console.log('🔍 Verificando todos os status de Manutenções...\n')
  
  try {
    // Buscar todas as manutenções
    const todasManutencoes = await prisma.manutencao.findMany({
      select: {
        id: true,
        status: true,
        ticket: true,
        updatedAt: true
      }
    })
    
    // Agrupar por status
    const statusCount = {}
    todasManutencoes.forEach(manutencao => {
      const status = manutencao.status || '(vazio)'
      if (!statusCount[status]) {
        statusCount[status] = []
      }
      statusCount[status].push(manutencao)
    })
    
    console.log('📊 Distribuição de status:\n')
    Object.keys(statusCount).sort().forEach(status => {
      console.log(`  "${status}": ${statusCount[status].length} registro(s)`)
    })
    
    // Procurar por variações de "CONCLUIDO", "Concluido", "Concluída"
    console.log('\n🔍 Procurando por variações relacionadas a "CONCLUIDO", "Concluido", "Concluída"...\n')
    
    const variacoes = [
      'CONCLUIDO',
      'Concluido',
      'concluido',
      'CONCLUIDA',
      'Concluida',
      'concluida',
      'Concluído',
      'concluído',
      'Concluída',
      'concluída',
      'CONCLUÍDO',
      'CONCLUÍDA'
    ]
    
    const matches = todasManutencoes.filter(m => {
      if (!m.status) return false
      const statusLower = m.status.toLowerCase()
      return statusLower.includes('concluid') || statusLower.includes('concluíd')
    })
    
    if (matches.length > 0) {
      console.log(`\n📋 Registros com status contendo "concluid" (${matches.length} total):`)
      matches.slice(0, 10).forEach((reg, index) => {
        console.log(`  ${index + 1}. ID: ${reg.id}`)
        console.log(`     Status: "${reg.status}"`)
        console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
        console.log(`     Atualizado: ${reg.updatedAt}`)
        console.log('')
      })
      
      if (matches.length > 10) {
        console.log(`  ... e mais ${matches.length - 10} registro(s)\n`)
      }
      
      // Agrupar por status exato
      const statusExatos = {}
      matches.forEach(m => {
        const status = m.status
        if (!statusExatos[status]) {
          statusExatos[status] = 0
        }
        statusExatos[status]++
      })
      
      console.log('\n📊 Variações encontradas:')
      Object.keys(statusExatos).sort().forEach(status => {
        console.log(`  "${status}": ${statusExatos[status]} registro(s)`)
      })
    } else {
      console.log('✅ Nenhum registro encontrado com variações de "CONCLUIDO"')
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
checkStatus()
  .then(() => {
    console.log('\n✅ Verificação concluída!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no processo:', error)
    process.exit(1)
  })

