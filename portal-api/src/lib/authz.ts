import type { FastifyReply, FastifyRequest } from 'fastify'
import { PortalUserRole, type PortalUser } from '@prisma/client'
import { prisma } from './prisma.js'

export async function loadPortalUser(req: FastifyRequest): Promise<PortalUser | null> {
  const payload = req.user as { sub?: string }
  const id = payload?.sub
  if (!id) return null
  return prisma.portalUser.findUnique({ where: { id } })
}

export async function requirePortalUser(
  req: FastifyRequest,
  reply: FastifyReply
): Promise<PortalUser | null> {
  try {
    await req.jwtVerify()
  } catch {
    reply.code(401).send({ error: 'Não autenticado' })
    return null
  }
  const u = await loadPortalUser(req)
  if (!u || !u.active) {
    reply.code(401).send({ error: 'Usuário inválido' })
    return null
  }
  return u
}

export function assertRole(user: PortalUser, roles: PortalUserRole[], reply: FastifyReply): boolean {
  if (!roles.includes(user.role)) {
    reply.code(403).send({ error: 'Sem permissão para esta ação' })
    return false
  }
  return true
}
