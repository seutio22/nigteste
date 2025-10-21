import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

export async function authRoutes(app: FastifyInstance, options?: { prisma?: PrismaClient }) {
  // Usar prisma compartilhado ou criar um temporário para rotas públicas
  const prisma = options?.prisma || new PrismaClient()
  app.post('/auth/login', async (req: { body: unknown }, res: { code: (code: number) => { send: (data: any) => void } }) => {
    try {
      // Validar dados de entrada
      const bodySchema = z.object({ 
        email: z.string().min(1, 'E-mail é obrigatório').refine(
          (email) => email.includes('@') && email.includes('.'),
          'E-mail deve conter @ e .'
        ), 
        password: z.string().min(1, 'Senha é obrigatória') 
      })
      const body = bodySchema.parse(req.body)

      console.log('🔐 Tentando login para:', body.email)

      // Tentar conectar ao banco primeiro
      let user = null
      try {
        // Testar conexão com banco
        await prisma.$connect()
        console.log('✅ Conexão com banco OK')
        
        // Buscar usuário por email
        user = await prisma.user.findUnique({ 
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
        console.log('👤 Usuário encontrado:', user ? 'Sim' : 'Não')
      } catch (dbError) {
        console.error('❌ Erro de conexão com banco:', dbError.message)
        console.log('⚠️ Continuando sem banco...')
        
        // Se não conseguir conectar ao banco, retornar erro
        return res.code(503).send({ 
          message: 'Banco de dados temporariamente indisponível',
          error: 'DATABASE_CONNECTION_FAILED',
          details: dbError.message
        })
      }

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

      // Gerar token JWT com expiração de 12 horas (meio dia)
      const token = app.jwt.sign({ 
        sub: user.id, 
        role: user.role, 
        name: user.name,
        email: user.email
      }, { 
        expiresIn: '12h' // Token expira em 12 horas (meio dia útil)
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
    } catch (error: any) {
      console.error('Erro no login:', error)
      if (error instanceof z.ZodError) {
        return res.code(400).send({ message: 'Dados inválidos', details: error.issues })
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


