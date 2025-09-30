const { PrismaClient } = require('@prisma/client');

async function fixAnalistaTable() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Verificando estrutura da tabela Analista...');
    
    // Verificar se a coluna email ainda existe
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Analista' AND column_name = 'email'
    `;
    
    if (result.length > 0) {
      console.log('❌ Coluna email ainda existe na tabela Analista');
      console.log('🔧 Removendo coluna email...');
      
      await prisma.$queryRaw`ALTER TABLE "Analista" DROP COLUMN IF EXISTS "email"`;
      console.log('✅ Coluna email removida com sucesso');
    } else {
      console.log('✅ Coluna email não existe na tabela Analista');
    }
    
    // Verificar se a coluna telefone ainda existe
    const telefoneResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Analista' AND column_name = 'telefone'
    `;
    
    if (telefoneResult.length > 0) {
      console.log('❌ Coluna telefone ainda existe na tabela Analista');
      console.log('🔧 Removendo coluna telefone...');
      
      await prisma.$queryRaw`ALTER TABLE "Analista" DROP COLUMN IF EXISTS "telefone"`;
      console.log('✅ Coluna telefone removida com sucesso');
    } else {
      console.log('✅ Coluna telefone não existe na tabela Analista');
    }
    
    // Verificar se a coluna areaId ainda existe
    const areaIdResult = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Analista' AND column_name = 'areaId'
    `;
    
    if (areaIdResult.length > 0) {
      console.log('❌ Coluna areaId ainda existe na tabela Analista');
      console.log('🔧 Removendo coluna areaId...');
      
      await prisma.$queryRaw`ALTER TABLE "Analista" DROP COLUMN IF EXISTS "areaId"`;
      console.log('✅ Coluna areaId removida com sucesso');
    } else {
      console.log('✅ Coluna areaId não existe na tabela Analista');
    }
    
    // Verificar estrutura final da tabela
    const finalStructure = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Analista'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Estrutura final da tabela Analista:');
    finalStructure.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    console.log('🎉 Correção da tabela Analista concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao corrigir tabela Analista:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAnalistaTable();
