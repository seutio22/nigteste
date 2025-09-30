const { PrismaClient } = require('@prisma/client');

async function testShare() {
  const prisma = new PrismaClient();
  
  try {
    // Primeiro criar um usuário para ser o manager
    const user = await prisma.user.create({
      data: {
        name: 'Usuário Teste',
        email: 'teste@teste.com',
        password: '123456',
        role: 'admin'
      }
    });
    
    console.log('✅ Usuário criado:', user);
    
    // Criar um projeto de teste
    const project = await prisma.project.create({
      data: {
        name: 'Projeto Teste Compartilhamento',
        description: 'Projeto para testar a funcionalidade de compartilhamento',
        status: 'active',
        priority: 'medium',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        managerId: user.id,
        team: '[]',
        tags: '[]',
        color: '#3B82F6'
      }
    });
    
    console.log('✅ Projeto criado:', project);
    
    // Testar criação de token de compartilhamento
    const shareToken = await prisma.projectShareToken.create({
      data: {
        projectId: project.id,
        token: 'test-token-123',
        name: 'Teste de Compartilhamento',
        description: 'Token para teste',
        allowedViews: 'overview,timeline,team,resources',
        createdBy: 'system'
      }
    });
    
    console.log('✅ Token de compartilhamento criado:', shareToken);
    
    // Testar busca de tokens
    const tokens = await prisma.projectShareToken.findMany({
      where: { projectId: project.id }
    });
    
    console.log('✅ Tokens encontrados:', tokens);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testShare();
