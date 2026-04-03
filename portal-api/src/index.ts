import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { prisma } from './lib/prisma.js'
import { registerAuthRoutes } from './routes/auth.js'
import { registerCaseRoutes } from './routes/cases.js'
import { registerAreaRoutes } from './routes/areas.js'
import { registerAdminRoutes } from './routes/admin.js'
import { registerManagerRoutes } from './routes/manager.js'
import { registerOperationsRoutes } from './routes/operations.js'
import { registerNexusSyncRoutes } from './routes/nexus-sync.js'

const PORT = Number(process.env.PORT) || 4001
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-in-production'

/** Origem sem barra final — o header Origin do browser nunca traz "/" no fim. */
function normalizeOrigin(url: string) {
  const t = url.trim().replace(/\/$/, '')
  return t || ''
}

const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || 'http://localhost:5174')
    .split(',')
    .map((s) => normalizeOrigin(s))
    .filter(Boolean)
)

const app = Fastify({ logger: true })

// Railway (e outros) costumam usar GET / no health check; precisa ser 200, não 404.
app.get('/', async () => ({ status: 'ok', service: 'portal-colaborador-api' }))

await app.register(cors, {
  credentials: true,
  strictPreflight: false,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true)
      return
    }
    if (allowedOrigins.has(normalizeOrigin(origin))) {
      cb(null, true)
      return
    }
    cb(null, false)
  },
})

await app.register(jwt, {
  secret: JWT_SECRET,
})

app.get('/health', async () => ({ status: 'ok', service: 'portal-colaborador-api' }))

await registerAuthRoutes(app)
await registerCaseRoutes(app)
await registerAreaRoutes(app)
await registerAdminRoutes(app)
await registerManagerRoutes(app)
await registerOperationsRoutes(app)
await registerNexusSyncRoutes(app)

const start = async () => {
  try {
    await prisma.$connect()
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Portal API em http://0.0.0.0:${PORT}`)
    console.log(`CORS permitidas (${allowedOrigins.size}): ${[...allowedOrigins].join(', ')}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
