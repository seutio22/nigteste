// Script para configurar PostgreSQL no Railway
const { execSync } = require('child_process');

async function setupPostgreSQL() {
  console.log('🔧 Configurando PostgreSQL no Railway...');
  
  try {
    // Verificar se estamos no Railway (DATABASE_URL configurada)
    if (!process.env.DATABASE_URL) {
      console.log('⚠️ DATABASE_URL não configurada - executando em modo local');
      console.log('💡 Este script deve ser executado no Railway onde DATABASE_URL está disponível');
      return;
    }
    
    console.log('✅ DATABASE_URL encontrada - configurando PostgreSQL');
    
    // Aplicar schema usando prisma db push
    console.log('📊 Aplicando schema no PostgreSQL...');
    execSync('npx prisma db push', { stdio: 'inherit' });
    
    console.log('✅ Schema aplicado com sucesso!');
    
    // Gerar cliente Prisma
    console.log('🔧 Regenerando cliente Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    
    console.log('✅ Cliente Prisma regenerado!');
    
    // Criar usuário admin inicial
    console.log('👤 Criando usuário admin inicial...');
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    
    const prisma = new PrismaClient();
    
    try {
      const existingAdmin = await prisma.user.findFirst({
        where: { email: 'admin@admin.com' }
      });
      
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash('123456', 10);
        
        const adminUser = await prisma.user.create({
          data: {
            name: 'Administrador',
            email: 'admin@admin.com',
            password: hashedPassword,
            role: 'admin',
            active: true,
            permissions: JSON.stringify({
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
            })
          }
        });
        
        console.log(`✅ Usuário admin criado: ${adminUser.name} (${adminUser.email})`);
      } else {
        console.log('ℹ️ Usuário admin já existe');
      }
    } catch (error) {
      console.error('❌ Erro ao criar usuário admin:', error.message);
    } finally {
      await prisma.$disconnect();
    }
    
    console.log('\n🎉 PostgreSQL configurado com sucesso!');
    console.log('📊 Banco de dados persistente no Railway');
    console.log('👤 Usuário admin disponível para login');
    
  } catch (error) {
    console.error('❌ Erro na configuração:', error.message);
    process.exit(1);
  }
}

setupPostgreSQL();
