// Script para popular dados mestres no banco
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedMasterData() {
  console.log('🌱 Iniciando seed de dados mestres...')
  
  try {
    // Criar áreas
    const areas = await Promise.all([
      prisma.area.upsert({
        where: { id: 'area-1' },
        update: {},
        create: { id: 'area-1', nome: 'TI' }
      }),
      prisma.area.upsert({
        where: { id: 'area-2' },
        update: {},
        create: { id: 'area-2', nome: 'Suporte' }
      })
    ])
    console.log('✅ Áreas criadas:', areas.length)
    
    // Criar analistas
    const analistas = await Promise.all([
      prisma.analista.upsert({
        where: { id: 'analista-1' },
        update: {},
        create: { id: 'analista-1', nome: 'João Silva', email: 'joao@empresa.com' }
      }),
      prisma.analista.upsert({
        where: { id: 'analista-2' },
        update: {},
        create: { id: 'analista-2', nome: 'Maria Santos', email: 'maria@empresa.com' }
      }),
      prisma.analista.upsert({
        where: { id: 'analista-3' },
        update: {},
        create: { id: 'analista-3', nome: 'Pedro Costa', email: 'pedro@empresa.com' }
      })
    ])
    console.log('✅ Analistas criados:', analistas.length)
    
    // Criar clientes
    const clientes = await Promise.all([
      prisma.cliente.upsert({
        where: { id: 'cliente-1' },
        update: {},
        create: { id: 'cliente-1', nome: 'Empresa ABC' }
      })
    ])
    console.log('✅ Clientes criados:', clientes.length)
    
    // Criar contratos
    const contratos = await Promise.all([
      prisma.contrato.upsert({
        where: { id: 'contrato-1' },
        update: {},
        create: { id: 'contrato-1', numero: 'CTR-001', clienteId: 'cliente-1' }
      })
    ])
    console.log('✅ Contratos criados:', contratos.length)
    
    // Criar operadoras
    const operadoras = await Promise.all([
      prisma.operadora.upsert({
        where: { id: 'operadora-1' },
        update: {},
        create: { id: 'operadora-1', nome: 'Operadora Principal' }
      })
    ])
    console.log('✅ Operadoras criadas:', operadoras.length)
    
    // Criar produtos
    const produtos = await Promise.all([
      prisma.produto.upsert({
        where: { id: 'produto-1' },
        update: {},
        create: { id: 'produto-1', nome: 'Produto A' }
      })
    ])
    console.log('✅ Produtos criados:', produtos.length)
    
    // Criar sistemas
    const sistemas = await Promise.all([
      prisma.sistema.upsert({
        where: { id: 'sys-1' },
        update: {},
        create: { id: 'sys-1', nome: 'Sistema Principal' }
      }),
      prisma.sistema.upsert({
        where: { id: 'sys-2' },
        update: {},
        create: { id: 'sys-2', nome: 'Sistema Secundário' }
      }),
      prisma.sistema.upsert({
        where: { id: 'sys-3' },
        update: {},
        create: { id: 'sys-3', nome: 'Sistema Terciário' }
      })
    ])
    console.log('✅ Sistemas criados:', sistemas.length)
    
    // Criar tipos de demanda
    const tiposDemanda = await Promise.all([
      prisma.tipoDemanda.upsert({
        where: { id: 'tipo-1' },
        update: {},
        create: { id: 'tipo-1', nome: 'Correção de Bug' }
      })
    ])
    console.log('✅ Tipos de demanda criados:', tiposDemanda.length)
    
    // Criar tipos de serviço
    const tiposServico = await Promise.all([
      prisma.tipoServico.upsert({
        where: { id: 'servico-1' },
        update: {},
        create: { id: 'servico-1', nome: 'Desenvolvimento' }
      })
    ])
    console.log('✅ Tipos de serviço criados:', tiposServico.length)
    
    console.log('🎉 Seed de dados mestres concluído com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro no seed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar seed
seedMasterData()
