/**
 * Script para executar a migração de normalização de status
 * Pode ser executado diretamente no Railway ou localmente
 * 
 * Uso no Railway:
 * node run-migration.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function normalizeStatus() {
  console.log('🔄 Iniciando normalização de status...')
  
  try {
    // Status a serem normalizados
    const statusToNormalize = [
      'CONCLUIDO',
      'Concluido',
      'concluido',
      'Concluído',
      'concluído',
      'Concluida',
      'concluida',
      'Concluída',
      'concluída',
      'Encerrado',
      'encerrado',
      'Resolvido',
      'resolvido'
    ]
    
    // Contar quantos registros serão afetados
    const count = await prisma.demanda.count({
      where: {
        status: {
          in: statusToNormalize
        }
      }
    })
    
    console.log(`📊 Encontrados ${count} registros para normalizar`)
    
    if (count === 0) {
      console.log('✅ Nenhum registro precisa ser normalizado')
      return { success: true, count: 0 }
    }
    
    // Atualizar todos os registros
    const result = await prisma.demanda.updateMany({
      where: {
        status: {
          in: statusToNormalize
        }
      },
      data: {
        status: 'Concluída'
      }
    })
    
    console.log(`✅ ${result.count} registros atualizados com sucesso!`)
    console.log('✅ Status normalizados: CONCLUIDO, Concluido, Encerrado, Resolvido -> Concluída')
    
    return { success: true, count: result.count }
    
  } catch (error) {
    console.error('❌ Erro ao normalizar status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
normalizeStatus()
  .then((result) => {
    console.log('✅ Migração concluída!', result)
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Erro na migração:', error)
    process.exit(1)
  })

