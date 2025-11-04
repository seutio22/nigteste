import { FastifyInstance } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { masterDataCache } from '../lib/cache'

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
      const solicitantes = await masterDataCache.get(
        'solicitantes',
        () => prisma.solicitante.findMany({
          orderBy: { nome: 'asc' }
        })
      )
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
      
      // Verificar se já existe solicitante com mesmo nome (case insensitive)
      const existingSolicitante = await prisma.solicitante.findFirst({
        where: {
          nome: {
            equals: body.nome,
            mode: 'insensitive'
          }
        }
      })
      
      if (existingSolicitante) {
        return reply.status(400).send({ 
          error: 'Solicitante duplicado', 
          message: `Solicitante "${body.nome}" já existe. Por favor, escolha um nome diferente.` 
        })
      }
      
      const solicitante = await prisma.solicitante.create({
        data: body
      })
      // Invalidar cache ao criar
      masterDataCache.delete('solicitantes')
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
      
      // Verificar se já existe outro solicitante com mesmo nome (excluindo o próprio)
      const duplicateSolicitante = await prisma.solicitante.findFirst({
        where: {
          nome: {
            equals: body.nome,
            mode: 'insensitive'
          },
          id: {
            not: id
          }
        }
      })
      
      if (duplicateSolicitante) {
        return reply.status(400).send({ 
          error: 'Solicitante duplicado', 
          message: `Solicitante "${body.nome}" já existe. Por favor, escolha um nome diferente.` 
        })
      }
      
      const solicitante = await prisma.solicitante.update({
        where: { id },
        data: body
      })
      // Invalidar cache ao atualizar
      masterDataCache.delete('solicitantes')
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
      // Invalidar cache ao deletar
      masterDataCache.delete('solicitantes')
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
      const relatorios = await masterDataCache.get(
        'relatorios',
        () => prisma.relatorio.findMany({
          orderBy: { nome: 'asc' }
        })
      )
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
      masterDataCache.delete('relatorios')
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
      masterDataCache.delete('relatorios')
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
      masterDataCache.delete('relatorios')
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
      const modelos = await masterDataCache.get(
        'modelos',
        () => prisma.modelo.findMany({
          orderBy: { nome: 'asc' }
        })
      )
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
      masterDataCache.delete('modelos')
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
      masterDataCache.delete('modelos')
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
      masterDataCache.delete('modelos')
      console.log('✅ Modelo excluído com sucesso')
      return reply.status(204).send()
    } catch (error) {
      console.error('❌ Erro ao deletar modelo:', error)
      console.error('❌ Detalhes do erro:', error instanceof Error ? error.message : String(error))
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
      return reply.status(500).send({ error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) })
    }
  })

  // ===== TIPOS DE CADASTRO =====
  
  // Schema de validação para TipoCadastro
  const tipoCadastroCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    descricao: z.string().optional()
  })

  const tipoCadastroUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    descricao: z.string().optional()
  })

  // GET /tiposCadastro
  app.get('/tiposCadastro', async (request, reply) => {
    try {
      const tiposCadastro = await masterDataCache.get(
        'tiposCadastro',
        () => prisma.tipoCadastro.findMany({
          orderBy: { nome: 'asc' }
        })
      )
      return reply.send(tiposCadastro)
    } catch (error) {
      console.error('Erro ao buscar tipos de cadastro:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /tiposCadastro
  app.post('/tiposCadastro', async (request, reply) => {
    try {
      const body = tipoCadastroCreateSchema.parse(request.body)
      const tipoCadastro = await prisma.tipoCadastro.create({
        data: body
      })
      masterDataCache.delete('tiposCadastro')
      return reply.status(201).send(tipoCadastro)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar tipo de cadastro:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /tiposCadastro/:id
  app.put('/tiposCadastro/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = tipoCadastroUpdateSchema.parse(request.body)
      
      const tipoCadastro = await prisma.tipoCadastro.update({
        where: { id },
        data: body
      })
      masterDataCache.delete('tiposCadastro')
      return reply.send(tipoCadastro)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar tipo de cadastro:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /tiposCadastro/:id
  app.delete('/tiposCadastro/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      console.log('🔍 DELETE /tiposCadastro/:id - ID recebido:', id)
      
      // Verificar se há manutenções vinculadas a este tipo de cadastro
      const manutencoes = await prisma.manutencao.findMany({
        where: { tipoServicoId: id }
      })
      
      if (manutencoes.length > 0) {
        console.log(`❌ Tipo de cadastro possui ${manutencoes.length} manutenção(ões) vinculada(s)`)
        return reply.status(400).send({ 
          error: 'Não é possível excluir este tipo de cadastro pois existem registros dependentes',
          details: `${manutencoes.length} manutenção(ões) vinculada(s)`
        })
      }
      
      // Verificar se o registro existe
      const existingTipoCadastro = await prisma.tipoCadastro.findUnique({ where: { id } })
      if (!existingTipoCadastro) {
        console.log('❌ Tipo de cadastro não encontrado:', id)
        return reply.status(404).send({ error: 'Tipo de cadastro não encontrado' })
      }
      
      console.log('✅ Tipo de cadastro encontrado, excluindo:', existingTipoCadastro.nome)
      await prisma.tipoCadastro.delete({
        where: { id }
      })
      masterDataCache.delete('tiposCadastro')
      console.log('✅ Tipo de cadastro excluído com sucesso')
      return reply.status(204).send()
    } catch (error) {
      console.error('❌ Erro ao deletar tipo de cadastro:', error)
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
      const areasMailling = await masterDataCache.get(
        'areas-mailling',
        () => prisma.areaMailling.findMany({
          orderBy: { nome: 'asc' }
        })
      )
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
      masterDataCache.delete('areas-mailling')
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
      masterDataCache.delete('areas-mailling')
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
      masterDataCache.delete('areas-mailling')
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
      const cargosMailling = await masterDataCache.get(
        'cargos-mailling',
        () => prisma.cargoMailling.findMany({
          orderBy: { nome: 'asc' }
        })
      )
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
      masterDataCache.delete('cargos-mailling')
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
      masterDataCache.delete('cargos-mailling')
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
      masterDataCache.delete('cargos-mailling')
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
      const filiaisMailling = await masterDataCache.get(
        'filiais-mailling',
        () => prisma.filialMailling.findMany({
          orderBy: { nome: 'asc' }
        })
      )
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
      masterDataCache.delete('filiais-mailling')
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
      masterDataCache.delete('filiais-mailling')
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
      masterDataCache.delete('filiais-mailling')
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
    origem: z.string().optional(),
    // CORRIGIDO: Adicionar novos campos
    posicaoEmail: z.string().optional(),
    grupos: z.string().optional(),
    filiais: z.string().optional(),
    area: z.string().optional(),
    cancelamento: z.string().optional(),
    alteracaoContratual: z.string().optional(),
    alteracaoDadosCliente: z.string().optional(),
    alteracaoServicos: z.string().optional(),
    alteracaoRemuneracao: z.string().optional(),
    curadoriaPortalRh: z.string().optional(),
    documentacaoContratual: z.string().optional(),
    changeLog: z.string().optional()
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
    origem: z.string().optional(),
    // CORRIGIDO: Adicionar novos campos
    posicaoEmail: z.string().optional(),
    grupos: z.string().optional(),
    filiais: z.string().optional(),
    area: z.string().optional(),
    cancelamento: z.string().optional(),
    alteracaoContratual: z.string().optional(),
    alteracaoDadosCliente: z.string().optional(),
    alteracaoServicos: z.string().optional(),
    alteracaoRemuneracao: z.string().optional(),
    curadoriaPortalRh: z.string().optional(),
    documentacaoContratual: z.string().optional(),
    changeLog: z.string().optional()
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

  // ===== GRUPOS =====
  
  // Schema de validação para Grupo
  const grupoCreateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório')
  })

  const grupoUpdateSchema = z.object({
    nome: z.string().min(1, 'Nome é obrigatório')
  })

  // GET /grupos
  app.get('/grupos', async (request, reply) => {
    try {
      const grupos = await masterDataCache.get(
        'grupos',
        () => prisma.grupo.findMany({
          orderBy: { nome: 'asc' }
        })
      )
      return reply.send(grupos)
    } catch (error) {
      console.error('Erro ao buscar grupos:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /grupos
  app.post('/grupos', async (request, reply) => {
    try {
      console.log('🔍 POST /grupos - Dados recebidos:', JSON.stringify(request.body, null, 2))
      const body = grupoCreateSchema.parse(request.body)
      console.log('✅ POST /grupos - Dados validados:', JSON.stringify(body, null, 2))
      
      // Verificar se já existe grupo com mesmo nome (case insensitive)
      const existingGrupo = await prisma.grupo.findFirst({
        where: {
          nome: {
            equals: body.nome,
            mode: 'insensitive'
          }
        }
      })
      
      if (existingGrupo) {
        console.log('❌ POST /grupos - Grupo duplicado:', body.nome)
        return reply.status(400).send({ 
          error: 'Grupo duplicado', 
          message: `Grupo "${body.nome}" já existe. Por favor, escolha um nome diferente.` 
        })
      }
      
      const grupo = await prisma.grupo.create({
        data: body
      })
      masterDataCache.delete('grupos')
      console.log('✅ POST /grupos - Grupo criado:', grupo.id)
      return reply.status(201).send(grupo)
    } catch (error) {
      console.error('❌ POST /grupos - Erro:', error)
      if (error instanceof z.ZodError) {
        console.error('❌ POST /grupos - Erro de validação:', error.issues)
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao criar grupo:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) })
    }
  })

  // PUT /grupos/:id
  app.put('/grupos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = grupoUpdateSchema.parse(request.body)
      
      // Verificar se já existe outro grupo com mesmo nome (excluindo o próprio)
      const duplicateGrupo = await prisma.grupo.findFirst({
        where: {
          nome: {
            equals: body.nome,
            mode: 'insensitive'
          },
          id: {
            not: id
          }
        }
      })
      
      if (duplicateGrupo) {
        return reply.status(400).send({ 
          error: 'Grupo duplicado', 
          message: `Grupo "${body.nome}" já existe. Por favor, escolha um nome diferente.` 
        })
      }
      
      const grupo = await prisma.grupo.update({
        where: { id },
        data: body
      })
      masterDataCache.delete('grupos')
      return reply.send(grupo)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Dados inválidos', details: error.issues })
      }
      console.error('Erro ao atualizar grupo:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /grupos/:id
  app.delete('/grupos/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      console.log('🔍 DELETE /grupos/:id - ID recebido:', id)
      
      // Verificar se o registro existe primeiro
      const existingGrupo = await prisma.grupo.findUnique({ where: { id } })
      if (!existingGrupo) {
        console.log('❌ Grupo não encontrado:', id)
        return reply.status(404).send({ error: 'Grupo não encontrado' })
      }
      
      console.log('✅ Grupo encontrado, excluindo:', existingGrupo.nome)
      await prisma.grupo.delete({
        where: { id }
      })
      masterDataCache.delete('grupos')
      console.log('✅ Grupo excluído com sucesso')
      return reply.status(204).send()
    } catch (error) {
      console.error('❌ Erro ao deletar grupo:', error)
      console.error('❌ Detalhes do erro:', error instanceof Error ? error.message : String(error))
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
      return reply.status(500).send({ error: 'Erro interno do servidor', details: error instanceof Error ? error.message : String(error) })
    }
  })

}
