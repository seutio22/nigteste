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
        String((request as any).authUser?.id || (request as any).user?.sub || '').trim() ||
        'system'

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
      const accessLog = await prisma.placementCotacaoShareAccessLog.create({
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
          accessLogId: accessLog.id,
        },
        cotacao: shareToken.cotacao,
        operadoras,
      }
    } catch (error) {
      console.error('Erro ao abrir share Placement:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.post('/share/placement/:token/access/end', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }
      const body = (request.body ?? {}) as { accessLogId?: string; durationSeconds?: number }

      const accessLogId = String(body.accessLogId || '').trim()
      const durationSeconds =
        typeof body.durationSeconds === 'number' && Number.isFinite(body.durationSeconds)
          ? Math.floor(body.durationSeconds)
          : NaN

      if (!accessLogId || !Number.isFinite(durationSeconds) || durationSeconds < 0) {
        return reply.status(400).send({ error: 'accessLogId e durationSeconds são obrigatórios' })
      }

      const shareToken = await prisma.placementCotacaoShareToken.findFirst({
        where: { token, isActive: true },
        select: { id: true, expiresAt: true },
      })
      if (!shareToken) {
        return reply.status(404).send({ error: 'Link inválido ou desativado' })
      }
      if (shareToken.expiresAt && shareToken.expiresAt.getTime() < Date.now()) {
        return reply.status(410).send({ error: 'Link expirado' })
      }

      const log = await prisma.placementCotacaoShareAccessLog.findFirst({
        where: { id: accessLogId, shareTokenId: shareToken.id },
      })
      if (!log) {
        return reply.status(404).send({ error: 'Registro de acesso não encontrado' })
      }

      const nextDuration = Math.max(log.durationSeconds ?? 0, durationSeconds)
      await prisma.placementCotacaoShareAccessLog.update({
        where: { id: log.id },
        data: { durationSeconds: nextDuration },
      })

      return { success: true, durationSeconds: nextDuration }
    } catch (error) {
      console.error('Erro ao encerrar acesso share Placement:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.post('/share/placement/:token/access/events', async (request, reply) => {
    try {
      const { token } = request.params as { token: string }
      const body = (request.body ?? {}) as {
        accessLogId?: string
        events?: Array<{
          at?: string
          t?: number
          kind?: string
          label?: string
          pane?: string
        }>
      }

      const accessLogId = String(body.accessLogId || '').trim()
      const incoming = Array.isArray(body.events) ? body.events : []
      if (!accessLogId || incoming.length === 0) {
        return reply.status(400).send({ error: 'accessLogId e events são obrigatórios' })
      }

      const shareToken = await prisma.placementCotacaoShareToken.findFirst({
        where: { token, isActive: true },
        select: { id: true, expiresAt: true },
      })
      if (!shareToken) {
        return reply.status(404).send({ error: 'Link inválido ou desativado' })
      }
      if (shareToken.expiresAt && shareToken.expiresAt.getTime() < Date.now()) {
        return reply.status(410).send({ error: 'Link expirado' })
      }

      const log = await prisma.placementCotacaoShareAccessLog.findFirst({
        where: { id: accessLogId, shareTokenId: shareToken.id },
        select: { id: true, clickEvents: true },
      })
      if (!log) {
        return reply.status(404).send({ error: 'Registro de acesso não encontrado' })
      }

      const existing = Array.isArray(log.clickEvents) ? log.clickEvents : []
      const sanitized = incoming
        .slice(0, 80)
        .map((ev) => {
          const kind = ev.kind === 'pane' ? 'pane' : 'click'
          const label = String(ev.label || '').trim().slice(0, 160)
          if (!label) return null
          const t =
            typeof ev.t === 'number' && Number.isFinite(ev.t) ? Math.max(0, Math.floor(ev.t)) : 0
          const pane = ev.pane ? String(ev.pane).trim().slice(0, 64) : undefined
          return {
            at: typeof ev.at === 'string' ? ev.at : new Date().toISOString(),
            t,
            kind,
            label,
            ...(pane ? { pane } : {}),
          }
        })
        .filter((ev): ev is NonNullable<typeof ev> => ev != null)

      const merged = [...existing, ...sanitized].slice(-200)
      await prisma.placementCotacaoShareAccessLog.update({
        where: { id: log.id },
        data: { clickEvents: merged },
      })

      return { success: true, count: merged.length }
    } catch (error) {
      console.error('Erro ao registrar cliques share Placement:', error)
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
