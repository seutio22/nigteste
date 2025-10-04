import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
const crypto = require('crypto');

export default async function shareRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // Gerar token de compartilhamento
  fastify.post('/projetos/:projectId/share', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string };
      const { name, description, allowedViews, expiresAt } = request.body as {
        name?: string;
        description?: string;
        allowedViews?: string;
        expiresAt?: string;
      };

      // Verificar se o projeto existe
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return reply.status(404).send({ error: 'Projeto não encontrado' });
      }

      // Gerar token único
      const token = crypto.randomBytes(32).toString('hex');
      
      // Criar token de compartilhamento
      const shareToken = await prisma.projectShareToken.create({
        data: {
          projectId,
          token,
          name: name || `Compartilhamento ${new Date().toLocaleDateString('pt-BR')}`,
          description,
          allowedViews: allowedViews || 'overview,timeline,team,resources',
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy: 'system' // TODO: Pegar do usuário logado
        }
      });

      return {
        success: true,
        token: shareToken.token,
        shareUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/share/${shareToken.token}`,
        shareToken
      };
    } catch (error) {
      console.error('Erro ao gerar token de compartilhamento:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Listar tokens de compartilhamento de um projeto
  fastify.get('/projetos/:projectId/share', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string };

      const shareTokens = await prisma.projectShareToken.findMany({
        where: { 
          projectId,
          isActive: true
        },
        orderBy: { createdAt: 'desc' }
      });

      return { shareTokens };
    } catch (error) {
      console.error('Erro ao listar tokens de compartilhamento:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Desativar token de compartilhamento
  fastify.delete('/projetos/:projectId/share/:tokenId', async (request, reply) => {
    try {
      const { tokenId } = request.params as { tokenId: string };

      await prisma.projectShareToken.update({
        where: { id: tokenId },
        data: { isActive: false }
      });

      return { success: true, message: 'Token desativado com sucesso' };
    } catch (error) {
      console.error('Erro ao desativar token:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Acessar projeto via token público
  fastify.get('/share/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };

      // Buscar token de compartilhamento
      const shareToken = await prisma.projectShareToken.findFirst({
        where: { 
          token,
          isActive: true
        },
        include: {
          project: {
            include: {
              client: true,
              manager: true,
              members: {
                include: {
                  user: true
                }
              },
              externalMembers: true,
              tasks: {
                include: {
                  assignee: true,
                  subtaskItems: true
                }
              },
              milestones: true,
              timelines: true
            }
          }
        }
      });

      if (!shareToken) {
        return reply.status(404).send({ error: 'Link de compartilhamento inválido ou expirado' });
      }

      // Verificar se expirou
      if (shareToken.expiresAt && shareToken.expiresAt < new Date()) {
        return reply.status(410).send({ error: 'Link de compartilhamento expirado' });
      }

      // Atualizar contadores
      await prisma.projectShareToken.update({
        where: { id: shareToken.id },
        data: {
          viewCount: { increment: 1 },
          lastViewAt: new Date()
        }
      });

      // Processar timeline se for string
      let processedProject = { ...shareToken.project };
      if (processedProject.timeline && typeof processedProject.timeline === 'string') {
        try {
          processedProject.timeline = JSON.parse(processedProject.timeline);
        } catch (e) {
          processedProject.timeline = JSON.stringify({ phases: [] });
        }
      }

      return {
        project: processedProject,
        allowedViews: shareToken.allowedViews.split(','),
        shareInfo: {
          name: shareToken.name,
          description: shareToken.description,
          createdAt: shareToken.createdAt
        }
      };
    } catch (error) {
      console.error('Erro ao acessar projeto compartilhado:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}
