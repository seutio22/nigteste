import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

export async function kanbanRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options

  // Colunas base (matriz) + colunas opcionais ativáveis pelo usuário
  const KANBAN_BASE_STATUSES = ['backlog', 'todo', 'in-progress', 'done'] as const
  const KANBAN_OPTIONAL_STATUSES = ['analise', 'homologacao', 'aguardando-retorno'] as const
  const KANBAN_ALL_STATUSES = [...KANBAN_BASE_STATUSES, ...KANBAN_OPTIONAL_STATUSES] as const

  // Schema de validação para tickets
  const ticketCreateSchema = z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    description: z.string().optional(),
    status: z.enum(KANBAN_ALL_STATUSES),
    priority: z.enum(['low', 'medium', 'high']),
    assignee: z.string().optional(), // Será definido pelo backend baseado no userId
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    tags: z.string().optional()
  })

  const ticketUpdateSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(KANBAN_ALL_STATUSES).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    startDate: z.string().optional().nullable(),
    dueDate: z.string().optional().nullable(),
    tags: z.string().optional()
  })

  const columnPrefsSchema = z.object({
    enabledColumns: z.array(z.enum(KANBAN_OPTIONAL_STATUSES)).max(KANBAN_OPTIONAL_STATUSES.length)
  })

  // GET /kanban/column-prefs - Colunas opcionais ativas do usuário
  app.get('/kanban/column-prefs', async (request: any, reply: any) => {
    try {
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
      }

      const userId = request.user.sub
      const pref = await prisma.kanbanColumnPref.findUnique({ where: { userId } })

      let enabledColumns: string[] = []
      if (pref?.enabledColumns) {
        try {
          const parsed = JSON.parse(pref.enabledColumns)
          if (Array.isArray(parsed)) {
            enabledColumns = parsed.filter((c) => (KANBAN_OPTIONAL_STATUSES as readonly string[]).includes(String(c)))
          }
        } catch {
          enabledColumns = []
        }
      }

      return reply.code(200).send({ enabledColumns })
    } catch (error: any) {
      console.error('❌ Erro ao buscar preferências de colunas:', error)
      return reply.code(500).send({ error: 'Erro ao buscar preferências', message: error.message })
    }
  })

  // PUT /kanban/column-prefs - Ativar/desativar colunas opcionais
  app.put('/kanban/column-prefs', async (request: any, reply: any) => {
    try {
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
      }

      const userId = request.user.sub
      const data = columnPrefsSchema.parse(request.body)
      const enabledColumns = [...new Set(data.enabledColumns)]

      // Bloquear desativação de coluna que ainda tem tarefas
      const disabledWithTickets = await prisma.kanbanTicket.findFirst({
        where: {
          assignee: userId,
          status: { in: KANBAN_OPTIONAL_STATUSES.filter((s) => !enabledColumns.includes(s)) }
        }
      })
      if (disabledWithTickets) {
        return reply.code(409).send({
          error: 'Coluna com tarefas',
          message: 'Mova as tarefas da coluna antes de desativá-la.',
          ticketStatus: disabledWithTickets.status
        })
      }

      await prisma.kanbanColumnPref.upsert({
        where: { userId },
        update: { enabledColumns: JSON.stringify(enabledColumns) },
        create: { userId, enabledColumns: JSON.stringify(enabledColumns) }
      })

      console.log('✅ Kanban API: Preferências de colunas atualizadas:', userId, enabledColumns)
      return reply.code(200).send({ enabledColumns })
    } catch (error: any) {
      console.error('❌ Erro ao salvar preferências de colunas:', error)

      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Dados inválidos', details: error.issues })
      }

      return reply.code(500).send({ error: 'Erro ao salvar preferências', message: error.message })
    }
  })

  // GET /kanban/tickets - Listar tickets do usuário autenticado
  app.get('/kanban/tickets', async (request: any, reply: any) => {
    try {
      // Validar JWT manualmente
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
      }
      
      const userId = request.user.sub

      console.log('🔍 Kanban API: GET /kanban/tickets chamado')
      console.log('🔍 Kanban API: userId:', userId)

      // Buscar tickets APENAS do usuário autenticado
      const tickets = await prisma.kanbanTicket.findMany({
        where: {
          assignee: userId
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      console.log(`✅ Kanban API: ${tickets.length} tickets encontrados`)

      return reply.code(200).send(tickets)
    } catch (error: any) {
      console.error('❌ Erro ao buscar tickets:', error)
      return reply.code(500).send({ 
        error: 'Erro ao buscar tickets',
        message: error.message 
      })
    }
  })

  // GET /kanban/tickets/:id - Buscar ticket específico
  app.get('/kanban/tickets/:id', async (request: any, reply: any) => {
    try {
      // Validar JWT manualmente
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
      }
      
      const userId = request.user.sub
      const { id } = request.params

      console.log('🔍 Kanban API: GET /kanban/tickets/:id chamado')
      console.log('🔍 Kanban API: userId:', userId, 'ticketId:', id)

      // Buscar ticket e verificar se pertence ao usuário
      const ticket = await prisma.kanbanTicket.findFirst({
        where: {
          id,
          assignee: userId // Garantir que é do usuário
        }
      })

      if (!ticket) {
        return reply.code(404).send({ error: 'Ticket não encontrado' })
      }

      console.log('✅ Kanban API: Ticket encontrado')

      return reply.code(200).send(ticket)
    } catch (error: any) {
      console.error('❌ Erro ao buscar ticket:', error)
      return reply.code(500).send({ 
        error: 'Erro ao buscar ticket',
        message: error.message 
      })
    }
  })

  // POST /kanban/tickets - Criar novo ticket
  app.post('/kanban/tickets', async (request: any, reply: any) => {
    try {
      // Validar JWT manualmente
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
      }
      
      const userId = request.user.sub
      
      console.log('🔍 Kanban API: POST /kanban/tickets chamado')
      console.log('🔍 Kanban API: userId:', userId)
      console.log('🔍 Kanban API: body:', request.body)

      // Validar dados
      const data = ticketCreateSchema.parse(request.body)

      // Converter datas vazias para null
      const startDate = data.startDate && data.startDate !== '' 
        ? new Date(data.startDate) 
        : null
      
      const dueDate = data.dueDate && data.dueDate !== '' 
        ? new Date(data.dueDate) 
        : null

      // Criar ticket com assignee sendo o userId do usuário autenticado
      const ticket = await prisma.kanbanTicket.create({
        data: {
          title: data.title,
          description: data.description || '',
          status: data.status,
          priority: data.priority,
          assignee: userId, // SEMPRE usar o userId do usuário autenticado
          startDate,
          dueDate,
          tags: data.tags || ''
        }
      })

      console.log('✅ Kanban API: Ticket criado:', ticket.id)

      return reply.code(201).send(ticket)
    } catch (error: any) {
      console.error('❌ Erro ao criar ticket:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Dados inválidos',
          details: error.issues 
        })
      }
      
      return reply.code(500).send({ 
        error: 'Erro ao criar ticket',
        message: error.message 
      })
    }
  })

  // PUT /kanban/tickets/:id - Atualizar ticket
  app.put('/kanban/tickets/:id', async (request: any, reply: any) => {
    try {
      // Validar JWT manualmente
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
      }
      
      const userId = request.user.sub
      const { id } = request.params

      console.log('🔍 Kanban API: PUT /kanban/tickets/:id chamado')
      console.log('🔍 Kanban API: userId:', userId, 'ticketId:', id)
      console.log('🔍 Kanban API: body:', request.body)

      // Validar dados
      const data = ticketUpdateSchema.parse(request.body)

      // Verificar se o ticket existe e pertence ao usuário
      const existingTicket = await prisma.kanbanTicket.findFirst({
        where: {
          id,
          assignee: userId // Garantir que é do usuário
        }
      })

      if (!existingTicket) {
        return reply.code(404).send({ error: 'Ticket não encontrado' })
      }

      // Preparar dados para atualização
      const updateData: any = {}
      
      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.status !== undefined) updateData.status = data.status
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.tags !== undefined) updateData.tags = data.tags

      // Tratar datas
      if (data.startDate !== undefined) {
        updateData.startDate = data.startDate && data.startDate !== '' 
          ? new Date(data.startDate) 
          : null
      }
      
      if (data.dueDate !== undefined) {
        updateData.dueDate = data.dueDate && data.dueDate !== '' 
          ? new Date(data.dueDate) 
          : null
      }

      // Atualizar ticket
      const updatedTicket = await prisma.kanbanTicket.update({
        where: { id },
        data: updateData
      })

      console.log('✅ Kanban API: Ticket atualizado:', id)

      return reply.code(200).send(updatedTicket)
    } catch (error: any) {
      console.error('❌ Erro ao atualizar ticket:', error)
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ 
          error: 'Dados inválidos',
          details: error.issues 
        })
      }
      
      return reply.code(500).send({ 
        error: 'Erro ao atualizar ticket',
        message: error.message 
      })
    }
  })

  // DELETE /kanban/tickets/:id - Excluir ticket
  app.delete('/kanban/tickets/:id', async (request: any, reply: any) => {
    try {
      // Validar JWT manualmente
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
      }
      
      const userId = request.user.sub
      const { id } = request.params

      console.log('🔍 Kanban API: DELETE /kanban/tickets/:id chamado')
      console.log('🔍 Kanban API: userId:', userId, 'ticketId:', id)

      // Verificar se o ticket existe e pertence ao usuário
      const existingTicket = await prisma.kanbanTicket.findFirst({
        where: {
          id,
          assignee: userId // Garantir que é do usuário
        }
      })

      if (!existingTicket) {
        return reply.code(404).send({ error: 'Ticket não encontrado' })
      }

      // Excluir ticket
      await prisma.kanbanTicket.delete({
        where: { id }
      })

      console.log('✅ Kanban API: Ticket excluído:', id)

      return reply.code(204).send()
    } catch (error: any) {
      console.error('❌ Erro ao excluir ticket:', error)
      return reply.code(500).send({ 
        error: 'Erro ao excluir ticket',
        message: error.message 
      })
    }
  })

  // DELETE /kanban/tickets - Excluir todos os tickets do usuário
  app.delete('/kanban/tickets', async (request: any, reply: any) => {
    try {
      // Validar JWT manualmente
      try {
        await request.jwtVerify()
      } catch (err) {
        return reply.code(401).send({ error: 'Unauthorized', message: 'Token inválido ou ausente' })
      }
      
      const userId = request.user.sub

      console.log('🔍 Kanban API: DELETE /kanban/tickets chamado')
      console.log('🔍 Kanban API: userId:', userId)

      // Excluir todos os tickets do usuário
      const result = await prisma.kanbanTicket.deleteMany({
        where: {
          assignee: userId
        }
      })

      console.log(`✅ Kanban API: ${result.count} tickets excluídos`)

      return reply.code(200).send({ 
        message: 'Tickets excluídos com sucesso',
        count: result.count
      })
    } catch (error: any) {
      console.error('❌ Erro ao excluir tickets:', error)
      return reply.code(500).send({ 
        error: 'Erro ao excluir tickets',
        message: error.message 
      })
    }
  })
}

