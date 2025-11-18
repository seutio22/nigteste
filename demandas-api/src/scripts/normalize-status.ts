/**
 * Script de migração para normalizar status de demandas
 * Converte: CONCLUIDO, Concluido, Encerrado, Resolvido -> Concluída
 */

import { PrismaClient } from '@prisma/client'

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
      return
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
    
  } catch (error) {
    console.error('❌ Erro ao normalizar status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  normalizeStatus()
    .then(() => {
      console.log('✅ Migração concluída!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro na migração:', error)
      process.exit(1)
    })
}

export { normalizeStatus }

