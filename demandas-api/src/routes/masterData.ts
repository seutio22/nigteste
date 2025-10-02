import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

export async function masterDataRoutes(app: FastifyInstance, options: { prisma: PrismaClient }) {
  const { prisma } = options

  // Schema de validação para Solicitante
  const solicitanteCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório')
  })

  const solicitanteUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório')
  })

  // Schema de validação para Relatório
  const relatorioCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório')
  })

  const relatorioUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório')
  })

  // Schema de validação para Modelo
  const modeloCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório')
  })

  const modeloUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório')
  })

  // ===== SOLICITANTES =====
  
  // GET /solicitantes
  app.get('/solicitantes', async (request, reply) => {
    try {
      const solicitantes = await prisma.solicitante.findMany({
        orderBy: { nome: 'asc' }
      })
      return reply.send(solicitantes)
    } catch (error) {
      console.error('Erro ao buscar solicitantes:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /solicitantes
  app.post('/solicitantes', async (request, reply) => {
    try {
      const body = solicitanteCreateSchema.parse(request.body)
      const solicitante = await prisma.solicitante.create({
        data: body
      })
      return reply.status(201).send(solicitante)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar solicitante:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /solicitantes/:id
  app.put('/solicitantes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = solicitanteUpdateSchema.parse(request.body)
      
      const solicitante = await prisma.solicitante.update({
        where: { id },
        data: body
      })
      return reply.send(solicitante)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar solicitante:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /solicitantes/:id
  app.delete('/solicitantes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      console.log('🔍 DELETE /solicitantes/:id - ID recebido:', id)
      
      // Verificar se o registro existe primeiro
      const existingSolicitante = await prisma.solicitante.findUnique({ where: { id } })
      if (!existingSolicitante) {
        console.log('❌ Solicitante não encontrado:', id)
        return reply.status(404).send({ error: 'Solicitante não encontrado' })
      }
      
      console.log('✅ Solicitante encontrado, excluindo:', existingSolicitante.nome)
      await prisma.solicitante.delete({
        where: { id }
      })
      console.log('✅ Solicitante excluído com sucesso')
      return reply.status(204).send()
    } catch (error) {
      console.error('❌ Erro ao deletar solicitante:', error)
      console.error('❌ Detalhes do erro:', error instanceof Error ? error.message : String(error))
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
      return reply.status(500).send({ error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) })
    }
  })

  // ===== RELATÓRIOS =====
  
  // GET /relatorios
  app.get('/relatorios', async (request, reply) => {
    try {
      const relatorios = await prisma.relatorio.findMany({
        orderBy: { nome: 'asc' }
      })
      return reply.send(relatorios)
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /relatorios
  app.post('/relatorios', async (request, reply) => {
    try {
      const body = relatorioCreateSchema.parse(request.body)
      const relatorio = await prisma.relatorio.create({
        data: body
      })
      return reply.status(201).send(relatorio)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar relatório:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /relatorios/:id
  app.put('/relatorios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = relatorioUpdateSchema.parse(request.body)
      
      const relatorio = await prisma.relatorio.update({
        where: { id },
        data: body
      })
      return reply.send(relatorio)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar relatório:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /relatorios/:id
  app.delete('/relatorios/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      console.log('🔍 DELETE /relatorios/:id - ID recebido:', id)
      
      // Verificar se o registro existe primeiro
      const existingRelatorio = await prisma.relatorio.findUnique({ where: { id } })
      if (!existingRelatorio) {
        console.log('❌ Relatório não encontrado:', id)
        return reply.status(404).send({ error: 'Relatório não encontrado' })
      }
      
      console.log('✅ Relatório encontrado, excluindo:', existingRelatorio.nome)
      await prisma.relatorio.delete({
        where: { id }
      })
      console.log('✅ Relatório excluído com sucesso')
      return reply.status(204).send()
    } catch (error) {
      console.error('❌ Erro ao deletar relatório:', error)
      console.error('❌ Detalhes do erro:', error instanceof Error ? error.message : String(error))
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
      return reply.status(500).send({ error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) })
    }
  })

  // ===== MODELOS =====
  
  // GET /modelos
  app.get('/modelos', async (request, reply) => {
    try {
      const modelos = await prisma.modelo.findMany({
        orderBy: { nome: 'asc' }
      })
      return reply.send(modelos)
    } catch (error) {
      console.error('Erro ao buscar modelos:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /modelos
  app.post('/modelos', async (request, reply) => {
    try {
      const body = modeloCreateSchema.parse(request.body)
      const modelo = await prisma.modelo.create({
        data: body
      })
      return reply.status(201).send(modelo)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar modelo:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /modelos/:id
  app.put('/modelos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = modeloUpdateSchema.parse(request.body)
      
      const modelo = await prisma.modelo.update({
        where: { id },
        data: body
      })
      return reply.send(modelo)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar modelo:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /modelos/:id
  app.delete('/modelos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      console.log('🔍 DELETE /modelos/:id - ID recebido:', id)
      
      // Verificar se o registro existe primeiro
      const existingModelo = await prisma.modelo.findUnique({ where: { id } })
      if (!existingModelo) {
        console.log('❌ Modelo não encontrado:', id)
        return reply.status(404).send({ error: 'Modelo não encontrado' })
      }
      
      console.log('✅ Modelo encontrado, excluindo:', existingModelo.nome)
      await prisma.modelo.delete({
        where: { id }
      })
      console.log('✅ Modelo excluído com sucesso')
      return reply.status(204).send()
    } catch (error) {
      console.error('❌ Erro ao deletar modelo:', error)
      console.error('❌ Detalhes do erro:', error instanceof Error ? error.message : String(error))
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
      return reply.status(500).send({ error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) })
    }
  })

  // ===== ÁREAS MAILLING =====
  
  // Schema de validação para AreaMailling
  const areaMaillingCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    descricao: z.string().optional(),
    ativo: z.boolean().default(true)
  })

  const areaMaillingUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    descricao: z.string().optional(),
    ativo: z.boolean().optional()
  })

  // GET /areas-mailling
  app.get('/areas-mailling', async (request, reply) => {
    try {
      const areasMailling = await prisma.areaMailling.findMany({
        orderBy: { nome: 'asc' }
      })
      return reply.send(areasMailling)
    } catch (error) {
      console.error('Erro ao buscar áreas de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /areas-mailling
  app.post('/areas-mailling', async (request, reply) => {
    try {
      const data = areaMaillingCreateSchema.parse(request.body)
      const areaMailling = await prisma.areaMailling.create({
        data
      })
      return reply.status(201).send(areaMailling)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar área de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /areas-mailling/:id
  app.put('/areas-mailling/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = areaMaillingUpdateSchema.parse(request.body)
      
      const areaMailling = await prisma.areaMailling.update({
        where: { id },
        data
      })
      return reply.send(areaMailling)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar área de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /areas-mailling/:id
  app.delete('/areas-mailling/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      await prisma.areaMailling.delete({
        where: { id }
      })
      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao deletar área de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // ===== CARGOS MAILLING =====
  
  // Schema de validação para CargoMailling
  const cargoMaillingCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    descricao: z.string().optional(),
    ativo: z.boolean().default(true)
  })

  const cargoMaillingUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    descricao: z.string().optional(),
    ativo: z.boolean().optional()
  })

  // GET /cargos-mailling
  app.get('/cargos-mailling', async (request, reply) => {
    try {
      const cargosMailling = await prisma.cargoMailling.findMany({
        orderBy: { nome: 'asc' }
      })
      return reply.send(cargosMailling)
    } catch (error) {
      console.error('Erro ao buscar cargos de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /cargos-mailling
  app.post('/cargos-mailling', async (request, reply) => {
    try {
      const data = cargoMaillingCreateSchema.parse(request.body)
      const cargoMailling = await prisma.cargoMailling.create({
        data
      })
      return reply.status(201).send(cargoMailling)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar cargo de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /cargos-mailling/:id
  app.put('/cargos-mailling/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = cargoMaillingUpdateSchema.parse(request.body)
      
      const cargoMailling = await prisma.cargoMailling.update({
        where: { id },
        data
      })
      return reply.send(cargoMailling)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar cargo de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /cargos-mailling/:id
  app.delete('/cargos-mailling/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      await prisma.cargoMailling.delete({
        where: { id }
      })
      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao deletar cargo de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // ===== FILIAIS MAILLING =====
  
  // Schema de validação para FilialMailling
  const filialMaillingCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    descricao: z.string().optional(),
    ativo: z.boolean().default(true)
  })

  const filialMaillingUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    descricao: z.string().optional(),
    ativo: z.boolean().optional()
  })

  // GET /filiais-mailling
  app.get('/filiais-mailling', async (request, reply) => {
    try {
      const filiaisMailling = await prisma.filialMailling.findMany({
        orderBy: { nome: 'asc' }
      })
      return reply.send(filiaisMailling)
    } catch (error) {
      console.error('Erro ao buscar filiais de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /filiais-mailling
  app.post('/filiais-mailling', async (request, reply) => {
    try {
      const data = filialMaillingCreateSchema.parse(request.body)
      const filialMailling = await prisma.filialMailling.create({
        data
      })
      return reply.status(201).send(filialMailling)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar filial de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /filiais-mailling/:id
  app.put('/filiais-mailling/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = filialMaillingUpdateSchema.parse(request.body)
      
      const filialMailling = await prisma.filialMailling.update({
        where: { id },
        data
      })
      return reply.send(filialMailling)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar filial de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /filiais-mailling/:id
  app.delete('/filiais-mailling/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      await prisma.filialMailling.delete({
        where: { id }
      })
      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao deletar filial de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // ===== CONTATOS MAILLING =====
  
  // Schema de validação para Mailling
  const maillingCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    email: z.string().email('E-mail inválido'),
    telefone: z.string().optional(),
    empresa: z.string().optional(),
    cargo: z.string().optional(),
    departamento: z.string().optional(),
    categoria: z.string().default('Geral'),
    status: z.string().default('Ativo'),
    origem: z.string().optional()
  })

  const maillingUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório').optional(),
    email: z.string().email('E-mail inválido').optional(),
    telefone: z.string().optional(),
    empresa: z.string().optional(),
    cargo: z.string().optional(),
    departamento: z.string().optional(),
    categoria: z.string().optional(),
    status: z.string().optional(),
    origem: z.string().optional()
  })

  // GET /mailling
  app.get('/mailling', async (request, reply) => {
    try {
      const mailling = await prisma.mailling.findMany({
        orderBy: { nome: 'asc' }
      })
      return reply.send(mailling)
    } catch (error) {
      console.error('Erro ao buscar contatos de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /mailling
  app.post('/mailling', async (request, reply) => {
    try {
      console.log('🔍 POST /mailling - Dados recebidos:', JSON.stringify(request.body, null, 2))
      const data = maillingCreateSchema.parse(request.body)
      console.log('✅ POST /mailling - Dados validados:', JSON.stringify(data, null, 2))
      const mailling = await prisma.mailling.create({
        data
      })
      console.log('✅ POST /mailling - Contato criado:', mailling.id)
      return reply.status(201).send(mailling)
    } catch (error) {
      console.error('❌ POST /mailling - Erro:', error)
      if (error instanceof z.ZodError) {
        console.error('❌ POST /mailling - Erro de validação:', error.issues)
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar contato de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /mailling/:id
  app.put('/mailling/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = maillingUpdateSchema.parse(request.body)
      
      const mailling = await prisma.mailling.update({
        where: { id },
        data
      })
      return reply.send(mailling)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar contato de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /mailling/:id
  app.delete('/mailling/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      
      await prisma.mailling.delete({
        where: { id }
      })
      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao deletar contato de mailling:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })


}
