/**
 * Script genérico para alteração em massa de status
 * 
 * Uso:
 *   npm run bulk-update-status
 * 
 * Configure as variáveis abaixo antes de executar
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ============================================
// CONFIGURAÇÕES - AJUSTE AQUI
// ============================================

// Qual tabela você quer atualizar?
type TableName = 'Demanda' | 'Manutencao' | 'Atendimento' | 'Project' | 'ProjectTask' | 'Validacao' | 'ValidacaoManutencao'

const CONFIG = {
  // Tabela a ser atualizada
  table: 'Demanda' as TableName,
  
  // Status atual(ais) que você quer alterar
  statusAtual: ['Pendente', 'Em Análise'],
  
  // Novo status
  statusNovo: 'Em Andamento',
  
  // Critérios adicionais (opcional)
  criterios: {
    // Exemplo: apenas demandas criadas antes de uma data
    // dataMaxima: new Date('2024-01-01'),
    
    // Exemplo: apenas de um cliente específico
    // clienteId: 'uuid-do-cliente',
    
    // Exemplo: apenas de um analista específico
    // analistaId: 'uuid-do-analista',
  } as {
    dataMaxima?: Date;
    clienteId?: string;
    analistaId?: string;
  },
  
  // Modo dry-run (true = apenas mostra o que seria feito, não executa)
  dryRun: true,
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function bulkUpdateStatus() {
  console.log('🔄 Iniciando alteração em massa de status...')
  console.log(`📋 Tabela: ${CONFIG.table}`)
  console.log(`📊 Status atual: ${CONFIG.statusAtual.join(', ')}`)
  console.log(`✨ Status novo: ${CONFIG.statusNovo}`)
  console.log(`🔍 Modo: ${CONFIG.dryRun ? 'DRY RUN (simulação)' : 'EXECUÇÃO REAL'}`)
  console.log('')
  
  try {
    // Construir condições WHERE
    const where: any = {
      status: {
        in: CONFIG.statusAtual
      }
    }
    
    // Adicionar critérios adicionais
    if (CONFIG.criterios.dataMaxima) {
      where.createdAt = {
        lt: CONFIG.criterios.dataMaxima
      }
    }
    
    if (CONFIG.criterios.clienteId) {
      where.clienteId = CONFIG.criterios.clienteId
    }
    
    if (CONFIG.criterios.analistaId) {
      where.analistaId = CONFIG.criterios.analistaId
    }
    
    // Contar quantos registros serão afetados
    let count = 0
    
    switch (CONFIG.table) {
      case 'Demanda':
        count = await prisma.demanda.count({ where })
        break
      case 'Manutencao':
        count = await prisma.manutencao.count({ where })
        break
      case 'Atendimento':
        count = await prisma.atendimento.count({ where })
        break
      case 'Project':
        count = await prisma.project.count({ where })
        break
      case 'ProjectTask':
        count = await prisma.projectTask.count({ where })
        break
      case 'Validacao':
        count = await prisma.validacao.count({ where })
        break
      case 'ValidacaoManutencao':
        count = await prisma.validacaoManutencao.count({ where })
        break
      default:
        throw new Error(`Tabela ${CONFIG.table} não suportada`)
    }
    
    console.log(`📊 Registros encontrados: ${count}`)
    
    if (count === 0) {
      console.log('✅ Nenhum registro encontrado com os critérios especificados')
      return
    }
    
    if (CONFIG.dryRun) {
      console.log('')
      console.log('⚠️  MODO DRY RUN - Nenhuma alteração foi feita')
      console.log(`📝 Para executar de verdade, altere CONFIG.dryRun para false`)
      console.log(`📝 Seriam atualizados ${count} registros`)
      return
    }
    
    // Confirmar antes de executar
    console.log('')
    console.log(`⚠️  ATENÇÃO: ${count} registros serão atualizados!`)
    console.log('Pressione Ctrl+C para cancelar ou aguarde 5 segundos...')
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    // Executar atualização
    let result
    
    switch (CONFIG.table) {
      case 'Demanda':
        result = await prisma.demanda.updateMany({
          where,
          data: {
            status: CONFIG.statusNovo,
            updatedAt: new Date()
          }
        })
        break
      case 'Manutencao':
        result = await prisma.manutencao.updateMany({
          where,
          data: {
            status: CONFIG.statusNovo,
            updatedAt: new Date()
          }
        })
        break
      case 'Atendimento':
        result = await prisma.atendimento.updateMany({
          where,
          data: {
            status: CONFIG.statusNovo,
            updatedAt: new Date()
          }
        })
        break
      case 'Project':
        result = await prisma.project.updateMany({
          where,
          data: {
            status: CONFIG.statusNovo,
            updatedAt: new Date()
          }
        })
        break
      case 'ProjectTask':
        result = await prisma.projectTask.updateMany({
          where,
          data: {
            status: CONFIG.statusNovo,
            updatedAt: new Date()
          }
        })
        break
      case 'Validacao':
        result = await prisma.validacao.updateMany({
          where,
          data: {
            status: CONFIG.statusNovo,
            updatedAt: new Date()
          }
        })
        break
      case 'ValidacaoManutencao':
        result = await prisma.validacaoManutencao.updateMany({
          where,
          data: {
            status: CONFIG.statusNovo,
            updatedAt: new Date()
          }
        })
        break
    }
    
    console.log('')
    console.log(`✅ ${result.count} registros atualizados com sucesso!`)
    console.log(`✨ Status alterado de "${CONFIG.statusAtual.join('" ou "')}" para "${CONFIG.statusNovo}"`)
    
  } catch (error) {
    console.error('❌ Erro ao atualizar status:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  bulkUpdateStatus()
    .then(() => {
      console.log('')
      console.log('✅ Processo concluído!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('')
      console.error('❌ Erro no processo:', error)
      process.exit(1)
    })
}

export { bulkUpdateStatus }

