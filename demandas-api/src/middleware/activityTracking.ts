import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'

interface TrackingData {
  userId?: string
  userName?: string
  userEmail?: string
  userRole?: string
  action: string
  page?: string
  endpoint?: string
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  duration?: number
  metadata?: any
}

// Middleware para tracking de atividades
export async function activityTrackingMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    // Extrair dados do usuário do token
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return // Não fazer tracking se não houver autenticação
    }

    const token = authHeader.substring(7)
    
    // Decodificar token (assumindo JWT)
    let userData: any = null
    try {
      // Aqui você precisaria implementar a decodificação do JWT
      // Por enquanto, vamos buscar o usuário de outra forma
      userData = await getUserFromToken(token)
    } catch (error) {
      console.log('Erro ao decodificar token:', error)
      return
    }

    if (!userData) {
      return
    }

    // Extrair dados da requisição
    const trackingData: TrackingData = {
      userId: userData.id,
      userName: userData.name,
      userEmail: userData.email,
      userRole: userData.role,
      action: getActionFromRequest(request),
      page: request.headers.referer || undefined,
      endpoint: request.url,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      sessionId: getSessionId(request),
      metadata: {
        method: request.method,
        statusCode: reply.statusCode,
        timestamp: new Date().toISOString()
      }
    }

    // Salvar atividade no banco (async, não bloquear resposta)
    Promise.resolve().then(() => {
      saveActivity(trackingData)
    })

  } catch (error) {
    console.error('Erro no middleware de tracking:', error)
    // Não bloquear a resposta em caso de erro
  }
}

// Função auxiliar para obter ação baseada na requisição
function getActionFromRequest(request: FastifyRequest): string {
  const method = request.method
  const url = request.url

  // Mapear ações baseadas no método e URL
  if (method === 'GET') {
    if (url.includes('/auth/login')) return 'login'
    if (url.includes('/auth/logout')) return 'logout'
    if (url.includes('/users')) return 'view_users'
    if (url.includes('/demandas')) return 'view_demandas'
    if (url.includes('/projetos')) return 'view_projetos'
    if (url.includes('/comunicados')) return 'view_comunicados'
    return 'page_view'
  }

  if (method === 'POST') {
    if (url.includes('/auth/login')) return 'login'
    if (url.includes('/demandas')) return 'create_demanda'
    if (url.includes('/projetos')) return 'create_projeto'
    if (url.includes('/comunicados')) return 'create_comunicado'
    return 'create_entity'
  }

  if (method === 'PUT') {
    return 'update_entity'
  }

  if (method === 'DELETE') {
    return 'delete_entity'
  }

  return 'api_call'
}

// Função auxiliar para obter session ID
function getSessionId(request: FastifyRequest): string | undefined {
  // Implementar lógica para extrair session ID
  return request.headers['x-session-id'] as string || undefined
}

// Função auxiliar para buscar usuário pelo token
async function getUserFromToken(token: string): Promise<any> {
  try {
    // Aqui você implementaria a lógica para validar o token e buscar o usuário
    // Por enquanto, vamos fazer uma busca simples
    const user = await prisma.user.findFirst({
      where: {
        // Assumindo que o token contém o ID do usuário ou email
        // Você precisaria implementar a validação JWT adequada
        active: true
      }
    })
    return user
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    return null
  }
}

// Função para salvar atividade no banco
async function saveActivity(data: TrackingData) {
  try {
    await prisma.userActivity.create({
      data: {
        userId: data.userId!,
        userName: data.userName!,
        userEmail: data.userEmail!,
        userRole: data.userRole!,
        action: data.action,
        page: data.page,
        endpoint: data.endpoint,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        duration: data.duration,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      }
    })

    // Atualizar estatísticas de monitoramento
    await updateUserMonitoring(data)

  } catch (error) {
    console.error('Erro ao salvar atividade:', error)
  }
}

// Função para atualizar estatísticas de monitoramento
async function updateUserMonitoring(data: TrackingData) {
  try {
    if (!data.userId) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Buscar ou criar registro de monitoramento do dia
    let monitoring = await prisma.userMonitoring.findUnique({
      where: {
        userId_date: {
          userId: data.userId,
          date: today
        }
      }
    })

    if (!monitoring) {
      monitoring = await prisma.userMonitoring.create({
        data: {
          userId: data.userId,
          date: today,
          lastAccess: new Date()
        }
      })
    }

    // Atualizar contadores baseados na ação
    const updates: any = {
      lastAccess: new Date(),
      updatedAt: new Date()
    }

    switch (data.action) {
      case 'login':
        updates.loginCount = { increment: 1 }
        updates.isOnline = true
        break
      case 'logout':
        updates.logoutCount = { increment: 1 }
        updates.isOnline = false
        break
      case 'page_view':
        updates.pageViewCount = { increment: 1 }
        updates.isOnline = true
        break
      default:
        updates.apiCallCount = { increment: 1 }
        updates.isOnline = true
    }

    // Calcular tempo online (simplificado)
    if (data.duration && data.duration > 0) {
      updates.totalTimeToday = { increment: Math.round(data.duration / 60) } // converter para minutos
    }

    await prisma.userMonitoring.update({
      where: { id: monitoring.id },
      data: updates
    })

  } catch (error) {
    console.error('Erro ao atualizar monitoramento:', error)
  }
}

// Função para calcular estatísticas agregadas
export async function calculateAggregatedStats(userId: string) {
  try {
    const now = new Date()
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)

    // Buscar dados da semana
    const weekData = await prisma.userMonitoring.findMany({
      where: {
        userId,
        date: { gte: startOfWeek }
      }
    })

    // Buscar dados do mês
    const monthData = await prisma.userMonitoring.findMany({
      where: {
        userId,
        date: { gte: startOfMonth }
      }
    })

    // Buscar dados do trimestre
    const quarterData = await prisma.userMonitoring.findMany({
      where: {
        userId,
        date: { gte: startOfQuarter }
      }
    })

    // Calcular totais
    const totalTimeThisWeek = weekData.reduce((sum, record) => sum + record.totalTimeToday, 0)
    const totalTimeThisMonth = monthData.reduce((sum, record) => sum + record.totalTimeToday, 0)
    const totalTimeThisQuarter = quarterData.reduce((sum, record) => sum + record.totalTimeToday, 0)

    // Atualizar registros com totais calculados
    await prisma.userMonitoring.updateMany({
      where: {
        userId,
        date: { gte: startOfWeek }
      },
      data: {
        totalTimeThisWeek,
        totalTimeThisMonth,
        totalTimeThisQuarter
      }
    })

  } catch (error) {
    console.error('Erro ao calcular estatísticas agregadas:', error)
  }
}
