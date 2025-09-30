const { PrismaClient } = require('@prisma/client');

async function testRoute() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Testando rota de compartilhamento...');
    
    // Verificar se conseguimos acessar a rota diretamente
    const response = await fetch('http://localhost:3333/projects/efa08711-e6c6-42df-805e-518cf2300ae6/share');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Rota funcionando:', data);
    } else {
      console.log('❌ Erro na rota:', response.status, response.statusText);
      const errorData = await response.text();
      console.log('📄 Detalhes do erro:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar rota:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testRoute();
