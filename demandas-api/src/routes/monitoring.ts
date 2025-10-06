import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function monitoringRoutes(fastify: FastifyInstance) {
  console.log('🔧 Registrando rotas de monitoramento...')

  // GET /users - Obter dados de monitoramento de todos os usuários
  fastify.get('/users', async (request, reply) => {
    try {
      console.log('🔍 Buscando dados de monitoramento reais...')
      
      // Buscar usuários reais
      const users = await prisma.user.findMany({
        where: { active: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastLogin: true,
          createdAt: true
        }
      })

      console.log(`✅ Encontrados ${users.length} usuários reais`)

      // Buscar dados de monitoramento para cada usuário
      const monitoringData = await Promise.all(users.map(async (user) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        const weekAgo = new Date(today)
        weekAgo.setDate(weekAgo.getDate() - 7)
        
        const monthAgo = new Date(today)
        monthAgo.setDate(monthAgo.getDate() - 30)
        
        const quarterAgo = new Date(today)
        quarterAgo.setDate(quarterAgo.getDate() - 90)

        // Buscar atividades do usuário
        const activities = await prisma.userActivity.findMany({
          where: {
            userId: user.id,
            createdAt: {
              gte: quarterAgo
            }
          },
          orderBy: { createdAt: 'desc' }
        })

        // Buscar sessões do usuário
        const sessions = await prisma.userSession.findMany({
          where: {
            userId: user.id,
            loginTime: {
              gte: quarterAgo
            }
          },
          orderBy: { loginTime: 'desc' }
        })

        // Buscar dados de monitoramento agregados
        const monitoring = await prisma.userMonitoring.findFirst({
          where: {
            userId: user.id,
            date: {
              gte: today
            }
          },
          orderBy: { date: 'desc' }
        })

        // Calcular métricas reais
        const todayActivities = activities.filter(a => a.createdAt >= today)
        const weekActivities = activities.filter(a => a.createdAt >= weekAgo)
        const monthActivities = activities.filter(a => a.createdAt >= monthAgo)
        const quarterActivities = activities.filter(a => a.createdAt >= quarterAgo)

        const todaySessions = sessions.filter(s => s.loginTime >= today)
        const activeSession = sessions.find(s => s.isActive)

        // Calcular tempo online baseado nas atividades
        const totalTimeToday = todayActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60 // converter para minutos
        const totalTimeThisWeek = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60
        const totalTimeThisMonth = monthActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60
        const totalTimeThisQuarter = quarterActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60

        // Calcular estatísticas de sessão
        const sessionCount = todaySessions.length
        const loginCount = activities.filter(a => a.action === 'login').length
        const logoutCount = activities.filter(a => a.action === 'logout').length
        const pageViewCount = activities.filter(a => a.action === 'page_view').length
        const apiCallCount = activities.filter(a => a.action === 'api_call').length
        const averageSessionTime = sessionCount > 0 ? totalTimeToday / sessionCount : 0

        // Última atividade
        const lastActivity = activities[0]?.createdAt || user.lastLogin || user.createdAt

        return {
          id: user.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          lastAccess: lastActivity.toISOString(),
          isOnline: !!activeSession,
          totalTimeToday: Math.round(totalTimeToday),
          totalTimeThisWeek: Math.round(totalTimeThisWeek),
          totalTimeThisMonth: Math.round(totalTimeThisMonth),
          totalTimeThisQuarter: Math.round(totalTimeThisQuarter),
          sessionCount,
          averageSessionTime: Math.round(averageSessionTime),
          lastActivity: lastActivity.toISOString(),
          loginCount,
          logoutCount,
          pageViewCount,
          apiCallCount
        }
      }))

      console.log(`✅ Dados de monitoramento processados: ${monitoringData.length} registros`)
      return reply.send(monitoringData)
    } catch (error) {
      console.error('❌ Erro ao buscar dados de monitoramento:', error)
      return reply.status(500).send({ message: 'Erro interno do servidor' })
    }
  })

  // POST /monitoring/activity - Registrar atividade do usuário
  fastify.post('/monitoring/activity', async (request, reply) => {
    try {
      const { action, page, endpoint, duration, metadata } = request.body as any
      const user = request.user

      // Criar registro de atividade
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

      // Atualizar estatísticas de monitoramento
      await updateUserMonitoringStats(user.id)

      return reply.send({ success: true, activity })
    } catch (error) {
      console.error('Erro ao registrar atividade:', error)
      return reply.status(500).send({ message: 'Erro interno do servidor' })
    }
  })

  // POST /monitoring/session/start - Iniciar sessão
  fastify.post('/monitoring/session/start', async (request, reply) => {
    try {
      const user = request.user
      const sessionId = `session_${user.id}_${Date.now()}`

      // Finalizar sessões ativas anteriores
      await prisma.userSession.updateMany({
        where: {
          userId: user.id,
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
          userId: user.id,
          sessionId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          loginTime: new Date(),
          lastActivity: new Date()
        }
      })

      // Registrar atividade de login
      await prisma.userActivity.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          action: 'login',
          sessionId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      })

      return reply.send({ success: true, session })
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
      return reply.status(500).send({ message: 'Erro interno do servidor' })
    }
  })

  // POST /monitoring/session/end - Finalizar sessão
  fastify.post('/monitoring/session/end', async (request, reply) => {
    try {
      const user = request.user

      // Finalizar sessão ativa
      const session = await prisma.userSession.findFirst({
        where: {
          userId: user.id,
          isActive: true
        }
      })

      if (session) {
        const duration = Math.floor((Date.now() - session.loginTime.getTime()) / 1000)

        await prisma.userSession.update({
          where: { id: session.id },
          data: {
            isActive: false,
            logoutTime: new Date(),
            duration
          }
        })

        // Registrar atividade de logout
        await prisma.userActivity.create({
          data: {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            userRole: user.role,
            action: 'logout',
            sessionId: session.sessionId,
            duration,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent']
          }
        })
      }

      return reply.send({ success: true })
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
      return reply.status(500).send({ message: 'Erro interno do servidor' })
    }
  })

  // Função auxiliar para atualizar estatísticas de monitoramento
  async function updateUserMonitoringStats(userId: string) {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const weekAgo = new Date(today)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const monthAgo = new Date(today)
      monthAgo.setDate(monthAgo.getDate() - 30)

      const quarterAgo = new Date(today)
      quarterAgo.setDate(quarterAgo.getDate() - 90)

      // Buscar atividades do usuário
      const activities = await prisma.userActivity.findMany({
        where: {
          userId,
          createdAt: {
            gte: quarterAgo
          }
        }
      })

      const sessions = await prisma.userSession.findMany({
        where: {
          userId,
          loginTime: {
            gte: quarterAgo
          }
        }
      })

      // Calcular estatísticas
      const todayActivities = activities.filter(a => a.createdAt >= today)
      const weekActivities = activities.filter(a => a.createdAt >= weekAgo)
      const monthActivities = activities.filter(a => a.createdAt >= monthAgo)
      const quarterActivities = activities.filter(a => a.createdAt >= quarterAgo)

      const totalTimeToday = todayActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60
      const totalTimeThisWeek = weekActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60
      const totalTimeThisMonth = monthActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60
      const totalTimeThisQuarter = quarterActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60

      const sessionCount = sessions.filter(s => s.loginTime >= today).length
      const loginCount = activities.filter(a => a.action === 'login').length
      const logoutCount = activities.filter(a => a.action === 'logout').length
      const pageViewCount = activities.filter(a => a.action === 'page_view').length
      const apiCallCount = activities.filter(a => a.action === 'api_call').length
      const averageSessionTime = sessionCount > 0 ? totalTimeToday / sessionCount : 0

      const isOnline = sessions.some(s => s.isActive)
      const lastAccess = activities[0]?.createdAt || new Date()

      // Upsert estatísticas de monitoramento
      await prisma.userMonitoring.upsert({
        where: {
          userId_date: {
            userId,
            date: today
          }
        },
        update: {
          totalTimeToday: Math.round(totalTimeToday),
          totalTimeThisWeek: Math.round(totalTimeThisWeek),
          totalTimeThisMonth: Math.round(totalTimeThisMonth),
          totalTimeThisQuarter: Math.round(totalTimeThisQuarter),
          sessionCount,
          loginCount,
          logoutCount,
          pageViewCount,
          apiCallCount,
          averageSessionTime: Math.round(averageSessionTime),
          lastAccess,
          isOnline
        },
        create: {
          userId,
          date: today,
          totalTimeToday: Math.round(totalTimeToday),
          totalTimeThisWeek: Math.round(totalTimeThisWeek),
          totalTimeThisMonth: Math.round(totalTimeThisMonth),
          totalTimeThisQuarter: Math.round(totalTimeThisQuarter),
          sessionCount,
          loginCount,
          logoutCount,
          pageViewCount,
          apiCallCount,
          averageSessionTime: Math.round(averageSessionTime),
          lastAccess,
          isOnline
        }
      })
    } catch (error) {
      console.error('Erro ao atualizar estatísticas de monitoramento:', error)
    }
  }
}
