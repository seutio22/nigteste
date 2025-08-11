import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...')

  // Criar usuário admin padrão
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demandas.com' },
    update: {},
    create: {
      email: 'admin@demandas.com',
      name: 'Administrador',
      password: '$2a$10$K7L1OJ45/4Y2nIvhRVpCe.FSmhDdWoXhV8bRxHqWqk8qKqKqKqKqK', // admin123
      role: 'admin',
    },
  })

  // Criar áreas padrão
  const areas = await Promise.all([
    prisma.area.upsert({
      where: { nome: 'TI' },
      update: {},
      create: { nome: 'TI' },
    }),
    prisma.area.upsert({
      where: { nome: 'Financeiro' },
      update: {},
      create: { nome: 'Financeiro' },
    }),
    prisma.area.upsert({
      where: { nome: 'RH' },
      update: {},
      create: { nome: 'RH' },
    }),
    prisma.area.upsert({
      where: { nome: 'Operações' },
      update: {},
      create: { nome: 'Operações' },
    }),
  ])

  // Criar analistas padrão
  const analistas = await Promise.all([
    prisma.analista.upsert({
      where: { nome: 'João Silva' },
      update: {},
      create: { nome: 'João Silva' },
    }),
    prisma.analista.upsert({
      where: { nome: 'Maria Santos' },
      update: {},
      create: { nome: 'Maria Santos' },
    }),
    prisma.analista.upsert({
      where: { nome: 'Pedro Costa' },
      update: {},
      create: { nome: 'Pedro Costa' },
    }),
  ])

  // Criar operadoras padrão
  const operadoras = await Promise.all([
    prisma.operadora.upsert({
      where: { nome: 'Vivo' },
      update: {},
      create: { nome: 'Vivo' },
    }),
    prisma.operadora.upsert({
      where: { nome: 'Claro' },
      update: {},
      create: { nome: 'Claro' },
    }),
    prisma.operadora.upsert({
      where: { nome: 'TIM' },
      update: {},
      create: { nome: 'TIM' },
    }),
    prisma.operadora.upsert({
      where: { nome: 'Oi' },
      update: {},
      create: { nome: 'Oi' },
    }),
  ])

  // Criar produtos padrão
  const produtos = await Promise.all([
    prisma.produto.upsert({
      where: { nome: 'Internet Banda Larga' },
      update: {},
      create: { nome: 'Internet Banda Larga' },
    }),
    prisma.produto.upsert({
      where: { nome: 'Telefonia Fixa' },
      update: {},
      create: { nome: 'Telefonia Fixa' },
    }),
    prisma.produto.upsert({
      where: { nome: 'Telefonia Móvel' },
      update: {},
      create: { nome: 'Telefonia Móvel' },
    }),
    prisma.produto.upsert({
      where: { nome: 'TV por Assinatura' },
      update: {},
      create: { nome: 'TV por Assinatura' },
    }),
  ])

  // Criar sistemas padrão
  const sistemas = await Promise.all([
    prisma.sistema.upsert({
      where: { nome: 'Sistema de Billing' },
      update: {},
      create: { nome: 'Sistema de Billing' },
    }),
    prisma.sistema.upsert({
      where: { nome: 'CRM' },
      update: {},
      create: { nome: 'CRM' },
    }),
    prisma.sistema.upsert({
      where: { nome: 'ERP' },
      update: {},
      create: { nome: 'ERP' },
    }),
    prisma.sistema.upsert({
      where: { nome: 'Sistema de Monitoramento' },
      update: {},
      create: { nome: 'Sistema de Monitoramento' },
    }),
  ])

  // Criar clientes padrão
  const clientes = await Promise.all([
    prisma.cliente.upsert({
      where: { nome: 'Empresa ABC Ltda' },
      update: {},
      create: { 
        nome: 'Empresa ABC Ltda',
        grupoEconomico: 'Grupo ABC'
      },
    }),
    prisma.cliente.upsert({
      where: { nome: 'Corporação XYZ S.A.' },
      update: {},
      create: { 
        nome: 'Corporação XYZ S.A.',
        grupoEconomico: 'Grupo XYZ'
      },
    }),
    prisma.cliente.upsert({
      where: { nome: 'Indústria 123' },
      update: {},
      create: { 
        nome: 'Indústria 123',
        grupoEconomico: 'Grupo Industrial'
      },
    }),
  ])

  // Criar contratos padrão
  const contratos = await Promise.all([
    prisma.contrato.upsert({
      where: { codigo: 'CTR001' },
      update: {},
      create: { 
        codigo: 'CTR001',
        grupoEconomico: 'Grupo ABC'
      },
    }),
    prisma.contrato.upsert({
      where: { codigo: 'CTR002' },
      update: {},
      create: { 
        codigo: 'CTR002',
        grupoEconomico: 'Grupo XYZ'
      },
    }),
    prisma.contrato.upsert({
      where: { codigo: 'CTR003' },
      update: {},
      create: { 
        codigo: 'CTR003',
        grupoEconomico: 'Grupo Industrial'
      },
    }),
  ])

  // Criar tipos de serviço padrão
  const tiposServico = await Promise.all([
    prisma.tipoServico.upsert({
      where: { id: 'TS001' },
      update: {},
      create: { 
        id: 'TS001',
        nome: 'Implementação'
      },
    }),
    prisma.tipoServico.upsert({
      where: { id: 'TS002' },
      update: {},
      create: { 
        id: 'TS002',
        nome: 'Manutenção'
      },
    }),
    prisma.tipoServico.upsert({
      where: { id: 'TS003' },
      update: {},
      create: { 
        id: 'TS003',
        nome: 'Suporte'
      },
    }),
    prisma.tipoServico.upsert({
      where: { id: 'TS004' },
      update: {},
      create: { 
        id: 'TS004',
        nome: 'Consultoria'
      },
    }),
  ])

  // Criar tipos de demanda padrão
  const tiposDemanda = await Promise.all([
    prisma.tipoDemanda.upsert({
      where: { nome: 'Bug Fix' },
      update: {},
      create: { 
        nome: 'Bug Fix',
        tipoServicoId: 'TS002'
      },
    }),
    prisma.tipoDemanda.upsert({
      where: { nome: 'Nova Funcionalidade' },
      update: {},
      create: { 
        nome: 'Nova Funcionalidade',
        tipoServicoId: 'TS001'
      },
    }),
    prisma.tipoDemanda.upsert({
      where: { nome: 'Melhoria' },
      update: {},
      create: { 
        nome: 'Melhoria',
        tipoServicoId: 'TS002'
      },
    }),
    prisma.tipoDemanda.upsert({
      where: { nome: 'Dúvida Técnica' },
      update: {},
      create: { 
        nome: 'Dúvida Técnica',
        tipoServicoId: 'TS003'
      },
    }),
  ])

  console.log('✅ Seed concluído com sucesso!')
  console.log('👤 Usuário admin criado: admin@demandas.com / admin123')
  console.log(`🏢 ${areas.length} áreas criadas`)
  console.log(`👨‍💼 ${analistas.length} analistas criados`)
  console.log(`📱 ${operadoras.length} operadoras criadas`)
  console.log(`📦 ${produtos.length} produtos criados`)
  console.log(`💻 ${sistemas.length} sistemas criados`)
  console.log(`🏭 ${clientes.length} clientes criados`)
  console.log(`📄 ${contratos.length} contratos criados`)
  console.log(`🔧 ${tiposServico.length} tipos de serviço criados`)
  console.log(`📋 ${tiposDemanda.length} tipos de demanda criados`)
}

main()
  .catch((e) => {
    console.error('❌ Erro durante o seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

