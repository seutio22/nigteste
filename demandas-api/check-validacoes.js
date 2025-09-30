const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkValidacoes() {
  try {
    console.log('🔍 Verificando tabela de validações...');
    
    // Verificar se a tabela existe e tem dados
    const validacoes = await prisma.validacao.findMany({
      include: {
        analista: true,
        demanda: true
      }
    });
    
    console.log('✅ Total de validações encontradas:', validacoes.length);
    
    if (validacoes.length > 0) {
      console.log('Primeira validação:', JSON.stringify(validacoes[0], null, 2));
    } else {
      console.log('❌ Nenhuma validação encontrada na tabela');
      
      // Verificar se a tabela existe
      const tableInfo = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='Validacao'`;
      console.log('Tabela Validacao existe:', tableInfo);
    }
    
    // Verificar outras tabelas relacionadas
    const analistas = await prisma.analista.findMany();
    console.log('Total de analistas:', analistas.length);
    
    const demandas = await prisma.demanda.findMany();
    console.log('Total de demandas:', demandas.length);
    
  } catch (error) {
    console.error('❌ Erro ao verificar validações:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkValidacoes();
