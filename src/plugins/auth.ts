import fp from 'fastify-plugin'
import bcrypt from 'bcryptjs'

declare module 'fastify' {
  interface FastifyInstance {
    auth: {
      hash(password: string): Promise<string>
      compare(password: string, hash: string): Promise<boolean>
    }
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
})


