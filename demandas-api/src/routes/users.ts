import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(3),
  role: z.enum(['admin', 'analista', 'solicitante', 'viewer']).default('analista'),
})

export async function userRoutes(app: FastifyInstance) {
  // Guard: apenas admin (por rota)
  const ensureAdmin = async (req: any, res: any) => {
    try {
      await req.jwtVerify()
      const payload = req.user as any
      if (payload.role !== 'admin') return res.code(403).send({ message: 'Sem permissão' })
    } catch (e) {
      return res.code(401).send({ message: 'Não autenticado' })
    }
  }

  app.get('/users', { preHandler: ensureAdmin }, async () => {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } })
    return users
  })

  app.post('/users', { preHandler: ensureAdmin }, async (req, res) => {
    const data = userSchema.parse(req.body)
    const hash = await app.auth.hash(data.password)
    const created = await prisma.user.create({
      data: { name: data.name, email: data.email, password: hash, role: data.role },
      select: { id: true, name: true, email: true, role: true },
    })
    res.code(201)
    return created
  })

  app.put('/users/:id', { preHandler: ensureAdmin }, async (req: any) => {
    const params = z.object({ id: z.string() }).parse(req.params)
    const body = userSchema.partial().parse(req.body)
    const data: any = { ...body }
    if (body.password) data.password = await app.auth.hash(body.password)
    const updated = await prisma.user.update({ where: { id: params.id }, data, select: { id: true, name: true, email: true, role: true } })
    return updated
  })

  app.delete('/users/:id', { preHandler: ensureAdmin }, async (req: any) => {
    const params = z.object({ id: z.string() }).parse(req.params)
    await prisma.user.delete({ where: { id: params.id } })
    return { ok: true }
  })
}


