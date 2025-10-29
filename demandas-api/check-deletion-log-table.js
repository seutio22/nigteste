import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAndCreateDeletionLogTable() {
  try {
    console.log('🔍 Verificando se a tabela DeletionLog existe...')
    
    // Tentar fazer uma consulta simples na tabela
    const count = await prisma.deletionLog.count()
    console.log(`✅ Tabela DeletionLog existe! Total de registros: ${count}`)
    
  } catch (error) {
    console.error('❌ Erro ao acessar tabela DeletionLog:', error)
    
    if (error.message.includes('does not exist') || error.message.includes('not found')) {
      console.log('🔄 Tabela não existe, tentando criar...')
      
      try {
        // Tentar criar a tabela usando SQL direto
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "DeletionLog" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "entityType" TEXT NOT NULL,
            "entityId" TEXT NOT NULL,
            "deletedBy" TEXT NOT NULL,
            "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "reason" TEXT,
            CONSTRAINT "DeletionLog_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
          );
        `
        
        console.log('✅ Tabela DeletionLog criada com sucesso!')
        
        // Criar índices
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "DeletionLog_entityType_deletedAt_idx" ON "DeletionLog"("entityType", "deletedAt");
        `
        
        await prisma.$executeRaw`
          CREATE INDEX IF NOT EXISTS "DeletionLog_deletedBy_idx" ON "DeletionLog"("deletedBy");
        `
        
        console.log('✅ Índices criados com sucesso!')
        
      } catch (createError) {
        console.error('❌ Erro ao criar tabela:', createError)
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Executar verificação
checkAndCreateDeletionLogTable()
  .then(() => {
    console.log('🎉 Verificação concluída!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Erro fatal:', error)
    process.exit(1)
  })
