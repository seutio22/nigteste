import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

export default async function projectAlertsRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options

  // Listar alertas do projeto
  fastify.get('/projetos/:projectId/alerts', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })
      if (!project) {
        return reply.status(404).send({ error: 'Projeto não encontrado' })
      }

      const alerts = await prisma.projectAlert.findMany({
        where: { projectId },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      })

      return reply.send(alerts)
    } catch (error) {
      console.error('Erro ao listar alertas:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Criar alerta
  fastify.post('/projetos/:projectId/alerts', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const { userId, responsavelNome, diasAntes, targetType, targetId } = request.body as {
        userId: string
        responsavelNome?: string
        diasAntes?: number
        targetType?: string
        targetId?: string
      }

      if (!userId) {
        return reply.status(400).send({ error: 'userId é obrigatório' })
      }

      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })
      if (!project) {
        return reply.status(404).send({ error: 'Projeto não encontrado' })
      }

      // Verificar se o usuário tem acesso ao projeto (membro, manager ou owner)
      const isMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId, userId }
        }
      })
      const isManager = project.managerId === userId
      const isOwner = project.ownerId === userId

      if (!isMember && !isManager && !isOwner) {
        return reply.status(400).send({
          error: 'O usuário selecionado deve ter acesso ao projeto. Adicione-o como membro da equipe primeiro.'
        })
      }

      const validDias = [1, 3, 7, 15]
      const dias = diasAntes && validDias.includes(diasAntes) ? diasAntes : 1
      const respNome = (responsavelNome || '').trim()
      const tType = (targetType || '').trim().toLowerCase()
      const tId = (targetId || '').trim()
      const finalTargetType = ['project', 'responsible', 'task', 'subtask'].includes(tType) ? tType : (respNome ? 'responsible' : 'project')
      const finalTargetId = (finalTargetType === 'task' || finalTargetType === 'subtask') ? tId : ''

      const alert = await prisma.projectAlert.create({
        data: {
          projectId,
          userId,
          responsavelNome: respNome,
          targetType: finalTargetType,
          targetId: finalTargetId,
          diasAntes: dias,
          enabled: true
        },
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      return reply.status(201).send(alert)
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return reply.status(400).send({
          error: 'Já existe um alerta idêntico para este usuário e escopo neste projeto.'
        })
      }
      console.error('Erro ao criar alerta:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Atualizar alerta
  fastify.put('/projetos/:projectId/alerts/:alertId', async (request, reply) => {
    try {
      const { projectId, alertId } = request.params as { projectId: string; alertId: string }
      const { diasAntes, enabled } = request.body as { diasAntes?: number; enabled?: boolean }

      const alert = await prisma.projectAlert.findFirst({
        where: { id: alertId, projectId }
      })
      if (!alert) {
        return reply.status(404).send({ error: 'Alerta não encontrado' })
      }

      const updates: any = {}
      if (diasAntes !== undefined) {
        const validDias = [1, 3, 7, 15]
        updates.diasAntes = validDias.includes(diasAntes) ? diasAntes : alert.diasAntes
      }
      if (enabled !== undefined) updates.enabled = enabled

      const updated = await prisma.projectAlert.update({
        where: { id: alertId },
        data: updates,
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      })

      return reply.send(updated)
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Remover alerta
  fastify.delete('/projetos/:projectId/alerts/:alertId', async (request, reply) => {
    try {
      const { projectId, alertId } = request.params as { projectId: string; alertId: string }

      const alert = await prisma.projectAlert.findFirst({
        where: { id: alertId, projectId }
      })
      if (!alert) {
        return reply.status(404).send({ error: 'Alerta não encontrado' })
      }

      await prisma.projectAlert.delete({
        where: { id: alertId }
      })

      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao remover alerta:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Notificações de previsão de entrega (para o usuário logado)
  fastify.get('/notifications/project-deadlines', async (request, reply) => {
    try {
      const req = request as any
      let userId: string | null = null
      try {
        await req.jwtVerify?.()
        userId = req.user?.id ?? req.user?.sub ?? null
      } catch {
        const auth = req?.headers?.authorization
        if (auth?.startsWith('Bearer ')) {
          const token = auth.slice(7)
          const parts = token.split('.')
          if (parts.length >= 2) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
            userId = payload?.id ?? payload?.userId ?? payload?.sub ?? null
          }
        }
      }

      if (!userId) {
        return reply.status(401).send({ error: 'Não autenticado' })
      }

      const alerts = await prisma.projectAlert.findMany({
        where: { userId, enabled: true },
        include: {
          project: {
            select: { id: true, name: true, endDate: true, timeline: true }
          }
        }
      })

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const notifications: any[] = []

      for (const alert of alerts) {
        const project = alert.project as any
        const timeline = typeof project.timeline === 'string' ? JSON.parse(project.timeline || '{}') : (project.timeline || {})
        const phases = timeline?.phases || []
        const targetType = (alert.targetType || '').trim() || (alert.responsavelNome ? 'responsible' : 'project')
        const targetId = (alert.targetId || '').trim()

        // Alerta do projeto - data de fim do projeto
        if (targetType === 'project') {
          const endDate = new Date(project.endDate)
          endDate.setHours(0, 0, 0, 0)
          const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
          if (diffDays >= 0 && diffDays <= alert.diasAntes) {
            const msg = diffDays === 0
              ? `O projeto "${project.name}" vence hoje!`
              : diffDays === 1
                ? `O projeto "${project.name}" vence amanhã.`
                : `O projeto "${project.name}" vence em ${diffDays} dias (${endDate.toLocaleDateString('pt-BR')}).`
            notifications.push({
              titulo: 'Previsão de entrega - Projeto',
              mensagem: msg,
              tipo: 'sistema',
              prioridade: diffDays <= 1 ? 'urgente' : 'alta',
              dados: { projectId: project.id, projectName: project.name, endDate: project.endDate, diasRestantes: diffDays },
              link: `/projetos/${project.id}`
            })
          }
        } else if (targetType === 'task' && targetId) {
          // Alerta para tarefa específica
          for (const phase of phases) {
            const tasks = phase.tasks || []
            const task = tasks.find((t: any) => String(t.id) === String(targetId))
            if (!task) continue
            const plannedDate = task.plannedEndDate || task.plannedDate
            if (!plannedDate) continue
            const dueDate = new Date(plannedDate)
            dueDate.setHours(0, 0, 0, 0)
            const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
            if (diffDays >= 0 && diffDays <= alert.diasAntes) {
              const taskName = task.name || task.title || 'Tarefa'
              const phaseName = phase.name || 'Fase'
              const msg = diffDays === 0
                ? `A tarefa "${taskName}" (${phaseName}) vence hoje!`
                : diffDays === 1
                  ? `A tarefa "${taskName}" (${phaseName}) vence amanhã.`
                  : `A tarefa "${taskName}" (${phaseName}) vence em ${diffDays} dias (${dueDate.toLocaleDateString('pt-BR')}).`
              notifications.push({
                titulo: 'Previsão de entrega - Tarefa',
                mensagem: msg,
                tipo: 'sistema',
                prioridade: diffDays <= 1 ? 'urgente' : 'alta',
                dados: { projectId: project.id, projectName: project.name, taskId: task.id, taskName, phaseName, plannedDate, diasRestantes: diffDays },
                link: `/projetos/${project.id}`
              })
            }
            break
          }
        } else if (targetType === 'subtask' && targetId) {
          // Alerta para subtarefa específica
          for (const phase of phases) {
            const tasks = phase.tasks || []
            for (const task of tasks) {
              const subtasks = task.subtasks || []
              const subtask = subtasks.find((s: any) => String(s.id) === String(targetId))
              if (!subtask) continue
              const plannedDate = subtask.plannedEndDate || subtask.plannedDate
              if (!plannedDate) continue
              const dueDate = new Date(plannedDate)
              dueDate.setHours(0, 0, 0, 0)
              const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
              if (diffDays >= 0 && diffDays <= alert.diasAntes) {
                const subtaskName = subtask.name || subtask.title || 'Subtarefa'
                const taskName = task.name || task.title || 'Tarefa'
                const phaseName = phase.name || 'Fase'
                const msg = diffDays === 0
                  ? `A subtarefa "${subtaskName}" (${taskName}) vence hoje!`
                  : diffDays === 1
                    ? `A subtarefa "${subtaskName}" (${taskName}) vence amanhã.`
                    : `A subtarefa "${subtaskName}" (${taskName}) vence em ${diffDays} dias (${dueDate.toLocaleDateString('pt-BR')}).`
              notifications.push({
                titulo: 'Previsão de entrega - Subtarefa',
                  mensagem: msg,
                  tipo: 'sistema',
                  prioridade: diffDays <= 1 ? 'urgente' : 'alta',
                  dados: { projectId: project.id, projectName: project.name, taskId: task.id, taskName, subtaskId: subtask.id, subtaskName, phaseName, plannedDate, diasRestantes: diffDays },
                  link: `/projetos/${project.id}`
                })
              }
              break
            }
          }
        } else {
          // Alerta por responsável - tarefas do cronograma
          const respNome = alert.responsavelNome.trim().toLowerCase()
          for (const phase of phases) {
            const tasks = phase.tasks || []
            for (const task of tasks) {
              const resp = (task.responsible || task.assignee || '')
              const respStr = typeof resp === 'object' ? (resp?.nome || resp?.name || '') : String(resp)
              if (!respStr.trim()) continue
              if (respStr.trim().toLowerCase() !== respNome) continue

              const plannedDate = task.plannedEndDate || task.plannedDate
              if (!plannedDate) continue

              const dueDate = new Date(plannedDate)
              dueDate.setHours(0, 0, 0, 0)
              const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))

              if (diffDays >= 0 && diffDays <= alert.diasAntes) {
                const taskName = task.name || task.title || 'Tarefa'
                const phaseName = phase.name || 'Fase'
                const msg = diffDays === 0
                  ? `A tarefa "${taskName}" (${phaseName}) vence hoje!`
                  : diffDays === 1
                    ? `A tarefa "${taskName}" (${phaseName}) vence amanhã.`
                    : `A tarefa "${taskName}" (${phaseName}) vence em ${diffDays} dias (${dueDate.toLocaleDateString('pt-BR')}).`
                notifications.push({
                  titulo: 'Previsão de entrega - Tarefa',
                  mensagem: msg,
                  tipo: 'sistema',
                  prioridade: diffDays <= 1 ? 'urgente' : 'alta',
                  dados: {
                    projectId: project.id,
                    projectName: project.name,
                    taskId: task.id,
                    taskName,
                    phaseName,
                    plannedDate: plannedDate,
                    diasRestantes: diffDays
                  },
                  link: `/projetos/${project.id}`
                })
              }
            }
          }
        }
      }

      return reply.send({
        notifications,
        count: notifications.length
      })
    } catch (error) {
      console.error('Erro ao buscar notificações de projeto:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
