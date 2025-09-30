const { PrismaClient } = require('@prisma/client');

async function createSimpleData() {
  console.log('🌱 Criando dados simples...');
  
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
    
    // 1. Clientes (sem campo ativo)
    console.log('👥 Criando clientes...');
    const cliente1 = await prisma.cliente.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Cliente Exemplo 1',
        cnpj: '12.345.678/0001-90'
      }
    });
    
    const cliente2 = await prisma.cliente.upsert({
      where: { id: '2' },
      update: {},
      create: {
        id: '2',
        nome: 'Cliente Exemplo 2',
        cnpj: '98.765.432/0001-10'
      }
    });
    console.log('✅ Clientes criados');
    
    // 2. Sistemas (sem campo ativo)
    console.log('💻 Criando sistemas...');
    const sistema1 = await prisma.sistema.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Sistema Principal',
        descricao: 'Sistema principal da empresa'
      }
    });
    console.log('✅ Sistemas criados');
    
    // 3. Áreas (sem campo ativo)
    console.log('🏢 Criando áreas...');
    const area1 = await prisma.area.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'TI',
        descricao: 'Tecnologia da Informação'
      }
    });
    console.log('✅ Áreas criadas');
    
    // 4. Analistas (sem campo ativo)
    console.log('👨‍💼 Criando analistas...');
    const analista1 = await prisma.analista.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'João Silva',
        email: 'joao@empresa.com'
      }
    });
    console.log('✅ Analistas criados');
    
    // 5. Tipos de Demanda (sem campo ativo)
    console.log('📋 Criando tipos de demanda...');
    const tipo1 = await prisma.tipoDemanda.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Desenvolvimento',
        descricao: 'Demandas de desenvolvimento'
      }
    });
    console.log('✅ Tipos de demanda criados');
    
    // 6. Operadoras (sem campo ativo)
    console.log('📱 Criando operadoras...');
    const operadora1 = await prisma.operadora.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Vivo'
      }
    });
    console.log('✅ Operadoras criadas');
    
    // 7. Produtos (sem campo ativo)
    console.log('📦 Criando produtos...');
    const produto1 = await prisma.produto.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        nome: 'Produto A',
        descricao: 'Descrição do produto A'
      }
    });
    console.log('✅ Produtos criados');
    
    console.log('🎉 Dados simples criados com sucesso!');
    console.log('📊 Resumo:');
    console.log('  - 2 Clientes');
    console.log('  - 1 Sistema');
    console.log('  - 1 Área');
    console.log('  - 1 Analista');
    console.log('  - 1 Tipo de Demanda');
    console.log('  - 1 Operadora');
    console.log('  - 1 Produto');
    console.log('');
    console.log('🚀 Agora o frontend deve mostrar dados!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSimpleData();
