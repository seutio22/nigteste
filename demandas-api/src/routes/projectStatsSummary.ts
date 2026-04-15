import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'

function normName(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/** Liga registo Analista (cadastro) a User (login) por email ou nome. */
async function resolveUserIdFromAnalistaId(
  prisma: PrismaClient,
  analistaId: string
): Promise<string | null> {
  const a = await prisma.analista.findUnique({
    where: { id: analistaId },
    select: { nome: true, email: true }
  })
  if (!a) return null
  const email = (a.email || '').trim()
  if (email) {
    const u = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    })
    if (u) return u.id
  }
  const nome = (a.nome || '').trim()
  if (!nome) return null
  const nn = normName(nome)
  const users = await prisma.user.findMany({ select: { id: true, name: true } })
  for (const u of users) {
    if (normName(u.name) === nn) return u.id
  }
  for (const u of users) {
    const un = normName(u.name)
    if (un.includes(nn) || nn.includes(un)) return u.id
  }
  return null
}

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

/** ISO ou data-only — para comparar com intervalo do dashboard. */
function parseAnyDateTime(d: unknown): Date | null {
  if (d == null) return null
  const s = String(d).trim()
  if (!s) return null
  const t = Date.parse(s)
  if (isNaN(t)) return null
  return new Date(t)
}

/** `from` e `to` em YYYY-MM-DD (interpretação em UTC, alinhada ao envio do front). */
function parseDateRangeInclusive(fromS: string, toS: string): { start: Date; end: Date } | null {
  const fm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fromS).trim())
  const tm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(toS).trim())
  if (!fm || !tm) return null
  const start = new Date(Date.UTC(Number(fm[1]), Number(fm[2]) - 1, Number(fm[3]), 0, 0, 0, 0))
  const end = new Date(Date.UTC(Number(tm[1]), Number(tm[2]) - 1, Number(tm[3]), 23, 59, 59, 999))
  if (start.getTime() > end.getTime()) return null
  return { start, end }
}

function inDateRange(dt: Date | null, range: { start: Date; end: Date }): boolean {
  if (!dt) return false
  const t = dt.getTime()
  return t >= range.start.getTime() && t <= range.end.getTime()
}

/**
 * Data usada para "criada / inserida no período" quando `createdAt` não existe (cronogramas antigos).
 * Ordem: createdAt → startDate → plannedStartDate → fim planejado (due/plannedEnd/end).
 */
function referenceDateForItemCreation(item: Record<string, unknown>): Date | null {
  const c = parseAnyDateTime(item.createdAt)
  if (c) return c
  const s = parseAnyDateTime(item.startDate)
  if (s) return s
  const ps = parseAnyDateTime((item as { plannedStartDate?: unknown }).plannedStartDate)
  if (ps) return ps
  const pe = ymd(
    (item as { plannedEndDate?: unknown }).plannedEndDate ??
      (item as { dueDate?: unknown }).dueDate ??
      (item as { endDate?: unknown }).endDate
  )
  if (pe) return pe
  return null
}

/** Segmentos de nome em `responsible` / `assignee` (vírgula), como no front de Projetos. */
function extractResponsibleSegmentsFromItem(item: Record<string, unknown>): string[] {
  const out: string[] = []
  const pushFrom = (raw: unknown) => {
    if (typeof raw === 'string' && raw.trim()) {
      out.push(...raw.split(',').map((s) => s.trim()).filter(Boolean))
    } else if (raw && typeof raw === 'object') {
      const n = (raw as { nome?: string; name?: string }).nome || (raw as { name?: string }).name
      if (n && String(n).trim()) out.push(String(n).trim())
    }
  }
  pushFrom(item.responsible)
  pushFrom(item.assignee)
  return out
}

function responsibleMatches(segments: string[], aliases: string[]): boolean {
  if (aliases.length === 0 || segments.length === 0) return false
  for (const seg of segments) {
    const ns = normName(seg)
    if (!ns) continue
    for (const al of aliases) {
      const na = normName(al)
      if (!na) continue
      if (ns === na || ns.includes(na) || na.includes(ns)) return true
    }
  }
  return false
}

/**
 * Nomes possíveis do analista no cronograma (cadastro Analista + nome do User).
 * Só faz sentido quando não é visão global de admin sem filtro de analista.
 */
async function getResponsibleAliasesForTarget(
  prisma: PrismaClient,
  targetUserId: string,
  analistaIdParam: string | null
): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, email: true }
  })
  const set = new Set<string>()
  if (user?.name?.trim()) set.add(user.name.trim())
  if (analistaIdParam) {
    const a = await prisma.analista.findUnique({
      where: { id: analistaIdParam },
      select: { nome: true }
    })
    if (a?.nome?.trim()) set.add(a.nome.trim())
  } else {
    if (user?.email) {
      const byEmail = await prisma.analista.findFirst({
        where: { email: { equals: user.email, mode: 'insensitive' } },
        select: { nome: true }
      })
      if (byEmail?.nome?.trim()) set.add(byEmail.nome.trim())
    }
    if (user?.name) {
      const nn = normName(user.name)
      const rows = await prisma.analista.findMany({ select: { nome: true } })
      for (const row of rows) {
        if (row.nome && normName(row.nome) === nn) set.add(row.nome.trim())
      }
    }
  }
  return [...set].filter(Boolean)
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
      let userRole: string | null = null
      try {
        await req.jwtVerify?.()
        const u = req.user as { id?: string; sub?: string; role?: string } | undefined
        userId = (u?.id ?? u?.sub) ?? null
        userRole = u?.role ?? null
      } catch {
        const f = extractUserFromAuthHeader(req)
        userId = f.id
        userRole = f.role
      }
      if (!userId) {
        const hdrId = (req?.headers?.['x-user-id'] || req?.headers?.['X-User-Id']) as string | undefined
        if (hdrId && typeof hdrId === 'string') userId = hdrId
      }
      if (!userRole) {
        const hdrRole = (req?.headers?.['x-user-role'] || req?.headers?.['X-User-Role']) as string | undefined
        if (hdrRole && typeof hdrRole === 'string') userRole = hdrRole
      }

      /** Apenas projetos vinculados ao utilizador (não incluir públicos só visíveis). */
      if (!userId) {
        return reply.status(401).send({ error: 'Não autenticado' })
      }

      const roleLc = String(userRole || '')
        .trim()
        .toLowerCase()
      const isAdmin = roleLc === 'admin'
      const canFilterByAnalista = isAdmin || roleLc === 'gerente'

      const q = req.query as { analistaId?: string; fromDate?: string; toDate?: string }
      const analistaIdParam =
        typeof q.analistaId === 'string' && q.analistaId.trim() ? q.analistaId.trim() : null
      const fromDateQ = typeof q.fromDate === 'string' && q.fromDate.trim() ? q.fromDate.trim() : ''
      const toDateQ = typeof q.toDate === 'string' && q.toDate.trim() ? q.toDate.trim() : ''
      const periodRange = fromDateQ && toDateQ ? parseDateRangeInclusive(fromDateQ, toDateQ) : null

      if (analistaIdParam && !canFilterByAnalista) {
        return reply.status(403).send({ error: 'Sem permissão para filtrar indicadores de projetos por analista.' })
      }

      let targetUserId = userId
      if (analistaIdParam) {
        const resolved = await resolveUserIdFromAnalistaId(prisma, analistaIdParam)
        if (!resolved) {
          return reply.status(400).send({
            error: 'Analista sem utilizador vinculado (email/nome). Ajuste o cadastro ou o utilizador.'
          })
        }
        targetUserId = resolved
      }

      /** Visão global só para admin sem filtro de analista no Dashboard. */
      const isGlobalAdminView = isAdmin && !analistaIdParam

      /**
       * Visão global (admin, sem analista): todos os projetos.
       * Caso contrário: projetos em que o utilizador alvo participa.
       */
      const whereScoped: any = {
        OR: [
          { ownerId: targetUserId },
          { managerId: targetUserId },
          { members: { some: { userId: targetUserId, isActive: true } } },
          { team: { contains: targetUserId } }
        ]
      }

      const projects = await prisma.project.findMany({
        where: isGlobalAdminView ? {} : whereScoped,
        select: {
          id: true,
          status: true,
          endDate: true,
          timeline: true
        }
      })

      const shouldComputeResponsible = !isGlobalAdminView || !!analistaIdParam
      const responsibleAliases = shouldComputeResponsible
        ? await getResponsibleAliasesForTarget(prisma, targetUserId, analistaIdParam)
        : []

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
      let cancelledProjectCount = 0
      let projectEndOverdue = 0

      /** Métricas do cronograma no período (data de criação / conclusão no intervalo). */
      let phasesCreatedInPeriod = 0
      let tasksCreatedInPeriod = 0
      let subtasksCreatedInPeriod = 0
      let phasesCompletedInPeriod = 0
      let tasksCompletedInPeriod = 0
      let subtasksCompletedInPeriod = 0

      let respTasksTotal = 0
      let respTasksCompleted = 0
      let respTasksOverdue = 0
      let respSubtasksTotal = 0
      let respSubtasksCompleted = 0
      let respSubtasksOverdue = 0
      let respTasksCreatedInPeriod = 0
      let respTasksCompletedInPeriod = 0
      let respSubtasksCreatedInPeriod = 0
      let respSubtasksCompletedInPeriod = 0

      for (const p of projects) {
        const st = String(p.status || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        if (st.includes('conclu') || st === 'completed') completedProjectCount++
        else if (st.includes('paus')) pausedProjectCount++
        else if (st.includes('cancel')) cancelledProjectCount++
        else activeProjectCount++

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
          const phCreatedAt = parseAnyDateTime((phase as Record<string, unknown>)?.createdAt)
          const phRef = phCreatedAt || referenceDateForItemCreation(phase as Record<string, unknown>)
          if (periodRange && phRef && inDateRange(phRef, periodRange)) phasesCreatedInPeriod++

          if (phDone) {
            phasesCompleted++
            const phActual = parseAnyDateTime((phase as Record<string, unknown>)?.actualEndDate)
            if (periodRange && phActual && inDateRange(phActual, periodRange)) phasesCompletedInPeriod++
            else if (periodRange && !phActual && phEnd && inDateRange(phEnd, periodRange)) phasesCompletedInPeriod++
          } else if (phEnd && phEnd.getTime() < todayStart.getTime()) phasesOverdue++
          else phasesOpenOnTrack++

          const tasks = Array.isArray(phase?.tasks) ? phase.tasks : []
          for (const task of tasks) {
            const t = task as Record<string, unknown>
            totalTasksInTimeline++
            const tCreatedAt = parseAnyDateTime(t?.createdAt)
            const tRef = tCreatedAt || referenceDateForItemCreation(t as Record<string, unknown>)
            if (periodRange && tRef && inDateRange(tRef, periodRange)) tasksCreatedInPeriod++

            const tEnd = ymd(t?.plannedEndDate ?? t?.dueDate ?? t?.endDate)
            const tDone = isDoneStatus(t?.status, t?.completed as boolean | undefined)
            const actualEnd = parseAnyDateTime(t?.actualEndDate)
            const taskSegs = extractResponsibleSegmentsFromItem(t)
            const taskMatch =
              responsibleAliases.length > 0 && responsibleMatches(taskSegs, responsibleAliases)

            if (taskMatch) {
              respTasksTotal++
              if (tDone) {
                respTasksCompleted++
                if (periodRange && actualEnd && inDateRange(actualEnd, periodRange)) respTasksCompletedInPeriod++
              } else if (tEnd && tEnd.getTime() < todayStart.getTime()) respTasksOverdue++
              if (periodRange && tRef && inDateRange(tRef, periodRange)) respTasksCreatedInPeriod++
            }

            if (tDone) {
              tasksCompleted++
              if (periodRange && actualEnd && inDateRange(actualEnd, periodRange)) tasksCompletedInPeriod++

              const planned = ymd(t?.plannedEndDate ?? t?.dueDate)
              const actual = ymd(t?.actualEndDate)
              if (!planned) tasksDeadlineMet++
              else if (actual && actual.getTime() <= planned.getTime()) tasksDeadlineMet++
              else if (!actual) tasksDeadlineMet++
            } else if (tEnd && tEnd.getTime() < todayStart.getTime()) tasksOverdue++

            const subs = Array.isArray(t?.subtasks) ? t.subtasks : []
            for (const sub of subs) {
              const s = sub as Record<string, unknown>
              totalSubtasksInTimeline++
              const sCreatedAt = parseAnyDateTime(s?.createdAt)
              const sRef = sCreatedAt || referenceDateForItemCreation(s as Record<string, unknown>)
              if (periodRange && sRef && inDateRange(sRef, periodRange)) subtasksCreatedInPeriod++

              const sEnd = ymd(s?.dueDate ?? s?.plannedEndDate)
              const sDone = isDoneStatus(s?.status, s?.completed as boolean | undefined)
              const adSub = parseAnyDateTime(s?.actualEndDate)
              let subSegs = extractResponsibleSegmentsFromItem(s)
              if (subSegs.length === 0) subSegs = taskSegs
              const subMatch =
                responsibleAliases.length > 0 && responsibleMatches(subSegs, responsibleAliases)

              if (subMatch) {
                respSubtasksTotal++
                if (sDone) {
                  respSubtasksCompleted++
                  if (periodRange && adSub && inDateRange(adSub, periodRange)) respSubtasksCompletedInPeriod++
                } else if (sEnd && sEnd.getTime() < todayStart.getTime()) respSubtasksOverdue++
                if (periodRange && sRef && inDateRange(sRef, periodRange)) respSubtasksCreatedInPeriod++
              }

              if (sDone) {
                subtasksCompleted++
                if (periodRange && adSub && inDateRange(adSub, periodRange)) subtasksCompletedInPeriod++

                const pd = ymd(s?.dueDate ?? s?.plannedEndDate)
                const adY = ymd(s?.actualEndDate)
                if (!pd) subtasksDeadlineMet++
                else if (adY && adY.getTime() <= pd.getTime()) subtasksDeadlineMet++
                else if (!adY) subtasksDeadlineMet++
              } else if (sEnd && sEnd.getTime() < todayStart.getTime()) subtasksOverdue++
            }
          }
        }
      }

      const projectIds = projects.map((x) => x.id)
      let auditTotal = 0
      let auditLast30 = 0
      let auditTeamInPeriod = 0
      const byEntity: Record<string, number> = {}
      const byAction: Record<string, number> = {}

      /** Visão global: todos os eventos nos projetos. Caso contrário: só ações do utilizador alvo (filtro analista ou próprio login). */
      const auditWhereBase = isGlobalAdminView
        ? { projectId: { in: projectIds } }
        : { projectId: { in: projectIds }, actorUserId: targetUserId }

      const auditWhereForAgg = periodRange
        ? { ...auditWhereBase, createdAt: { gte: periodRange.start, lte: periodRange.end } }
        : auditWhereBase

      if (projectIds.length > 0) {
        auditTotal = await prisma.projectWorkAuditLog.count({
          where: auditWhereForAgg
        })
        const since = new Date()
        since.setDate(since.getDate() - 30)
        since.setHours(0, 0, 0, 0)
        auditLast30 = await prisma.projectWorkAuditLog.count({
          where: { ...auditWhereBase, createdAt: { gte: since } }
        })

        if (periodRange && !isGlobalAdminView) {
          auditTeamInPeriod = await prisma.projectWorkAuditLog.count({
            where: {
              projectId: { in: projectIds },
              createdAt: { gte: periodRange.start, lte: periodRange.end }
            }
          })
        }

        const grouped = await prisma.projectWorkAuditLog.groupBy({
          by: ['entityType', 'action'],
          where: auditWhereForAgg,
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
        cancelledProjectCount,
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
        period:
          periodRange != null
            ? {
                fromDate: fromDateQ,
                toDate: toDateQ,
                phasesCreated: phasesCreatedInPeriod,
                tasksCreated: tasksCreatedInPeriod,
                subtasksCreated: subtasksCreatedInPeriod,
                phasesCompleted: phasesCompletedInPeriod,
                tasksCompleted: tasksCompletedInPeriod,
                subtasksCompleted: subtasksCompletedInPeriod,
                responsibleTasksCreated: respTasksCreatedInPeriod,
                responsibleTasksCompleted: respTasksCompletedInPeriod,
                responsibleSubtasksCreated: respSubtasksCreatedInPeriod,
                responsibleSubtasksCompleted: respSubtasksCompletedInPeriod
              }
            : null,
        responsibleAsAnalyst: shouldComputeResponsible
          ? {
              aliases: responsibleAliases,
              tasks: {
                total: respTasksTotal,
                completed: respTasksCompleted,
                overdue: respTasksOverdue
              },
              subtasks: {
                total: respSubtasksTotal,
                completed: respSubtasksCompleted,
                overdue: respSubtasksOverdue
              }
            }
          : null,
        audit: {
          totalEvents: auditTotal,
          last30Days: auditLast30,
          teamEventsInPeriod: periodRange ? auditTeamInPeriod : undefined,
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
