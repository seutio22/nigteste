/**
 * Script para normalizar status "EM REAJUSTE" na tabela Manutencao
 * Execute: npx @railway/cli run --service nigteste node normalize-manutencao-reajuste.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function normalizeStatus() {
  console.log('🔍 Verificando status "EM REAJUSTE" em Manutenções...\n')
  
  try {
    // Verificar quantos registros têm "EM REAJUSTE"
    const countEMREAJUSTE = await prisma.manutencao.count({
      where: {
        status: 'EM REAJUSTE'
      }
    })
    
    // Verificar se existe algum status nativo relacionado a reajuste
    const todasManutencoes = await prisma.manutencao.findMany({
      select: {
        status: true
      }
    })
    
    // Agrupar por status para ver todas as variações
    const statusCount = {}
    todasManutencoes.forEach(m => {
      const status = m.status || '(vazio)'
      statusCount[status] = (statusCount[status] || 0) + 1
    })
    
    console.log('📊 Todos os status encontrados na tabela Manutencao:\n')
    Object.keys(statusCount).sort().forEach(status => {
      console.log(`  "${status}": ${statusCount[status]} registro(s)`)
    })
    
    console.log(`\n📊 Status "EM REAJUSTE" encontrado: ${countEMREAJUSTE} registro(s)`)
    
    if (countEMREAJUSTE === 0) {
      console.log('✅ Nenhum registro encontrado com status "EM REAJUSTE".')
      await prisma.$disconnect()
      return
    }
    
    // Mostrar exemplos dos registros que serão alterados
    const exemplos = await prisma.manutencao.findMany({
      where: {
        status: 'EM REAJUSTE'
      },
      select: {
        id: true,
        ticket: true,
        status: true,
        updatedAt: true
      },
      take: 5
    })
    
    console.log('\n📋 Registros com "EM REAJUSTE" que serão normalizados:')
    exemplos.forEach((reg, index) => {
      console.log(`  ${index + 1}. ID: ${reg.id}`)
      console.log(`     Ticket: ${reg.ticket || 'N/A'}`)
      console.log(`     Status atual: "${reg.status}"`)
      console.log(`     Atualizado: ${reg.updatedAt}`)
      console.log('')
    })
    
    // Verificar qual seria o status nativo - provavelmente "Em reajuste" ou "Reajuste"
    // Baseado nos padrões anteriores, o status nativo seria "Em reajuste"
    const statusNativo = 'Em reajuste'
    
    console.log(`✨ Normalizando ${countEMREAJUSTE} registro(s) de "EM REAJUSTE" para "${statusNativo}"...\n`)
    
    const result = await prisma.manutencao.updateMany({
      where: {
        status: 'EM REAJUSTE'
      },
      data: {
        status: statusNativo,
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ ${result.count} registro(s) normalizado(s) com sucesso!`)
    console.log(`✨ Status alterado de "EM REAJUSTE" para "${statusNativo}"\n`)
    
    // Verificar resultado final
    const countFinalEMREAJUSTE = await prisma.manutencao.count({
      where: {
        status: 'EM REAJUSTE'
      }
    })
    
    const countFinalEmReajuste = await prisma.manutencao.count({
      where: {
        status: statusNativo
      }
    })
    
    console.log('📊 Resultado final:')
    console.log(`  "${statusNativo}" (padrão nativo): ${countFinalEmReajuste} registro(s)`)
    
    if (countFinalEMREAJUSTE > 0) {
      console.log(`  "EM REAJUSTE" (ainda existe): ${countFinalEMREAJUSTE} registro(s)`)
      console.log(`  ⚠️  Ainda há variações não normalizadas!`)
    } else {
      console.log(`  ✅ Todos os registros foram normalizados para "${statusNativo}"!`)
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

