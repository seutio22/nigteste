import fp from 'fastify-plugin'
import bcrypt from 'bcryptjs'

declare module 'fastify' {
  interface FastifyInstance {
    auth: {
      hash(password: string): Promise<string>
      compare(password: string, hash: string): Promise<boolean>
    }
    authenticate: any
  }
}

export default fp(async (app) => {
  app.decorate('auth', {
    async hash(password: string) {
      const salt = await bcrypt.genSalt(10)
      return bcrypt.hash(password, salt)
    },
    async compare(password: string, hash: string) {
      return bcrypt.compare(password, hash)
    },
  })

  // Adicionar middleware de autenticação JWT
  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
    }
  })
})


