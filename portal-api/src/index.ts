import 'dotenv/config'
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
import { registerUploadRoutes } from './routes/uploads.js'
import { getNexusBaseUrl } from './lib/nexus.js'
import { getNexusSyncIntervalMinutes, runNexusSnapshotSync, type NexusSyncResultRow } from './lib/nexus-sync-runner.js'

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
await registerUploadRoutes(app)

function scheduleNexusPeriodicSync() {
  const mins = getNexusSyncIntervalMinutes()
  if (mins <= 0) {
    console.log('[nexus-sync] Automático desligado (NEXUS_SYNC_INTERVAL_MINUTES=0)')
    return
  }
  if (!getNexusBaseUrl()) {
    console.warn(
      `[nexus-sync] Automático não iniciado: defina NEXUS_API_BASE_URL (intervalo seria ${mins} min após configurar).`
    )
    return
  }
  const ms = mins * 60 * 1000
  console.log(
    `[nexus-sync] Automático a cada ${mins} min — recomendado 15–30 min para cadastros; mínimo 5 min.`
  )
  const tick = () => {
    void runNexusSnapshotSync()
      .then((r) => {
        if ('skipped' in r && r.skipped) {
          if (r.reason === 'not_configured') return
          if (r.reason === 'already_running') console.warn('[nexus-sync] Periódico ignorado: sync manual em andamento')
          return
        }
        if (!('ok' in r) || !r.ok) return
        const ok = r.results.filter((x: NexusSyncResultRow) => x.ok).length
        console.log(`[nexus-sync] Periódico OK: ${ok}/${r.results.length} entidades`)
      })
      .catch((e) => console.error('[nexus-sync] Periódico falhou:', e))
  }
  setInterval(tick, ms)
  if (process.env.NEXUS_SYNC_ON_STARTUP === 'true') {
    setTimeout(tick, 15_000)
  }
}

const start = async () => {
  try {
    await prisma.$connect()
    await app.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`Portal API em http://0.0.0.0:${PORT}`)
    console.log(`CORS permitidas (${allowedOrigins.size}): ${[...allowedOrigins].join(', ')}`)
    scheduleNexusPeriodicSync()
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()
