const { PrismaClient } = require('@prisma/client');

async function debugPermissions() {
  console.log('🔍 Debugando permissões do usuário...');
  
  const DATABASE_URL = 'postgresql://postgres:bmMmEyxMQtWnuUNpCHurVgavceYvAaeR@caboose.proxy.rlwy.net:14005/railway';
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: DATABASE_URL
      }
    }
  });
  
  try {
    // 1. Conectar
    await prisma.$connect();
    console.log('✅ Conectado ao banco');
    
    // 2. Buscar usuário admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@demandas.com' }
    });
    
    if (!admin) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    console.log('👤 Usuário encontrado:');
    console.log('  - ID:', admin.id);
    console.log('  - Email:', admin.email);
    console.log('  - Nome:', admin.name);
    console.log('  - Role:', admin.role);
    console.log('  - Permissões (raw):', admin.permissions);
    console.log('  - Tipo das permissões:', typeof admin.permissions);
    
    // 3. Tentar fazer parse das permissões
    try {
      const parsedPermissions = JSON.parse(admin.permissions);
      console.log('  - Permissões (parsed):', parsedPermissions);
      console.log('  - canAccessAllModules:', parsedPermissions.canAccessAllModules);
      console.log('  - canViewDashboard:', parsedPermissions.canViewDashboard);
    } catch (parseError) {
      console.log('❌ Erro ao fazer parse das permissões:', parseError.message);
    }
    
    // 4. Verificar se há outros usuários
    const allUsers = await prisma.user.findMany();
    console.log(`\n📊 Total de usuários: ${allUsers.length}`);
    
    allUsers.forEach((user, index) => {
      console.log(`\n👤 Usuário ${index + 1}:`);
      console.log(`  - Email: ${user.email}`);
      console.log(`  - Role: ${user.role}`);
      console.log(`  - Permissões: ${user.permissions}`);
    });
    
    // 5. Verificar estrutura da tabela User
    console.log('\n🔍 Verificando estrutura da tabela User...');
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'User' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    console.log('📋 Colunas da tabela User:');
    tableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugPermissions();
