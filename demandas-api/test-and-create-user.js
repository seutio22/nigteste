const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function testAndCreateUser() {
  console.log('🔍 Testando conexão e criando usuário...');
  
  const prisma = new PrismaClient();
  
  try {
    // 1. Testar conexão
    console.log('🔌 Testando conexão com banco...');
    await prisma.$connect();
    console.log('✅ Conexão estabelecida');
    
    // 2. Verificar se já existe usuário
    console.log('👤 Verificando usuários existentes...');
    const users = await prisma.user.findMany();
    console.log(`📊 Usuários encontrados: ${users.length}`);
    
    if (users.length > 0) {
      console.log('👥 Usuários existentes:');
      users.forEach(user => {
        console.log(`  - ${user.email} (${user.role})`);
      });
    }
    
    // 3. Criar usuário admin se não existir
    const adminEmail = 'admin@demandas.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (!existingAdmin) {
      console.log('👤 Criando usuário administrador...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
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
    } else {
      console.log('ℹ️ Usuário administrador já existe');
    }
    
    // 4. Testar login
    console.log('🔐 Testando login...');
    const testUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });
    
    if (testUser) {
      const isValidPassword = await bcrypt.compare('admin123', testUser.password);
      console.log('🔑 Teste de senha:', isValidPassword ? '✅ Válida' : '❌ Inválida');
    }
    
    // 5. Verificar dados básicos
    console.log('📊 Verificando dados básicos...');
    const clientes = await prisma.cliente.count();
    const sistemas = await prisma.sistema.count();
    const areas = await prisma.area.count();
    
    console.log(`📈 Dados no banco:`);
    console.log(`  - Clientes: ${clientes}`);
    console.log(`  - Sistemas: ${sistemas}`);
    console.log(`  - Áreas: ${areas}`);
    
    if (clientes === 0) {
      console.log('🌱 Criando dados básicos...');
      
      // Criar cliente
      await prisma.cliente.create({
        data: {
          nome: 'Cliente Exemplo',
          cnpj: '12.345.678/0001-90',
          ativo: true
        }
      });
      
      // Criar sistema
      await prisma.sistema.create({
        data: {
          nome: 'Sistema Principal',
          descricao: 'Sistema principal da empresa',
          ativo: true
        }
      });
      
      // Criar área
      await prisma.area.create({
        data: {
          nome: 'TI',
          descricao: 'Tecnologia da Informação',
          ativo: true
        }
      });
      
      console.log('✅ Dados básicos criados');
    }
    
    console.log('🎉 Teste concluído com sucesso!');
    console.log('🔑 Credenciais para login:');
    console.log('  Email: admin@demandas.com');
    console.log('  Senha: admin123');
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testAndCreateUser();
