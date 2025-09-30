const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

async function testPermissions() {
  console.log('🔍 Testando sistema de permissões...');
  
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
    
    // 1. Buscar usuário admin
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@demandas.com' }
    });
    
    if (!admin) {
      console.log('❌ Usuário admin não encontrado');
      return;
    }
    
    console.log('👤 Usuário admin encontrado:');
    console.log('  - ID:', admin.id);
    console.log('  - Email:', admin.email);
    console.log('  - Role:', admin.role);
    console.log('  - Active:', admin.active);
    console.log('  - ViewOwnDataOnly:', admin.viewOwnDataOnly);
    console.log('  - Permissões:', admin.permissions);
    
    // 2. Fazer parse das permissões
    const permissions = JSON.parse(admin.permissions);
    console.log('\n🔑 Permissões parseadas:');
    Object.entries(permissions).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    
    // 3. Testar login via API
    console.log('\n🔐 Testando login via API...');
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare('admin123', admin.password);
    console.log('🔑 Senha válida:', isValidPassword);
    
    if (isValidPassword) {
      // 4. Gerar token JWT
      const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-for-development-only';
      const token = jwt.sign(
        {
          sub: admin.id,
          role: admin.role,
          name: admin.name,
          email: admin.email,
          permissions: permissions
        },
        jwtSecret,
        { expiresIn: '24h' }
      );
      
      console.log('🎫 Token JWT gerado:', token.substring(0, 50) + '...');
      
      // 5. Verificar token
      const decoded = jwt.verify(token, jwtSecret);
      console.log('🔍 Token decodificado:');
      console.log('  - sub:', decoded.sub);
      console.log('  - role:', decoded.role);
      console.log('  - email:', decoded.email);
      console.log('  - permissions:', decoded.permissions);
      
      // 6. Testar verificação de permissões
      console.log('\n🧪 Testando verificação de permissões:');
      const testPermissions = [
        'canCreate',
        'canRead', 
        'canUpdate',
        'canDelete',
        'canAccessAllModules',
        'canViewDashboard',
        'canManageUsers',
        'canManageProjects'
      ];
      
      testPermissions.forEach(perm => {
        const hasPermission = decoded.permissions && decoded.permissions[perm] === true;
        console.log(`  - ${perm}: ${hasPermission ? '✅' : '❌'}`);
      });
      
      // 7. Verificar se o problema está no role
      console.log('\n🔍 Verificando role:');
      console.log('  - Role do usuário:', admin.role);
      console.log('  - Role no token:', decoded.role);
      console.log('  - Role é admin?', admin.role === 'admin');
      console.log('  - Role no token é admin?', decoded.role === 'admin');
      
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPermissions();
