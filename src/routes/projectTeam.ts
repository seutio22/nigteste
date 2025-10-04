import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'

export default async function projectTeamRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options

  // Adicionar membro interno (usuário do sistema)
  fastify.post('/projetos/:projectId/members', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const { userId, role, permissions, notes } = request.body as any

      // Verificar se o projeto existe
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })

      if (!project) {
        return reply.status(404).send({ error: 'Projeto não encontrado' })
      }

      // Verificar se o usuário existe
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' })
      }

      // Verificar se já é membro
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId
          }
        }
      })

      if (existingMember) {
        return reply.status(400).send({ error: 'Usuário já é membro deste projeto' })
      }

      // Criar membro
      const member = await prisma.projectMember.create({
        data: {
          projectId,
          userId,
          role,
          permissions: permissions ? JSON.stringify(permissions) : null,
          notes
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      })

      return reply.status(201).send(member)
    } catch (error) {
      console.error('Erro ao adicionar membro:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Adicionar membro externo
  fastify.post('/projetos/:projectId/external-members', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }
      const { name, email, phone, company, role, accessLevel, notes } = request.body as any

      // Verificar se o projeto existe
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      })

      if (!project) {
        return reply.status(404).send({ error: 'Projeto não encontrado' })
      }

      // Criar membro externo
      const externalMember = await prisma.projectExternalMember.create({
        data: {
          projectId,
          name,
          email,
          phone,
          company,
          role,
          accessLevel: accessLevel || 'view',
          notes
        }
      })

      return reply.status(201).send(externalMember)
    } catch (error) {
      console.error('Erro ao adicionar membro externo:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Listar membros da equipe
  fastify.get('/projetos/:projectId/members', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }

      const members = await prisma.projectMember.findMany({
        where: { 
          projectId,
          isActive: true
        },
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
        orderBy: { createdAt: 'asc' }
      })

      const externalMembers = await prisma.projectExternalMember.findMany({
        where: { 
          projectId,
          isActive: true
        },
        orderBy: { createdAt: 'asc' }
      })

      return reply.send({
        internal: members,
        external: externalMembers
      })
    } catch (error) {
      console.error('Erro ao listar membros:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Atualizar membro
  fastify.put('/projetos/:projectId/members/:memberId', async (request, reply) => {
    try {
      const { projectId, memberId } = request.params as { projectId: string, memberId: string }
      const { role, permissions, notes, isActive } = request.body as any

      const member = await prisma.projectMember.update({
        where: { id: memberId },
        data: {
          role,
          permissions: permissions ? JSON.stringify(permissions) : null,
          notes,
          isActive
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      })

      return reply.send(member)
    } catch (error) {
      console.error('Erro ao atualizar membro:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Atualizar membro externo
  fastify.put('/projetos/:projectId/external-members/:memberId', async (request, reply) => {
    try {
      const { projectId, memberId } = request.params as { projectId: string, memberId: string }
      const { name, email, phone, company, role, accessLevel, notes, isActive } = request.body as any

      const externalMember = await prisma.projectExternalMember.update({
        where: { id: memberId },
        data: {
          name,
          email,
          phone,
          company,
          role,
          accessLevel,
          notes,
          isActive
        }
      })

      return reply.send(externalMember)
    } catch (error) {
      console.error('Erro ao atualizar membro externo:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Remover membro
  fastify.delete('/projetos/:projectId/members/:memberId', async (request, reply) => {
    try {
      const { memberId } = request.params as { memberId: string }

      await prisma.projectMember.delete({
        where: { id: memberId }
      })

      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao remover membro:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Remover membro externo
  fastify.delete('/projetos/:projectId/external-members/:memberId', async (request, reply) => {
    try {
      const { memberId } = request.params as { memberId: string }

      await prisma.projectExternalMember.delete({
        where: { id: memberId }
      })

      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao remover membro externo:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Buscar usuários disponíveis para adicionar ao projeto
  fastify.get('/projetos/:projectId/available-users', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string }

      // Buscar usuários que não são membros deste projeto
      const existingMembers = await prisma.projectMember.findMany({
        where: { projectId },
        select: { userId: true }
      })

      const existingUserIds = existingMembers.map(m => m.userId)

      const availableUsers = await prisma.user.findMany({
        where: {
          id: { notIn: existingUserIds },
          active: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        },
        orderBy: { name: 'asc' }
      })

      return reply.send(availableUsers)
    } catch (error) {
      console.error('Erro ao buscar usuários disponíveis:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
