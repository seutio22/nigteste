/** Base da API em produção (alinhado ao restante do app). */
export const MONITORING_API_BASE = 'https://nigteste-production.up.railway.app'

export const MONITORING_ACTIVITY_URL = `${MONITORING_API_BASE}/monitoring/activity`

/** Registra login no monitoramento (contagem "Logins hoje" na API). Fire-and-forget. */
export function notifyMonitoringLogin(token: string, userId: string): void {
  try {
    void fetch(MONITORING_ACTIVITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        userId,
        action: 'login',
        page: '/login',
        metadata: { source: 'auth' }
      })
    })
  } catch {
    /* ignore */
  }
}

/**
 * Encerra sessão de monitoramento e registra logout no servidor.
 * Chamar antes de limpar token/localStorage no logout manual.
 */
export async function notifyServerLogout(token: string, userId: string): Promise<void> {
  try {
    const sessionId = localStorage.getItem('sessionId')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
    if (sessionId) {
      await fetch(`${MONITORING_API_BASE}/monitoring/session/end`, {        method: 'POST',
        headers,
        body: JSON.stringify({ sessionId })
      })
    }
    await fetch(`${MONITORING_API_BASE}/monitoring/activity`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ userId, action: 'logout' })
    })
  } catch (e) {
    console.warn('notifyServerLogout:', e)
  } finally {
    localStorage.removeItem('sessionId')
  }
}
