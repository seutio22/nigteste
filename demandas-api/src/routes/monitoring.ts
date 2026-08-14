import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'
import { createRequirePermission } from '../middleware/requirePermission'

const requirePermission = createRequirePermission(prisma)

async function verifyJWT(req: any) {
  await req.jwtVerify()
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
            await prisma.userSession.updateMany({
              where: { userId: user.id, isActive: true },
              data: { lastActivity: new Date() }
            })
            await upsertUserMonitoringDaily(user.id, action, duration, new Date())
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
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
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
   * (padrão: NIG). Logins/sessões em dias úteis, cruzados com Analista (email/nome).
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
            where: { date: { gte: rangeStart, lte: rangeEnd } },
            select: {
              userId: true,
              date: true,
              loginCount: true,
              sessionCount: true,
              pageDwellSeconds: true,
              pageViewCount: true
            }
          }),
          prisma.userSession.findMany({
            where: {
              OR: [
                { loginTime: { gte: rangeStart, lte: rangeEnd } },
                {
                  AND: [
                    { loginTime: { lte: rangeEnd } },
                    {
                      OR: [{ logoutTime: null }, { logoutTime: { gte: rangeStart } }]
                    }
                  ]
                }
              ]
            },
            select: { userId: true, loginTime: true, logoutTime: true, lastActivity: true }
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
          const hasPresence =
            (row.loginCount || 0) > 0 ||
            (row.sessionCount || 0) > 0 ||
            (row.pageDwellSeconds || 0) > 0 ||
            (row.pageViewCount || 0) > 0
          if (!hasPresence) continue
          touch(row.userId, dayKeyOf(row.date))
        }

        for (const s of sessions) {
          const start = new Date(Math.max(s.loginTime.getTime(), rangeStart.getTime()))
          const endRaw = s.logoutTime || s.lastActivity || s.loginTime
          const end = new Date(Math.min(endRaw.getTime(), rangeEnd.getTime()))
          const walker = new Date(start)
          walker.setHours(12, 0, 0, 0)
          const endWalk = new Date(end)
          endWalk.setHours(12, 0, 0, 0)
          let guard = 0
          while (walker <= endWalk && guard < 400) {
            touch(s.userId, dayKeyOf(walker))
            walker.setDate(walker.getDate() + 1)
            guard += 1
          }
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
  fastify.get('/user/:userId/activities', async (request: FastifyRequest, reply: FastifyReply) => {
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

  // Endpoint para buscar estatísticas agregadas
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
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