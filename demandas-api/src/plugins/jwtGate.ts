import fp from 'fastify-plugin'
import { identityFromVerifiedRequest } from '../lib/authIdentity'

/**
 * Deny-by-default: rotas exigem JWT, exceto allowlist pública.
 * OPTIONS (CORS preflight) sempre passa.
 */
function pathOnly(url: string): string {
  const q = url.indexOf('?')
  return q >= 0 ? url.slice(0, q) : url
}

function isPublicPath(method: string, pathname: string): boolean {
  const m = method.toUpperCase()
  if (m === 'OPTIONS') return true

  if (pathname === '/health' || pathname === '/') return true

  // Auth
  if (pathname === '/auth/login' && m === 'POST') return true
  if (pathname === '/auth/change-password' && m === 'POST') return true

  // Share público (leitura + telemetria do viewer)
  if (m === 'GET' && /^\/share\/[^/]+$/.test(pathname)) return true
  if (m === 'GET' && /^\/share\/placement\/[^/]+$/.test(pathname)) return true
  if (m === 'GET' && /^\/share\/placement\/[^/]+\/cotacao$/.test(pathname)) return true
  if (m === 'GET' && /^\/share\/placement\/[^/]+\/beneficiarios$/.test(pathname)) return true
  if (m === 'POST' && /^\/share\/placement\/[^/]+\/access\/(end|events)$/.test(pathname)) {
    return true
  }

  return false
}

export default fp(async (app) => {
  app.addHook('onRequest', async (request, reply) => {
    const pathname = pathOnly(request.url || '/')
    if (isPublicPath(request.method, pathname)) return

    try {
      await request.jwtVerify()
    } catch {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
    }

    const identity = identityFromVerifiedRequest(request as any)
    if (!identity) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Token sem identidade válida' })
    }
    ;(request as any).authUser = identity
  })
})
