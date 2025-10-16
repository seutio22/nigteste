import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

export async function userRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options

  // Schema de validação para usuários
  const userCreateSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    role: z.enum(['admin', 'gerente', 'analista', 'solicitante', 'viewer']).default('analista'),
    active: z.boolean().default(true),
    viewOwnDataOnly: z.boolean().default(false),
    permissions: z.string().optional() // JSON string com permissões
  })

  const userUpdateSchema = z.object({
    name: z.string().min(1, 'Nome é obrigatório').optional(),
    email: z.string().email('E-mail inválido').optional(),
    password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
    role: z.enum(['admin', 'gerente', 'analista', 'solicitante', 'viewer']).optional(),
    active: z.boolean().optional(),
    viewOwnDataOnly: z.boolean().optional(),
    permissions: z.string().optional()
  })

  // Função para gerar permissões padrão baseadas no role
  const getDefaultPermissions = (role: string) => {
    const defaultPermissions = {
      admin: {
        home: { view: true, create: true, edit: true, delete: true },
        dashboard: { view: true, create: true, edit: true, delete: true },
        cadastro: { view: true, create: true, edit: true, delete: true },
        manutencao: { view: true, create: true, edit: true, delete: true },
        atendimento: { view: true, create: true, edit: true, delete: true },
        comunicados: { view: true, create: true, edit: true, delete: true },
        validacao: { view: true, create: true, edit: true, delete: true },
        reajuste: { view: true, create: true, edit: true, delete: true },
        mailling: { view: true, create: true, edit: true, delete: true },
        analytics: { view: true, create: true, edit: true, delete: true },
        kanban: { view: true, create: true, edit: true, delete: true },
        projetos: { view: true, create: true, edit: true, delete: true },
        dados: { view: true, create: true, edit: true, delete: true },
        usuarios: { view: true, create: true, edit: true, delete: true },
        configuracoes: { view: true, create: true, edit: true, delete: true },
        relatorios: { view: true, create: true, edit: true, delete: true }
      },
      gerente: {
        home: { view: true, create: true, edit: true, delete: true },
        dashboard: { view: true, create: true, edit: true, delete: true },
        cadastro: { view: true, create: true, edit: true, delete: true },
        manutencao: { view: true, create: true, edit: true, delete: true },
        atendimento: { view: true, create: true, edit: true, delete: true },
        comunicados: { view: true, create: true, edit: true, delete: true },
        validacao: { view: true, create: true, edit: true, delete: true },
        reajuste: { view: true, create: true, edit: true, delete: true },
        mailling: { view: true, create: true, edit: true, delete: true },
        analytics: { view: true, create: true, edit: true, delete: true },
        kanban: { view: true, create: true, edit: true, delete: true },
        projetos: { view: true, create: true, edit: true, delete: true },
        dados: { view: true, create: true, edit: true, delete: true },
        usuarios: { view: false, create: false, edit: false, delete: false },
        configuracoes: { view: true, create: true, edit: true, delete: true },
        relatorios: { view: true, create: true, edit: true, delete: true }
      },
      analista: {
        home: { view: true, create: false, edit: false, delete: false },
        dashboard: { view: true, create: false, edit: false, delete: false },
        cadastro: { view: true, create: true, edit: true, delete: false },
        manutencao: { view: true, create: true, edit: true, delete: false },
        atendimento: { view: true, create: true, edit: true, delete: false },
        comunicados: { view: true, create: true, edit: true, delete: false },
        validacao: { view: true, create: true, edit: true, delete: false },
        reajuste: { view: true, create: true, edit: true, delete: false },
        mailling: { view: true, create: true, edit: true, delete: false },
        analytics: { view: true, create: false, edit: false, delete: false },
        kanban: { view: true, create: true, edit: true, delete: false },
        projetos: { view: true, create: true, edit: true, delete: false },
        dados: { view: true, create: false, edit: false, delete: false },
        usuarios: { view: false, create: false, edit: false, delete: false },
        configuracoes: { view: true, create: false, edit: false, delete: false },
        relatorios: { view: true, create: true, edit: true, delete: false }
      },
      solicitante: {
        home: { view: true, create: false, edit: false, delete: false },
        dashboard: { view: true, create: false, edit: false, delete: false },
        cadastro: { view: true, create: true, edit: false, delete: false },
        manutencao: { view: false, create: false, edit: false, delete: false },
        atendimento: { view: true, create: true, edit: false, delete: false },
        comunicados: { view: true, create: false, edit: false, delete: false },
        validacao: { view: false, create: false, edit: false, delete: false },
        reajuste: { view: false, create: false, edit: false, delete: false },
        mailling: { view: false, create: false, edit: false, delete: false },
        analytics: { view: false, create: false, edit: false, delete: false },
        kanban: { view: false, create: false, edit: false, delete: false },
        projetos: { view: false, create: false, edit: false, delete: false },
        dados: { view: false, create: false, edit: false, delete: false },
        usuarios: { view: false, create: false, edit: false, delete: false },
        configuracoes: { view: false, create: false, edit: false, delete: false },
        relatorios: { view: false, create: false, edit: false, delete: false }
      },
      viewer: {
        home: { view: true, create: false, edit: false, delete: false },
        dashboard: { view: true, create: false, edit: false, delete: false },
        cadastro: { view: true, create: false, edit: false, delete: false },
        manutencao: { view: true, create: false, edit: false, delete: false },
        atendimento: { view: true, create: false, edit: false, delete: false },
        comunicados: { view: true, create: false, edit: false, delete: false },
        validacao: { view: true, create: false, edit: false, delete: false },
        reajuste: { view: true, create: false, edit: false, delete: false },
        mailling: { view: true, create: false, edit: false, delete: false },
        analytics: { view: true, create: false, edit: false, delete: false },
        kanban: { view: true, create: false, edit: false, delete: false },
        projetos: { view: true, create: false, edit: false, delete: false },
        dados: { view: true, create: false, edit: false, delete: false },
        usuarios: { view: false, create: false, edit: false, delete: false },
        configuracoes: { view: true, create: false, edit: false, delete: false },
        relatorios: { view: true, create: false, edit: false, delete: false }
      }
    }
    
    return defaultPermissions[role as keyof typeof defaultPermissions] || defaultPermissions.viewer
  }

  // Middleware para verificar JWT (qualquer usuário autenticado)
  const verifyJWT = async (req: any) => {
    await req.jwtVerify()
  }

  // Middleware para verificar se o usuário é admin
  const ensureAdmin = async (req: any) => {
    await req.jwtVerify()
    if (req.user.role !== 'admin') {
      throw new Error('Acesso negado: apenas administradores podem gerenciar usuários')
    }
  }

  // GET /users - Listar todos os usuários (apenas admin)
  app.get('/users', { preHandler: ensureAdmin }, async () => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          viewOwnDataOnly: true,
          permissions: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: { createdAt: 'desc' }
      })
      
      return users
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error)
      throw new Error('Erro interno ao listar usuários')
    }
  })

  // GET /users/:id - Obter usuário específico (qualquer usuário autenticado pode buscar seus próprios dados)
  app.get('/users/:id', { preHandler: verifyJWT }, async (req: any) => {
    try {
      const { id } = req.params
      const requestingUserId = req.user?.id
      const requestingUserRole = req.user?.role
      
      // Permitir que admin busque qualquer usuário OU que o usuário busque seus próprios dados
      if (requestingUserRole !== 'admin' && requestingUserId !== id) {
        return { error: 'Você só pode buscar seus próprios dados' }
      }
      
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          viewOwnDataOnly: true,
          permissions: true,
          lastLogin: true,
          createdAt: true,
          updatedAt: true
        }
      })
      
      if (!user) {
        throw new Error('Usuário não encontrado')
      }
      
      console.log(`✅ Permissões retornadas para ${user.name}:`, user.permissions ? 'SIM' : 'NÃO')
      
      return user
    } catch (error: any) {
      console.error('Erro ao obter usuário:', error)
      throw error
    }
  })

  // POST /users - Criar novo usuário (apenas admin)
  app.post('/users', { preHandler: ensureAdmin }, async (req: any, res: any) => {
    try {
      const userData = userCreateSchema.parse(req.body)
      
      // Verificar se email já existe
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (existingUser) {
        return res.code(400).send({ error: 'E-mail já cadastrado' })
      }
      
      // Hash da senha
      const hashedPassword = userData.password ? await bcrypt.hash(userData.password, 10) : null
      
      // Definir permissões: usar as fornecidas ou gerar padrão baseado no role
      const permissions = userData.permissions || JSON.stringify(getDefaultPermissions(userData.role))
      
      // Criar usuário
      const created = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          active: userData.active,
          viewOwnDataOnly: userData.viewOwnDataOnly,
          permissions: permissions
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          viewOwnDataOnly: true,
          permissions: true,
          createdAt: true
        }
      })
      
      res.code(201)
      return created
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error)
      if (error instanceof z.ZodError) {
        return res.code(400).send({ error: 'Dados inválidos', details: (error).issues })
      }
      throw new Error('Erro interno ao criar usuário')
    }
  })

  // PUT /users/:id - Atualizar usuário (apenas admin)
  app.put('/users/:id', { preHandler: ensureAdmin }, async (req: any, res: any) => {
    try {
      const { id } = req.params
      const updateData = userUpdateSchema.parse(req.body)
      
      console.log('🔍 Backend PUT /users/:id - Dados recebidos:', JSON.stringify(updateData, null, 2))
      console.log('🔍 Backend - Permissões recebidas (raw):', updateData.permissions)
      
      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({ where: { id } })
      if (!existingUser) {
        return res.code(404).send({ error: 'Usuário não encontrado' })
      }
      
      console.log('🔍 Backend - Usuário existente:', existingUser.name)
      
      // Se estiver alterando email, verificar se já existe
      if (updateData.email && updateData.email !== existingUser.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: updateData.email }
        })
        if (emailExists) {
          return res.code(400).send({ error: 'E-mail já cadastrado' })
        }
      }
      
      // Hash da senha se fornecida
      let hashedPassword = undefined
      if (updateData.password) {
        hashedPassword = await bcrypt.hash(updateData.password, 10)
      }
      
      // Se o role foi alterado e não foram fornecidas permissões específicas, atualizar permissões
      let permissionsToUpdate = updateData.permissions
      if (updateData.role && updateData.role !== existingUser.role && !updateData.permissions) {
        permissionsToUpdate = JSON.stringify(getDefaultPermissions(updateData.role))
        console.log(`🔄 Atualizando permissões do usuário ${existingUser.name} para role ${updateData.role}`)
      }
      
      // Atualizar usuário
      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...updateData,
          password: hashedPassword,
          permissions: permissionsToUpdate,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          viewOwnDataOnly: true,
          permissions: true,
          updatedAt: true
        }
      })
      
      return updated
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error)
      if (error instanceof z.ZodError) {
        return res.code(400).send({ error: 'Dados inválidos', details: (error).issues })
      }
      throw new Error('Erro interno ao atualizar usuário')
    }
  })

  // DELETE /users/:id - Deletar usuário (apenas admin)
  app.delete('/users/:id', { preHandler: ensureAdmin }, async (req: any) => {
    try {
      const { id } = req.params
      
      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({ where: { id } })
      if (!existingUser) {
        throw new Error('Usuário não encontrado')
      }
      
      // Não permitir deletar o próprio usuário admin
      if (req.user.sub === id) {
        throw new Error('Não é possível deletar seu próprio usuário')
      }
      
      // Usar transação para garantir consistência
      await prisma.$transaction(async (tx) => {
        // 1. Atualizar registros relacionados para remover referência ao usuário
        // Demandas - definir userId como null
        await tx.demanda.updateMany({
          where: { userId: id },
          data: { userId: null }
        })
        
        // Manutenções - definir userId como null
        await tx.manutencao.updateMany({
          where: { userId: id },
          data: { userId: null }
        })
        
        // Atendimentos - definir userId como null
        await tx.atendimento.updateMany({
          where: { userId: id },
          data: { userId: null }
        })
        
        // Validações - definir userId como null
        await tx.validacao.updateMany({
          where: { userId: id },
          data: { userId: null }
        })
        
        // Validações de Manutenção - definir userId como null
        await tx.validacaoManutencao.updateMany({
          where: { userId: id },
          data: { userId: null }
        })
        
        // Reajustes - definir userId como null
        await tx.reajuste.updateMany({
          where: { userId: id },
          data: { userId: null }
        })
        
        // Reajustes de Manutenção - definir userId como null
        await tx.reajusteManutencao.updateMany({
          where: { userId: id },
          data: { userId: null }
        })
        
        // Comunicados - definir userId como null
        await tx.comunicado.updateMany({
          where: { userId: id },
          data: { userId: null }
        })
        
        // 2. Deletar registros que têm onDelete: Cascade
        // UserPermissions (já tem onDelete: Cascade)
        await tx.userPermission.deleteMany({
          where: { userId: id }
        })
        
        // ProjectMembers (já tem onDelete: Cascade)
        await tx.projectMember.deleteMany({
          where: { userId: id }
        })
        
        // 3. Verificar se usuário é manager de algum projeto
        const projectsManaged = await tx.project.findMany({
          where: { managerId: id },
          select: { id: true, name: true }
        })
        
        if (projectsManaged.length > 0) {
          throw new Error(`Não é possível excluir o usuário pois ele é gerente de ${projectsManaged.length} projeto(s): ${projectsManaged.map(p => p.name).join(', ')}`)
        }
        
        // 4. Atualizar tickets do kanban
        await tx.kanbanTicket.updateMany({
          where: { assignee: id },
          data: { assignee: null }
        })
        
        // 5. Finalmente, deletar o usuário
        await tx.user.delete({ where: { id } })
      })
      
      return { message: 'Usuário deletado com sucesso' }
    } catch (error: any) {
      console.error('Erro ao deletar usuário:', error)
      throw error
    }
  })

  // PATCH /users/:id/toggle-active - Ativar/Desativar usuário (apenas admin)
  app.patch('/users/:id/toggle-active', { preHandler: ensureAdmin }, async (req: any) => {
    try {
      const { id } = req.params
      
      const user = await prisma.user.findUnique({ where: { id } })
      if (!user) {
        throw new Error('Usuário não encontrado')
      }
      
      const updated = await prisma.user.update({
        where: { id },
        data: { 
          active: !user.active,
          updatedAt: new Date()
        },
        select: {
          id: true,
          name: true,
          active: true,
          updatedAt: true
        }
      })
      
      return updated
    } catch (error: any) {
      console.error('Erro ao alterar status do usuário:', error)
      throw error
    }
  })

  // GET /users/me - Obter dados do usuário logado
  app.get('/users/me', async (req: any) => {
    try {
      await req.jwtVerify()
      const userId = req.user.sub
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          viewOwnDataOnly: true,
          permissions: true,
          lastLogin: true,
          createdAt: true
        }
      })
      
      if (!user) {
        throw new Error('Usuário não encontrado')
      }
      
      return user
    } catch (error: any) {
      console.error('Erro ao obter dados do usuário:', error)
      throw error
    }
  })
}


