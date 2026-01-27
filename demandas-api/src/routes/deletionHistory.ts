import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'

interface DeletionLogQuery {
  entityType?: string
  deletedBy?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

export default async function deletionHistoryRoutes(fastify: FastifyInstance) {
  // Endpoint para buscar histórico de exclusões
  fastify.get('/history', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as DeletionLogQuery
      
      // Construir filtros
      const where: any = {}
      
      if (query.entityType) {
        where.entityType = query.entityType
      }
      
      if (query.deletedBy) {
        where.deletedBy = query.deletedBy
      }
      
      if (query.startDate || query.endDate) {
        where.deletedAt = {}
        if (query.startDate) {
          where.deletedAt.gte = new Date(query.startDate)
        }
        if (query.endDate) {
          where.deletedAt.lte = new Date(query.endDate)
        }
      }

      // Buscar histórico de exclusões
      const deletionLogs = await prisma.deletionLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { deletedAt: 'desc' },
        take: query.limit ? parseInt(query.limit.toString()) : 50,
        skip: query.offset ? parseInt(query.offset.toString()) : 0
      })

      // Buscar dados dos itens excluídos (batch por tipo para evitar N+1)
      const idsByType = deletionLogs.reduce<Record<string, string[]>>((acc, log) => {
        if (!acc[log.entityType]) acc[log.entityType] = []
        acc[log.entityType].push(log.entityId)
        return acc
      }, {})

      const [
        demandas,
        manutencoes,
        atendimentos,
        validacoes,
        reajustes,
        reports
      ] = await Promise.all([
        idsByType.demanda?.length
          ? prisma.demanda.findMany({
              where: { id: { in: idsByType.demanda } },
              select: {
                id: true,
                ticket: true,
                descricao: true,
                status: true,
                user: { select: { name: true, email: true } },
                contrato: true
              }
            })
          : Promise.resolve([]),
        idsByType.manutencao?.length
          ? prisma.manutencao.findMany({
              where: { id: { in: idsByType.manutencao } },
              select: {
                id: true,
                ticket: true,
                descricao: true,
                status: true,
                user: { select: { name: true, email: true } },
                contrato: true
              }
            })
          : Promise.resolve([]),
        idsByType.atendimento?.length
          ? prisma.atendimento.findMany({
              where: { id: { in: idsByType.atendimento } },
              select: {
                id: true,
                ticket: true,
                descricao: true,
                status: true,
                user: { select: { name: true, email: true } }
              }
            })
          : Promise.resolve([]),
        idsByType.validacao?.length
          ? prisma.validacao.findMany({
              where: { id: { in: idsByType.validacao } },
              select: {
                id: true,
                ticket: true,
                descricao: true,
                status: true,
                user: { select: { name: true, email: true } }
              }
            })
          : Promise.resolve([]),
        idsByType.reajuste?.length
          ? prisma.reajuste.findMany({
              where: { id: { in: idsByType.reajuste } },
              select: {
                id: true,
                ticket: true,
                descricao: true,
                status: true,
                user: { select: { name: true, email: true } }
              }
            })
          : Promise.resolve([]),
        idsByType.analytics?.length
          ? prisma.report.findMany({
              where: { id: { in: idsByType.analytics } }
            })
          : Promise.resolve([])
      ])

      const mapById = <T extends { id: string }>(rows: T[]) =>
        rows.reduce<Record<string, T>>((acc, row) => {
          acc[row.id] = row
          return acc
        }, {})

      const demandMap = mapById(demandas)
      const manutencaoMap = mapById(manutencoes)
      const atendimentoMap = mapById(atendimentos)
      const validacaoMap = mapById(validacoes)
      const reajusteMap = mapById(reajustes)
      const reportMap = mapById(reports)

      const enrichedLogs = deletionLogs.map((log) => {
        let entityData: any = null
        switch (log.entityType) {
          case 'demanda':
            entityData = demandMap[log.entityId] || null
            break
          case 'manutencao':
            entityData = manutencaoMap[log.entityId] || null
            break
          case 'analytics':
            entityData = reportMap[log.entityId] || null
            break
          case 'atendimento':
            entityData = atendimentoMap[log.entityId] || null
            break
          case 'validacao':
            entityData = validacaoMap[log.entityId] || null
            break
          case 'reajuste':
            entityData = reajusteMap[log.entityId] || null
            break
        }
        return { ...log, entityData }
      })

      return reply.send({
        logs: enrichedLogs,
        total: await prisma.deletionLog.count({ where }),
        hasMore: enrichedLogs.length === (query.limit ? parseInt(query.limit.toString()) : 50)
      })
    } catch (error) {
      console.error('Erro ao buscar histórico de exclusões:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para restaurar item excluído
  fastify.post('/restore/:logId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { logId } = request.params as { logId: string }
      const user = (request as any).authenticatedUser

      if (!user) {
        return reply.status(401).send({ error: 'Usuário não autenticado' })
      }

      // Buscar log de exclusão
      const deletionLog = await prisma.deletionLog.findUnique({
        where: { id: logId }
      })

      if (!deletionLog) {
        return reply.status(404).send({ error: 'Log de exclusão não encontrado' })
      }

      // Restaurar item baseado no tipo
      let restoredItem = null
      
      switch (deletionLog.entityType) {
        case 'demanda':
          restoredItem = await prisma.demanda.findUnique({
            where: { id: deletionLog.entityId }
          })
          if (restoredItem) {
            // Se o item ainda existe, apenas remover o log
            await prisma.deletionLog.delete({ where: { id: logId } })
          } else {
            return reply.status(404).send({ error: 'Item não encontrado para restauração' })
          }
          break
        case 'manutencao':
          restoredItem = await prisma.manutencao.findUnique({
            where: { id: deletionLog.entityId }
          })
          if (restoredItem) {
            await prisma.deletionLog.delete({ where: { id: logId } })
          } else {
            return reply.status(404).send({ error: 'Item não encontrado para restauração' })
          }
          break
        case 'analytics':
          restoredItem = await prisma.report.findUnique({
            where: { id: deletionLog.entityId }
          })
          if (restoredItem) {
            await prisma.deletionLog.delete({ where: { id: logId } })
          } else {
            return reply.status(404).send({ error: 'Item não encontrado para restauração' })
          }
          break
        default:
          return reply.status(400).send({ error: 'Tipo de entidade não suportado para restauração' })
      }

      return reply.send({ 
        success: true, 
        message: 'Item restaurado com sucesso',
        restoredItem 
      })
    } catch (error) {
      console.error('Erro ao restaurar item:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para obter estatísticas do histórico
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const stats = {
        total: await prisma.deletionLog.count(),
        today: await prisma.deletionLog.count({
          where: { deletedAt: { gte: startOfDay } }
        }),
        thisWeek: await prisma.deletionLog.count({
          where: { deletedAt: { gte: startOfWeek } }
        }),
        thisMonth: await prisma.deletionLog.count({
          where: { deletedAt: { gte: startOfMonth } }
        }),
        byEntityType: await prisma.deletionLog.groupBy({
          by: ['entityType'],
          _count: { entityType: true }
        }),
        byUser: await prisma.deletionLog.groupBy({
          by: ['deletedBy'],
          _count: { deletedBy: true }
        })
      }

      return reply.send(stats)
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para verificar e criar tabela DeletionLog
  fastify.get('/setup', async (request: FastifyRequest, reply: FastifyReply) => {
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
