import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'
import { PortalUserRole } from '@prisma/client'

const emailSchema = z.string().email().max(254)

async function requireJwt(req: FastifyRequest, reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Não autenticado' })
  }
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (req, reply) => {
    const bodySchema = z.object({
      email: emailSchema,
      password: z.string().min(8).max(128),
      name: z.string().min(2).max(120),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const exists = await prisma.portalUser.findUnique({ where: { email: body.email.toLowerCase() } })
    if (exists) {
      return reply.code(409).send({ error: 'E-mail já cadastrado' })
    }

    const passwordHash = await bcrypt.hash(body.password, 12)
    const user = await prisma.portalUser.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        name: body.name.trim(),
        role: PortalUserRole.COLLABORATOR,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    })

    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.code(201).send({ user, token })
  })

  app.post('/auth/login', async (req, reply) => {
    const bodySchema = z.object({
      email: emailSchema,
      password: z.string().min(1),
    })
    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'Dados inválidos' })
    }

    const user = await prisma.portalUser.findUnique({
      where: { email: body.email.toLowerCase() },
    })
    if (!user || !user.active) {
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash)
    if (!ok) {
      return reply.code(401).send({ error: 'Credenciais inválidas' })
    }

    const now = new Date()
    await prisma.portalUser.update({
      where: { id: user.id },
      data: { lastLogin: now, lastSeenAt: now },
    })

    const token = app.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    )

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  })

  app.get('/auth/me', { preHandler: [requireJwt] }, async (req, reply) => {
    const payload = req.user as { sub?: string }
    const id = payload?.sub
    if (!id) return reply.code(401).send({ error: 'Não autenticado' })

    const user = await prisma.portalUser.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    })
    if (!user || !user.active) return reply.code(401).send({ error: 'Usuário inválido' })

    await prisma.portalUser.update({
      where: { id },
      data: { lastSeenAt: new Date() },
    })

    return reply.send({ user })
  })
}
