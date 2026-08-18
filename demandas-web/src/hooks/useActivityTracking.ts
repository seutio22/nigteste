import { useCallback, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { MONITORING_ACTIVITY_URL, MONITORING_API_BASE } from '../lib/monitoringClient'

interface TrackingData {
  action: string
  page?: string
  endpoint?: string
  duration?: number
  metadata?: any
}

/** Não usa await: não bloqueia a thread nem encadeia microtarefas na navegação. */
function postMonitoringActivity(
  token: string,
  userId: string,
  data: TrackingData
): void {
  const body = JSON.stringify({ userId, ...data })
  try {
    void fetch(MONITORING_ACTIVITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body
    }).then((res) => {
      if (!res.ok && import.meta.env.DEV) {
        console.warn('monitoring/activity:', res.status)
      }
    })
  } catch {
    /* ignore */
  }
}

export function useActivityTracking() {
  const { user, token } = useAuthStore()

  const trackActivity = useCallback(
    (data: TrackingData) => {
      if (!user || !token) return
      postMonitoringActivity(token, user.id, data)
    },
    [user, token]
  )

  // Função para iniciar sessão
  const startSession = useCallback(() => {
    if (!user || !token) return

    void fetch(`${MONITORING_API_BASE}/monitoring/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userId: user.id })
    })
      .then(async (response) => {
        if (!response.ok) return
        const json = await response.json()
        const sid = json?.session?.sessionId
        if (sid) localStorage.setItem('sessionId', sid)
      })
      .catch(() => {
        /* não bloquear login */
      })
  }, [user, token])

  // Função para finalizar sessão
  const endSession = useCallback(() => {
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId || !token) {
      localStorage.removeItem('sessionId')
      return
    }

    void fetch(`${MONITORING_API_BASE}/monitoring/session/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ sessionId }),
      keepalive: true
    }).catch(() => {
      /* ignore */
    })
    localStorage.removeItem('sessionId')
  }, [token])

  // Função para trackear visualização de página
  const trackPageView = useCallback((page: string) => {
    trackActivity({
      action: 'page_view',
      page,
      metadata: {
        timestamp: new Date().toISOString(),
        url: window.location.href
      }
    })
  }, [trackActivity])

  // Função para trackear chamadas de API
  const trackApiCall = useCallback((endpoint: string, method: string, statusCode?: number) => {
    trackActivity({
      action: 'api_call',
      endpoint,
      metadata: {
        method,
        statusCode,
        timestamp: new Date().toISOString()
      }
    })
  }, [trackActivity])

  // Função para trackear ações do usuário
  const trackUserAction = useCallback((action: string, details?: any) => {
    trackActivity({
      action,
      metadata: {
        details,
        timestamp: new Date().toISOString()
      }
    })
  }, [trackActivity])

  // Iniciar sessão quando o usuário fizer login
  useEffect(() => {
    if (user && token) {
      startSession()
    }
  }, [user, token, startSession])

  // Heartbeat só com aba visível e uso recente (não mantém sessão aberta à toa).
  useEffect(() => {
    if (!user || !token) return

    const IDLE_MS = 5 * 60 * 1000
    let lastUserInteraction = Date.now()

    const markInteraction = () => {
      lastUserInteraction = Date.now()
    }
    const interactionEvents = ['mousedown', 'mousemove', 'keydown', 'keypress', 'scroll', 'touchstart', 'click']
    interactionEvents.forEach((e) =>
      document.addEventListener(e, markInteraction, { capture: true, passive: true })
    )

    const send = () => {
      if (typeof document !== 'undefined' && document.hidden) return
      if (Date.now() - lastUserInteraction > IDLE_MS) return
      trackActivity({
        action: 'heartbeat',
        page: typeof window !== 'undefined' ? window.location.pathname : undefined,
        metadata: { ts: new Date().toISOString() }
      })
    }

    send()
    const intervalMs = 2 * 60 * 1000
    const id = window.setInterval(send, intervalMs)
    return () => {
      window.clearInterval(id)
      interactionEvents.forEach((e) => document.removeEventListener(e, markInteraction, true))
    }
  }, [user, token, trackActivity])

  // Finalizar sessão quando a página for fechada
  useEffect(() => {
    const handleBeforeUnload = () => {
      endSession()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      endSession()
    }
  }, [endSession])

  return {
    trackActivity,
    trackPageView,
    trackApiCall,
    trackUserAction,
    startSession,
    endSession
  }
}