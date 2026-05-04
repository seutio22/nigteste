import type { FastifyInstance, FastifyReply } from 'fastify'

import { z } from 'zod'

import { PortalUserRole } from '@prisma/client'

import { assertRole, requirePortalUser } from '../lib/authz.js'

import {

  SEGUROS_BASE_SNAPSHOT_VERSION,

  analyzeSegurosBaseSnapshot,

  applySegurosBaseSnapshot,

  buildSegurosBaseSnapshot,

  segurosBaseSnapshotBodySchema,

  type SegurosBaseSnapshotParsed,

} from '../lib/seguros-base-snapshot.js'

import { parseSegurosBaseExcelBuffer, segurosSnapshotToExcelBuffer } from '../lib/seguros-base-excel.js'



const importBodySchema = z.object({

  dryRun: z.boolean(),

  snapshot: z.unknown(),

})



async function sendImportResult(

  reply: FastifyReply,

  parsed: SegurosBaseSnapshotParsed,

  dryRun: boolean,

  source: 'excel' | 'json',

): Promise<void> {

  const { issues, statsIfApplied } = await analyzeSegurosBaseSnapshot(parsed)

  const errors = issues.filter((x) => x.severity === 'error')

  const warnings = issues.filter((x) => x.severity === 'warning')

  const canApply = errors.length === 0



  if (dryRun) {

    return reply.send({

      ok: true,

      dryRun: true,

      source,

      canApply,

      schemaVersion: parsed.schemaVersion,

      counts: {

        grupos: parsed.grupos.length,

        estipulantes: parsed.estipulantes.length,

        apolices: parsed.apolices.length,

        itens: parsed.itens.length,

      },

      statsIfApplied,

      issues,

      errors,

      warnings,

    })

  }



  if (!canApply) {

    return reply.code(409).send({

      ok: false,

      error: 'Importação bloqueada: corrija os erros indicados (simulação com o mesmo ficheiro).',

      errors,

      warnings,

    })

  }



  try {

    const applied = await applySegurosBaseSnapshot(parsed)

    return reply.send({

      ok: true,

      dryRun: false,

      source,

      applied,

      warnings,

    })

  } catch (e) {

    const message = e instanceof Error ? e.message : 'Falha ao gravar'

    return reply.code(500).send({ ok: false, error: message })

  }

}



export async function registerSegurosBaseSnapshotRoutes(app: FastifyInstance) {

  app.get('/admin/seguros-base/export', async (req, reply) => {

    const u = await requirePortalUser(req, reply)

    if (!u) return

    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return



    const q = req.query as { format?: string }

    const asJson = q.format === 'json'



    const snapshot = await buildSegurosBaseSnapshot()



    if (asJson) {

      reply.header(

        'Content-Disposition',

        `attachment; filename="portal-seguros-base-v${SEGUROS_BASE_SNAPSHOT_VERSION}.json"`,

      )

      return reply.type('application/json; charset=utf-8').send(JSON.stringify(snapshot, null, 2))

    }



    const buf = await segurosSnapshotToExcelBuffer(snapshot)

    reply.header(

      'Content-Disposition',

      `attachment; filename="portal-seguros-base-v${SEGUROS_BASE_SNAPSHOT_VERSION}.xlsx"`,

    )

    return reply.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').send(buf)

  })



  app.post('/admin/seguros-base/import', { bodyLimit: 52 * 1024 * 1024 }, async (req, reply) => {

    const u = await requirePortalUser(req, reply)

    if (!u) return

    if (!assertRole(u, [PortalUserRole.PORTAL_ADMIN], reply)) return



    if (req.isMultipart()) {

      let dryRun = true

      let fileBuf: Buffer | null = null

      try {

        const parts = req.parts()

        for await (const part of parts) {

          if (part.type === 'file' && part.fieldname === 'file') {

            fileBuf = await part.toBuffer()

          } else if (part.type === 'field' && part.fieldname === 'dryRun') {

            dryRun = String(part.value).toLowerCase() === 'true'

          }

        }

      } catch {

        return reply.code(400).send({ error: 'Upload multipart inválido ou ficheiro demasiado grande.' })

      }



      if (!fileBuf?.length) {

        return reply.code(400).send({ error: 'Envie o campo file (.xlsx) com dryRun=true ou false.' })

      }



      const excel = await parseSegurosBaseExcelBuffer(fileBuf)

      if (!excel.ok) {

        return reply.code(400).send({ error: excel.error })

      }



      return sendImportResult(reply, excel.snapshot, dryRun, 'excel')

    }



    let body: z.infer<typeof importBodySchema>

    try {

      body = importBodySchema.parse(req.body)

    } catch (e) {

      if (e instanceof z.ZodError) {

        return reply.code(400).send({ error: e.issues[0]?.message || 'Corpo inválido' })

      }

      return reply.code(400).send({ error: 'Corpo inválido' })

    }



    const parsed = segurosBaseSnapshotBodySchema.safeParse(body.snapshot)

    if (!parsed.success) {

      const msg = parsed.error.issues[0]?.message ?? 'Snapshot inválido'

      const path = parsed.error.issues[0]?.path.join('.')

      return reply.code(400).send({

        error: msg,

        path,

        hint: `JSON: schemaVersion=${SEGUROS_BASE_SNAPSHOT_VERSION} e arrays (grupos, estipulantes, apolices, itens; opcionais comissão/fee no Excel). Ou use multipart com ficheiro Excel.`,

      })

    }



    return sendImportResult(reply, parsed.data, body.dryRun, 'json')

  })

}

