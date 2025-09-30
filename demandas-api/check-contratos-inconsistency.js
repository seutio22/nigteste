const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkContratosInconsistency() {
  try {
    console.log('🔍 Verificando inconsistências na tabela Contratos...')
    console.log('')
    
    // Verificar todos os contratos no banco
    const contratos = await prisma.contrato.findMany({
      include: {
        cliente: {
          select: {
            id: true,
            nome: true
          }
        }
      }
    })
    
    console.log(`📊 Total de contratos no banco: ${contratos.length}`)
    console.log('')
    
    if (contratos.length > 0) {
      console.log('📋 Lista de contratos no banco:')
      contratos.forEach((contrato, index) => {
        console.log(`\n${index + 1}. ID: ${contrato.id}`)
        console.log(`   Número: ${contrato.numero}`)
        console.log(`   Código: ${contrato.codigo || 'N/A'}`)
        console.log(`   Cliente ID: ${contrato.clienteId}`)
        console.log(`   Cliente Nome: ${contrato.cliente?.nome || 'N/A'}`)
        console.log(`   Status: ${contrato.status}`)
        console.log(`   Criado em: ${contrato.createdAt}`)
        console.log(`   Atualizado em: ${contrato.updatedAt}`)
      })
    } else {
      console.log('❌ Nenhum contrato encontrado no banco de dados.')
    }
    
    // Verificar se há demandas que dependem de contratos
    const demandas = await prisma.demanda.findMany({
      where: {
        contratoId: {
          not: null
        }
      },
      select: {
        id: true,
        contratoId: true,
        descricao: true
      }
    })
    
    console.log(`\n📊 Total de demandas com contrato: ${demandas.length}`)
    
    if (demandas.length > 0) {
      console.log('\n📋 Demandas que dependem de contratos:')
      for (const demanda of demandas) {
        const contrato = await prisma.contrato.findUnique({
          where: { id: demanda.contratoId }
        })
        
        console.log(`\n   Demanda ID: ${demanda.id}`)
        console.log(`   Contrato ID: ${demanda.contratoId}`)
        console.log(`   Contrato existe: ${contrato ? 'Sim' : 'Não'}`)
        console.log(`   Contrato número: ${contrato?.numero || 'N/A'}`)
        console.log(`   Descrição: ${demanda.descricao || 'N/A'}`)
      }
    }
    
    // Verificar se há atendimentos que dependem de contratos
    const atendimentos = await prisma.atendimento.findMany({
      where: {
        contratoId: {
          not: null
        }
      },
      select: {
        id: true,
        contratoId: true,
        titulo: true
      }
    })
    
    console.log(`\n📊 Total de atendimentos com contrato: ${atendimentos.length}`)
    
    if (atendimentos.length > 0) {
      console.log('\n📋 Atendimentos que dependem de contratos:')
      for (const atendimento of atendimentos) {
        const contrato = await prisma.contrato.findUnique({
          where: { id: atendimento.contratoId }
        })
        
        console.log(`\n   Atendimento ID: ${atendimento.id}`)
        console.log(`   Contrato ID: ${atendimento.contratoId}`)
        console.log(`   Contrato existe: ${contrato ? 'Sim' : 'Não'}`)
        console.log(`   Contrato número: ${contrato?.numero || 'N/A'}`)
        console.log(`   Título: ${atendimento.titulo || 'N/A'}`)
      }
    }
    
    // Verificar clientes
    const clientes = await prisma.cliente.findMany({
      select: {
        id: true,
        nome: true
      }
    })
    
    console.log(`\n📊 Total de clientes: ${clientes.length}`)
    
    if (clientes.length > 0) {
      console.log('\n📋 Clientes disponíveis:')
      clientes.forEach((cliente, index) => {
        console.log(`   ${index + 1}. ID: ${cliente.id} - Nome: ${cliente.nome}`)
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
checkContratosInconsistency()
