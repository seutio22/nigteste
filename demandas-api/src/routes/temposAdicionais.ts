import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { requireJwt } from '../lib/authIdentity'

const STATUS_REVISAO = new Set(['aprovado', 'rejeitado'])
const MAX_ADICIONAL_SECONDS = 1000 * 3600

function isAdmin(request: any): boolean {
  return String(request?.authUser?.role || '').toLowerCase() === 'admin'
}

async function actorName(prisma: PrismaClient, request: any): Promise<string | null> {
  const fromToken = request?.authUser?.name
  if (fromToken) return String(fromToken)
  const id = request?.authUser?.id
  if (!id) return null
  const u = await prisma.user.findUnique({ where: { id }, select: { name: true } })
  return u?.name ?? null
}

function text(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : ''
}

export default async function temposAdicionaisRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options

  fastify.get('/tempos-adicionais', { preHandler: requireJwt }, async (request, reply) => {
    try {
      const q = request.query as { pageKey?: string; entityId?: string; status?: string }
      const where: Record<string, string> = {}
      if (q.pageKey) where.pageKey = q.pageKey
      if (q.entityId) where.entityId = q.entityId
      if (q.status) where.status = q.status
      return await prisma.tempoAdicional.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5000,
      })
    } catch (error) {
      console.error('GET /tempos-adicionais:', error)
      return reply.status(500).send({ error: 'Erro ao listar tempos adicionais' })
    }
  })

  fastify.post('/tempos-adicionais', { preHandler: requireJwt }, async (request: any, reply) => {
    try {
      const body = (request.body ?? {}) as Record<string, unknown>
      const pageKey = text(body.pageKey)
      const entityId = text(body.entityId)
      const motivo = text(body.motivo)
      const justificativa = text(body.justificativa)
      const adicionalSeconds = Math.round(Number(body.adicionalSeconds))
      const tempoPrevistoSeconds = Math.max(0, Math.round(Number(body.tempoPrevistoSeconds) || 0))

      if (!pageKey || !entityId) {
        return reply.status(400).send({ error: 'Chamado não informado' })
      }
      if (!Number.isFinite(adicionalSeconds) || adicionalSeconds <= 0 || adicionalSeconds > MAX_ADICIONAL_SECONDS) {
        return reply.status(400).send({ error: 'Informe um tempo adicional válido' })
      }
      if (!motivo) return reply.status(400).send({ error: 'Selecione o motivo' })
      if (justificativa.length < 10) {
        return reply.status(400).send({ error: 'Descreva a justificativa (mínimo 10 caracteres)' })
      }

      const created = await prisma.tempoAdicional.create({
        data: {
          pageKey,
          entityId,
          ticket: text(body.ticket) || null,
          analistaId: text(body.analistaId) || null,
          regraProdutividadeId: text(body.regraProdutividadeId) || null,
          tempoPrevistoSeconds,
          adicionalSeconds,
          motivo,
          justificativa,
          userId: request.authUser?.id ?? null,
          userNome: await actorName(prisma, request),
        },
      })
      return reply.status(201).send(created)
    } catch (error) {
      console.error('POST /tempos-adicionais:', error)
      return reply.status(500).send({ error: 'Erro ao registrar tempo adicional' })
    }
  })

  fastify.patch('/tempos-adicionais/:id/revisao', { preHandler: requireJwt }, async (request: any, reply) => {
    try {
      if (!isAdmin(request)) {
        return reply.status(403).send({ error: 'Somente administradores podem revisar tempos adicionais' })
      }
      const { id } = request.params as { id: string }
      const body = (request.body ?? {}) as Record<string, unknown>
      const status = text(body.status)
      if (!STATUS_REVISAO.has(status)) {
        return reply.status(400).send({ error: 'Status de revisão inválido' })
      }
      const exists = await prisma.tempoAdicional.findUnique({ where: { id } })
      if (!exists) return reply.status(404).send({ error: 'Lançamento não encontrado' })

      return await prisma.tempoAdicional.update({
        where: { id },
        data: {
          status,
          comentarioRevisao: text(body.comentario) || null,
          revisorId: request.authUser?.id ?? null,
          revisorNome: await actorName(prisma, request),
          revisadoEm: new Date(),
        },
      })
    } catch (error) {
      console.error('PATCH /tempos-adicionais/:id/revisao:', error)
      return reply.status(500).send({ error: 'Erro ao revisar tempo adicional' })
    }
  })

  fastify.delete('/tempos-adicionais/:id', { preHandler: requireJwt }, async (request: any, reply) => {
    try {
      const { id } = request.params as { id: string }
      const row = await prisma.tempoAdicional.findUnique({ where: { id } })
      if (!row) return reply.status(404).send({ error: 'Lançamento não encontrado' })
      const isAuthor = row.userId && row.userId === request.authUser?.id
      if (!isAdmin(request) && !(isAuthor && row.status === 'pendente')) {
        return reply
          .status(403)
          .send({ error: 'Só o autor (enquanto pendente) ou um administrador pode excluir' })
      }
      await prisma.tempoAdicional.delete({ where: { id } })
      return reply.status(204).send()
    } catch (error) {
      console.error('DELETE /tempos-adicionais/:id:', error)
      return reply.status(500).send({ error: 'Erro ao excluir tempo adicional' })
    }
  })
}
