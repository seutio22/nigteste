/**
 * Script para alterar status "em_andamento" para "EM ANDAMENTO" na tabela Report (Analytics)
 * Execute: node alterar-status-em-andamento-analytics.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function alterarStatus() {
  console.log('🔍 Alterando status "em_andamento" para "EM ANDAMENTO" na tabela Report (Analytics)...\n')
  
  try {
    // Verificar quantos registros serão afetados
    const countAntes = await prisma.report.count({
      where: {
        status: 'em_andamento'
      }
    })
    
    console.log(`📊 Registros encontrados com status "em_andamento": ${countAntes}`)
    
    if (countAntes === 0) {
      console.log('✅ Nenhum registro encontrado para alterar.')
      await prisma.$disconnect()
      return
    }
    
    // Atualizar status
    console.log(`\n✨ Alterando ${countAntes} registro(s) de "em_andamento" para "EM ANDAMENTO"...`)
    
    const result = await prisma.report.updateMany({
      where: {
        status: 'em_andamento'
      },
      data: {
        status: 'EM ANDAMENTO',
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ ${result.count} registro(s) alterado(s)!`)
    
    // Verificar resultado final
    const countDepois = await prisma.report.count({
      where: {
        status: 'EM ANDAMENTO'
      }
    })
    
    const countEmAndamento = await prisma.report.count({
      where: {
        status: 'em_andamento'
      }
    })
    
    console.log('\n📊 Resultado final:')
    console.log(`  "EM ANDAMENTO": ${countDepois} registro(s)`)
    console.log(`  "em_andamento": ${countEmAndamento} registro(s)`)
    
    if (countEmAndamento === 0) {
      console.log('\n✅ Todos os registros foram alterados com sucesso!')
    }
    
  } catch (error) {
    console.error('❌ Erro ao alterar status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
alterarStatus()
  .then(() => {
    console.log('\n✅ Processo concluído!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Erro no processo:', error)
    process.exit(1)
  })

