import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req, res) => {
    // Exigir e-mail válido com TLD comum
    const bodySchema = z.object({ email: z.string().email(), password: z.string().min(3) })
    const body = bodySchema.parse(req.body)

    const user = await prisma.user.findUnique({ where: { email: body.email } })
    if (!user) return res.code(401).send({ message: 'Credenciais inválidas' })

    const ok = await app.auth.compare(body.password, user.password)
    if (!ok) return res.code(401).send({ message: 'Credenciais inválidas' })

    const token = app.jwt.sign({ sub: user.id, role: user.role, name: user.name })
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } }
  })
}


