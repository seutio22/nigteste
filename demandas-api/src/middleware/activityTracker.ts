import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string
    name: string
    email: string
    role: string
  }
}

export async function trackUserActivity(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    // Só rastrear se o usuário estiver autenticado
    if (!request.user) {
      return
    }

    const { user } = request
    const now = new Date()
    
    // Determinar o tipo de ação baseado na rota
    let action = 'api_call'
    let page = null
    let endpoint = request.url

    // Mapear rotas para ações específicas
    if (request.url.includes('/auth/login')) {
      action = 'login'
    } else if (request.url.includes('/auth/logout')) {
      action = 'logout'
    } else if (request.url.includes('/users')) {
      action = 'page_view'
      page = '/users'
    } else if (request.url.includes('/demandas')) {
      action = 'page_view'
      page = '/demandas'
    } else if (request.url.includes('/kanban')) {
      action = 'page_view'
      page = '/kanban'
    } else if (request.url.includes('/manutencao')) {
      action = 'page_view'
      page = '/manutencao'
    } else if (request.url.includes('/atendimento')) {
      action = 'page_view'
      page = '/atendimento'
    } else if (request.url.includes('/comunicados')) {
      action = 'page_view'
      page = '/comunicados'
    } else if (request.url.includes('/analytics')) {
      action = 'page_view'
      page = '/analytics'
    }

    // Registrar atividade
    await prisma.userActivity.create({
      data: {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        action,
        page,
        endpoint,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        sessionId: request.headers['x-session-id'] as string || null,
        duration: null, // Será calculado posteriormente
        metadata: JSON.stringify({
          method: request.method,
          timestamp: now.toISOString(),
          url: request.url
        })
      }
    })

    // Atualizar UserMonitoring para hoje
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    await prisma.userMonitoring.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: today
        }
      },
      update: {
        lastAccess: now,
        isOnline: true,
        pageViewCount: action === 'page_view' ? { increment: 1 } : undefined,
        apiCallCount: action === 'api_call' ? { increment: 1 } : undefined,
        loginCount: action === 'login' ? { increment: 1 } : undefined,
        logoutCount: action === 'logout' ? { increment: 1 } : undefined
      },
      create: {
        userId: user.id,
        date: today,
        lastAccess: now,
        isOnline: true,
        pageViewCount: action === 'page_view' ? 1 : 0,
        apiCallCount: action === 'api_call' ? 1 : 0,
        loginCount: action === 'login' ? 1 : 0,
        logoutCount: action === 'logout' ? 1 : 0
      }
    })

    console.log(`📊 Atividade registrada: ${user.name} - ${action} - ${endpoint}`)
  } catch (error) {
    console.error('❌ Erro ao registrar atividade:', error)
    // Não falhar a requisição por causa do tracking
  }
}

export async function trackSessionStart(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.user) {
      return
    }

    const { user } = request
    const sessionId = request.headers['x-session-id'] as string || `session_${Date.now()}_${user.id}`

    // Finalizar sessões antigas ativas para este usuário
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
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionId,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'] || null,
        loginTime: new Date(),
        lastActivity: new Date(),
        isActive: true
      }
    })

    console.log(`🔐 Sessão iniciada: ${user.name} - ${sessionId}`)
  } catch (error) {
    console.error('❌ Erro ao iniciar sessão:', error)
  }
}

export async function trackSessionEnd(request: AuthenticatedRequest, reply: FastifyReply) {
  try {
    if (!request.user) {
      return
    }

    const { user } = request
    const sessionId = request.headers['x-session-id'] as string

    if (sessionId) {
      const session = await prisma.userSession.findUnique({
        where: { sessionId }
      })

      if (session && session.isActive) {
        const logoutTime = new Date()
        const duration = Math.floor((logoutTime.getTime() - session.loginTime.getTime()) / 1000)

        await prisma.userSession.update({
          where: { id: session.id },
          data: {
            logoutTime,
            isActive: false,
            duration
          }
        })

        // Atualizar UserMonitoring com tempo de sessão
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        await prisma.userMonitoring.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date: today
            }
          },
          update: {
            isOnline: false,
            totalTimeToday: { increment: Math.floor(duration / 60) }, // Adicionar duração em minutos
            sessionCount: { increment: 1 }
          },
          create: {
            userId: user.id,
            date: today,
            lastAccess: new Date(),
            isOnline: false,
            totalTimeToday: Math.floor(duration / 60),
            sessionCount: 1
          }
        })

        console.log(`🔐 Sessão finalizada: ${user.name} - Duração: ${Math.floor(duration / 60)} min`)
      }
    }
  } catch (error) {
    console.error('❌ Erro ao finalizar sessão:', error)
  }
}
