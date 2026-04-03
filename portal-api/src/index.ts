import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { prisma } from './lib/prisma.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerCaseRoutes } from './routes/cases.js'
import { registerAreaRoutes } from './routes/areas.js'

const PORT = Number(process.env.PORT) || 4001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-in-production'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5174').split(',').map((s) => s.trim()),
  credentials: true,
})

await app.register(jwt, {
  secret: JWT_SECRET,
})

app.get('/health', async () => ({ status: 'ok', service: 'portal-colaborador-api' }))

await registerAuthRoutes(app)
await registerCaseRoutes(app)
await registerAreaRoutes(app)

const start = async () => {
  try {
    await prisma.$connect()
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Portal API em http://localhost:${PORT}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
