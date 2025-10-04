// Script para testar conexão com PostgreSQL no Railway
const { PrismaClient } = require('@prisma/client');

async function testDatabaseConnection() {
  console.log('🔍 Testando conexão com PostgreSQL...');
  console.log('📊 DATABASE_URL:', process.env.DATABASE_URL ? 'Definido' : 'Não definido');
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL não está definido');
    return;
  }

  // Mostrar parte da URL (sem credenciais)
  const url = new URL(process.env.DATABASE_URL);
  console.log('🌐 Host:', url.hostname);
  console.log('🔌 Port:', url.port);
  console.log('📂 Database:', url.pathname.slice(1));

  const prisma = new PrismaClient();

  try {
    console.log('🔄 Tentando conectar...');
    
    // Teste simples de conexão
    await prisma.$connect();
    console.log('✅ Conexão estabelecida com sucesso!');

    // Teste de consulta simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Consulta de teste executada:', result);

    // Teste de tabela específica
    const userCount = await prisma.user.count();
    console.log('✅ Contagem de usuários:', userCount);

  } catch (error) {
    console.error('❌ Erro de conexão:');
    console.error('Tipo:', error.name);
    console.error('Mensagem:', error.message);
    console.error('Código:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('🔴 Problema: Servidor PostgreSQL não está rodando ou não aceita conexões');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🔴 Problema: Host do banco não foi encontrado');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('🔴 Problema: Timeout na conexão - banco pode estar inativo');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testDatabaseConnection();
