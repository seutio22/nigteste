import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { getUserPermissions, hasPermission, ApiModule, ModulePermission } from '../config/permissions'

/**
 * Factory que retorna um preHandler para exigir uma permissão (módulo + ação).
 * Deve ser usado após authenticate (jwtVerify). Carrega o usuário do DB para
 * obter permissions customizadas e aplica a checagem.
 */
export function createRequirePermission(prisma: PrismaClient) {
  return function requirePermission(
    module: ApiModule,
    action: keyof ModulePermission
  ): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
    return async function (request: FastifyRequest, reply: FastifyReply) {
      const req = request as any
      const userId = req.user?.sub ?? req.user?.id
      if (!userId) {
        return reply.code(401).send({ error: 'Não autenticado', message: 'Token inválido ou ausente' }) as any
      }
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { permissions: true, role: true }
        })
        if (!user) {
          return reply.code(401).send({ error: 'Usuário não encontrado' }) as any
        }
        if (user.role === 'admin') {
          return
        }
        const perms = getUserPermissions(user.permissions as string | null, user.role || 'viewer')
        if (hasPermission(perms, module, action)) {
          return
        }
        return reply.code(403).send({
          error: 'Acesso negado',
          message: 'Você não tem permissão para esta ação.'
        }) as any
      } catch (err) {
        request.log.error(err)
        return reply.code(500).send({ error: 'Erro ao verificar permissão' }) as any
      }
    }
  }
}

/**
 * Permite se for o próprio recurso (req.params.id === req.user.sub) ou se tiver a permissão.
 * Útil para GET /users/:id (ver próprio perfil sem precisar de usuarios.view).
 */
export function createRequirePermissionOrSelf(prisma: PrismaClient) {
  const requirePermission = createRequirePermission(prisma)
  return function requirePermissionOrSelf(
    module: ApiModule,
    action: keyof ModulePermission
  ): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
    const check = requirePermission(module, action)
    return async function (request: FastifyRequest, reply: FastifyReply) {
      const req = request as any
      const resourceId = req.params?.id
      const userId = req.user?.sub ?? req.user?.id
      if (userId && resourceId && userId === resourceId) {
        return
      }
      return check(request, reply)
    }
  }
}
