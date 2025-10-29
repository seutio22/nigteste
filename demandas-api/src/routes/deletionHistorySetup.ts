import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function deletionHistorySetupRoutes(fastify: FastifyInstance) {
  // Rota para verificar e criar tabela DeletionLog
  fastify.get('/setup', async (request, reply) => {
    try {
      console.log('🔍 Verificando tabela DeletionLog...')
      
      // Tentar fazer uma consulta simples na tabela
      const count = await prisma.deletionLog.count()
      
      return reply.send({ 
        message: 'Tabela DeletionLog existe!', 
        totalRecords: count,
        timestamp: new Date().toISOString()
      })
      
    } catch (error) {
      console.error('❌ Erro ao verificar tabela:', error)
      
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        try {
          console.log('🔄 Criando tabela DeletionLog...')
          
          // Criar a tabela usando SQL direto
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
          
          // Criar índices
          await prisma.$executeRaw`
            CREATE INDEX IF NOT EXISTS "DeletionLog_entityType_deletedAt_idx" ON "DeletionLog"("entityType", "deletedAt");
          `
          
          await prisma.$executeRaw`
            CREATE INDEX IF NOT EXISTS "DeletionLog_deletedBy_idx" ON "DeletionLog"("deletedBy");
          `
          
          return reply.send({ 
            message: 'Tabela DeletionLog criada com sucesso!', 
            timestamp: new Date().toISOString()
          })
          
        } catch (createError) {
          console.error('❌ Erro ao criar tabela:', createError)
          return reply.status(500).send({ 
            error: 'Erro ao criar tabela', 
            details: createError.message 
          })
        }
      }
      
      return reply.status(500).send({ 
        error: 'Erro ao verificar tabela', 
        details: error.message 
      })
    }
  })
}
