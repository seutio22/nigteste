const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function fixPermissions() {
  console.log('🔧 Corrigindo permissões do usuário administrador...');
  
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
    
    console.log('👤 Usuário encontrado:', admin.email);
    console.log('🔍 Permissões atuais:', admin.permissions);
    
    // 3. Atualizar permissões com todas as permissões possíveis
    const fullPermissions = {
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
      canManageMasterData: true,
      canAccessAllModules: true,
      canViewDashboard: true,
      canManageSettings: true,
      canExportData: true,
      canImportData: true,
      canViewAnalytics: true,
      canManageNotifications: true,
      canViewLogs: true
    };
    
    const updatedAdmin = await prisma.user.update({
      where: { email: 'admin@demandas.com' },
      data: {
        permissions: JSON.stringify(fullPermissions),
        role: 'admin'
      }
    });
    
    console.log('✅ Permissões atualizadas!');
    console.log('🔑 Novas permissões:', JSON.parse(updatedAdmin.permissions));
    
    // 4. Verificar se há outros usuários
    const allUsers = await prisma.user.findMany();
    console.log(`📊 Total de usuários: ${allUsers.length}`);
    
    allUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.role})`);
    });
    
    console.log('🎉 Permissões corrigidas com sucesso!');
    console.log('🔑 Agora você deve ter acesso total ao sistema!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPermissions();
