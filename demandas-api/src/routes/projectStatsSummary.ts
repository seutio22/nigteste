import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

function extractUserFromAuthHeader(req: {
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, unknown>
}): { id: string | null; role: string | null } {
  try {
    const auth = req?.headers?.authorization || req?.headers?.Authorization
    let token: string | null = null
    if (auth && typeof auth === 'string') {
      const parts = auth.split(' ')
      if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1] ?? null
    }
    if (!token && typeof req?.headers?.cookie === 'string') {
      const m = req.headers.cookie
        .split(';')
        .map((s: string) => s.trim())
        .find((c: string) => c.startsWith('token='))
      if (m) token = m.substring('token='.length)
    }
    if (!token && req.query && typeof req.query.token === 'string') {
      token = req.query.token
    }
    if (!token) {
      const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
      const hdrRole = (req?.headers?.['x-user-role'] || req?.headers?.['X-User-Role']) as string | undefined
      if (hdrId && typeof hdrId === 'string') return { id: hdrId, role: typeof hdrRole === 'string' ? hdrRole : null }
      return { id: null, role: null }
    }
    const segs = token.split('.')
    if (segs.length < 2) return { id: null, role: null }
    const payloadB64 = segs[1]!.replace(/-/g, '+').replace(/_/g, '/')
    const pad = payloadB64.length % 4
    const payloadFixed = payloadB64 + (pad ? '='.repeat(4 - pad) : '')
    const json = Buffer.from(payloadFixed, 'base64').toString('utf8')
    const payload = JSON.parse(json)
    const extractedId = payload?.id || payload?.userId || payload?.user?.id || payload?.sub || null
    const extractedRole = payload?.role || payload?.user?.role || payload?.userRole || null
    return { id: extractedId, role: extractedRole }
  } catch {
    return { id: null, role: null }
  }
}

function parsePhasesFromTimeline(timeline: unknown): any[] {
  if (timeline == null) return []
  let obj: any = timeline
  if (typeof timeline === 'string') {
    try {
      obj = JSON.parse(timeline)
    } catch {
      return []
    }
  }
  if (typeof obj !== 'object' || !obj) return []
  const phases = (obj as { phases?: unknown }).phases
  return Array.isArray(phases) ? phases : []
}

function ymd(d: unknown): Date | null {
  if (d == null) return null
  const s = String(d).trim()
  const part = s.includes('T') ? s.split('T')[0]! : s.slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(part)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function isDoneStatus(s: unknown, completed?: boolean): boolean {
  if (completed === true) return true
  const t = String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  return (
    t.includes('conclu') ||
    t === 'completed' ||
    t === 'done' ||
    t === 'feito'
  )
}

export default async function projectStatsSummaryRoutes(
  fastify: FastifyInstance,
  options: { prisma: PrismaClient }
) {
  const { prisma } = options

  fastify.get('/projetos/stats/summary', async (req: any, reply: any) => {
    try {
      let userId: string | null = null
      try {
        await req.jwtVerify?.()
        const u = req.user
        userId = (u?.id ?? u?.sub) ?? null
      } catch {
        const f = extractUserFromAuthHeader(req)
        userId = f.id
      }
      if (!userId) {
        const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
        if (hdrId && typeof hdrId === 'string') userId = hdrId
      }

      /** Apenas projetos vinculados ao utilizador (não incluir públicos só visíveis). */
      if (!userId) {
        return reply.status(401).send({ error: 'Não autenticado' })
      }

      const where: any = {
        OR: [
          { ownerId: userId },
          { managerId: userId },
          { members: { some: { userId, isActive: true } } },
          { team: { contains: userId } }
        ]
      }

      const projects = await prisma.project.findMany({
        where,
        select: {
          id: true,
          status: true,
          endDate: true,
          timeline: true
        }
      })

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      let totalPhases = 0
      let phasesCompleted = 0
      let phasesOverdue = 0
      let phasesOpenOnTrack = 0
      let totalTasksInTimeline = 0
      let totalSubtasksInTimeline = 0
      let tasksCompleted = 0
      let tasksOverdue = 0
      let tasksDeadlineMet = 0
      let subtasksDeadlineMet = 0
      let subtasksCompleted = 0
      let subtasksOverdue = 0

      let activeProjectCount = 0
      let completedProjectCount = 0
      let pausedProjectCount = 0
      let projectEndOverdue = 0

      for (const p of projects) {
        const st = String(p.status || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        if (st.includes('conclu') || st === 'completed') completedProjectCount++
        else if (st.includes('paus')) pausedProjectCount++
        else if (st.includes('cancel')) {
          /* não conta como ativo */
        } else activeProjectCount++

        const pend = p.endDate instanceof Date ? p.endDate : new Date(p.endDate)
        const pendDay = new Date(pend.getFullYear(), pend.getMonth(), pend.getDate())
        const projDone =
          st.includes('conclu') ||
          st === 'completed' ||
          st.includes('cancel')
        if (!projDone && pendDay.getTime() < todayStart.getTime()) projectEndOverdue++

        const phases = parsePhasesFromTimeline(p.timeline)
        for (const phase of phases) {
          totalPhases++
          const phEnd = ymd(phase?.endDate)
          const phDone = isDoneStatus(phase?.status, phase?.completed)
          if (phDone) phasesCompleted++
          else if (phEnd && phEnd.getTime() < todayStart.getTime()) phasesOverdue++
          else phasesOpenOnTrack++

          const tasks = Array.isArray(phase?.tasks) ? phase.tasks : []
          for (const task of tasks) {
            totalTasksInTimeline++
            const tEnd = ymd(task?.plannedEndDate ?? task?.dueDate ?? task?.endDate)
            const tDone = isDoneStatus(task?.status, task?.completed)
            if (tDone) {
              tasksCompleted++
              const planned = ymd(task?.plannedEndDate ?? task?.dueDate)
              const actual = ymd(task?.actualEndDate)
              if (!planned) tasksDeadlineMet++
              else if (actual && actual.getTime() <= planned.getTime()) tasksDeadlineMet++
              else if (!actual) tasksDeadlineMet++
            } else if (tEnd && tEnd.getTime() < todayStart.getTime()) tasksOverdue++

            const subs = Array.isArray(task?.subtasks) ? task.subtasks : []
            for (const sub of subs) {
              totalSubtasksInTimeline++
              const sEnd = ymd(sub?.dueDate ?? sub?.plannedEndDate)
              const sDone = isDoneStatus(sub?.status, sub?.completed)
              if (sDone) {
                subtasksCompleted++
                const pd = ymd(sub?.dueDate ?? sub?.plannedEndDate)
                const ad = ymd(sub?.actualEndDate)
                if (!pd) subtasksDeadlineMet++
                else if (ad && ad.getTime() <= pd.getTime()) subtasksDeadlineMet++
                else if (!ad) subtasksDeadlineMet++
              } else if (sEnd && sEnd.getTime() < todayStart.getTime()) subtasksOverdue++
            }
          }
        }
      }

      const projectIds = projects.map((x) => x.id)
      let auditTotal = 0
      let auditLast30 = 0
      const byEntity: Record<string, number> = {}
      const byAction: Record<string, number> = {}

      if (projectIds.length > 0) {
        auditTotal = await prisma.projectWorkAuditLog.count({
          where: { projectId: { in: projectIds } }
        })
        const since = new Date()
        since.setDate(since.getDate() - 30)
        since.setHours(0, 0, 0, 0)
        auditLast30 = await prisma.projectWorkAuditLog.count({
          where: { projectId: { in: projectIds }, createdAt: { gte: since } }
        })

        const grouped = await prisma.projectWorkAuditLog.groupBy({
          by: ['entityType', 'action'],
          where: { projectId: { in: projectIds } },
          _count: { _all: true }
        })
        for (const row of grouped) {
          const et = String(row.entityType || 'outro')
          const ac = String(row.action || '')
          byEntity[et] = (byEntity[et] || 0) + row._count._all
          byAction[ac] = (byAction[ac] || 0) + row._count._all
        }
      }

      return reply.send({
        projectCount: projects.length,
        activeProjectCount,
        completedProjectCount,
        pausedProjectCount,
        totalPhases,
        phasesCompleted,
        phasesOverdue,
        phasesOpenOnTrack,
        totalTasksInTimeline,
        totalSubtasksInTimeline,
        tasksCompleted,
        tasksOverdue,
        subtasksCompleted,
        subtasksOverdue,
        tasksDeadlineMet,
        subtasksDeadlineMet,
        projectEndOverdue,
        audit: {
          totalEvents: auditTotal,
          last30Days: auditLast30,
          byEntityType: byEntity,
          byAction
        }
      })
    } catch (err) {
      console.error('GET /projetos/stats/summary:', err)
      return reply.status(500).send({ error: 'Erro ao calcular indicadores de projetos' })
    }
  })
}
