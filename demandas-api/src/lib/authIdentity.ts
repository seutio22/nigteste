/**
 * Identidade só a partir de JWT verificado (jwtVerify).
 * Nunca confiar em x-user-id / x-user-role / decode sem assinatura.
 */
export type AuthIdentity = {
  id: string
  role: string | null
  email?: string | null
  name?: string | null
}

export function identityFromVerifiedRequest(req: {
  user?: Record<string, unknown>
}): AuthIdentity | null {
  const u = req.user
  if (!u || typeof u !== 'object') return null
  const id = String(u.sub ?? u.id ?? u.userId ?? '').trim()
  if (!id) return null
  const role = u.role != null ? String(u.role) : null
  return {
    id,
    role,
    email: u.email != null ? String(u.email) : null,
    name: u.name != null ? String(u.name) : null,
  }
}

/** preHandler: exige jwtVerify e anexa request.authUser */
export async function requireJwt(request: any, reply: any) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
  }
  const identity = identityFromVerifiedRequest(request)
  if (!identity) {
    return reply.code(401).send({ error: 'Unauthorized', message: 'Token sem identidade válida' })
  }
  request.authUser = identity
}

export async function requireAdminJwt(request: any, reply: any) {
  await requireJwt(request, reply)
  if (reply.sent) return
  if (String(request.authUser?.role || '').toLowerCase() !== 'admin') {
    return reply.code(403).send({ error: 'Forbidden', message: 'Acesso restrito a administradores' })
  }
}
