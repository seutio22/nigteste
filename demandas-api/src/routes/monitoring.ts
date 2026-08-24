import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { createRequirePermission } from '../middleware/requirePermission'
import { getPageAreaLabel } from '../utils/pageMonitoringLabels'

const requirePermission = createRequirePermission(prisma)

/** Sessão inativa após este intervalo sem uso real (alinhado ao logout do front). */
const SESSION_IDLE_MS = 5 * 60 * 1000

async function verifyJWT(req: any) {
  await req.jwtVerify()
}

/** Fecha sessões ociosas; se `refresh` e ainda dentro da janela, atualiza lastActivity. */
async function refreshOrCloseActiveSessions(userId: string, now: Date, refresh: boolean) {
  const sessions = await prisma.userSession.findMany({
    where: { userId, isActive: true },
    select: { id: true, loginTime: true, lastActivity: true }
  })
  for (const s of sessions) {
    const last = (s.lastActivity || s.loginTime).getTime()
    if (now.getTime() - last > SESSION_IDLE_MS) {
      const logoutTime = new Date(Math.min(now.getTime(), last + SESSION_IDLE_MS))
      const duration = Math.max(0, Math.floor((logoutTime.getTime() - s.loginTime.getTime()) / 1000))
      await prisma.userSession.update({
        where: { id: s.id },
        data: { isActive: false, logoutTime, duration }
      })
    } else if (refresh) {
      await prisma.userSession.update({
        where: { id: s.id },
        data: { lastActivity: now }
      })
    }
  }
}

/** Encerra sessões ativas cujo lastActivity já passou da janela de 5 minutos. */
async function closeAllIdleSessions(now = new Date()) {
  const cutoff = new Date(now.getTime() - SESSION_IDLE_MS)
  const stale = await prisma.userSession.findMany({
    where: { isActive: true, lastActivity: { lt: cutoff } },
    select: { id: true, loginTime: true, lastActivity: true }
  })
  await Promise.all(
    stale.map((s) => {
      const logoutTime = s.lastActivity
      const duration = Math.max(0, Math.floor((logoutTime.getTime() - s.loginTime.getTime()) / 1000))
      return prisma.userSession.update({
        where: { id: s.id },
        data: { isActive: false, logoutTime, duration }
      })
    })
  )
}

/** Início do dia local do servidor (alinhado aos registros UserMonitoring.date). */
function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Atualiza agregado diário (UserMonitoring) a partir de eventos do app. */
async function upsertUserMonitoringDaily(
  userId: string,
  action: string,
  duration: number | null | undefined,
  at: Date
) {
  const day = startOfLocalDay(at)
  const now = at

  if (action === 'page_time') {
    const sec = typeof duration === 'number' && duration > 0 ? Math.floor(duration) : 0
    if (sec <= 0) return
    const min = Math.max(0, Math.round(sec / 60))
    await prisma.userMonitoring.upsert({
      where: { userId_date: { userId, date: day } },
      create: {
        userId,
        date: day,
        pageDwellSeconds: sec,
        pageDwellSessions: 1,
        totalTimeToday: min,
        lastAccess: now
      },
      update: {
        pageDwellSeconds: { increment: sec },
        pageDwellSessions: { increment: 1 },
        totalTimeToday: { increment: min },
        lastAccess: now
      }
    })
    return
  }

  if (action === 'login') {
    await prisma.userMonitoring.upsert({
      where: { userId_date: { userId, date: day } },
      create: { userId, date: day, loginCount: 1, lastAccess: now },
      update: { loginCount: { increment: 1 }, lastAccess: now }
    })
  }
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function getStartOfQuarter(d: Date): Date {
  const m = Math.floor(d.getMonth() / 3) * 3
  return new Date(d.getFullYear(), m, 1, 0, 0, 0, 0)
}

type PageTimeRow = { userId: string; page: string | null; duration: number | null; createdAt: Date }

function pageBreakdown(
  rows: PageTimeRow[],
  userId: string,
  since: Date
): Array<{ path: string; seconds: number }> {
  const m = new Map<string, number>()
  for (const r of rows) {
    if (r.userId !== userId || !r.page || r.duration == null || r.duration <= 0) continue
    if (r.createdAt < since) continue
    m.set(r.page, (m.get(r.page) || 0) + r.duration)
  }
  return Array.from(m.entries())
    .map(([path, seconds]) => ({ path, seconds }))
    .sort((a, b) => b.seconds - a.seconds)
}

function totalPageSeconds(rows: PageTimeRow[], userId: string, since: Date): number {
  let t = 0
  for (const r of rows) {
    if (r.userId !== userId || r.duration == null || r.duration <= 0) continue
    if (r.createdAt < since) continue
    t += r.duration
  }
  return t
}

function countPageTimeEvents(rows: PageTimeRow[], userId: string, since: Date): number {
  let n = 0
  for (const r of rows) {
    if (r.userId !== userId) continue
    if (r.createdAt < since) continue
    n += 1
  }
  return n
}

export default async function monitoringRoutes(fastify: FastifyInstance) {
  // Endpoint para registrar atividade
  fastify.post('/activity', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId, action, page, endpoint, duration, metadata } = request.body as any

      if (!userId || !action) {
        return reply.status(400).send({ error: 'userId e action são obrigatórios' })
      }

      // Buscar dados do usuário
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' })
      }

      const now = new Date()
      const isHeartbeat = action === 'heartbeat'

      // Heartbeat não grava histórico: só pinga sessão se ainda houver uso recente.
      if (isHeartbeat) {
        setImmediate(() => {
          void refreshOrCloseActiveSessions(user.id, now, true).catch((e) => {
            console.error('monitoring/activity heartbeat follow-up:', e)
          })
        })
        return reply.send({ success: true, heartbeat: true })
      }

      // Registrar atividade
      const activity = await prisma.userActivity.create({
        data: {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          action,
          page,
          endpoint,
          duration,
          metadata: metadata ? JSON.stringify(metadata) : null,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent']
        }
      })

      // Sessão + agregado diário fora do caminho crítico da resposta (o front usa fire-and-forget).
      setImmediate(() => {
        void (async () => {
          try {
            await refreshOrCloseActiveSessions(user.id, now, true)
            await upsertUserMonitoringDaily(user.id, action, duration, now)
          } catch (e) {
            console.error('monitoring/activity async follow-up:', e)
          }
        })()
      })

      return reply.send({ success: true, activity })
    } catch (error) {
      console.error('Erro ao registrar atividade:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para buscar dados de monitoramento
  fastify.get('/users', { preHandler: [verifyJWT, requirePermission('usuarios', 'view')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      setImmediate(() => {
        void closeAllIdleSessions().catch((e) => {
          console.error('monitoring/users idle session cleanup:', e)
        })
      })

      const startOfDay = new Date()
      startOfDay.setHours(0, 0, 0, 0)
      const nowDate = new Date()
      const startOfWeek = startOfWeekMonday(nowDate)
      const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1, 0, 0, 0, 0)
      const startOfQuarter = getStartOfQuarter(nowDate)

      /** Online: viu heartbeat/atividade nos últimos 5 min. Ausente: até 15 min. */
      const ONLINE_MS = 5 * 60 * 1000
      const AWAY_MS = 15 * 60 * 1000

      // Buscar usuários com dados de monitoramento
      const users = await prisma.user.findMany({
        where: {
          active: true
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          departmentId: true,
          department: { select: { id: true, nome: true } },
          lastLogin: true,
          createdAt: true,
          userActivities: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: {
              action: true,
              createdAt: true
            }
          },
          userSessions: {
            where: { isActive: true },
            take: 1,
            orderBy: { lastActivity: 'desc' },
            select: {
              isActive: true,
              loginTime: true,
              lastActivity: true
            }
          },
          userMonitoring: {
            where: {
              date: { gte: startOfDay }
            },
            take: 1,
            orderBy: { date: 'desc' },
            select: {
              totalTimeToday: true,
              totalTimeThisWeek: true,
              totalTimeThisMonth: true,
              totalTimeThisQuarter: true,
              sessionCount: true,
              loginCount: true,
              logoutCount: true,
              pageViewCount: true,
              apiCallCount: true,
              pageDwellSeconds: true,
              pageDwellSessions: true,
              date: true
            }
          }
        }
      })

      const userIds = users.map(u => u.id)

      const [loginTodayGroups, activityTodayGroups, sessionStartsTodayGroups] =
        userIds.length === 0
          ? [[], [], []]
          : await Promise.all([
              prisma.userActivity.groupBy({
                by: ['userId'],
                where: {
                  userId: { in: userIds },
                  action: 'login',
                  createdAt: { gte: startOfDay }
                },
                _count: { _all: true }
              }),
              prisma.userActivity.groupBy({
                by: ['userId'],
                where: {
                  userId: { in: userIds },
                  createdAt: { gte: startOfDay }
                },
                _count: { _all: true }
              }),
              /** Fallback: o app nem sempre gravava action "login" em UserActivity; sessões refletem acessos reais. */
              prisma.userSession.groupBy({
                by: ['userId'],
                where: {
                  userId: { in: userIds },
                  loginTime: { gte: startOfDay }
                },
                _count: { _all: true }
              })
            ])

      const loginsTodayMap = Object.fromEntries(
        loginTodayGroups.map((g: { userId: string; _count: { _all: number } }) => [g.userId, g._count._all])
      )
      const sessionsStartedTodayMap = Object.fromEntries(
        sessionStartsTodayGroups.map((g: { userId: string; _count: { _all: number } }) => [g.userId, g._count._all])
      )
      const activitiesTodayMap = Object.fromEntries(
        activityTodayGroups.map((g: { userId: string; _count: { _all: number } }) => [g.userId, g._count._all])
      )

      const pageTimeRows: PageTimeRow[] =
        userIds.length === 0
          ? []
          : await prisma.userActivity.findMany({
              where: {
                userId: { in: userIds },
                action: 'page_time',
                duration: { gt: 0 },
                createdAt: { gte: startOfQuarter },
                page: { not: null }
              },
              select: {
                userId: true,
                page: true,
                duration: true,
                createdAt: true
              }
            })

      const nowMs = Date.now()

      // Processar dados para o frontend
      const monitoringData = users.map(user => {
        const lastActivityRow = user.userActivities[0]
        const activeSession = user.userSessions[0]
        const todayMonitoring = user.userMonitoring[0]

        const lastActivityAt = lastActivityRow?.createdAt
        const sessionPingAt = activeSession?.isActive ? activeSession.lastActivity : undefined
        const loginAt = user.lastLogin ?? undefined

        const times = [lastActivityAt?.getTime(), sessionPingAt?.getTime(), loginAt?.getTime()].filter(
          (t): t is number => typeof t === 'number'
        )
        const lastSeenMs = times.length > 0 ? Math.max(...times) : user.createdAt.getTime()
        const msSinceSeen = nowMs - lastSeenMs

        const presenceStatus =
          msSinceSeen < ONLINE_MS ? 'online' : msSinceSeen < AWAY_MS ? 'away' : 'offline'
        const isOnline = presenceStatus === 'online'

        // Calcular tempo online baseado nas sessões ativas
        let calculatedTimeToday = todayMonitoring?.totalTimeToday || 0
        if (activeSession?.isActive && activeSession.loginTime) {
          const sessionDuration = Math.floor((nowMs - activeSession.loginTime.getTime()) / (1000 * 60))
          calculatedTimeToday += sessionDuration
        }

        const loginCountToday = Math.max(
          loginsTodayMap[user.id] ?? 0,
          sessionsStartedTodayMap[user.id] ?? 0
        )
        const activitiesTodayCount = activitiesTodayMap[user.id] ?? 0
        const calculatedSessionCount = Math.max(todayMonitoring?.sessionCount || 0, loginCountToday)

        const averageSessionTime =
          calculatedSessionCount > 0 ? Math.floor(calculatedTimeToday / calculatedSessionCount) : 0

        let currentSessionMinutes: number | null = null
        if (activeSession?.isActive && activeSession.loginTime) {
          currentSessionMinutes = Math.floor((nowMs - activeSession.loginTime.getTime()) / (1000 * 60))
        }

        const lastAccess = lastActivityAt || user.lastLogin || user.createdAt

        const pageDwellTotalSecondsToday = totalPageSeconds(pageTimeRows, user.id, startOfDay)
        const pageDwellTotalSecondsWeek = totalPageSeconds(pageTimeRows, user.id, startOfWeek)
        const pageDwellTotalSecondsMonth = totalPageSeconds(pageTimeRows, user.id, startOfMonth)
        const pageDwellTotalSecondsQuarter = totalPageSeconds(pageTimeRows, user.id, startOfQuarter)

        const pageDwellVisitsToday = countPageTimeEvents(pageTimeRows, user.id, startOfDay)
        const pageDwellVisitsWeek = countPageTimeEvents(pageTimeRows, user.id, startOfWeek)
        const pageDwellVisitsMonth = countPageTimeEvents(pageTimeRows, user.id, startOfMonth)
        const pageDwellVisitsQuarter = countPageTimeEvents(pageTimeRows, user.id, startOfQuarter)

        return {
          id: user.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          departmentId: user.departmentId,
          departmentName: user.department?.nome ?? null,
          lastAccess,
          lastSeenAt: new Date(lastSeenMs).toISOString(),
          minutesSinceLastActivity: Math.floor(msSinceSeen / 60000),
          presenceStatus,
          isOnline,
          currentSessionMinutes,
          totalTimeToday: calculatedTimeToday,
          totalTimeThisWeek: todayMonitoring?.totalTimeThisWeek || calculatedTimeToday,
          totalTimeThisMonth: todayMonitoring?.totalTimeThisMonth || calculatedTimeToday,
          totalTimeThisQuarter: todayMonitoring?.totalTimeThisQuarter || calculatedTimeToday,
          sessionCount: calculatedSessionCount,
          averageSessionTime,
          lastActivity: lastAccess,
          loginCount: Math.max(todayMonitoring?.loginCount || 0, loginCountToday),
          logoutCount: todayMonitoring?.logoutCount || 0,
          pageViewCount: todayMonitoring?.pageViewCount || 0,
          apiCallCount: todayMonitoring?.apiCallCount || 0,
          activitiesTodayCount,
          hasRealActivity: !!(user.lastLogin || lastActivityRow || activitiesTodayCount > 0),
          /** Tempo medido por rota (cada visita envia duração ao sair da página), em segundos */
          pageDwellTotalSecondsToday,
          pageDwellTotalSecondsWeek,
          pageDwellTotalSecondsMonth,
          pageDwellTotalSecondsQuarter,
          pageDwellByPageToday: pageBreakdown(pageTimeRows, user.id, startOfDay),
          pageDwellByPageWeek: pageBreakdown(pageTimeRows, user.id, startOfWeek),
          pageDwellByPageMonth: pageBreakdown(pageTimeRows, user.id, startOfMonth),
          pageDwellByPageQuarter: pageBreakdown(pageTimeRows, user.id, startOfQuarter),
          pageDwellVisitsToday,
          pageDwellVisitsWeek,
          pageDwellVisitsMonth,
          pageDwellVisitsQuarter
        }
      })

      return reply.send(monitoringData)
    } catch (error) {
      console.error('Erro ao buscar dados de monitoramento:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  /**
   * Panorama mensal: por usuário, totais do mês e detalhamento por dia
   * (logins/sessões agregados em UserMonitoring + rotas/tempo em page_time).
   */
  fastify.get(
    '/monthly-panorama',
    { preHandler: [verifyJWT, requirePermission('usuarios', 'view')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const q = request.query as Record<string, string | undefined>
        const now = new Date()
        const y = q.year ? parseInt(q.year, 10) : now.getFullYear()
        const m = q.month ? parseInt(q.month, 10) : now.getMonth() + 1
        if (y < 2000 || y > 2100 || m < 1 || m > 12) {
          return reply.status(400).send({ error: 'year e month inválidos (use 1–12 para month)' })
        }

        const lastDay = new Date(y, m, 0).getDate()
        const rangeStartLocal = new Date(y, m - 1, 1)
        rangeStartLocal.setHours(0, 0, 0, 0)
        const rangeEndLocal = new Date(y, m - 1, lastDay, 23, 59, 59, 999)

        const pad = (n: number) => String(n).padStart(2, '0')
        const daysInMonth: string[] = []
        for (let d = 1; d <= lastDay; d++) {
          daysInMonth.push(`${y}-${pad(m)}-${pad(d)}`)
        }

        const [users, monitoringRows, pageEvents] = await Promise.all([
          prisma.user.findMany({
            where: { active: true },
            select: { id: true, name: true, email: true },
            orderBy: { name: 'asc' }
          }),
          prisma.userMonitoring.findMany({
            where: {
              date: { gte: rangeStartLocal, lte: rangeEndLocal }
            },
            orderBy: { date: 'asc' }
          }),
          prisma.userActivity.findMany({
            where: {
              action: 'page_time',
              duration: { gt: 0 },
              createdAt: { gte: rangeStartLocal, lte: rangeEndLocal },
              page: { not: null }
            },
            select: { userId: true, page: true, duration: true, createdAt: true }
          })
        ])

        type DayPageAgg = {
          pages: Map<string, number>
          pageDwellSeconds: number
          pageDwellSessions: number
        }

        const pageByUserDay = new Map<string, Map<string, DayPageAgg>>()

        function ensureDayAgg(uid: string, dayKey: string): DayPageAgg {
          if (!pageByUserDay.has(uid)) pageByUserDay.set(uid, new Map())
          const um = pageByUserDay.get(uid)!
          if (!um.has(dayKey)) {
            um.set(dayKey, { pages: new Map(), pageDwellSeconds: 0, pageDwellSessions: 0 })
          }
          return um.get(dayKey)!
        }

        for (const ev of pageEvents) {
          const dk = ev.createdAt.toISOString().slice(0, 10)
          const agg = ensureDayAgg(ev.userId, dk)
          agg.pageDwellSessions += 1
          agg.pageDwellSeconds += ev.duration || 0
          if (ev.page) {
            agg.pages.set(ev.page, (agg.pages.get(ev.page) || 0) + (ev.duration || 0))
          }
        }

        const monByUserDay = new Map<string, Map<string, (typeof monitoringRows)[number]>>()
        for (const row of monitoringRows) {
          const dk = row.date.toISOString().slice(0, 10)
          if (!monByUserDay.has(row.userId)) monByUserDay.set(row.userId, new Map())
          monByUserDay.get(row.userId)!.set(dk, row)
        }

        const resultUsers = users.map(u => {
          const monMap = monByUserDay.get(u.id) ?? new Map()
          const pgMap = pageByUserDay.get(u.id) ?? new Map()

          let mtLogins = 0
          let mtSessions = 0
          let mtPageSec = 0
          let mtPageSess = 0
          const monthPaths = new Map<string, number>()

          const byDay = daysInMonth.map(dateKey => {
            const mr = monMap.get(dateKey)
            const pa = pgMap.get(dateKey)
            const loginCount = mr?.loginCount ?? 0
            const sessionCount = mr?.sessionCount ?? 0
            const pageDwellSeconds = pa?.pageDwellSeconds ?? mr?.pageDwellSeconds ?? 0
            const pageDwellSessions = pa?.pageDwellSessions ?? mr?.pageDwellSessions ?? 0
            const pages = pa
              ? [...pa.pages.entries()]
                  .map(([path, seconds]) => ({ path, seconds }))
                  .sort((a, b) => b.seconds - a.seconds)
              : []

            mtLogins += loginCount
            mtSessions += sessionCount
            mtPageSec += pageDwellSeconds
            mtPageSess += pageDwellSessions
            if (pa) {
              for (const [pth, sec] of pa.pages.entries()) {
                monthPaths.set(pth, (monthPaths.get(pth) || 0) + sec)
              }
            }

            const hasData =
              loginCount > 0 ||
              sessionCount > 0 ||
              pageDwellSeconds > 0 ||
              pageDwellSessions > 0 ||
              pages.length > 0

            return {
              date: dateKey,
              loginCount,
              sessionCount,
              pageDwellSeconds,
              pageDwellSessions,
              pages,
              hasData
            }
          })

          const pagesMonth = [...monthPaths.entries()]
            .map(([path, seconds]) => ({ path, seconds }))
            .sort((a, b) => b.seconds - a.seconds)

          return {
            userId: u.id,
            userName: u.name,
            userEmail: u.email,
            monthTotals: {
              loginCount: mtLogins,
              monitoringSessions: mtSessions,
              pageDwellSeconds: mtPageSec,
              pageDwellSessions: mtPageSess,
              distinctPaths: monthPaths.size
            },
            pagesMonth,
            byDay
          }
        })

        return reply.send({
          year: y,
          month: m,
          rangeStart: rangeStartLocal.toISOString(),
          rangeEnd: rangeEndLocal.toISOString(),
          users: resultUsers
        })
      } catch (error) {
        console.error('Erro no monthly-panorama:', error)
        return reply.status(500).send({ error: 'Erro interno do servidor' })
      }
    }
  )

  /**
   * Presença no período (capacidade real): apenas usuários do departamento informado
   * (padrão: NIG). Conta somente o dia do login real — não estende pelos dias em que
   * a sessão ficou aberta (heartbeat / lastActivity).
   */
  fastify.get(
    '/presence-range',
    { preHandler: [verifyJWT, requirePermission('usuarios', 'view')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const q = request.query as Record<string, string | undefined>
        const from = String(q.from || '').slice(0, 10)
        const to = String(q.to || '').slice(0, 10)
        const departmentQuery = String(q.department || 'NIG').trim() || 'NIG'
        if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) {
          return reply.status(400).send({ error: 'Informe from e to no formato YYYY-MM-DD' })
        }

        const rangeStart = new Date(`${from}T00:00:00`)
        const rangeEnd = new Date(`${to}T23:59:59.999`)
        if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
          return reply.status(400).send({ error: 'Datas inválidas' })
        }

        const businessDaySet = new Set<string>()
        const cur = new Date(rangeStart)
        cur.setHours(12, 0, 0, 0)
        const endProbe = new Date(rangeEnd)
        endProbe.setHours(12, 0, 0, 0)
        while (cur <= endProbe) {
          const wd = cur.getDay()
          if (wd !== 0 && wd !== 6) {
            const y = cur.getFullYear()
            const m = String(cur.getMonth() + 1).padStart(2, '0')
            const d = String(cur.getDate()).padStart(2, '0')
            businessDaySet.add(`${y}-${m}-${d}`)
          }
          cur.setDate(cur.getDate() + 1)
        }
        const businessDays = Math.max(businessDaySet.size, 1)

        const norm = (s: string) =>
          s
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

        const areas = await prisma.area.findMany({ select: { id: true, nome: true } })
        const deptNeedle = norm(departmentQuery)
        const matchedAreas = areas.filter((a) => norm(a.nome || '').includes(deptNeedle))
        if (!matchedAreas.length) {
          return reply.send({
            from,
            to,
            businessDays,
            department: departmentQuery,
            departmentIds: [],
            equipePrevista: 0,
            pessoasComPresenca: 0,
            pessoaDiasPresentes: 0,
            pessoaDiasPrevistos: 0,
            users: [],
            warning: `Nenhuma área/departamento encontrada para "${departmentQuery}"`
          })
        }
        const departmentIds = matchedAreas.map((a) => a.id)

        const [users, analistas, monitoringRows, sessions, loginActs] = await Promise.all([
          prisma.user.findMany({
            where: {
              active: true,
              departmentId: { in: departmentIds }
            },
            select: {
              id: true,
              name: true,
              email: true,
              departmentId: true,
              department: { select: { id: true, nome: true } }
            },
            orderBy: { name: 'asc' }
          }),
          prisma.analista.findMany({
            select: { id: true, nome: true, email: true }
          }),
          prisma.userMonitoring.findMany({
            where: {
              date: { gte: rangeStart, lte: rangeEnd },
              loginCount: { gt: 0 }
            },
            select: {
              userId: true,
              date: true,
              loginCount: true
            }
          }),
          prisma.userSession.findMany({
            where: { loginTime: { gte: rangeStart, lte: rangeEnd } },
            select: { userId: true, loginTime: true }
          }),
          prisma.userActivity.findMany({
            where: {
              action: 'login',
              createdAt: { gte: rangeStart, lte: rangeEnd }
            },
            select: { userId: true, createdAt: true }
          })
        ])

        const nigUserIds = new Set(users.map((u) => u.id))

        // Mapa userId → analista (só equipe do departamento)
        const userToAnalista = new Map<string, { analistaId: string; analistaNome: string }>()
        const emailToUser = new Map<string, (typeof users)[number]>()
        const nameToUser = new Map<string, (typeof users)[number]>()
        for (const u of users) {
          if (u.email) emailToUser.set(norm(u.email), u)
          if (u.name) nameToUser.set(norm(u.name), u)
        }
        for (const a of analistas) {
          let u: (typeof users)[number] | undefined
          const em = (a.email || '').trim()
          if (em) u = emailToUser.get(norm(em))
          if (!u && a.nome) u = nameToUser.get(norm(a.nome))
          if (u && !userToAnalista.has(u.id)) {
            userToAnalista.set(u.id, { analistaId: a.id, analistaNome: a.nome })
          }
        }

        const daysByUser = new Map<string, Set<string>>()
        const touch = (userId: string, dayKey: string) => {
          if (!nigUserIds.has(userId)) return
          if (!businessDaySet.has(dayKey)) return
          if (!daysByUser.has(userId)) daysByUser.set(userId, new Set())
          daysByUser.get(userId)!.add(dayKey)
        }
        const dayKeyOf = (dt: Date) => {
          const y = dt.getFullYear()
          const m = String(dt.getMonth() + 1).padStart(2, '0')
          const d = String(dt.getDate()).padStart(2, '0')
          return `${y}-${m}-${d}`
        }

        for (const row of monitoringRows) {
          if ((row.loginCount || 0) <= 0) continue
          touch(row.userId, dayKeyOf(row.date))
        }

        // Só o dia em que a pessoa entrou — não os dias em que a aba ficou aberta.
        for (const s of sessions) {
          touch(s.userId, dayKeyOf(s.loginTime))
        }

        for (const act of loginActs) {
          touch(act.userId, dayKeyOf(act.createdAt))
        }

        const equipePrevista = users.length
        const presentUsers = users
          .map((u) => {
            const days = [...(daysByUser.get(u.id) || [])].sort()
            if (!days.length) return null
            const link = userToAnalista.get(u.id)
            return {
              userId: u.id,
              userName: u.name,
              userEmail: u.email,
              departmentId: u.departmentId,
              departmentNome: u.department?.nome ?? null,
              daysPresent: days.length,
              dates: days,
              analistaId: link?.analistaId ?? null,
              analistaNome: link?.analistaNome ?? null
            }
          })
          .filter((u): u is NonNullable<typeof u> => u != null)

        const pessoasComPresenca = presentUsers.length
        const pessoaDiasPresentes = presentUsers.reduce((s, u) => s + u.daysPresent, 0)
        const pessoaDiasPrevistos = Math.max(equipePrevista, 0) * businessDays

        return reply.send({
          from,
          to,
          businessDays,
          department: departmentQuery,
          departmentIds,
          departmentNomes: matchedAreas.map((a) => a.nome),
          equipePrevista,
          pessoasComPresenca,
          pessoaDiasPresentes,
          pessoaDiasPrevistos,
          users: presentUsers,
          roster: users.map((u) => ({
            userId: u.id,
            userName: u.name,
            userEmail: u.email,
            analistaId: userToAnalista.get(u.id)?.analistaId ?? null
          }))
        })
      } catch (error) {
        console.error('Erro no presence-range:', error)
        return reply.status(500).send({ error: 'Erro interno do servidor' })
      }
    }
  )

  // Endpoint para buscar atividades de um usuário específico
  /**
   * Painel analítico agregado: tendências, módulos, presença e ranking.
   */
  fastify.get(
    '/analytics-dashboard',
    { preHandler: [verifyJWT, requirePermission('usuarios', 'view')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const q = request.query as Record<string, string | undefined>
        const trendDays = Math.min(30, Math.max(7, parseInt(q.days || '14', 10) || 14))
        const nowDate = new Date()
        const startOfDay = startOfLocalDay(nowDate)
        const startOfWeek = startOfWeekMonday(nowDate)
        const trendStart = new Date(startOfDay)
        trendStart.setDate(trendStart.getDate() - (trendDays - 1))

        const ONLINE_MS = 5 * 60 * 1000
        const AWAY_MS = 15 * 60 * 1000

        const [users, monitoringTrend, pageEventsTrend, activityEvents] = await Promise.all([
          prisma.user.findMany({
            where: { active: true },
            select: {
              id: true,
              name: true,
              role: true,
              departmentId: true,
              department: { select: { nome: true } },
              lastLogin: true,
              createdAt: true,
              userActivities: {
                take: 1,
                orderBy: { createdAt: 'desc' },
                select: { createdAt: true }
              },
              userSessions: {
                where: { isActive: true },
                take: 1,
                orderBy: { lastActivity: 'desc' },
                select: { isActive: true, loginTime: true, lastActivity: true }
              },
              userMonitoring: {
                where: { date: { gte: startOfDay } },
                take: 1,
                orderBy: { date: 'desc' },
                select: {
                  loginCount: true,
                  logoutCount: true,
                  pageViewCount: true,
                  apiCallCount: true,
                  pageDwellSeconds: true,
                  sessionCount: true
                }
              }
            },
            orderBy: { name: 'asc' }
          }),
          prisma.userMonitoring.findMany({
            where: { date: { gte: trendStart, lte: nowDate } },
            select: {
              userId: true,
              date: true,
              loginCount: true,
              sessionCount: true,
              pageDwellSeconds: true,
              pageViewCount: true,
              apiCallCount: true
            }
          }),
          prisma.userActivity.findMany({
            where: {
              action: 'page_time',
              duration: { gt: 0 },
              createdAt: { gte: trendStart },
              page: { not: null }
            },
            select: { userId: true, page: true, duration: true, createdAt: true }
          }),
          prisma.userActivity.findMany({
            where: { createdAt: { gte: startOfDay } },
            select: { userId: true, action: true, duration: true, page: true, createdAt: true }
          })
        ])

        const userIds = users.map((u) => u.id)
        const pageEventsTodayWeek =
          userIds.length === 0
            ? []
            : await prisma.userActivity.findMany({
                where: {
                  userId: { in: userIds },
                  action: 'page_time',
                  duration: { gt: 0 },
                  createdAt: { gte: startOfWeek },
                  page: { not: null }
                },
                select: { userId: true, page: true, duration: true, createdAt: true }
              })

        const nowMs = Date.now()
        type Presence = 'online' | 'away' | 'offline'
        const userPresence = new Map<string, Presence>()
        const userDwellToday = new Map<string, number>()
        const userDwellWeek = new Map<string, number>()
        const userLoginsToday = new Map<string, number>()

        for (const u of users) {
          const lastActivityAt = u.userActivities[0]?.createdAt
          const activeSession = u.userSessions[0]
          const sessionPingAt = activeSession?.isActive ? activeSession.lastActivity : undefined
          const loginAt = u.lastLogin ?? undefined
          const times = [lastActivityAt?.getTime(), sessionPingAt?.getTime(), loginAt?.getTime()].filter(
            (t): t is number => typeof t === 'number'
          )
          const lastSeenMs = times.length > 0 ? Math.max(...times) : u.createdAt.getTime()
          const msSinceSeen = nowMs - lastSeenMs
          const presence: Presence =
            msSinceSeen < ONLINE_MS ? 'online' : msSinceSeen < AWAY_MS ? 'away' : 'offline'
          userPresence.set(u.id, presence)
          userLoginsToday.set(u.id, u.userMonitoring[0]?.loginCount ?? 0)
        }

        for (const ev of pageEventsTodayWeek) {
          if (ev.createdAt >= startOfDay) {
            userDwellToday.set(ev.userId, (userDwellToday.get(ev.userId) ?? 0) + (ev.duration || 0))
          }
          userDwellWeek.set(ev.userId, (userDwellWeek.get(ev.userId) ?? 0) + (ev.duration || 0))
        }

        let onlineUsers = 0
        let awayUsers = 0
        let offlineUsers = 0
        let activeTodayUsers = 0
        let totalPageDwellSecondsToday = 0
        let totalPageDwellSecondsWeek = 0
        let totalLoginsToday = 0
        let totalApiCallsToday = 0
        let totalPageViewsToday = 0

        for (const u of users) {
          const p = userPresence.get(u.id) ?? 'offline'
          if (p === 'online') onlineUsers++
          else if (p === 'away') awayUsers++
          else offlineUsers++

          const mon = u.userMonitoring[0]
          const dwellToday = userDwellToday.get(u.id) ?? mon?.pageDwellSeconds ?? 0
          const dwellWeek = userDwellWeek.get(u.id) ?? 0
          totalPageDwellSecondsToday += dwellToday
          totalPageDwellSecondsWeek += dwellWeek
          totalLoginsToday += mon?.loginCount ?? 0
          totalApiCallsToday += mon?.apiCallCount ?? 0
          totalPageViewsToday += mon?.pageViewCount ?? 0

          if (dwellToday > 0 || (mon?.loginCount ?? 0) > 0 || u.lastLogin) {
            activeTodayUsers++
          }
        }

        const pad = (n: number) => String(n).padStart(2, '0')
        const dayKey = (d: Date) =>
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

        const dailyTrend: Array<{
          date: string
          label: string
          logins: number
          pageDwellSeconds: number
          activeUsers: number
          activities: number
          apiCalls: number
        }> = []

        const trendByDay = new Map<
          string,
          { logins: number; pageDwellSeconds: number; users: Set<string>; activities: number; apiCalls: number }
        >()

        for (const row of monitoringTrend) {
          const dk = dayKey(row.date)
          if (!trendByDay.has(dk)) {
            trendByDay.set(dk, { logins: 0, pageDwellSeconds: 0, users: new Set(), activities: 0, apiCalls: 0 })
          }
          const b = trendByDay.get(dk)!
          b.logins += row.loginCount || 0
          b.pageDwellSeconds += row.pageDwellSeconds || 0
          b.apiCalls += row.apiCallCount || 0
          if ((row.loginCount || 0) > 0 || (row.pageDwellSeconds || 0) > 0) {
            b.users.add(row.userId)
          }
        }

        for (const ev of pageEventsTrend) {
          const dk = dayKey(ev.createdAt)
          if (!trendByDay.has(dk)) {
            trendByDay.set(dk, { logins: 0, pageDwellSeconds: 0, users: new Set(), activities: 0, apiCalls: 0 })
          }
          const b = trendByDay.get(dk)!
          b.pageDwellSeconds += ev.duration || 0
          b.users.add(ev.userId)
        }

        for (const ev of activityEvents) {
          const dk = dayKey(ev.createdAt)
          if (!trendByDay.has(dk)) {
            trendByDay.set(dk, { logins: 0, pageDwellSeconds: 0, users: new Set(), activities: 0, apiCalls: 0 })
          }
          trendByDay.get(dk)!.activities++
        }

        for (let i = 0; i < trendDays; i++) {
          const d = new Date(trendStart)
          d.setDate(d.getDate() + i)
          const dk = dayKey(d)
          const b = trendByDay.get(dk)
          dailyTrend.push({
            date: dk,
            label: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
            logins: b?.logins ?? 0,
            pageDwellSeconds: b?.pageDwellSeconds ?? 0,
            activeUsers: b?.users.size ?? 0,
            activities: b?.activities ?? 0,
            apiCalls: b?.apiCalls ?? 0
          })
        }

        const moduleMapToday = new Map<string, { seconds: number; users: Set<string> }>()
        const moduleMapWeek = new Map<string, { seconds: number; users: Set<string> }>()

        for (const ev of pageEventsTodayWeek) {
          const area = getPageAreaLabel(ev.page || '/')
          if (ev.createdAt >= startOfDay) {
            if (!moduleMapToday.has(area)) moduleMapToday.set(area, { seconds: 0, users: new Set() })
            const t = moduleMapToday.get(area)!
            t.seconds += ev.duration || 0
            t.users.add(ev.userId)
          }
          if (!moduleMapWeek.has(area)) moduleMapWeek.set(area, { seconds: 0, users: new Set() })
          const w = moduleMapWeek.get(area)!
          w.seconds += ev.duration || 0
          w.users.add(ev.userId)
        }

        const moduleUsage = [...moduleMapWeek.entries()]
          .map(([area, w]) => ({
            area,
            secondsToday: moduleMapToday.get(area)?.seconds ?? 0,
            secondsWeek: w.seconds,
            userCountWeek: w.users.size
          }))
          .sort((a, b) => b.secondsWeek - a.secondsWeek)
          .slice(0, 15)

        const actionMixMap = new Map<string, number>()
        for (const ev of activityEvents) {
          actionMixMap.set(ev.action, (actionMixMap.get(ev.action) ?? 0) + 1)
        }
        const actionMixToday = [...actionMixMap.entries()]
          .map(([action, count]) => ({ action, count }))
          .sort((a, b) => b.count - a.count)

        const hourlyToday = Array.from({ length: 24 }, (_, hour) => ({
          hour,
          label: `${pad(hour)}h`,
          activities: 0,
          pageDwellSeconds: 0
        }))
        for (const ev of activityEvents) {
          const h = ev.createdAt.getHours()
          hourlyToday[h].activities++
          if (ev.action === 'page_time' && ev.duration) {
            hourlyToday[h].pageDwellSeconds += ev.duration
          }
        }

        const presenceByRoleMap = new Map<
          string,
          { online: number; away: number; offline: number; total: number }
        >()
        for (const u of users) {
          const role = u.role || 'analista'
          if (!presenceByRoleMap.has(role)) {
            presenceByRoleMap.set(role, { online: 0, away: 0, offline: 0, total: 0 })
          }
          const r = presenceByRoleMap.get(role)!
          r.total++
          const p = userPresence.get(u.id) ?? 'offline'
          if (p === 'online') r.online++
          else if (p === 'away') r.away++
          else r.offline++
        }
        const presenceByRole = [...presenceByRoleMap.entries()]
          .map(([role, v]) => ({ role, ...v }))
          .sort((a, b) => b.total - a.total)

        const topUsers = users
          .map((u) => ({
            userId: u.id,
            userName: u.name,
            userRole: u.role,
            departmentName: u.department?.nome ?? null,
            dwellSecondsToday: userDwellToday.get(u.id) ?? u.userMonitoring[0]?.pageDwellSeconds ?? 0,
            dwellSecondsWeek: userDwellWeek.get(u.id) ?? 0,
            loginsToday: u.userMonitoring[0]?.loginCount ?? 0,
            apiCallsToday: u.userMonitoring[0]?.apiCallCount ?? 0,
            presenceStatus: userPresence.get(u.id) ?? 'offline'
          }))
          .sort((a, b) => b.dwellSecondsToday - a.dwellSecondsToday)
          .slice(0, 12)

        const departments = [...new Set(users.map((u) => u.department?.nome).filter(Boolean))].sort() as string[]

        return reply.send({
          trendDays,
          summary: {
            totalUsers: users.length,
            onlineUsers,
            awayUsers,
            offlineUsers,
            activeTodayUsers,
            totalPageDwellSecondsToday,
            totalPageDwellSecondsWeek,
            totalLoginsToday,
            totalActivitiesToday: activityEvents.length,
            totalApiCallsToday,
            totalPageViewsToday,
            avgDwellSecondsPerActiveUserToday:
              activeTodayUsers > 0 ? Math.round(totalPageDwellSecondsToday / activeTodayUsers) : 0
          },
          moduleUsage,
          topUsers,
          dailyTrend,
          presenceByRole,
          hourlyToday: hourlyToday.filter((h) => h.hour <= nowDate.getHours() || h.activities > 0),
          actionMixToday,
          departments
        })
      } catch (error) {
        console.error('Erro no analytics-dashboard:', error)
        return reply.status(500).send({ error: 'Erro interno do servidor' })
      }
    }
  )

  /**
   * Jornada aprofundada: tempo por página, ociosidade, cliques e timeline.
   * Query: days=1|7|14 (padrão 1 = hoje)
   */
  fastify.get(
    '/user/:userId/journey',
    { preHandler: [verifyJWT, requirePermission('usuarios', 'view')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string }
        const q = request.query as Record<string, string | undefined>
        const days = Math.min(30, Math.max(1, parseInt(q.days || '1', 10) || 1))

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true, role: true }
        })
        if (!user) return reply.status(404).send({ error: 'Usuário não encontrado' })

        const since = startOfLocalDay(new Date())
        since.setDate(since.getDate() - (days - 1))

        const events = await prisma.userActivity.findMany({
          where: {
            userId,
            createdAt: { gte: since },
            action: { in: ['page_time', 'idle_time', 'ui_click_batch', 'login', 'logout', 'page_view'] }
          },
          orderBy: { createdAt: 'desc' },
          take: 800,
          select: {
            id: true,
            action: true,
            page: true,
            duration: true,
            metadata: true,
            createdAt: true,
            ipAddress: true
          }
        })

        let pageDwellSeconds = 0
        let idleSeconds = 0
        let clickCount = 0
        const pageMap = new Map<string, { seconds: number; visits: number; idleSeconds: number }>()
        const clickMap = new Map<string, { label: string; page: string; count: number }>()
        const timeline: Array<{
          id: string
          at: string
          kind: string
          label: string
          page: string | null
          seconds?: number
          detail?: string
        }> = []

        for (const ev of events) {
          let meta: any = null
          if (ev.metadata) {
            try {
              meta = typeof ev.metadata === 'string' ? JSON.parse(ev.metadata) : ev.metadata
            } catch {
              meta = null
            }
          }

          if (ev.action === 'page_time') {
            const sec = ev.duration || 0
            pageDwellSeconds += sec
            const path = ev.page || '/'
            if (!pageMap.has(path)) pageMap.set(path, { seconds: 0, visits: 0, idleSeconds: 0 })
            const p = pageMap.get(path)!
            p.seconds += sec
            p.visits += 1
            timeline.push({
              id: ev.id,
              at: ev.createdAt.toISOString(),
              kind: 'page_time',
              label: `Permaneceu em ${getPageAreaLabel(path)}`,
              page: path,
              seconds: sec,
              detail: meta?.source ? `origem: ${meta.source}` : undefined
            })
          } else if (ev.action === 'idle_time') {
            const sec = ev.duration || 0
            idleSeconds += sec
            const path = ev.page || '/'
            if (!pageMap.has(path)) pageMap.set(path, { seconds: 0, visits: 0, idleSeconds: 0 })
            pageMap.get(path)!.idleSeconds += sec
            timeline.push({
              id: ev.id,
              at: ev.createdAt.toISOString(),
              kind: 'idle_time',
              label: 'Ocioso (sem interação)',
              page: path,
              seconds: sec,
              detail: meta?.source ? `detectado em: ${meta.source}` : undefined
            })
          } else if (ev.action === 'ui_click_batch') {
            const clicks = Array.isArray(meta?.clicks) ? meta.clicks : []
            for (const c of clicks) {
              clickCount += 1
              const label = String(c.label || 'Clique').slice(0, 160)
              const page = String(c.page || ev.page || '/')
              const key = `${page}||${label}`
              if (!clickMap.has(key)) clickMap.set(key, { label, page, count: 0 })
              clickMap.get(key)!.count += 1
              timeline.push({
                id: `${ev.id}-${c.at || clickCount}`,
                at: c.at || ev.createdAt.toISOString(),
                kind: 'ui_click',
                label: `Clicou: ${label}`,
                page,
                detail: c.tag ? `elemento: ${c.tag}` : undefined
              })
            }
            if (clicks.length === 0 && meta?.count) {
              clickCount += Number(meta.count) || 0
            }
          } else if (ev.action === 'login' || ev.action === 'logout' || ev.action === 'page_view') {
            timeline.push({
              id: ev.id,
              at: ev.createdAt.toISOString(),
              kind: ev.action,
              label:
                ev.action === 'login'
                  ? 'Login'
                  : ev.action === 'logout'
                    ? 'Logout'
                    : `Visualizou ${getPageAreaLabel(ev.page || '/')}`,
              page: ev.page
            })
          }
        }

        // Timeline cronológica (mais recente primeiro já veio; reordenar por at)
        timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

        const pages = [...pageMap.entries()]
          .map(([path, v]) => ({
            path,
            area: getPageAreaLabel(path),
            seconds: v.seconds,
            visits: v.visits,
            idleSeconds: v.idleSeconds,
            activeSeconds: Math.max(0, v.seconds - v.idleSeconds)
          }))
          .sort((a, b) => b.seconds - a.seconds)

        const topClicks = [...clickMap.values()]
          .sort((a, b) => b.count - a.count)
          .slice(0, 40)
          .map((c) => ({
            ...c,
            area: getPageAreaLabel(c.page)
          }))

        const activeSeconds = Math.max(0, pageDwellSeconds - idleSeconds)

        return reply.send({
          user,
          days,
          since: since.toISOString(),
          summary: {
            pageDwellSeconds,
            idleSeconds,
            activeSeconds,
            clickCount,
            distinctPages: pages.length,
            idleRatio:
              pageDwellSeconds > 0 ? Math.round((100 * idleSeconds) / pageDwellSeconds) : 0
          },
          pages,
          topClicks,
          timeline: timeline.slice(0, 200)
        })
      } catch (error) {
        console.error('Erro no user journey:', error)
        return reply.status(500).send({ error: 'Erro interno do servidor' })
      }
    }
  )

  fastify.get(
    '/user/:userId/activities',
    { preHandler: [verifyJWT, requirePermission('usuarios', 'view')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.params as { userId: string }
      const { limit = 50, offset = 0 } = request.query as any

      const activities = await prisma.userActivity.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset)
      })

      return reply.send(activities)
    } catch (error) {
      console.error('Erro ao buscar atividades do usuário:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  fastify.get(
    '/user/:userId/sessions',
    { preHandler: [verifyJWT, requirePermission('usuarios', 'view')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string }
        const { limit = 20 } = request.query as { limit?: string }

        const sessions = await prisma.userSession.findMany({
          where: { userId },
          orderBy: { loginTime: 'desc' },
          take: Math.min(50, parseInt(String(limit), 10) || 20),
          select: {
            id: true,
            sessionId: true,
            ipAddress: true,
            userAgent: true,
            loginTime: true,
            logoutTime: true,
            lastActivity: true,
            isActive: true,
            duration: true,
            pageViews: true,
            apiCalls: true
          }
        })

        return reply.send(sessions)
      } catch (error) {
        console.error('Erro ao buscar sessões do usuário:', error)
        return reply.status(500).send({ error: 'Erro interno do servidor' })
      }
    }
  )

  // Endpoint para buscar estatísticas agregadas
  fastify.get('/stats', { preHandler: [verifyJWT, requirePermission('usuarios', 'view')] }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      // Buscar estatísticas gerais
      const totalUsers = await prisma.user.count({ where: { active: true } })
      
      const onlineUsers = await prisma.userSession.count({
        where: { 
          isActive: true,
          lastActivity: { gte: new Date(now.getTime() - 5 * 60 * 1000) } // 5 minutos
        }
      })

      const activitiesToday = await prisma.userActivity.count({
        where: { createdAt: { gte: startOfDay } }
      })

      const loginsToday = await prisma.userActivity.count({
        where: { 
          action: 'login',
          createdAt: { gte: startOfDay }
        }
      })

      return reply.send({
        totalUsers,
        onlineUsers,
        activitiesToday,
        loginsToday,
        period: {
          today: startOfDay,
          week: startOfWeek,
          month: startOfMonth
        }
      })
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para iniciar sessão
  fastify.post('/session/start', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId } = request.body as any

      if (!userId) {
        return reply.status(400).send({ error: 'userId é obrigatório' })
      }

      // Finalizar sessões ativas anteriores
      await prisma.userSession.updateMany({
        where: { 
          userId, 
          isActive: true 
        },
        data: { 
          isActive: false,
          logoutTime: new Date()
        }
      })

      // Criar nova sessão
      const session = await prisma.userSession.create({
        data: {
          userId,
          sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          loginTime: new Date(),
          lastActivity: new Date()
        }
      })

      return reply.send({ success: true, session })
    } catch (error) {
      console.error('Erro ao iniciar sessão:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Endpoint para finalizar sessão
  fastify.post('/session/end', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionId } = request.body as any

      if (!sessionId) {
        return reply.status(400).send({ error: 'sessionId é obrigatório' })
      }

      const session = await prisma.userSession.findUnique({
        where: { sessionId }
      })

      if (!session) {
        return reply.status(404).send({ error: 'Sessão não encontrada' })
      }

      // Calcular duração da sessão
      const duration = Math.floor((new Date().getTime() - session.loginTime.getTime()) / 1000)

      await prisma.userSession.update({
        where: { sessionId },
        data: {
          isActive: false,
          logoutTime: new Date(),
          duration
        }
      })

      return reply.send({ success: true, duration })
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}