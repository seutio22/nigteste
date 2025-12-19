/**
 * Script para verificar todas as variações de status relacionadas a "EM ANDAMENT" ou "Em Andamento"
 * Execute: npx @railway/cli run --service nigteste node check-status-variations.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkStatus() {
  console.log('🔍 Verificando todos os status de demandas...\n')
  
  try {
    // Buscar todos os status únicos
    const todasDemandas = await prisma.demanda.findMany({
      select: {
        id: true,
        status: true,
        ticket: true,
        descricao: true,
        updatedAt: true
      }
    })
    
    // Agrupar por status
    const statusCount = {}
    todasDemandas.forEach(demanda => {
      const status = demanda.status || '(vazio)'
      if (!statusCount[status]) {
        statusCount[status] = []
      }
      statusCount[status].push(demanda)
    })
    
    console.log('📊 Distribuição de status:\n')
    Object.keys(statusCount).sort().forEach(status => {
      console.log(`  "${status}": ${statusCount[status].length} registro(s)`)
    })
    
    // Procurar por variações de "EM ANDAMENT" ou "Em Andamento"
    console.log('\n🔍 Procurando por variações relacionadas a "EM ANDAMENT" ou "Em Andamento"...\n')
    
    const variacoes = [
      'EM ANDAMENT',
      'em andament',
      'Em Andament',
      'EM ANDAMENTO',
      'em andamento',
      'Em Andamento',
      'EM_ANDAMENT',
      'EM_ANDAMENTO'
    ]
    
    let encontrados = false
    variacoes.forEach(variacao => {
      const matches = todasDemandas.filter(d => 
        d.status && d.status.toLowerCase().includes('andament')
      )
      
      if (matches.length > 0 && !encontrados) {
        encontrados = true
        console.log(`\n📋 Registros com status contendo "andament":`)
        matches.forEach((reg, index) => {
          console.log(`  ${index + 1}. ID: ${reg.id}`)
          console.log(`     Status: "${reg.status}"`)
          console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
          console.log(`     Atualizado: ${reg.updatedAt}`)
          console.log('')
        })
      }
    })
    
    if (!encontrados) {
      console.log('✅ Nenhum registro encontrado com variações de "EM ANDAMENT"')
      console.log('   O status pode já ter sido corrigido ou não existe.')
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

