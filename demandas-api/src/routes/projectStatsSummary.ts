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
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true }
    })
    if (u) return u.id
  }
  const nome = (a.nome || '').trim()
  if (!nome) return null
  const exact = await prisma.user.findFirst({
    where: { name: { equals: nome, mode: 'insensitive' } },
    select: { id: true }
  })
  if (exact) return exact.id

  // Evita carregar todos os users: busca parcial limitada
  const candidates = await prisma.user.findMany({
    where: { name: { contains: nome, mode: 'insensitive' } },
    select: { id: true, name: true },
    take: 40
  })
  const nn = normName(nome)
  for (const u of candidates) {
    if (normName(u.name) === nn) return u.id
  }
  for (const u of candidates) {
    const un = normName(u.name)
    if (un.includes(nn) || nn.includes(un)) return u.id
  }
  return null
}

function extractUserFromAuthHeader(_req: {
  headers: Record<string, string | string[] | undefined>
  query?: Record<string, unknown>
}): { id: string | null; role: string | null } {
  // Identidade só via jwtVerify + authUser; sem decode unsigned / x-user-*
  return { id: null, role: null }
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

/**
 * `from` e `to` em YYYY-MM-DD.
 * Usa `tzOffsetMinutes` (Date.getTimezoneOffset do browser) para alinhar o intervalo ao dia local do usuário.
 */
function parseDateRangeInclusive(
  fromS: string,
  toS: string,
  tzOffsetMinutes: number
): { start: Date; end: Date } | null {
  const fm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fromS).trim())
  const tm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(toS).trim())
  if (!fm || !tm) return null
  const off = Number.isFinite(tzOffsetMinutes) ? tzOffsetMinutes : 0
  // getTimezoneOffset: minutos a SOMAR ao horário local para obter UTC.
  const shiftMs = off * 60 * 1000
  const startUtcMs = Date.UTC(Number(fm[1]), Number(fm[2]) - 1, Number(fm[3]), 0, 0, 0, 0) + shiftMs
  const endUtcMs = Date.UTC(Number(tm[1]), Number(tm[2]) - 1, Number(tm[3]), 23, 59, 59, 999) + shiftMs
  const start = new Date(startUtcMs)
  const end = new Date(endUtcMs)
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
  const set = new Set<string>()
  if (analistaIdParam) {
    const [user, a] = await Promise.all([
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { name: true }
      }),
      prisma.analista.findUnique({
        where: { id: analistaIdParam },
        select: { nome: true }
      })
    ])
    if (user?.name?.trim()) set.add(user.name.trim())
    if (a?.nome?.trim()) set.add(a.nome.trim())
    return [...set].filter(Boolean)
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { name: true, email: true }
  })
  if (user?.name?.trim()) set.add(user.name.trim())
  if (user?.email) {
    const byEmail = await prisma.analista.findFirst({
      where: { email: { equals: user.email, mode: 'insensitive' } },
      select: { nome: true }
    })
    if (byEmail?.nome?.trim()) set.add(byEmail.nome.trim())
  }
  if (user?.name) {
    const byName = await prisma.analista.findFirst({
      where: { nome: { equals: user.name, mode: 'insensitive' } },
      select: { nome: true }
    })
    if (byName?.nome?.trim()) set.add(byName.nome.trim())
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

      /** Apenas projetos vinculados ao utilizador (não incluir públicos só visíveis). */
      if (!userId) {
        return reply.status(401).send({ error: 'Não autenticado' })
      }

      const roleLc = String(userRole || '')
        .trim()
        .toLowerCase()
      const isAdmin = roleLc === 'admin'
      const canFilterByAnalista = isAdmin || roleLc === 'gerente'

      const q = req.query as {
        analistaId?: string
        fromDate?: string
        toDate?: string
        tzOffsetMinutes?: string
      }
      const analistaIdParam =
        typeof q.analistaId === 'string' && q.analistaId.trim() ? q.analistaId.trim() : null
      const fromDateQ = typeof q.fromDate === 'string' && q.fromDate.trim() ? q.fromDate.trim() : ''
      const toDateQ = typeof q.toDate === 'string' && q.toDate.trim() ? q.toDate.trim() : ''
      const tzOffsetMinutes = q.tzOffsetMinutes ? Number.parseInt(q.tzOffsetMinutes, 10) : 0
      const periodRange =
        fromDateQ && toDateQ ? parseDateRangeInclusive(fromDateQ, toDateQ, tzOffsetMinutes) : null

      if (analistaIdParam && !canFilterByAnalista) {
        return reply.status(403).send({ error: 'Sem permissão para filtrar indicadores de projetos por analista.' })
      }

      let targetUserId = userId
      let resolvedFromAnalista = false
      if (analistaIdParam) {
        const resolved = await resolveUserIdFromAnalistaId(prisma, analistaIdParam)
        if (resolved) {
          targetUserId = resolved
          resolvedFromAnalista = true
        } else {
          const exists = await prisma.analista.findUnique({
            where: { id: analistaIdParam },
            select: { id: true, nome: true }
          })
          if (!exists) {
            return reply.status(400).send({ error: 'Analista não encontrado no cadastro.' })
          }
          // Sem User vinculado: admin/gerente ainda filtram pela responsabilidade no cronograma (nome).
          if (!canFilterByAnalista) {
            return reply.status(400).send({
              error: 'Analista sem utilizador vinculado (email/nome). Ajuste o cadastro ou o utilizador.'
            })
          }
        }
      }

      /** Visão global só para admin sem filtro de analista no Dashboard. */
      const isGlobalAdminView = isAdmin && !analistaIdParam
      /** Admin/gerente filtrando analista sem User: usa todos os projetos e mede pelo nome no cronograma. */
      const isAliasOnlyFilter = Boolean(analistaIdParam) && !resolvedFromAnalista && canFilterByAnalista

      /**
       * Visão global (admin, sem analista): todos os projetos.
       * Alias-only: todos os projetos (métricas de atuação usam o nome do analista).
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
        where: isGlobalAdminView || isAliasOnlyFilter ? {} : whereScoped,
        select: {
          id: true,
          name: true,
          status: true,
          priority: true,
          progress: true,
          createdAt: true,
          startDate: true,
          endDate: true,
          updatedAt: true,
          timeline: true
        }
      })

      const shouldComputeResponsible = !isGlobalAdminView || !!analistaIdParam
      const responsibleAliases = shouldComputeResponsible
        ? isAliasOnlyFilter
          ? await (async () => {
              const a = await prisma.analista.findUnique({
                where: { id: analistaIdParam! },
                select: { nome: true }
              })
              return a?.nome?.trim() ? [a.nome.trim()] : []
            })()
          : await getResponsibleAliasesForTarget(prisma, targetUserId, analistaIdParam)
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
      let projectsCompletedInPeriod = 0

      // Produtividade / desvio
      let slippageSumDays = 0
      let slippageCount = 0
      let estimatedHoursSum = 0
      let actualHoursSum = 0
      let deadlineEvaluated = 0
      let deadlineMetCount = 0

      type CompletedTimelineItem = {
        type: 'projeto' | 'etapa' | 'tarefa' | 'subtarefa'
        projectId: string
        projectName: string
        label: string
        completedAt: string
      }
      const completedItemsInPeriod: CompletedTimelineItem[] = []
      const pushCompleted = (it: CompletedTimelineItem) => {
        // evita lista enorme no painel (UX) e no payload
        if (completedItemsInPeriod.length >= 15) return
        completedItemsInPeriod.push(it)
      }

      type OverdueItem = {
        type: 'tarefa' | 'subtarefa'
        projectId: string
        projectName: string
        label: string
        dueDate: string
        responsible: string
        daysOverdue: number
      }
      const overdueItems: OverdueItem[] = []

      type ProjectBreakdown = {
        id: string
        name: string
        status: string
        priority: string | null
        progress: number
        endDate: string | null
        endOverdue: boolean
        phasesTotal: number
        phasesOverdue: number
        tasksTotal: number
        tasksCompleted: number
        tasksOverdue: number
        subtasksTotal: number
        subtasksCompleted: number
        subtasksOverdue: number
        myTasksTotal: number
        myTasksCompleted: number
        myTasksOverdue: number
        mySubtasksTotal: number
        mySubtasksCompleted: number
        mySubtasksOverdue: number
        completedInPeriod: number
        riskScore: number
      }
      const projectsBreakdown: ProjectBreakdown[] = []

      const pushOverdue = (it: OverdueItem) => {
        if (overdueItems.length >= 40) return
        overdueItems.push(it)
      }

      const daysBetween = (a: Date, b: Date) =>
        Math.round((b.getTime() - a.getTime()) / (24 * 60 * 60 * 1000))

      const noteSlippage = (planned: Date | null, actual: Date | null) => {
        if (!planned || !actual) return
        slippageSumDays += daysBetween(planned, actual)
        slippageCount++
      }

      const noteHours = (item: Record<string, unknown>) => {
        const est = Number(item.estimatedHours)
        const act = Number(item.actualHours)
        if (Number.isFinite(est) && est > 0) estimatedHoursSum += est
        if (Number.isFinite(act) && act > 0) actualHoursSum += act
      }

      const noteDeadline = (planned: Date | null, actual: Date | null, done: boolean) => {
        if (!done) return
        deadlineEvaluated++
        if (!planned) {
          deadlineMetCount++
          return
        }
        if (actual && actual.getTime() <= planned.getTime()) deadlineMetCount++
        else if (!actual) deadlineMetCount++
      }

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
        const projectCompleted =
          st === 'completed' ||
          st === 'done' ||
          st === 'closed' ||
          st.includes('conclu') ||
          st.includes('finaliz') ||
          st.includes('entreg')
        if (projectCompleted) completedProjectCount++
        else if (st.includes('paus')) pausedProjectCount++
        else if (st.includes('cancel')) cancelledProjectCount++
        else activeProjectCount++

        const pb: ProjectBreakdown = {
          id: p.id,
          name: p.name,
          status: String(p.status || ''),
          priority: p.priority != null ? String(p.priority) : null,
          progress: typeof p.progress === 'number' ? p.progress : Number(p.progress) || 0,
          endDate: p.endDate ? new Date(p.endDate).toISOString() : null,
          endOverdue: false,
          phasesTotal: 0,
          phasesOverdue: 0,
          tasksTotal: 0,
          tasksCompleted: 0,
          tasksOverdue: 0,
          subtasksTotal: 0,
          subtasksCompleted: 0,
          subtasksOverdue: 0,
          myTasksTotal: 0,
          myTasksCompleted: 0,
          myTasksOverdue: 0,
          mySubtasksTotal: 0,
          mySubtasksCompleted: 0,
          mySubtasksOverdue: 0,
          completedInPeriod: 0,
          riskScore: 0
        }

        // Conclusões de PROJETOS no período (o "Resumo Geral" considera o projeto como item concluído).
        // Nem todo projeto concluído tem tarefa/subtarefa/etapa com `actualEndDate`, então também listamos aqui.
        if (periodRange && projectCompleted) {
          const pUpdated = parseAnyDateTime((p as any)?.updatedAt)
          const completionRef = pUpdated || parseAnyDateTime((p as any)?.endDate)
          const createdRef = parseAnyDateTime((p as any)?.createdAt)
          const startRef = parseAnyDateTime((p as any)?.startDate)
          const creationRef = createdRef || startRef

          // Alinha com o Dashboard: no "diário", se não houver data de conclusão no intervalo,
          // ainda conta quando o item foi criado no próprio dia selecionado.
          const isSingleDay =
            fromDateQ &&
            toDateQ &&
            String(fromDateQ).trim() === String(toDateQ).trim()

          const inCompletion = completionRef && inDateRange(completionRef, periodRange)
          const inCreationDailyFallback =
            !inCompletion && isSingleDay && creationRef && inDateRange(creationRef, periodRange)

          if (inCompletion || inCreationDailyFallback) {
            projectsCompletedInPeriod++
            pb.completedInPeriod++
            pushCompleted({
              type: 'projeto',
              projectId: p.id,
              projectName: p.name,
              label: `${p.name} • Projeto concluído`,
              completedAt: (completionRef || creationRef!).toISOString()
            })
          }
        }

        const pend = p.endDate instanceof Date ? p.endDate : new Date(p.endDate)
        const pendDay = new Date(pend.getFullYear(), pend.getMonth(), pend.getDate())
        const projDone =
          st.includes('conclu') ||
          st === 'completed' ||
          st.includes('cancel')
        if (!projDone && pendDay.getTime() < todayStart.getTime()) {
          projectEndOverdue++
          pb.endOverdue = true
        }

        const phases = parsePhasesFromTimeline(p.timeline)
        for (const phase of phases) {
          totalPhases++
          pb.phasesTotal++
          const phEnd = ymd(phase?.endDate)
          const phDone = isDoneStatus(phase?.status, phase?.completed)
          const phCreatedAt = parseAnyDateTime((phase as Record<string, unknown>)?.createdAt)
          const phRef = phCreatedAt || referenceDateForItemCreation(phase as Record<string, unknown>)
          if (periodRange && phRef && inDateRange(phRef, periodRange)) phasesCreatedInPeriod++

          if (phDone) {
            phasesCompleted++
            const phActual = parseAnyDateTime((phase as Record<string, unknown>)?.actualEndDate)
            if (periodRange && phActual && inDateRange(phActual, periodRange)) {
              phasesCompletedInPeriod++
              pb.completedInPeriod++
            } else if (periodRange && !phActual && phEnd && inDateRange(phEnd, periodRange)) {
              phasesCompletedInPeriod++
              pb.completedInPeriod++
            }
            if (periodRange) {
              const dt = phActual || (phEnd ? new Date(phEnd) : null)
              if (dt && inDateRange(dt, periodRange)) {
                const phName =
                  (phase as any)?.name || (phase as any)?.title || (phase as any)?.nome || 'Etapa'
                pushCompleted({
                  type: 'etapa',
                  projectId: p.id,
                  projectName: p.name,
                  label: `${p.name} • Etapa: ${String(phName)}`,
                  completedAt: dt.toISOString()
                })
              }
            }
            noteSlippage(phEnd, phActual ? ymd((phase as any)?.actualEndDate) : null)
          } else if (phEnd && phEnd.getTime() < todayStart.getTime()) {
            phasesOverdue++
            pb.phasesOverdue++
          } else phasesOpenOnTrack++

          const tasks = Array.isArray(phase?.tasks) ? phase.tasks : []
          for (const task of tasks) {
            const t = task as Record<string, unknown>
            totalTasksInTimeline++
            pb.tasksTotal++
            noteHours(t)
            const tCreatedAt = parseAnyDateTime(t?.createdAt)
            const tRef = tCreatedAt || referenceDateForItemCreation(t as Record<string, unknown>)
            if (periodRange && tRef && inDateRange(tRef, periodRange)) tasksCreatedInPeriod++

            const tEnd = ymd(t?.plannedEndDate ?? t?.dueDate ?? t?.endDate)
            const tDone = isDoneStatus(t?.status, t?.completed as boolean | undefined)
            const actualEnd = parseAnyDateTime(t?.actualEndDate)
            // Alguns cronogramas não preenchem `actualEndDate`. Para não subcontar “concluídos no período”,
            // usamos `updatedAt` como fallback quando o status já está concluído.
            const tUpdated = parseAnyDateTime(t?.updatedAt ?? (t as any)?.updated_at)
            const completionRef = actualEnd || (tDone ? tUpdated : null)
            const taskSegs = extractResponsibleSegmentsFromItem(t)
            const taskMatch =
              responsibleAliases.length > 0 && responsibleMatches(taskSegs, responsibleAliases)
            const taskTitle = (t as any)?.title || (t as any)?.name || (t as any)?.nome || 'Tarefa'
            const phName = (phase as any)?.name || (phase as any)?.title || (phase as any)?.nome
            const responsibleLabel = taskSegs.join(', ') || '—'

            if (taskMatch) {
              respTasksTotal++
              pb.myTasksTotal++
              if (tDone) {
                respTasksCompleted++
                pb.myTasksCompleted++
                if (periodRange && completionRef && inDateRange(completionRef, periodRange)) respTasksCompletedInPeriod++
              } else if (tEnd && tEnd.getTime() < todayStart.getTime()) {
                respTasksOverdue++
                pb.myTasksOverdue++
              }
              if (periodRange && tRef && inDateRange(tRef, periodRange)) respTasksCreatedInPeriod++
            }

            if (tDone) {
              tasksCompleted++
              pb.tasksCompleted++
              if (periodRange && completionRef && inDateRange(completionRef, periodRange)) {
                tasksCompletedInPeriod++
                pb.completedInPeriod++
                pushCompleted({
                  type: 'tarefa',
                  projectId: p.id,
                  projectName: p.name,
                  label: `${p.name}${phName ? ` • Etapa: ${String(phName)}` : ''} • Tarefa: ${String(taskTitle)}`,
                  completedAt: completionRef.toISOString()
                })
              }

              const planned = ymd(t?.plannedEndDate ?? t?.dueDate)
              const actual = ymd(t?.actualEndDate)
              noteDeadline(planned, actual, true)
              noteSlippage(planned, actual)
              if (!planned) tasksDeadlineMet++
              else if (actual && actual.getTime() <= planned.getTime()) tasksDeadlineMet++
              else if (!actual) tasksDeadlineMet++
            } else if (tEnd && tEnd.getTime() < todayStart.getTime()) {
              tasksOverdue++
              pb.tasksOverdue++
              pushOverdue({
                type: 'tarefa',
                projectId: p.id,
                projectName: p.name,
                label: `${p.name}${phName ? ` • ${String(phName)}` : ''} • ${String(taskTitle)}`,
                dueDate: tEnd.toISOString(),
                responsible: responsibleLabel,
                daysOverdue: daysBetween(tEnd, todayStart)
              })
            }

            const subs = Array.isArray(t?.subtasks) ? t.subtasks : []
            for (const sub of subs) {
              const s = sub as Record<string, unknown>
              totalSubtasksInTimeline++
              pb.subtasksTotal++
              noteHours(s)
              const sCreatedAt = parseAnyDateTime(s?.createdAt)
              const sRef = sCreatedAt || referenceDateForItemCreation(s as Record<string, unknown>)
              if (periodRange && sRef && inDateRange(sRef, periodRange)) subtasksCreatedInPeriod++

              const sEnd = ymd(s?.dueDate ?? s?.plannedEndDate)
              const sDone = isDoneStatus(s?.status, s?.completed as boolean | undefined)
              const adSub = parseAnyDateTime(s?.actualEndDate)
              const sUpdated = parseAnyDateTime(s?.updatedAt ?? (s as any)?.updated_at)
              const subCompletionRef = adSub || (sDone ? sUpdated : null)
              let subSegs = extractResponsibleSegmentsFromItem(s)
              if (subSegs.length === 0) subSegs = taskSegs
              const subMatch =
                responsibleAliases.length > 0 && responsibleMatches(subSegs, responsibleAliases)
              const subTitle = (s as any)?.title || (s as any)?.name || (s as any)?.nome || 'Subtarefa'
              const subResponsibleLabel = subSegs.join(', ') || responsibleLabel

              if (subMatch) {
                respSubtasksTotal++
                pb.mySubtasksTotal++
                if (sDone) {
                  respSubtasksCompleted++
                  pb.mySubtasksCompleted++
                  if (periodRange && subCompletionRef && inDateRange(subCompletionRef, periodRange)) respSubtasksCompletedInPeriod++
                } else if (sEnd && sEnd.getTime() < todayStart.getTime()) {
                  respSubtasksOverdue++
                  pb.mySubtasksOverdue++
                }
                if (periodRange && sRef && inDateRange(sRef, periodRange)) respSubtasksCreatedInPeriod++
              }

              if (sDone) {
                subtasksCompleted++
                pb.subtasksCompleted++
                if (periodRange && subCompletionRef && inDateRange(subCompletionRef, periodRange)) {
                  subtasksCompletedInPeriod++
                  pb.completedInPeriod++
                  pushCompleted({
                    type: 'subtarefa',
                    projectId: p.id,
                    projectName: p.name,
                    label: `${p.name}${phName ? ` • Etapa: ${String(phName)}` : ''}${taskTitle ? ` • Tarefa: ${String(taskTitle)}` : ''} • Subtarefa: ${String(subTitle)}`,
                    completedAt: subCompletionRef.toISOString()
                  })
                }

                const pd = ymd(s?.dueDate ?? s?.plannedEndDate)
                const adY = ymd(s?.actualEndDate)
                noteDeadline(pd, adY, true)
                noteSlippage(pd, adY)
                if (!pd) subtasksDeadlineMet++
                else if (adY && adY.getTime() <= pd.getTime()) subtasksDeadlineMet++
                else if (!adY) subtasksDeadlineMet++
              } else if (sEnd && sEnd.getTime() < todayStart.getTime()) {
                subtasksOverdue++
                pb.subtasksOverdue++
                pushOverdue({
                  type: 'subtarefa',
                  projectId: p.id,
                  projectName: p.name,
                  label: `${p.name}${phName ? ` • ${String(phName)}` : ''} • ${String(taskTitle)} › ${String(subTitle)}`,
                  dueDate: sEnd.toISOString(),
                  responsible: subResponsibleLabel,
                  daysOverdue: daysBetween(sEnd, todayStart)
                })
              }
            }
          }
        }

        pb.riskScore =
          (pb.endOverdue ? 40 : 0) +
          pb.phasesOverdue * 8 +
          pb.tasksOverdue * 5 +
          pb.subtasksOverdue * 3 +
          pb.myTasksOverdue * 6 +
          pb.mySubtasksOverdue * 4
        projectsBreakdown.push(pb)
      }

      const projectIds = projects.map((x) => x.id)
      let auditTotal = 0
      let auditLast30 = 0
      let auditTeamInPeriod = 0
      const byEntity: Record<string, number> = {}
      const byAction: Record<string, number> = {}
      type RecentAudit = {
        id: string
        projectId: string
        projectName: string
        entityType: string
        action: string
        targetLabel: string | null
        actorName: string | null
        createdAt: string
      }
      let recentAudit: RecentAudit[] = []

      if (projectIds.length > 0) {
        const since = new Date()
        since.setDate(since.getDate() - 30)
        since.setHours(0, 0, 0, 0)

        // Visão global: não usa `projectId in (...)` com lista enorme (muito lento).
        const auditWhereBase = isGlobalAdminView
          ? {}
          : isAliasOnlyFilter
            ? { projectId: { in: projectIds } }
            : { projectId: { in: projectIds }, actorUserId: targetUserId }

        const auditWhereForAgg = periodRange
          ? { ...auditWhereBase, createdAt: { gte: periodRange.start, lte: periodRange.end } }
          : auditWhereBase

        const teamPeriodPromise =
          periodRange && !isGlobalAdminView
            ? prisma.projectWorkAuditLog.count({
                where: {
                  projectId: { in: projectIds },
                  createdAt: { gte: periodRange.start, lte: periodRange.end }
                }
              })
            : Promise.resolve(0)

        const [total, last30, teamInPeriod, grouped, recentRows] = await Promise.all([
          prisma.projectWorkAuditLog.count({ where: auditWhereForAgg }),
          prisma.projectWorkAuditLog.count({
            where: { ...auditWhereBase, createdAt: { gte: since } }
          }),
          teamPeriodPromise,
          prisma.projectWorkAuditLog.groupBy({
            by: ['entityType', 'action'],
            where: auditWhereForAgg,
            _count: { _all: true }
          }),
          prisma.projectWorkAuditLog.findMany({
            where: auditWhereForAgg,
            orderBy: { createdAt: 'desc' },
            take: 25,
            select: {
              id: true,
              projectId: true,
              entityType: true,
              action: true,
              targetLabel: true,
              createdAt: true,
              actor: { select: { name: true } },
              project: { select: { name: true } }
            }
          })
        ])

        auditTotal = total
        auditLast30 = last30
        auditTeamInPeriod = teamInPeriod

        for (const row of grouped) {
          const et = String(row.entityType || 'outro')
          const ac = String(row.action || '')
          byEntity[et] = (byEntity[et] || 0) + row._count._all
          byAction[ac] = (byAction[ac] || 0) + row._count._all
        }

        recentAudit = recentRows.map((r) => ({
          id: r.id,
          projectId: r.projectId,
          projectName: r.project?.name || 'Projeto',
          entityType: String(r.entityType || ''),
          action: String(r.action || ''),
          targetLabel: r.targetLabel ?? null,
          actorName: r.actor?.name ?? null,
          createdAt: r.createdAt.toISOString()
        }))
      }

      const createdInPeriod =
        (periodRange
          ? phasesCreatedInPeriod + tasksCreatedInPeriod + subtasksCreatedInPeriod
          : 0)
      const completedInPeriod =
        (periodRange
          ? projectsCompletedInPeriod +
            phasesCompletedInPeriod +
            tasksCompletedInPeriod +
            subtasksCompletedInPeriod
          : 0)

      const onTimeRate =
        deadlineEvaluated > 0 ? Math.round((deadlineMetCount / deadlineEvaluated) * 1000) / 10 : null
      const avgSlippageDays =
        slippageCount > 0 ? Math.round((slippageSumDays / slippageCount) * 10) / 10 : null
      const effortVariancePct =
        estimatedHoursSum > 0
          ? Math.round(((actualHoursSum - estimatedHoursSum) / estimatedHoursSum) * 1000) / 10
          : null

      projectsBreakdown.sort((a, b) => b.riskScore - a.riskScore || b.tasksOverdue - a.tasksOverdue)
      overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue)

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
                projectsCompleted: projectsCompletedInPeriod,
                phasesCompleted: phasesCompletedInPeriod,
                tasksCompleted: tasksCompletedInPeriod,
                subtasksCompleted: subtasksCompletedInPeriod,
                completedItems: completedItemsInPeriod
                  .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
                  .slice(0, 15),
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
        productivity: {
          onTimeRate,
          deadlineEvaluated,
          deadlineMet: deadlineMetCount,
          avgSlippageDays,
          estimatedHours: Math.round(estimatedHoursSum * 10) / 10,
          actualHours: Math.round(actualHoursSum * 10) / 10,
          effortVariancePct,
          createdInPeriod,
          completedInPeriod,
          projectsAtRisk: projectsBreakdown.filter((x) => x.riskScore > 0 || x.endOverdue).length
        },
        projectsBreakdown: projectsBreakdown.slice(0, 40),
        overdueItems: overdueItems.slice(0, 25),
        recentAudit,
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
