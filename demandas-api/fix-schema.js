// Script para corrigir o schema diretamente no banco
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSchema() {
  console.log('🔧 Corrigindo schema do banco...');
  
  try {
    // Tentar adicionar as colunas diretamente
    try {
      console.log('➕ Adicionando coluna email...');
      await prisma.$executeRaw`ALTER TABLE "Analista" ADD COLUMN "email" TEXT`;
    } catch (e) {
      console.log('ℹ️ Coluna email já existe');
    }
    
    try {
      console.log('➕ Adicionando coluna telefone...');
      await prisma.$executeRaw`ALTER TABLE "Analista" ADD COLUMN "telefone" TEXT`;
    } catch (e) {
      console.log('ℹ️ Coluna telefone já existe');
    }
    
    try {
      console.log('➕ Adicionando coluna cargo...');
      await prisma.$executeRaw`ALTER TABLE "Analista" ADD COLUMN "cargo" TEXT`;
    } catch (e) {
      console.log('ℹ️ Coluna cargo já existe');
    }
    
    console.log('✅ Schema corrigido com sucesso!');
    
    // Testar se funcionou
    console.log('🧪 Testando consulta...');
    const result = await prisma.analista.findMany({ take: 1 });
    console.log('✅ Consulta funcionou! Schema aplicado.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSchema();
