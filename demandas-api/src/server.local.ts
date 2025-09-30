import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import authPlugin from './plugins/auth'
import { authRoutes } from './routes/auth'
import { userRoutes } from './routes/users'
import comunicadosRoutes from './routes/comunicados'
import { PrismaClient } from '@prisma/client'
const config = require('../config.local.js')

const app = Fastify({ logger: true })
const prisma = new PrismaClient()

// Configuração de CORS para desenvolvimento local
const corsOptions = {
  origin: config.CORS_ORIGIN || true, // Usar configuração do arquivo ou permitir todas
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}

app.register(cors, corsOptions)
const jwtSecret = config.JWT_SECRET;
if (!jwtSecret) {
  throw new Error('JWT_SECRET não configurado no config.local.js');
}
app.register(jwt, { secret: jwtSecret })
app.register(authPlugin)

app.get('/health', async () => ({ status: 'ok' }))

// CRUD genérico simples para entidades mestres
function crud(entity: keyof PrismaClient) {
  const anyPrisma = prisma as any;
  return {
    list: async () => anyPrisma[entity].findMany(),
    get: async (id: string) => anyPrisma[entity].findUnique({ where: { id } }),
    create: async (data: unknown) => anyPrisma[entity].create({ data }),
    update: async (id: string, data: unknown) => anyPrisma[entity].update({ where: { id }, data }),
    remove: async (id: string) => anyPrisma[entity].delete({ where: { id } }),
  }
}

const resources = {
  areas: crud('area'),
  analistas: crud('analista'),
  operadoras: crud('operadora'),
  produtos: crud('produto'),
  sistemas: crud('sistema'),
  clientes: crud('cliente'),
  contratos: crud('contrato'),
  tiposServico: crud('tipoServico'),
  tiposDemanda: crud('tipoDemanda'),
  demandas: crud('demanda'),
  validacoes: crud('validacao'),
  reajustes: crud('reajuste'),
}

for (const [path, repo] of Object.entries(resources)) {
  app.get(`/${path}`, async () => repo.list())
  app.get(`/${path}/:id`, async (req: any) => repo.get(req.params.id))
  app.post(`/${path}`, async (req: any, res: any) => {
    const created = await repo.create(req.body)
    res.code(201)
    return created
  })
  app.put(`/${path}/:id`, async (req: any) => repo.update(req.params.id, req.body))
  app.delete(`/${path}/:id`, async (req: any) => repo.remove(req.params.id))
}

// Rotas de autenticação e usuários (admin)
app.register(authRoutes)
app.register(userRoutes, { prisma })

// Rotas de comunicados
app.register(comunicadosRoutes)

const port = Number(config.PORT)
app
  .listen({ host: '0.0.0.0', port })
  .then(() => console.log(`🚀 API rodando em http://localhost:${port}`))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
