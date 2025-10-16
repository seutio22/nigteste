import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MonitoringQuery {
  userId?: string
  date?: string
  period?: 'today' | 'week' | 'month' | 'quarter'
}

export default async function monitoringRoutes(fastify: FastifyInstance) {
  // Endpoint para registrar atividade
  fastify.post('/activity', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId, action, page, endpoint, duration, metadata } = request.body as any

      if (!userId || !action) {
        return reply.status(400).send({ error: 'userId e action são obrigatórios' })
      }

      // Buscar dados do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' })
      }

      // Registrar atividade
      const activity = await prisma.userActivity.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          action,
          page,
          endpoint,
          duration,
          metadata: metadata ? JSON.stringify(metadata) : null,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      })

      return reply.send({ success: true, activity })
    } catch (error) {
      console.error('Erro ao registrar atividade:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para buscar dados de monitoramento
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as MonitoringQuery
      
      // Buscar usuários com dados de monitoramento
      const users = await prisma.user.findMany({
        where: {
          active: true
        },
        include: {
          userActivities: {
            take: 1,
            orderBy: { createdAt: 'desc' }
          },
          userSessions: {
            where: { isActive: true },
            take: 1
          },
          userMonitoring: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            },
            take: 1,
            orderBy: { date: 'desc' }
          }
        }
      })

      // Processar dados para o frontend
      const monitoringData = users.map(user => {
        const lastActivity = user.userActivities[0]
        const activeSession = user.userSessions[0]
        const todayMonitoring = user.userMonitoring[0]

        const now = new Date()
        const isRecentlyActive = lastActivity ? 
          (now.getTime() - lastActivity.createdAt.getTime()) < 5 * 60 * 1000 : // 5 minutos
          false

        return {
          id: user.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          lastAccess: lastActivity?.createdAt || user.lastLogin || user.createdAt,
          isOnline: isRecentlyActive && activeSession?.isActive,
          totalTimeToday: todayMonitoring?.totalTimeToday || 0,
          totalTimeThisWeek: todayMonitoring?.totalTimeThisWeek || 0,
          totalTimeThisMonth: todayMonitoring?.totalTimeThisMonth || 0,
          totalTimeThisQuarter: todayMonitoring?.totalTimeThisQuarter || 0,
          sessionCount: todayMonitoring?.sessionCount || 0,
          averageSessionTime: todayMonitoring?.averageSessionTime || 0,
          lastActivity: lastActivity?.createdAt || user.lastLogin || user.createdAt,
          loginCount: todayMonitoring?.loginCount || 0,
          logoutCount: todayMonitoring?.logoutCount || 0,
          pageViewCount: todayMonitoring?.pageViewCount || 0,
          apiCallCount: todayMonitoring?.apiCallCount || 0,
          hasRealActivity: !!user.lastLogin
        }
      })

      return reply.send(monitoringData)
    } catch (error) {
      console.error('Erro ao buscar dados de monitoramento:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para buscar atividades de um usuário específico
  fastify.get('/user/:userId/activities', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string }
      const { limit = 50, offset = 0 } = request.query as any

      const activities = await prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      })

      return reply.send(activities)
    } catch (error) {
      console.error('Erro ao buscar atividades do usuário:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para buscar estatísticas agregadas
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Buscar estatísticas gerais
      const totalUsers = await prisma.user.count({ where: { active: true } })
      
      const onlineUsers = await prisma.userSession.count({
        where: { 
          isActive: true,
          lastActivity: { gte: new Date(now.getTime() - 5 * 60 * 1000) } // 5 minutos
        }
      })

      const activitiesToday = await prisma.userActivity.count({
        where: { createdAt: { gte: startOfDay } }
      })

      const loginsToday = await prisma.userActivity.count({
        where: { 
          action: 'login',
          createdAt: { gte: startOfDay }
        }
      })

      return reply.send({
        totalUsers,
        onlineUsers,
        activitiesToday,
        loginsToday,
        period: {
          today: startOfDay,
          week: startOfWeek,
          month: startOfMonth
        }
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para iniciar sessão
  fastify.post('/session/start', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.body as any

      if (!userId) {
        return reply.status(400).send({ error: 'userId é obrigatório' })
      }

      // Finalizar sessões ativas anteriores
      await prisma.userSession.updateMany({
        where: { 
          userId, 
          isActive: true 
        },
        data: { 
          isActive: false,
          logoutTime: new Date()
        }
      })

      // Criar nova sessão
      const session = await prisma.userSession.create({
        data: {
          userId,
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          loginTime: new Date(),
          lastActivity: new Date()
        }
      })

      return reply.send({ success: true, session })
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para finalizar sessão
  fastify.post('/session/end', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionId } = request.body as any

      if (!sessionId) {
        return reply.status(400).send({ error: 'sessionId é obrigatório' })
      }

      const session = await prisma.userSession.findUnique({
        where: { sessionId }
      })

      if (!session) {
        return reply.status(404).send({ error: 'Sessão não encontrada' })
      }

      // Calcular duração da sessão
      const duration = Math.floor((new Date().getTime() - session.loginTime.getTime()) / 1000)

      await prisma.userSession.update({
        where: { sessionId },
        data: {
          isActive: false,
          logoutTime: new Date(),
          duration
        }
      })

      return reply.send({ success: true, duration })
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}