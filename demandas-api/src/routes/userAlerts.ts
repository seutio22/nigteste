import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

function getUserId(req: FastifyRequest): string | null {
  const r = req as any
  if (r.authUser?.id) return r.authUser.id
  try {
    const user = r.user
    if (user?.id) return user.id
    if (user?.sub) return user.sub
  } catch {}
  return null
}

function getUserRole(req: FastifyRequest): string | null {
  const r = req as any
  if (r.authUser?.role) return r.authUser.role
  try {
    const user = r.user
    if (user?.role) return user.role
  } catch {}
  return null
}

export async function userAlertsRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const prisma = options.prisma

  // GET /user-alerts - Listar alertas para o usuário logado (no dia de exibição ou antes)
  app.get('/user-alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(req)
      if (!userId) return reply.status(401).send({ error: 'Não autenticado' })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const endOfToday = new Date(today)
      endOfToday.setHours(23, 59, 59, 999)

      const allAlertas = await prisma.alertaUsuario.findMany({
        where: { dataExibicao: { lte: endOfToday } },
        include: {
          visualizacoes: {
            where: { usuarioId: userId },
            select: { id: true, dataVisualizacao: true }
          }
        },
        orderBy: { dataExibicao: 'desc' }
      })

      const alertas = allAlertas.filter((a) => {
        try {
          const ids = JSON.parse(a.targetUserIds || '[]') as string[]
          if (ids.length === 0) return true
          return ids.includes(userId)
        } catch {
          return true
        }
      })

      const notifications = alertas.map((a) => {
        const viewed = a.visualizacoes?.length > 0
        return {
          id: a.id,
          titulo: a.titulo,
          mensagem: a.mensagem,
          tipo: 'alerta' as const,
          prioridade: a.prioridade,
          lida: viewed,
          dataCriacao: a.createdAt.toISOString(),
          dataExibicao: a.dataExibicao.toISOString(),
          dados: {
            alertaId: a.id,
            autor: a.autorNome,
            autorId: a.autorId
          }
        }
      })

      return reply.send({ notifications, count: notifications.length })
    } catch (e) {
      console.error('Erro GET /user-alerts:', e)
      return reply.status(500).send({ error: 'Erro interno' })
    }
  })

  // POST /user-alerts/:id/view - Marcar alerta como visualizado
  app.post('/user-alerts/:id/view', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(req)
      if (!userId) return reply.status(401).send({ error: 'Não autenticado' })

      const { id } = req.params as { id: string }
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
      const userNome = user?.name || 'Usuário'

      const existing = await prisma.alertaUsuarioVisualizacao.findFirst({
        where: { alertaId: id, usuarioId: userId }
      })
      if (existing) return reply.send({ ok: true, alreadyViewed: true })

      await prisma.alertaUsuarioVisualizacao.create({
        data: {
          alertaId: id,
          usuarioId: userId,
          usuarioNome: userNome
        }
      })

      return reply.send({ ok: true })
    } catch (e) {
      console.error('Erro POST /user-alerts/:id/view:', e)
      return reply.status(500).send({ error: 'Erro interno' })
    }
  })

  // GET /user-alerts/available-users - Listar usuários para seleção de destinatários (admin/gerente)
  app.get('/user-alerts/available-users', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(req)
      if (!userId) return reply.status(401).send({ error: 'Não autenticado' })

      const role = getUserRole(req)
      if (!['admin', 'gerente'].includes(role || '')) {
        return reply.status(403).send({ error: 'Apenas admin ou gerente podem criar alertas' })
      }

      const users = await prisma.user.findMany({
        where: { active: true },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
      })

      return reply.send(
        users.map((u) => ({ id: u.id, name: u.name || u.email || 'Sem nome' }))
      )
    } catch (e) {
      console.error('Erro GET /user-alerts/available-users:', e)
      return reply.status(500).send({ error: 'Erro interno' })
    }
  })

  // POST /user-alerts - Criar alerta (admin/gerente)
  app.post('/user-alerts', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(req)
      if (!userId) return reply.status(401).send({ error: 'Não autenticado' })

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, role: true } })
      if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })
      const allowedRoles = ['admin', 'gerente']
      if (!allowedRoles.includes(user.role || '')) {
        return reply.status(403).send({ error: 'Apenas admin ou gerente podem criar alertas' })
      }

      const body = req.body as {
        titulo: string
        mensagem: string
        prioridade?: string
        dataExibicao: string
        targetUserIds?: string[]
      }

      if (!body.titulo?.trim()) return reply.status(400).send({ error: 'Título é obrigatório' })
      if (!body.mensagem?.trim()) return reply.status(400).send({ error: 'Mensagem é obrigatória' })
      if (!body.dataExibicao) return reply.status(400).send({ error: 'Data de exibição é obrigatória' })

      const dataExibicao = new Date(body.dataExibicao)
      if (isNaN(dataExibicao.getTime())) return reply.status(400).send({ error: 'Data de exibição inválida' })

      const targetUserIds = Array.isArray(body.targetUserIds) ? body.targetUserIds : []
      const targetJson = JSON.stringify(targetUserIds)

      const alerta = await prisma.alertaUsuario.create({
        data: {
          titulo: body.titulo.trim(),
          mensagem: body.mensagem.trim(),
          prioridade: body.prioridade || 'media',
          dataExibicao,
          autorId: userId,
          autorNome: user.name || 'Usuário',
          targetUserIds: targetJson
        }
      })

      return reply.status(201).send(alerta)
    } catch (e) {
      console.error('Erro POST /user-alerts:', e)
      return reply.status(500).send({ error: 'Erro interno' })
    }
  })

  // GET /user-alerts/managed - Listar alertas criados pelo usuário (para ver quem visualizou)
  app.get('/user-alerts/managed', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(req)
      if (!userId) return reply.status(401).send({ error: 'Não autenticado' })

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      const allowedRoles = ['admin', 'gerente']
      if (!user || !allowedRoles.includes(user.role || '')) {
        return reply.status(403).send({ error: 'Apenas admin ou gerente podem ver alertas criados' })
      }

      const alertas = await prisma.alertaUsuario.findMany({
        where: { autorId: userId },
        include: {
          visualizacoes: {
            orderBy: { dataVisualizacao: 'desc' },
            select: { id: true, usuarioId: true, usuarioNome: true, dataVisualizacao: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      const enriched = alertas.map((a) => {
        let targetIds: string[] = []
        try {
          targetIds = JSON.parse(a.targetUserIds || '[]') as string[]
        } catch {}
        const destinatariosLabel =
          !targetIds || targetIds.length === 0
            ? 'Todos os usuários'
            : `${targetIds.length} destinatário(s)`
        return { ...a, destinatariosLabel }
      })

      return reply.send({ alertas: enriched })
    } catch (e) {
      console.error('Erro GET /user-alerts/managed:', e)
      return reply.status(500).send({ error: 'Erro interno' })
    }
  })

  // DELETE /user-alerts/:id - Remover alerta (apenas autor)
  app.delete('/user-alerts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = getUserId(req)
      if (!userId) return reply.status(401).send({ error: 'Não autenticado' })

      const { id } = req.params as { id: string }
      const alerta = await prisma.alertaUsuario.findUnique({ where: { id } })
      if (!alerta) return reply.status(404).send({ error: 'Alerta não encontrado' })

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
      const isAdmin = user?.role === 'admin'
      if (alerta.autorId !== userId && !isAdmin) {
        return reply.status(403).send({ error: 'Apenas o autor ou admin pode remover' })
      }

      await prisma.alertaUsuario.delete({ where: { id } })
      return reply.status(204).send()
    } catch (e) {
      console.error('Erro DELETE /user-alerts/:id:', e)
      return reply.status(500).send({ error: 'Erro interno' })
    }
  })
}
