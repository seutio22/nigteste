const { PrismaClient } = require('@prisma/client');

async function resetRailwayDatabase() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: "postgresql://postgres:password@containers-us-west-146.railway.app:6543/railway"
      }
    }
  });
  
  try {
    console.log('🔄 Resetando banco de dados do Railway...');
    
    // 1. Remover todas as tabelas
    console.log('1️⃣ Removendo todas as tabelas...');
    await prisma.$executeRaw`DROP SCHEMA public CASCADE`;
    await prisma.$executeRaw`CREATE SCHEMA public`;
    await prisma.$executeRaw`GRANT ALL ON SCHEMA public TO postgres`;
    await prisma.$executeRaw`GRANT ALL ON SCHEMA public TO public`;
    
    console.log('✅ Todas as tabelas removidas');
    
    // 2. Aplicar schema atual
    console.log('2️⃣ Aplicando schema atual...');
    await prisma.$executeRaw`CREATE TABLE "Area" (
      "id" TEXT NOT NULL,
      "nome" TEXT NOT NULL,
      "descricao" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
    )`;
    
    await prisma.$executeRaw`CREATE TABLE "Analista" (
      "id" TEXT NOT NULL,
      "nome" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Analista_pkey" PRIMARY KEY ("id")
    )`;
    
    await prisma.$executeRaw`CREATE TABLE "User" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "password" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'user',
      "permissions" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    )`;
    
    await prisma.$executeRaw`CREATE UNIQUE INDEX "User_email_key" ON "User"("email")`;
    
    console.log('✅ Schema aplicado com sucesso');
    
    // 3. Criar usuário admin
    console.log('3️⃣ Criando usuário administrador...');
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
        email: 'admin@demandas.com',
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
    
    console.log('✅ Usuário administrador criado:', admin.email);
    
    // 4. Criar dados de exemplo
    console.log('4️⃣ Criando dados de exemplo...');
    
    // Criar áreas
    const area1 = await prisma.area.create({
      data: { nome: 'TI', descricao: 'Tecnologia da Informação' }
    });
    
    const area2 = await prisma.area.create({
      data: { nome: 'Suporte', descricao: 'Suporte Técnico' }
    });
    
    // Criar analistas
    const analista1 = await prisma.analista.create({
      data: { nome: 'João Silva' }
    });
    
    const analista2 = await prisma.analista.create({
      data: { nome: 'Maria Santos' }
    });
    
    console.log('✅ Dados de exemplo criados');
    console.log('🎉 Reset do banco de dados concluído com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante o reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetRailwayDatabase();
