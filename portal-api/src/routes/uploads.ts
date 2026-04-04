import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { PortalUserRole } from '@prisma/client'
import { isR2Configured, presignGet, presignPut, sanitizeOriginalFileName } from '../lib/r2.js'
import { requirePortalUser } from '../lib/authz.js'
import { prisma } from '../lib/prisma.js'

/** Tipos MIME permitidos para anexos (ajuste conforme o negócio) */
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'application/octet-stream',
])

const MAX_FILE_MB = Math.min(50, Math.max(1, Number(process.env.R2_MAX_FILE_MB) || 25))

function objectKeyForUser(userId: string, originalName: string): string {
  const safe = sanitizeOriginalFileName(originalName)
  return `portal/${userId}/${randomUUID()}-${safe}`
}

function keyBelongsToUser(key: string, userId: string): boolean {
  const prefix = `portal/${userId}/`
  return key.startsWith(prefix) && !key.slice(prefix.length).includes('..')
}

/** Dono do ficheiro, operador/admin, ou gestor do solicitante (caso referencie a key em answers). */
async function canAccessAttachmentKey(
  userId: string,
  role: PortalUserRole,
  key: string
): Promise<boolean> {
  if (keyBelongsToUser(key, userId)) return true

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "PortalCase"
    WHERE answers::text LIKE ${`%${key}%`}
    LIMIT 1
  `
  if (rows.length === 0) return false

  const caseRow = await prisma.portalCase.findUnique({
    where: { id: rows[0].id },
    select: { portalUserId: true },
  })
  if (!caseRow) return false

  if (caseRow.portalUserId === userId) return true
  if (role === PortalUserRole.PORTAL_ADMIN || role === PortalUserRole.PORTAL_OPERATOR) return true
  if (role === PortalUserRole.REQUESTER_MANAGER) {
    const sub = await prisma.portalUser.findFirst({
      where: { id: caseRow.portalUserId, parentManagerId: userId, active: true },
    })
    return !!sub
  }
  return false
}

export async function registerUploadRoutes(app: FastifyInstance) {
  app.post('/uploads/presign', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!isR2Configured()) {
      return reply.code(503).send({
        error: 'Armazenamento de arquivos não configurado',
        hint: 'Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME no Railway.',
      })
    }

    const u = await requirePortalUser(req, reply)
    if (!u) return

    const bodySchema = z.object({
      fileName: z.string().min(1).max(200),
      contentType: z.string().min(1).max(120),
    })

    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'fileName e contentType são obrigatórios' })
    }

    if (!ALLOWED_MIME.has(body.contentType)) {
      return reply.code(400).send({
        error: 'Tipo de arquivo não permitido',
        allowed: [...ALLOWED_MIME],
      })
    }

    const key = objectKeyForUser(u.id, body.fileName)
    const { url, expiresIn } = await presignPut(key, body.contentType)

    return reply.send({
      uploadUrl: url,
      key,
      method: 'PUT' as const,
      headers: { 'Content-Type': body.contentType },
      maxFileBytes: MAX_FILE_MB * 1024 * 1024,
      expiresIn,
    })
  })

  app.post('/uploads/presign-download', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!isR2Configured()) {
      return reply.code(503).send({ error: 'Armazenamento de arquivos não configurado' })
    }

    const u = await requirePortalUser(req, reply)
    if (!u) return

    const bodySchema = z.object({
      key: z.string().min(1).max(500),
    })

    let body: z.infer<typeof bodySchema>
    try {
      body = bodySchema.parse(req.body)
    } catch {
      return reply.code(400).send({ error: 'key é obrigatória' })
    }

    if (!(await canAccessAttachmentKey(u.id, u.role, body.key))) {
      return reply.code(403).send({ error: 'Acesso negado a este arquivo' })
    }

    const { url, expiresIn } = await presignGet(body.key)
    return reply.send({ downloadUrl: url, expiresIn })
  })
}
