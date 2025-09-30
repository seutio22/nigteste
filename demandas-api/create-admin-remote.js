const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

// URL do banco Railway (você precisa substituir pela sua)
const DATABASE_URL = 'postgresql://postgres:abc123@containers-us-west-xyz.railway.app:5432/railway';

async function createAdminUser() {
  console.log('🔧 Criando usuário administrador no Railway...');
  
  // Criar cliente Prisma com URL específica
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });
  
  try {
    // 1. Testar conexão
    console.log('🔌 Testando conexão com banco Railway...');
    await prisma.$connect();
    console.log('✅ Conexão estabelecida');
    
    // 2. Verificar usuários existentes
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
      
      if (isValidPassword) {
        console.log('🎉 Usuário administrador configurado com sucesso!');
        console.log('🔑 Credenciais para login:');
        console.log('  Email: admin@demandas.com');
        console.log('  Senha: admin123');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
    console.log('💡 Dica: Verifique se a DATABASE_URL está correta');
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
