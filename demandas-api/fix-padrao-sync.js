const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixPadraoSync() {
  try {
    console.log('🔧 Corrigindo sincronização de padrões...')
    console.log('')
    
    // 1. Verificar padrões no banco
    const padroesNoBanco = await prisma.padrao.findMany()
    console.log(`📊 Padrões no banco: ${padroesNoBanco.length}`)
    
    padroesNoBanco.forEach((padrao, index) => {
      console.log(`   ${index + 1}. ID: ${padrao.id} - Nome: ${padrao.nome}`)
    })
    
    // 2. Verificar se há padrões órfãos (sem tipo de serviço válido)
    const padroesOrfaos = await prisma.padrao.findMany({
      where: {
        tipoServicoId: {
          not: null
        }
      },
      include: {
        tipoServico: true
      }
    })
    
    console.log(`\n🔍 Padrões com tipo de serviço: ${padroesOrfaos.length}`)
    
    // 3. Verificar se há padrões com tipoServicoId inválido
    const padroesInvalidos = padroesOrfaos.filter(p => !p.tipoServico)
    
    if (padroesInvalidos.length > 0) {
      console.log(`\n⚠️ Encontrados ${padroesInvalidos.length} padrões com tipoServicoId inválido:`)
      
      for (const padrao of padroesInvalidos) {
        console.log(`   - ID: ${padrao.id} - Nome: ${padrao.nome} - tipoServicoId: ${padrao.tipoServicoId}`)
        
        // Corrigir definindo tipoServicoId como null
        await prisma.padrao.update({
          where: { id: padrao.id },
          data: { tipoServicoId: null }
        })
        
        console.log(`   ✅ Corrigido: tipoServicoId definido como null`)
      }
    }
    
    // 4. Verificar tipos de serviço disponíveis
    const tiposServico = await prisma.tipoServico.findMany()
    console.log(`\n📊 Tipos de serviço disponíveis: ${tiposServico.length}`)
    
    tiposServico.forEach((tipo, index) => {
      console.log(`   ${index + 1}. ID: ${tipo.id} - Nome: ${tipo.nome}`)
    })
    
    // 5. Listar padrões finais
    const padroesFinais = await prisma.padrao.findMany({
      include: {
        tipoServico: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    })
    
    console.log(`\n📋 Estado final dos padrões:`)
    padroesFinais.forEach((padrao, index) => {
      console.log(`\n${index + 1}. ID: ${padrao.id}`)
      console.log(`   Nome: ${padrao.nome}`)
      console.log(`   Tipo Serviço ID: ${padrao.tipoServicoId || 'N/A'}`)
      console.log(`   Tipo Serviço Nome: ${padrao.tipoServico?.nome || 'N/A'}`)
    })
    
    console.log('\n✅ Sincronização corrigida!')
    console.log('\n💡 Próximos passos:')
    console.log('   1. Recarregue a página do frontend (F5)')
    console.log('   2. Os dados serão sincronizados automaticamente')
    console.log('   3. Tente excluir o padrão novamente')
    
  } catch (error) {
    console.error('❌ Erro na correção:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar correção
fixPadraoSync()
