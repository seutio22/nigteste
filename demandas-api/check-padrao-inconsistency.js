const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkPadraoInconsistency() {
  try {
    console.log('🔍 Verificando inconsistências na tabela Padrao...')
    console.log('')
    
    // Verificar todos os padrões no banco
    const padroes = await prisma.padrao.findMany({
      include: {
        tipoServico: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    })
    
    console.log(`📊 Total de padrões no banco: ${padroes.length}`)
    console.log('')
    
    if (padroes.length > 0) {
      console.log('📋 Lista de padrões no banco:')
      padroes.forEach((padrao, index) => {
        console.log(`\n${index + 1}. ID: ${padrao.id}`)
        console.log(`   Nome: ${padrao.nome}`)
        console.log(`   Tipo Serviço ID: ${padrao.tipoServicoId || 'N/A'}`)
        console.log(`   Tipo Serviço Nome: ${padrao.tipoServico?.nome || 'N/A'}`)
        console.log(`   Criado em: ${padrao.createdAt}`)
        console.log(`   Atualizado em: ${padrao.updatedAt}`)
      })
    } else {
      console.log('❌ Nenhum padrão encontrado no banco de dados.')
    }
    
    // Verificar se há manutenções que dependem de padrões
    const manutencoes = await prisma.manutencao.findMany({
      where: {
        tipoId: {
          not: null
        }
      },
      select: {
        id: true,
        tipoId: true,
        descricao: true
      }
    })
    
    console.log(`\n📊 Total de manutenções com padrão: ${manutencoes.length}`)
    
    if (manutencoes.length > 0) {
      console.log('\n📋 Manutenções que dependem de padrões:')
      for (const manutencao of manutencoes) {
        const padrao = await prisma.padrao.findUnique({
          where: { id: manutencao.tipoId }
        })
        
        console.log(`\n   Manutenção ID: ${manutencao.id}`)
        console.log(`   Padrão ID: ${manutencao.tipoId}`)
        console.log(`   Padrão existe: ${padrao ? 'Sim' : 'Não'}`)
        console.log(`   Padrão nome: ${padrao?.nome || 'N/A'}`)
        console.log(`   Descrição: ${manutencao.descricao || 'N/A'}`)
      }
    }
    
    // Verificar tipos de serviço
    const tiposServico = await prisma.tipoServico.findMany({
      select: {
        id: true,
        nome: true
      }
    })
    
    console.log(`\n📊 Total de tipos de serviço: ${tiposServico.length}`)
    
    if (tiposServico.length > 0) {
      console.log('\n📋 Tipos de serviço disponíveis:')
      tiposServico.forEach((tipo, index) => {
        console.log(`   ${index + 1}. ID: ${tipo.id} - Nome: ${tipo.nome}`)
      })
    }
    
    console.log('\n✅ Verificação concluída!')
    
  } catch (error) {
    console.error('❌ Erro na verificação:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar verificação
checkPadraoInconsistency()
