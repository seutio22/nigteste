/**
 * Script para alterar status "ESPERA DE TERCEIROS" para "Em andamento" na tabela Manutencao
 * Execute: node alterar-status-espera-terceiros.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function alterarStatus() {
  console.log('🔍 Alterando status "ESPERA DE TERCEIROS" para "Em andamento"...\n')
  
  try {
    // Verificar quantos registros serão afetados
    const countAntes = await prisma.manutencao.count({
      where: {
        status: 'ESPERA DE TERCEIROS'
      }
    })
    
    console.log(`📊 Registros encontrados com status "ESPERA DE TERCEIROS": ${countAntes}`)
    
    if (countAntes === 0) {
      console.log('✅ Nenhum registro encontrado para alterar.')
      await prisma.$disconnect()
      return
    }
    
    // Atualizar status
    console.log(`\n✨ Alterando ${countAntes} registro(s) de "ESPERA DE TERCEIROS" para "Em andamento"...`)
    
    const result = await prisma.manutencao.updateMany({
      where: {
        status: 'ESPERA DE TERCEIROS'
      },
      data: {
        status: 'Em andamento',
        updatedAt: new Date()
      }
    })
    
    console.log(`✅ ${result.count} registro(s) alterado(s)!`)
    
    // Verificar resultado final
    const countDepois = await prisma.manutencao.count({
      where: {
        status: 'Em andamento'
      }
    })
    
    const countEspera = await prisma.manutencao.count({
      where: {
        status: 'ESPERA DE TERCEIROS'
      }
    })
    
    console.log('\n📊 Resultado final:')
    console.log(`  "Em andamento": ${countDepois} registro(s)`)
    console.log(`  "ESPERA DE TERCEIROS": ${countEspera} registro(s)`)
    
    if (countEspera === 0) {
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

