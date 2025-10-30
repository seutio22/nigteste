import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'

interface SoftDeleteOptions {
  entityType: string
  reason?: string
}

export async function softDeleteMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  options: SoftDeleteOptions
) {
  try {
    const user = (request as any).authenticatedUser
    
    if (!user) {
      return reply.status(401).send({ error: 'Usuário não autenticado' })
    }

    const { id } = request.params as { id: string }
    
    if (!id) {
      return reply.status(400).send({ error: 'ID não fornecido' })
    }

    // Verificar se o item existe
    let existingItem = null
    switch (options.entityType) {
      case 'demanda':
        existingItem = await prisma.demanda.findUnique({ where: { id } })
        break
      case 'manutencao':
        existingItem = await prisma.manutencao.findUnique({ where: { id } })
        break
      case 'analytics':
        existingItem = await prisma.report.findUnique({ where: { id } })
        break
      case 'atendimento':
        existingItem = await prisma.atendimento.findUnique({ where: { id } })
        break
      case 'validacao':
        existingItem = await prisma.validacao.findUnique({ where: { id } })
        break
      case 'reajuste':
        existingItem = await prisma.reajuste.findUnique({ where: { id } })
        break
      default:
        return reply.status(400).send({ error: 'Tipo de entidade não suportado' })
    }

    if (!existingItem) {
      return reply.status(404).send({ error: 'Item não encontrado' })
    }

    // Verificar se já foi excluído
    const existingLog = await prisma.deletionLog.findFirst({
      where: {
        entityType: options.entityType,
        entityId: id
      }
    })

    if (existingLog) {
      return reply.status(400).send({ error: 'Item já foi excluído' })
    }

    // Criar log de exclusão (Soft Delete)
    await prisma.deletionLog.create({
      data: {
        entityType: options.entityType,
        entityId: id,
        deletedBy: user.id,
        reason: options.reason || null
      }
    })

    // Retornar sucesso (item "excluído" mas dados preservados)
    return reply.send({ 
      success: true, 
      message: 'Item excluído com sucesso',
      deletedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erro no middleware de soft delete:', error)
    return reply.status(500).send({ error: 'Erro interno do servidor' })
  }
}

// Função auxiliar para aplicar soft delete em rotas específicas
export function createSoftDeleteRoute(
  fastify: any,
  entityType: string,
  reason?: string
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    return softDeleteMiddleware(request, reply, { entityType, reason })
  }
}
