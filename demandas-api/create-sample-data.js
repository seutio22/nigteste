const { PrismaClient } = require('@prisma/client');

async function createSampleData() {
  console.log('🌱 Criando dados de exemplo...');
  
  const DATABASE_URL = 'postgresql://postgres:bmMmEyxMQtWnuUNpCHurVgavceYvAaeR@caboose.proxy.rlwy.net:14005/railway';
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });
  
  try {
    await prisma.$connect();
    console.log('✅ Conectado ao banco');
    
    // 1. Clientes
    console.log('👥 Criando clientes...');
    const cliente1 = await prisma.cliente.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Cliente Exemplo 1',
        cnpj: '12.345.678/0001-90',
        ativo: true
      }
    });
    
    const cliente2 = await prisma.cliente.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        nome: 'Cliente Exemplo 2',
        cnpj: '98.765.432/0001-10',
        ativo: true
      }
    });
    console.log('✅ Clientes criados');
    
    // 2. Sistemas
    console.log('💻 Criando sistemas...');
    const sistema1 = await prisma.sistema.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Sistema Principal',
        descricao: 'Sistema principal da empresa',
        ativo: true
      }
    });
    
    const sistema2 = await prisma.sistema.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        nome: 'Sistema Secundário',
        descricao: 'Sistema auxiliar',
        ativo: true
      }
    });
    console.log('✅ Sistemas criados');
    
    // 3. Áreas
    console.log('🏢 Criando áreas...');
    const area1 = await prisma.area.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'TI',
        descricao: 'Tecnologia da Informação',
        ativo: true
      }
    });
    
    const area2 = await prisma.area.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        nome: 'Financeiro',
        descricao: 'Área financeira',
        ativo: true
      }
    });
    console.log('✅ Áreas criadas');
    
    // 4. Analistas
    console.log('👨‍💼 Criando analistas...');
    const analista1 = await prisma.analista.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'João Silva',
        email: 'joao@empresa.com',
        ativo: true
      }
    });
    
    const analista2 = await prisma.analista.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        nome: 'Maria Santos',
        email: 'maria@empresa.com',
        ativo: true
      }
    });
    console.log('✅ Analistas criados');
    
    // 5. Tipos de Demanda
    console.log('📋 Criando tipos de demanda...');
    const tipo1 = await prisma.tipoDemanda.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Desenvolvimento',
        descricao: 'Demandas de desenvolvimento',
        ativo: true
      }
    });
    
    const tipo2 = await prisma.tipoDemanda.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        nome: 'Correção',
        descricao: 'Demandas de correção de bugs',
        ativo: true
      }
    });
    console.log('✅ Tipos de demanda criados');
    
    // 6. Operadoras
    console.log('📱 Criando operadoras...');
    const operadora1 = await prisma.operadora.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Vivo',
        ativo: true
      }
    });
    
    const operadora2 = await prisma.operadora.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        nome: 'Claro',
        ativo: true
      }
    });
    console.log('✅ Operadoras criadas');
    
    // 7. Produtos
    console.log('📦 Criando produtos...');
    const produto1 = await prisma.produto.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Produto A',
        descricao: 'Descrição do produto A',
        ativo: true
      }
    });
    
    const produto2 = await prisma.produto.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        nome: 'Produto B',
        descricao: 'Descrição do produto B',
        ativo: true
      }
    });
    console.log('✅ Produtos criados');
    
    console.log('🎉 Dados de exemplo criados com sucesso!');
    console.log('📊 Resumo:');
    console.log('  - 2 Clientes');
    console.log('  - 2 Sistemas');
    console.log('  - 2 Áreas');
    console.log('  - 2 Analistas');
    console.log('  - 2 Tipos de Demanda');
    console.log('  - 2 Operadoras');
    console.log('  - 2 Produtos');
    console.log('');
    console.log('🚀 Agora o frontend deve mostrar dados!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData();
