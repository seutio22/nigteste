/**
 * Script para alterar status "pendente" para "PENDENTE" na tabela Report (Analytics)
 * Execute: node alterar-status-pendente-analytics.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function alterarStatus() {
  console.log('🔍 Alterando status "pendente" para "PENDENTE" na tabela Report (Analytics)...\n')
  
  try {
    // Verificar quantos registros serão afetados
    const countAntes = await prisma.report.count({
      where: {
        status: 'pendente'
      }
    })
    
    console.log(`📊 Registros encontrados com status "pendente": ${countAntes}`)
    
    if (countAntes === 0) {
      console.log('✅ Nenhum registro encontrado para alterar.')
      await prisma.$disconnect()
      return
    }
    
    // Atualizar status
    console.log(`\n✨ Alterando ${countAntes} registro(s) de "pendente" para "PENDENTE"...`)
    
    const result = await prisma.report.updateMany({
      where: {
        status: 'pendente'
      },
      data: {
        status: 'PENDENTE',
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ ${result.count} registro(s) alterado(s)!`)
    
    // Verificar resultado final
    const countDepois = await prisma.report.count({
      where: {
        status: 'PENDENTE'
      }
    })
    
    const countPendente = await prisma.report.count({
      where: {
        status: 'pendente'
      }
    })
    
    console.log('\n📊 Resultado final:')
    console.log(`  "PENDENTE": ${countDepois} registro(s)`)
    console.log(`  "pendente": ${countPendente} registro(s)`)
    
    if (countPendente === 0) {
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

