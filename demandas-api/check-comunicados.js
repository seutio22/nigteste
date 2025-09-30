const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkComunicados() {
  try {
    console.log('Verificando dados de comunicados...');
    
    const comunicados = await prisma.comunicado.findMany();
    console.log('Total de comunicados:', comunicados.length);
    
    if (comunicados.length > 0) {
      console.log('Primeiro comunicado:', comunicados[0]);
    } else {
      console.log('Nenhum comunicado encontrado no banco');
    }
    
    // Verificar se a tabela existe
    const tableInfo = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='Comunicado'`;
    console.log('Tabela Comunicado existe:', tableInfo.length > 0);
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkComunicados();
