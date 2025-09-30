const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdminFinal() {
  console.log('🔧 Criando usuário administrador - VERSÃO FINAL...');
  
  // Usar a DATABASE_URL do Railway
  const DATABASE_URL = 'postgresql://postgres:bmMmEyxMQtWnuUNpCHurVgavceYvAaeR@caboose.proxy.rlwy.net:14005/railway';
  
  console.log('🔗 Usando DATABASE_URL:', DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });
  
  try {
    // 1. Testar conexão
    console.log('🔌 Testando conexão...');
    await prisma.$connect();
    console.log('✅ Conexão estabelecida');
    
    // 2. Listar todas as tabelas
    console.log('📋 Verificando tabelas...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📊 Tabelas encontradas:', tables.length);
    
    // 3. Verificar usuários existentes
    console.log('👤 Verificando usuários...');
    const users = await prisma.user.findMany();
    console.log(`📊 Usuários encontrados: ${users.length}`);
    
    if (users.length > 0) {
      console.log('👥 Usuários existentes:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }
    
    // 4. Criar usuário admin
    const adminEmail = 'admin@demandas.com';
    console.log(`👤 Criando/verificando usuário: ${adminEmail}`);
    
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (existingAdmin) {
      console.log('ℹ️ Usuário já existe, atualizando senha...');
      
      // Atualizar senha
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.update({
        where: { email: adminEmail },
        data: { password: hashedPassword }
      });
      console.log('✅ Senha atualizada');
    } else {
      console.log('👤 Criando novo usuário...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Administrador',
          role: 'admin',
          permissions: JSON.stringify({
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
          })
        }
      });
      console.log('✅ Usuário criado:', admin.email);
    }
    
    // 5. Testar login
    console.log('🔐 Testando login...');
    const testUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (testUser) {
      const isValidPassword = await bcrypt.compare('admin123', testUser.password);
      console.log('🔑 Teste de senha:', isValidPassword ? '✅ Válida' : '❌ Inválida');
      
      if (isValidPassword) {
        console.log('🎉 SUCESSO! Usuário administrador configurado!');
        console.log('🔑 Credenciais para login:');
        console.log('  Email: admin@demandas.com');
        console.log('  Senha: admin123');
        console.log('');
        console.log('🚀 Agora você pode fazer login no frontend!');
      }
    }
    
    // 6. Criar alguns dados básicos
    console.log('🌱 Criando dados básicos...');
    
    // Cliente
    const cliente = await prisma.cliente.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'Cliente Exemplo',
        cnpj: '12.345.678/0001-90',
        ativo: true
      }
    });
    console.log('✅ Cliente criado:', cliente.nome);
    
    // Sistema
    const sistema = await prisma.sistema.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'Sistema Principal',
        descricao: 'Sistema principal da empresa',
        ativo: true
      }
    });
    console.log('✅ Sistema criado:', sistema.nome);
    
    // Área
    const area = await prisma.area.upsert({
      where: { id: 1 },
      update: {},
      create: {
        nome: 'TI',
        descricao: 'Tecnologia da Informação',
        ativo: true
      }
    });
    console.log('✅ Área criada:', area.nome);
    
    console.log('🎉 CONFIGURAÇÃO COMPLETA!');
    console.log('📊 Dados criados:');
    console.log('  - Usuário administrador');
    console.log('  - Cliente exemplo');
    console.log('  - Sistema principal');
    console.log('  - Área TI');
    
  } catch (error) {
    console.error('❌ Erro:', error);
    console.log('💡 Dicas:');
    console.log('  1. Verifique se a DATABASE_URL está correta');
    console.log('  2. Verifique se o banco está acessível');
    console.log('  3. Verifique se as tabelas foram criadas');
  } finally {
    await prisma.$disconnect();
  }
}

createAdminFinal();
