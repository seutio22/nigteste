import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

/**
 * Rotas do módulo Placement.
 *
 * - Dados > Placement: cadastro de Filiais (`/placement/filiais`).
 * - Módulo operacional Placement: Fila de cotações (`/placement/cotacoes`).
 */
function onlyDigits(value: string): string {
  return (value || '').replace(/\D+/g, '');
}

function normalizeStatus(value: unknown): 'Ativo' | 'Inativo' {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === 'inativo' || v === 'inactive' || v === '0' || v === 'false') return 'Inativo';
  return 'Ativo';
}

const COTACAO_STATUSES = [
  'Aberta',
  'Em cotação',
  'Aguardando operadora',
  'Proposta enviada',
  'Fechada',
  'Perdida',
  'Cancelada',
] as const;

type CotacaoStatus = (typeof COTACAO_STATUSES)[number];

function normalizeCotacaoStatus(value: unknown): CotacaoStatus {
  const v = String(value ?? '').trim();
  const hit = COTACAO_STATUSES.find((s) => s.toLowerCase() === v.toLowerCase());
  return hit ?? 'Aberta';
}

/** Gera um ticket sequencial no formato COT-YYYYMM-NNNN para a Fila Placement. */
async function generateCotacaoTicket(prisma: PrismaClient): Promise<string> {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prefix = `COT-${yyyymm}-`;
  const last = await prisma.placementCotacao.findFirst({
    where: { ticket: { startsWith: prefix } },
    orderBy: { ticket: 'desc' },
    select: { ticket: true },
  });
  const lastSeq = last?.ticket?.split('-').pop() ?? '0000';
  const nextSeq = Number(lastSeq) + 1;
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

function toDateOrNull(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIntOrNull(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

function toOperadorasArray(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Array.isArray(value)) return null;
  return value
    .map((v) => String(v ?? '').trim())
    .filter((v) => v.length > 0);
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

  // ---- Cotações (Fila) --------------------------------------------------

  /** Lista todas as cotações com analista e cliente para exibição direta. */
  fastify.get('/placement/cotacoes', async (_request, reply) => {
    try {
      const cotacoes = await prisma.placementCotacao.findMany({
        include: {
          analista: { select: { id: true, nome: true } },
          cliente: { select: { id: true, nome: true, cnpj: true } },
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: 'desc' },
      });
      return { cotacoes };
    } catch (error) {
      console.error('❌ GET /placement/cotacoes:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.get('/placement/cotacoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const cotacao = await prisma.placementCotacao.findUnique({
        where: { id },
        include: {
          analista: { select: { id: true, nome: true } },
          cliente: { select: { id: true, nome: true, cnpj: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
      if (!cotacao) return reply.status(404).send({ error: 'Cotação não encontrada' });
      return cotacao;
    } catch (error) {
      console.error('❌ GET /placement/cotacoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.post('/placement/cotacoes', async (request, reply) => {
    try {
      const body = (request.body ?? {}) as Record<string, unknown>;

      const descricao = body.descricao !== undefined ? String(body.descricao ?? '').trim() : '';
      const ramo = body.ramo !== undefined ? String(body.ramo ?? '').trim() : '';
      const observacoes = body.observacoes !== undefined ? String(body.observacoes ?? '').trim() : '';
      const ticketInput = body.ticket !== undefined ? String(body.ticket ?? '').trim() : '';
      const status = normalizeCotacaoStatus(body.status);

      const analistaId = body.analistaId ? String(body.analistaId) : null;
      const clienteId = body.clienteId ? String(body.clienteId) : null;
      const userId = body.userId ? String(body.userId) : null;
      const operadorasIds = toOperadorasArray(body.operadorasIds) ?? null;
      const vidas = toIntOrNull(body.vidas) ?? null;
      const valorEstimadoCents = toIntOrNull(body.valorEstimadoCents) ?? null;
      const dataInicio = toDateOrNull(body.dataInicio) ?? null;
      const dataLimite = toDateOrNull(body.dataLimite) ?? null;

      let ticket = ticketInput;
      if (!ticket) {
        ticket = await generateCotacaoTicket(prisma);
      } else {
        const exists = await prisma.placementCotacao.findUnique({ where: { ticket } });
        if (exists) {
          return reply.status(409).send({
            error: 'Ticket já cadastrado',
            message: `Já existe uma cotação com o ticket ${ticket}.`,
          });
        }
      }

      const created = await prisma.placementCotacao.create({
        data: {
          ticket,
          status,
          analistaId,
          clienteId,
          userId,
          ramo: ramo || null,
          operadorasIds: operadorasIds as any,
          vidas,
          valorEstimadoCents,
          dataInicio,
          dataLimite,
          descricao: descricao || null,
          observacoes: observacoes || null,
        },
        include: {
          analista: { select: { id: true, nome: true } },
          cliente: { select: { id: true, nome: true, cnpj: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
      return reply.status(201).send(created);
    } catch (error) {
      console.error('❌ POST /placement/cotacoes:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.put('/placement/cotacoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const body = (request.body ?? {}) as Record<string, unknown>;

      const existing = await prisma.placementCotacao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Cotação não encontrada' });

      const data: Record<string, unknown> = {};

      if (body.ticket !== undefined) {
        const ticket = String(body.ticket ?? '').trim();
        if (!ticket) {
          return reply.status(400).send({ error: 'Ticket inválido' });
        }
        if (ticket !== existing.ticket) {
          const dup = await prisma.placementCotacao.findUnique({ where: { ticket } });
          if (dup && dup.id !== id) {
            return reply.status(409).send({
              error: 'Ticket já cadastrado',
              message: `Já existe outra cotação com o ticket ${ticket}.`,
            });
          }
        }
        data.ticket = ticket;
      }

      if (body.status !== undefined) data.status = normalizeCotacaoStatus(body.status);
      if (body.analistaId !== undefined) data.analistaId = body.analistaId ? String(body.analistaId) : null;
      if (body.clienteId !== undefined) data.clienteId = body.clienteId ? String(body.clienteId) : null;
      if (body.userId !== undefined) data.userId = body.userId ? String(body.userId) : null;
      if (body.ramo !== undefined) data.ramo = String(body.ramo ?? '').trim() || null;
      if (body.descricao !== undefined) data.descricao = String(body.descricao ?? '').trim() || null;
      if (body.observacoes !== undefined) data.observacoes = String(body.observacoes ?? '').trim() || null;

      const operadoras = toOperadorasArray(body.operadorasIds);
      if (operadoras !== undefined) data.operadorasIds = operadoras as any;

      const vidas = toIntOrNull(body.vidas);
      if (vidas !== undefined) data.vidas = vidas;

      const valor = toIntOrNull(body.valorEstimadoCents);
      if (valor !== undefined) data.valorEstimadoCents = valor;

      const dataInicio = toDateOrNull(body.dataInicio);
      if (dataInicio !== undefined) data.dataInicio = dataInicio;

      const dataLimite = toDateOrNull(body.dataLimite);
      if (dataLimite !== undefined) data.dataLimite = dataLimite;

      const updated = await prisma.placementCotacao.update({
        where: { id },
        data,
        include: {
          analista: { select: { id: true, nome: true } },
          cliente: { select: { id: true, nome: true, cnpj: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
      return updated;
    } catch (error) {
      console.error('❌ PUT /placement/cotacoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });

  fastify.delete('/placement/cotacoes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const existing = await prisma.placementCotacao.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: 'Cotação não encontrada' });
      await prisma.placementCotacao.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      console.error('❌ DELETE /placement/cotacoes/:id:', error);
      return reply.status(500).send({ error: 'Erro interno do servidor' });
    }
  });
}
