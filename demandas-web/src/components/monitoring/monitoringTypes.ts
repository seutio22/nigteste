export interface AnalyticsDashboard {
  trendDays: number
  summary: {
    totalUsers: number
    onlineUsers: number
    awayUsers: number
    offlineUsers: number
    activeTodayUsers: number
    totalPageDwellSecondsToday: number
    totalPageDwellSecondsWeek: number
    totalLoginsToday: number
    totalActivitiesToday: number
    totalApiCallsToday: number
    totalPageViewsToday: number
    avgDwellSecondsPerActiveUserToday: number
  }
  moduleUsage: Array<{
    area: string
    secondsToday: number
    secondsWeek: number
    userCountWeek: number
  }>
  topUsers: Array<{
    userId: string
    userName: string
    userRole: string
    departmentName: string | null
    dwellSecondsToday: number
    dwellSecondsWeek: number
    loginsToday: number
    apiCallsToday: number
    presenceStatus: 'online' | 'away' | 'offline'
  }>
  dailyTrend: Array<{
    date: string
    label: string
    logins: number
    pageDwellSeconds: number
    activeUsers: number
    activities: number
    apiCalls: number
  }>
  presenceByRole: Array<{
    role: string
    online: number
    away: number
    offline: number
    total: number
  }>
  hourlyToday: Array<{
    hour: number
    label: string
    activities: number
    pageDwellSeconds: number
  }>
  actionMixToday: Array<{ action: string; count: number }>
  departments: string[]
}

export interface UserActivityLog {
  id: string
  userId: string
  action: string
  page: string | null
  endpoint: string | null
  duration: number | null
  ipAddress: string | null
  userAgent: string | null
  metadata: string | null
  createdAt: string
}

export interface UserSessionLog {
  id: string
  sessionId: string
  ipAddress: string | null
  userAgent: string | null
  loginTime: string
  logoutTime: string | null
  lastActivity: string
  isActive: boolean
  duration: number | null
  pageViews: number
  apiCalls: number
}
