const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function seedData() {
  console.log('🌱 Iniciando seed de dados...');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Criar usuário administrador
    console.log('👤 Criando usuário administrador...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@demandas.com' },
      update: {},
      create: {
        email: 'admin@demandas.com',
        password: hashedPassword,
        name: 'Administrador',
        role: 'admin',
        permissions: {
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
          canManageUsers: true,
          canManageProjects: true,
          canManageDemands: true,
          canManageValidations: true,
          canManageMaintenance: true,
          canViewReports: true,
          canManageMasterData: true
        }
      }
    });
    console.log('✅ Usuário administrador criado:', admin.email);
    
    // 2. Criar dados básicos de master data
    console.log('📊 Criando dados básicos...');
    
    // Clientes
    const cliente1 = await prisma.cliente.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'Cliente Exemplo 1',
        cnpj: '12.345.678/0001-90',
        ativo: true
      }
    });
    
    const cliente2 = await prisma.cliente.upsert({
      where: { id: 2 },
      update: {},
      create: {
        nome: 'Cliente Exemplo 2',
        cnpj: '98.765.432/0001-10',
        ativo: true
      }
    });
    
    // Sistemas
    const sistema1 = await prisma.sistema.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'Sistema Principal',
        descricao: 'Sistema principal da empresa',
        ativo: true
      }
    });
    
    // Áreas
    const area1 = await prisma.area.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'TI',
        descricao: 'Tecnologia da Informação',
        ativo: true
      }
    });
    
    // Analistas
    const analista1 = await prisma.analista.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'João Silva',
        email: 'joao@empresa.com',
        ativo: true
      }
    });
    
    // Tipos de Demanda
    const tipoDemanda1 = await prisma.tipoDemanda.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'Desenvolvimento',
        descricao: 'Demandas de desenvolvimento',
        ativo: true
      }
    });
    
    const tipoDemanda2 = await prisma.tipoDemanda.upsert({
      where: { id: 2 },
      update: {},
      create: {
        nome: 'Correção',
        descricao: 'Demandas de correção de bugs',
        ativo: true
      }
    });
    
    // Operadoras
    const operadora1 = await prisma.operadora.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'Vivo',
        ativo: true
      }
    });
    
    const operadora2 = await prisma.operadora.upsert({
      where: { id: 2 },
      update: {},
      create: {
        nome: 'Claro',
        ativo: true
      }
    });
    
    // Produtos
    const produto1 = await prisma.produto.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'Produto A',
        descricao: 'Descrição do produto A',
        ativo: true
      }
    });
    
    console.log('✅ Dados básicos criados com sucesso!');
    console.log('📊 Resumo:');
    console.log(`  - Usuários: 1`);
    console.log(`  - Clientes: 2`);
    console.log(`  - Sistemas: 1`);
    console.log(`  - Áreas: 1`);
    console.log(`  - Analistas: 1`);
    console.log(`  - Tipos de Demanda: 2`);
    console.log(`  - Operadoras: 2`);
    console.log(`  - Produtos: 1`);
    
    console.log('🎉 Seed concluído com sucesso!');
    console.log('🔑 Credenciais de acesso:');
    console.log('  Email: admin@demandas.com');
    console.log('  Senha: admin123');
    
  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
