import { formatIntegerPtBR } from '../../utils/formatNumber'

export function formatSecondsAsHM(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds < 0) return '0h 0m'
  const minutes = Math.floor(totalSeconds / 60)
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export function formatMinutesAsHM(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Agora'
  if (diffMins < 60) return `${diffMins}m atrás`
  if (diffHours < 24) return `${diffHours}h atrás`
  return `${diffDays}d atrás`
}

export function formatChartMinutes(seconds: number): string {
  return `${formatIntegerPtBR(Math.round(seconds / 60))} min`
}

export const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  page_time: 'Permanência em página',
  idle_time: 'Ociosidade',
  ui_click: 'Clique',
  ui_click_batch: 'Cliques (lote)',
  heartbeat: 'Heartbeat',
  page_view: 'Visualização de página',
  api_call: 'Chamada de API'
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action
}

export function parseUserAgent(ua: string | null): string {
  if (!ua) return '—'
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edg')) return 'Edge'
  return ua.length > 40 ? `${ua.slice(0, 40)}…` : ua
}
