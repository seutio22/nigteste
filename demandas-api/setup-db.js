const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function setupDatabase() {
  console.log('🔄 Configurando banco de dados...');
  
  try {
    // 1. Executar prisma db push
    console.log('📊 Executando prisma db push...');
    execSync('npx prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ Prisma db push executado com sucesso');
    
    // 2. Gerar cliente Prisma
    console.log('🔧 Gerando cliente Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Cliente Prisma gerado');
    
    // 3. Testar conexão
    console.log('🔌 Testando conexão com banco...');
    const prisma = new PrismaClient();
    await prisma.$connect();
    console.log('✅ Conexão com banco estabelecida');
    
    // 4. Verificar se as tabelas existem
    console.log('📋 Verificando tabelas...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('📊 Tabelas encontradas:', tables.length);
    tables.forEach(table => console.log(`  - ${table.table_name}`));
    
    await prisma.$disconnect();
    console.log('🎉 Banco configurado com sucesso!');
    
    // 5. Executar seed de dados
    console.log('🌱 Executando seed de dados...');
    execSync('node seed-data.js', { stdio: 'inherit' });
    console.log('✅ Seed de dados executado com sucesso');
    
    // 6. Criar usuário administrador diretamente
    console.log('👤 Criando usuário administrador...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Verificar se já existe
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@demandas.com' }
    });
    
    if (!existingAdmin) {
      const admin = await prisma.user.create({
        data: {
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
    } else {
      console.log('ℹ️ Usuário administrador já existe');
    }
    
    // 7. Testar e verificar usuário
    console.log('🔍 Testando e verificando usuário...');
    execSync('node test-and-create-user.js', { stdio: 'inherit' });
    console.log('✅ Teste de usuário concluído');
    
  } catch (error) {
    console.error('❌ Erro ao configurar banco:', error);
    process.exit(1);
  }
}

setupDatabase();
