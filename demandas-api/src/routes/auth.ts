import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/login', async (req: { body: unknown }, res: { code: (code: number) => { send: (data: any) => void } }) => {
    try {
      // Validar dados de entrada
      const bodySchema = z.object({ 
        email: z.string().email('E-mail inválido'), 
        password: z.string().min(1, 'Senha é obrigatória') 
      })
      const body = bodySchema.parse(req.body)

      // Buscar usuário por email
      const user = await prisma.user.findUnique({ 
        where: { email: body.email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          role: true,
          active: true,
          permissions: true
        }
      })

      if (!user) {
        return res.code(401).send({ message: 'Credenciais inválidas' })
      }

      // Verificar se usuário está ativo
      if (!user.active) {
        return res.code(401).send({ message: 'Usuário inativo' })
      }

      // Verificar senha
      if (user.password) {
        const isValidPassword = await bcrypt.compare(body.password, user.password)
        if (!isValidPassword) {
          return res.code(401).send({ message: 'Credenciais inválidas' })
        }
      } else {
        // Para desenvolvimento: aceitar qualquer senha se não houver hash
        // Em produção, remover esta condição
        console.warn('Usuário sem senha hash - aceitando qualquer senha (desenvolvimento)')
      }

      // Atualizar último login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      })

      // Gerar token JWT
      const token = app.jwt.sign({ 
        sub: user.id, 
        role: user.role, 
        name: user.name,
        email: user.email
      })

      const userResponse = { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        active: user.active,
        permissions: user.permissions ? JSON.parse(user.permissions as string) : null
      }

      return { 
        token, 
        user: userResponse
      }
    } catch (error) {
      app.log.error('Erro no login:', error as any)
      if (error instanceof z.ZodError) {
        return res.code(400).send({ message: 'Dados inválidos', details: (error as any).errors })
      }
      return res.code(500).send({ message: 'Erro interno do servidor' })
    }
  })

  // Rota para verificar token
  app.get('/auth/verify', async (req: any) => {
    try {
      await req.jwtVerify()
      return { valid: true, user: req.user }
    } catch (error) {
      return { valid: false, error: 'Token inválido' }
    }
  })

  // Rota para logout (opcional - token é invalidado no frontend)
  app.post('/auth/logout', async (req: any) => {
    try {
      await req.jwtVerify()
      // Em uma implementação mais robusta, você poderia adicionar o token a uma blacklist
      return { message: 'Logout realizado com sucesso' }
    } catch (error) {
      return { message: 'Logout realizado com sucesso' }
    }
  })
}


