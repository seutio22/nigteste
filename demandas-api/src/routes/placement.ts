import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

/**
 * Rotas do módulo Placement (Dados > Placement).
 *
 * Primeira tabela: Filiais (razão social, CNPJ, status).
 * Próximas tabelas devem seguir o mesmo padrão de prefixo `/placement/...`.
 */
function onlyDigits(value: string): string {
  return (value || '').replace(/\D+/g, '');
}

function normalizeStatus(value: unknown): 'Ativo' | 'Inativo' {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'inativo' || v === 'inactive' || v === '0' || v === 'false') return 'Inativo';
  return 'Ativo';
}

export default async function placementRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options;

  // ---- Filiais ----------------------------------------------------------

  fastify.get('/placement/filiais', async (_request, reply) => {
    try {
      const filiais = await prisma.placementFilial.findMany({
        orderBy: { razaoSocial: 'asc' },
      });
      return { filiais };
    } catch (error) {
      console.error('❌ GET /placement/filiais:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/filiais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const filial = await prisma.placementFilial.findUnique({ where: { id } });
      if (!filial) return reply.status(404).send({ error: 'Filial não encontrada' });
      return filial;
    } catch (error) {
      console.error('❌ GET /placement/filiais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/filiais', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as {
        razaoSocial?: string;
        cnpj?: string;
        status?: string;
      };

      const razaoSocial = String(body.razaoSocial ?? '').trim();
      const cnpjDigits = onlyDigits(String(body.cnpj ?? ''));
      const status = normalizeStatus(body.status);

      if (!razaoSocial) {
        return reply.status(400).send({ error: 'Razão social é obrigatória' });
      }
      if (cnpjDigits.length !== 14) {
        return reply
          .status(400)
          .send({ error: 'CNPJ inválido — informe os 14 dígitos' });
      }

      const exists = await prisma.placementFilial.findUnique({ where: { cnpj: cnpjDigits } });
      if (exists) {
        return reply.status(409).send({
          error: 'CNPJ já cadastrado',
          message: `Já existe uma filial cadastrada com este CNPJ (${exists.razaoSocial}).`,
        });
      }

      const created = await prisma.placementFilial.create({
        data: { razaoSocial, cnpj: cnpjDigits, status },
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/filiais:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/filiais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as {
        razaoSocial?: string;
        cnpj?: string;
        status?: string;
      };

      const existing = await prisma.placementFilial.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Filial não encontrada' });

      const data: Record<string, unknown> = {};

      if (body.razaoSocial !== undefined) {
        const razaoSocial = String(body.razaoSocial).trim();
        if (!razaoSocial) {
          return reply.status(400).send({ error: 'Razão social é obrigatória' });
        }
        data.razaoSocial = razaoSocial;
      }

      if (body.cnpj !== undefined) {
        const cnpjDigits = onlyDigits(String(body.cnpj));
        if (cnpjDigits.length !== 14) {
          return reply
            .status(400)
            .send({ error: 'CNPJ inválido — informe os 14 dígitos' });
        }
        if (cnpjDigits !== existing.cnpj) {
          const dup = await prisma.placementFilial.findUnique({ where: { cnpj: cnpjDigits } });
          if (dup && dup.id !== id) {
            return reply.status(409).send({
              error: 'CNPJ já cadastrado',
              message: `Já existe outra filial com este CNPJ (${dup.razaoSocial}).`,
            });
          }
        }
        data.cnpj = cnpjDigits;
      }

      if (body.status !== undefined) {
        data.status = normalizeStatus(body.status);
      }

      const updated = await prisma.placementFilial.update({ where: { id }, data });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/filiais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/filiais/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementFilial.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Filial não encontrada' });

      await prisma.placementFilial.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/filiais/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}
