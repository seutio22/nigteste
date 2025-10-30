import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

// Interface para os parâmetros das rotas
interface ComunicadoParams {
  id: string
}

interface ComunicadoBody {
  titulo: string
  conteudo: string
  categoria: string
  prioridade: string
  autor: string
  autorId: string
  publicado: boolean
  dataExpiracao?: string
  tags: string[]
}


interface VisualizacaoBody {
  usuarioId: string
  usuarioNome: string
  usuarioRole: string
  tempoVisualizacao?: number
  ipAddress?: string
  userAgent?: string
}

interface ComentarioBody {
  autor: string
  autorId: string
  autorRole?: string
  conteudo: string
}

import { prisma as prismaSingleton } from '../lib/prisma'

// Plugin para registrar as rotas
export default async function comunicadosRoutes(fastify: FastifyInstance, options?: { prisma?: PrismaClient }) {
  // Usar prisma compartilhado (singleton) para evitar múltiplas conexões
  const prisma = options?.prisma || prismaSingleton
  // GET / - Listar todos os comunicados (prefixo já é /comunicados)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const comunicados = await prisma.comunicado.findMany({
        orderBy: { createdAt: 'desc' }
      })

      // Converter tags de JSON string para array
      const comunicadosComTags = comunicados.map(comunicado => ({
        ...comunicado,
        tags: comunicado.tags ? JSON.parse(comunicado.tags) : []
      }))

      return reply.send(comunicadosComTags)
    } catch (error) {
      console.error('Erro ao buscar comunicados:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // GET /:id - Buscar comunicado por ID (prefixo já é /comunicados)
  fastify.get<{ Params: ComunicadoParams }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params

      const comunicado = await prisma.comunicado.findUnique({
        where: { id }
      })

      if (!comunicado) {
        return reply.status(404).send({ error: 'Comunicado não encontrado' })
      }


      // Buscar visualizações
      const visualizacoes = await prisma.comunicadoVisualizacao.findMany({
        where: { comunicadoId: id },
        orderBy: { dataVisualizacao: 'desc' }
      })

      // Buscar comentários ativos
      const comentarios = await prisma.comunicadoComentario.findMany({
        where: { 
          comunicadoId: id,
          status: 'ativo'
        },
        orderBy: { createdAt: 'asc' }
      })

      // Estruturar dados como esperado pelo frontend
      const comunicadoCompleto = {
        ...comunicado,
        tags: comunicado.tags ? JSON.parse(comunicado.tags) : [],
        comentarios: comentarios.map(c => ({
          id: c.id,
          autor: c.autor,
          autorId: c.autorId,
          autorRole: c.autorRole,
          conteudo: c.conteudo,
          dataCriacao: c.createdAt.toISOString(),
          status: c.status
        })),
        visualizacoes: visualizacoes.map(v => ({
          id: v.id,
          usuarioId: v.usuarioId,
          usuarioNome: v.usuarioNome,
          usuarioRole: v.usuarioRole,
          dataVisualizacao: v.dataVisualizacao.toISOString(),
          tempoVisualizacao: v.tempoVisualizacao,
          ipAddress: v.ipAddress,
          userAgent: v.userAgent
        }))
      }

      return reply.send(comunicadoCompleto)
    } catch (error) {
      console.error('Erro ao buscar comunicado:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST / - Criar novo comunicado (prefixo já é /comunicados)
  fastify.post<{ Body: ComunicadoBody }>('/', async (request, reply) => {
    try {
      const { titulo, conteudo, categoria, prioridade, autor, autorId, publicado, dataExpiracao, tags } = request.body

      const comunicado = await prisma.comunicado.create({
        data: {
          titulo,
          conteudo,
          categoria,
          prioridade,
          autor,
          autorId,
          publicado,
          dataExpiracao,
          tags: JSON.stringify(tags || [])
        }
      })

      return reply.status(201).send(comunicado)
    } catch (error) {
      console.error('Erro ao criar comunicado:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // PUT /:id - Atualizar comunicado (prefixo já é /comunicados)
  fastify.put<{ Params: ComunicadoParams; Body: Partial<ComunicadoBody> }>('/:id', async (request, reply) => {
    try {
      console.log('🔍 Backend: PUT /:id chamado')
      const { id } = request.params
      const updateData = request.body

      // Remover campos undefined
      const cleanUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      )

      if (cleanUpdateData.tags) {
        cleanUpdateData.tags = JSON.stringify(cleanUpdateData.tags)
      }

      const comunicado = await prisma.comunicado.update({
        where: { id },
        data: cleanUpdateData
      })

      return reply.send(comunicado)
    } catch (error) {
      console.error('Erro ao atualizar comunicado:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /:id - Excluir comunicado (prefixo já é /comunicados)
  fastify.delete<{ Params: ComunicadoParams }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params

      // Excluir visualizações primeiro
      await prisma.comunicadoVisualizacao.deleteMany({ where: { comunicadoId: id } })

      // Excluir comunicado
      await prisma.comunicado.delete({ where: { id } })

      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao excluir comunicado:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })


  // POST /:id/visualizacoes - Registrar visualização (prefixo já é /comunicados)
  fastify.post<{ Params: ComunicadoParams; Body: VisualizacaoBody }>('/:id/visualizacoes', async (request, reply) => {
    try {
      const { id } = request.params
      const { usuarioId, usuarioNome, usuarioRole, tempoVisualizacao, ipAddress, userAgent } = request.body

      const visualizacao = await prisma.comunicadoVisualizacao.create({
        data: {
          comunicadoId: id,
          usuarioId,
          usuarioNome,
          usuarioRole,
          tempoVisualizacao,
          ipAddress,
          userAgent
        }
      })

      return reply.status(201).send(visualizacao)
    } catch (error) {
      console.error('Erro ao registrar visualização:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // POST /:id/comentarios - Adicionar comentário (prefixo já é /comunicados)
  fastify.post<{ Params: ComunicadoParams; Body: ComentarioBody }>('/:id/comentarios', async (request, reply) => {
    try {
      const { id } = request.params
      const { autor, autorId, autorRole, conteudo } = request.body

      // Validar se o comunicado existe
      const comunicado = await prisma.comunicado.findUnique({
        where: { id }
      })

      if (!comunicado) {
        return reply.status(404).send({ error: 'Comunicado não encontrado' })
      }

      // Criar comentário
      const comentario = await prisma.comunicadoComentario.create({
        data: {
          comunicadoId: id,
          autor,
          autorId,
          autorRole: autorRole || 'user',
          conteudo: conteudo.trim()
        }
      })

      return reply.status(201).send({
        id: comentario.id,
        autor: comentario.autor,
        autorId: comentario.autorId,
        autorRole: comentario.autorRole,
        conteudo: comentario.conteudo,
        dataCriacao: comentario.createdAt.toISOString(),
        status: comentario.status
      })
    } catch (error) {
      console.error('Erro ao adicionar comentário:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // DELETE /:id/comentarios/:comentarioId - Remover comentário (prefixo já é /comunicados)
  fastify.delete<{ Params: { id: string; comentarioId: string } }>('/:id/comentarios/:comentarioId', async (request, reply) => {
    try {
      const { comentarioId } = request.params

      // Verificar se o comentário existe
      const comentario = await prisma.comunicadoComentario.findUnique({
        where: { id: comentarioId }
      })

      if (!comentario) {
        return reply.status(404).send({ error: 'Comentário não encontrado' })
      }

      // Marcar como removido (soft delete)
      await prisma.comunicadoComentario.update({
        where: { id: comentarioId },
        data: { 
          status: 'removido',
          updatedAt: new Date()
        }
      })

      return reply.status(204).send()
    } catch (error) {
      console.error('Erro ao remover comentário:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
