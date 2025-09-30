const { PrismaClient } = require('@prisma/client');

async function convertPermissions() {
  console.log('🔄 Convertendo permissões para o novo formato...');
  
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
    
    // Buscar usuário admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@demandas.com' }
    });
    
    if (!admin) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    console.log('👤 Usuário encontrado:', admin.email);
    
    // Converter permissões para o novo formato
    const newPermissions = {
      home: { view: true, create: true, edit: true, delete: true },
      dashboard: { view: true, create: true, edit: true, delete: true },
      cadastro: { view: true, create: true, edit: true, delete: true },
      manutencao: { view: true, create: true, edit: true, delete: true },
      atendimento: { view: true, create: true, edit: true, delete: true },
      comunicados: { view: true, create: true, edit: true, delete: true },
      validacao: { view: true, create: true, edit: true, delete: true },
      reajuste: { view: true, create: true, edit: true, delete: true },
      mailling: { view: true, create: true, edit: true, delete: true },
      analytics: { view: true, create: true, edit: true, delete: true },
      kanban: { view: true, create: true, edit: true, delete: true },
      projetos: { view: true, create: true, edit: true, delete: true },
      dados: { view: true, create: true, edit: true, delete: true },
      usuarios: { view: true, create: true, edit: true, delete: true },
      configuracoes: { view: true, create: true, edit: true, delete: true },
      relatorios: { view: true, create: true, edit: true, delete: true }
    };
    
    // Atualizar permissões no banco
    const updatedAdmin = await prisma.user.update({
      where: { email: 'admin@demandas.com' },
      data: {
        permissions: JSON.stringify(newPermissions)
      }
    });
    
    console.log('✅ Permissões convertidas para o novo formato!');
    console.log('🔑 Novas permissões:', JSON.stringify(newPermissions, null, 2));
    
    // Verificar se foi salvo corretamente
    const verifyAdmin = await prisma.user.findUnique({
      where: { email: 'admin@demandas.com' }
    });
    
    console.log('🔍 Verificação:');
    console.log('  - Permissões salvas:', verifyAdmin.permissions);
    
    const parsedPermissions = JSON.parse(verifyAdmin.permissions);
    console.log('  - Módulos disponíveis:', Object.keys(parsedPermissions));
    console.log('  - Home view:', parsedPermissions.home?.view);
    console.log('  - Dashboard view:', parsedPermissions.dashboard?.view);
    
    console.log('🎉 Conversão concluída com sucesso!');
    console.log('🚀 Agora o frontend deve reconhecer as permissões!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

convertPermissions();
