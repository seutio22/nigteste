import { FastifyInstance, FastifyRequest } from 'fastify'
import { PrismaClient } from '@prisma/client'
const crypto = require('crypto')

function getClientIp(request: FastifyRequest): string {
  const xf = request.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length > 0) {
    return xf.split(',')[0].trim()
  }
  const real = request.headers['x-real-ip']
  if (typeof real === 'string' && real.length > 0) {
    return real.trim()
  }
  return request.ip || ''
}

const DEFAULT_ALLOWED =
  'grupo_elegivel,localidades,mercado_quadro,contrato_atual,comparativo_propostas,comparativo_diferenciais'

const cotacaoPublicInclude = {
  analistaResponsavel: { select: { id: true, nome: true } },
  cliente: { select: { id: true, nome: true } },
  prospect: { select: { id: true, razaoSocial: true } },
  condicao: true,
  filial: { select: { id: true, razaoSocial: true } },
} as const

type ActiveShareResult =
  | { ok: false; error: 'not_found' | 'expired' }
  | {
      ok: true
      shareToken: {
        id: string
        cotacaoId: string
        name: string | null
        description: string | null
        allowedViews: string
        viewCount: number
        expiresAt: Date | null
        cotacao: unknown
      }
    }

async function resolveActiveShare(prisma: PrismaClient, token: string): Promise<ActiveShareResult> {
  const shareToken = await prisma.placementCotacaoShareToken.findFirst({
    where: { token, isActive: true },
    include: {
      cotacao: { include: cotacaoPublicInclude },
    },
  })
  if (!shareToken) return { ok: false, error: 'not_found' }
  if (shareToken.expiresAt && shareToken.expiresAt.getTime() < Date.now()) {
    return { ok: false, error: 'expired' }
  }
  return { ok: true, shareToken }
}

export default async function placementShareRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options

  fastify.post('/placement/cotacoes/:cotacaoId/share', async (request, reply) => {
    try {
      const { cotacaoId } = request.params as { cotacaoId: string }
      const body = (request.body ?? {}) as {
        name?: string
        description?: string
        allowedViews?: string
        expiresAt?: string
      }

      const cotacao = await prisma.placementCotacao.findUnique({ where: { id: cotacaoId } })
      if (!cotacao) return reply.status(404).send({ error: 'Cotação não encontrada' })

      const token = crypto.randomBytes(32).toString('hex')
      const createdBy =
        (request.headers['x-user-id'] as string | undefined)?.trim() || 'system'

      const shareToken = await prisma.placementCotacaoShareToken.create({
        data: {
          cotacaoId,
          token,
          name: body.name || `Proposta ${cotacao.ticket} — ${new Date().toLocaleDateString('pt-BR')}`,
          description: body.description,
          allowedViews: body.allowedViews?.trim() || DEFAULT_ALLOWED,
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
          createdBy,
        },
      })

      const origin =
        process.env.FRONTEND_URL ||
        (typeof request.headers.origin === 'string' ? request.headers.origin : null) ||
        'http://localhost:5173'

      return {
        success: true,
        token: shareToken.token,
        shareUrl: `${origin.replace(/\/$/, '')}/share/placement/${shareToken.token}`,
        shareToken,
      }
    } catch (error) {
      console.error('Erro ao gerar share Placement:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.get('/placement/cotacoes/:cotacaoId/share', async (request, reply) => {
    try {
      const { cotacaoId } = request.params as { cotacaoId: string }
      const shareTokens = await prisma.placementCotacaoShareToken.findMany({
        where: { cotacaoId, isActive: true },
        orderBy: { createdAt: 'desc' },
        include: {
          accessLogs: { orderBy: { accessedAt: 'desc' }, take: 30 },
        },
      })
      return { shareTokens }
    } catch (error) {
      console.error('Erro ao listar share Placement:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.delete('/placement/cotacoes/:cotacaoId/share/:tokenId', async (request, reply) => {
    try {
      const { tokenId } = request.params as { tokenId: string }
      await prisma.placementCotacaoShareToken.update({
        where: { id: tokenId },
        data: { isActive: false },
      })
      return { success: true }
    } catch (error) {
      console.error('Erro ao desativar share Placement:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /** Metadados + cotação + operadoras (seed do viewer público). */
  fastify.get('/share/placement/:token', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }
      const resolved = await resolveActiveShare(prisma, token)
      if (resolved.ok === false) {
        if (resolved.error === 'expired') {
          return reply.status(410).send({ error: 'Link expirado' })
        }
        return reply.status(404).send({ error: 'Link inválido ou desativado' })
      }
      const { shareToken } = resolved

      await prisma.placementCotacaoShareToken.update({
        where: { id: shareToken.id },
        data: {
          viewCount: { increment: 1 },
          lastViewAt: new Date(),
        },
      })
      await prisma.placementCotacaoShareAccessLog.create({
        data: {
          shareTokenId: shareToken.id,
          ipAddress: getClientIp(request) || 'unknown',
          userAgent: String(request.headers['user-agent'] ?? '').slice(0, 500) || null,
        },
      })

      const operadoras = await prisma.operadora.findMany({
        select: { id: true, nome: true },
        orderBy: { nome: 'asc' },
      })

      return {
        shareInfo: {
          id: shareToken.id,
          name: shareToken.name,
          description: shareToken.description,
          allowedViews: String(shareToken.allowedViews || DEFAULT_ALLOWED)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          viewCount: shareToken.viewCount + 1,
          expiresAt: shareToken.expiresAt,
        },
        cotacao: shareToken.cotacao,
        operadoras,
      }
    } catch (error) {
      console.error('Erro ao abrir share Placement:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /** Mesmo shape do GET autenticado da cotação — para dashboards via rewrite. */
  fastify.get('/share/placement/:token/cotacao', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }
      const resolved = await resolveActiveShare(prisma, token)
      if (resolved.ok === false) {
        if (resolved.error === 'expired') {
          return reply.status(410).send({ error: 'Link expirado' })
        }
        return reply.status(404).send({ error: 'Link inválido ou desativado' })
      }
      return resolved.shareToken.cotacao
    } catch (error) {
      console.error('Erro share Placement cotacao:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.get('/share/placement/:token/beneficiarios', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }
      const resolved = await resolveActiveShare(prisma, token)
      if (resolved.ok === false) {
        if (resolved.error === 'expired') {
          return reply.status(410).send({ error: 'Link expirado' })
        }
        return reply.status(404).send({ error: 'Link inválido ou desativado' })
      }
      const beneficiarios = await prisma.placementCotacaoBeneficiario.findMany({
        where: { cotacaoId: resolved.shareToken.cotacaoId },
        orderBy: [{ ordem: 'asc' }, { createdAt: 'asc' }],
      })
      return { beneficiarios, total: beneficiarios.length }
    } catch (error) {
      console.error('Erro share Placement beneficiarios:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
