import { FastifyInstance, FastifyRequest } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { charterForShare } from '../lib/projectCharter';
import {
  applyHiddenFields,
  mergeSectionStats,
  parseHiddenFields,
  parseSectionStats,
  parseTrackPayload,
  parseUserAgent
} from '../lib/projectShare';
const crypto = require('crypto');

function getClientIp(request: FastifyRequest): string {
  const xf = request.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim();
  }
  const real = request.headers['x-real-ip'];
  if (typeof real === 'string' && real.length > 0) {
    return real.trim();
  }
  return request.ip || '';
}

export default async function shareRoutes(fastify: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options;

  // Gerar token de compartilhamento
  fastify.post('/projetos/:projectId/share', async (request, reply) => {
    try {
      const { projectId } = request.params as { projectId: string };
      const { name, description, allowedViews, hiddenFields, expiresAt } = request.body as {
        name?: string;
        description?: string;
        allowedViews?: string;
        hiddenFields?: string;
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
          allowedViews: allowedViews || 'overview,timeline,team',
          hiddenFields: parseHiddenFields(hiddenFields).join(','),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          createdBy:
            String((request as any).authUser?.id || (request as any).user?.sub || '').trim() ||
            'system'
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
        orderBy: { createdAt: 'desc' },
        include: {
          accessLogs: {
            orderBy: { accessedAt: 'desc' },
            take: 500,
            select: {
              id: true,
              ipAddress: true,
              accessedAt: true,
              visitorId: true,
              durationSeconds: true,
              clickCount: true,
              sectionStats: true,
              deviceType: true,
              browser: true,
              os: true
            }
          }
        }
      });

      return {
        shareTokens: shareTokens.map((t) => ({
          ...t,
          accessLogs: t.accessLogs.map((log) => ({ ...log, sectionStats: parseSectionStats(log.sectionStats) }))
        }))
      };
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
              client: { select: { id: true, nome: true } },
              manager: { select: { id: true, name: true, email: true } },
              members: {
                include: {
                  user: { select: { id: true, name: true, email: true } }
                }
              },
              externalMembers: true,
              tasks: {
                include: {
                  assignee: { select: { id: true, nome: true } },
                  subtaskItems: true
                }
              },
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

      const ua = request.headers['user-agent'];
      const userAgent =
        typeof ua === 'string' ? ua.slice(0, 2000) : ua != null ? String(ua).slice(0, 2000) : null;
      const { v } = request.query as { v?: string };
      const visitorId = typeof v === 'string' && /^[\w-]{8,64}$/.test(v) ? v : null;

      const [, accessLog] = await prisma.$transaction([
        prisma.projectShareToken.update({
          where: { id: shareToken.id },
          data: {
            viewCount: { increment: 1 },
            lastViewAt: new Date()
          }
        }),
        prisma.projectShareAccessLog.create({
          data: {
            shareTokenId: shareToken.id,
            ipAddress: getClientIp(request) || 'desconhecido',
            userAgent,
            visitorId,
            ...parseUserAgent(userAgent)
          }
        })
      ]);

      // Processar timeline se for string
      let processedProject = { ...shareToken.project };
      if (processedProject.timeline && typeof processedProject.timeline === 'string') {
        try {
          processedProject.timeline = JSON.parse(processedProject.timeline);
        } catch (e) {
          processedProject.timeline = JSON.stringify({ phases: [] });
        }
      }

      const allowedViews = shareToken.allowedViews.split(',');
      const hiddenFields = parseHiddenFields(shareToken.hiddenFields);
      (processedProject as any).charter = charterForShare((processedProject as any).charter, allowedViews);
      delete (processedProject as any).activities;

      return {
        project: applyHiddenFields(processedProject, [...new Set([...hiddenFields, 'orcamento' as const])]),
        allowedViews,
        hiddenFields,
        shareInfo: {
          name: shareToken.name,
          description: shareToken.description,
          createdAt: shareToken.createdAt,
          accessLogId: accessLog.id
        }
      };
    } catch (error) {
      console.error('Erro ao acessar projeto compartilhado:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  // Telemetria do link público: tempo visível, cliques e tempo/cliques por aba (valores acumulados)
  fastify.post('/share/:token/access/track', async (request, reply) => {
    try {
      const { token } = request.params as { token: string };
      const payload = parseTrackPayload(request.body);
      if (!payload) {
        return reply.status(400).send({ error: 'accessLogId é obrigatório' });
      }

      const log = await prisma.projectShareAccessLog.findFirst({
        where: { id: payload.accessLogId, shareToken: { token, isActive: true } },
        select: { id: true, accessedAt: true, durationSeconds: true, clickCount: true, sectionStats: true }
      });
      if (!log) {
        return reply.status(404).send({ error: 'Registro de acesso não encontrado' });
      }
      if (Date.now() - log.accessedAt.getTime() > 24 * 3600 * 1000) {
        return reply.status(410).send({ error: 'Registro de acesso encerrado' });
      }

      const sectionStats = mergeSectionStats(parseSectionStats(log.sectionStats), payload.sections);
      await prisma.projectShareAccessLog.update({
        where: { id: log.id },
        data: {
          durationSeconds: Math.max(log.durationSeconds, payload.durationSeconds),
          clickCount: Math.max(log.clickCount, payload.clicks),
          sectionStats: JSON.stringify(sectionStats)
        }
      });
      return { success: true };
    } catch (error) {
      console.error('Erro ao registrar telemetria do compartilhamento:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}
