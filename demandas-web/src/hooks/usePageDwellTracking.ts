import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { MONITORING_ACTIVITY_URL } from '../lib/monitoringClient'

/** Ignorar permanências menores que isso (evita ruído de cliques rápidos). */
const MIN_DWELL_SECONDS = 2

type DwellRef = { path: string; startedAt: number }

let flushBeforeLogout: (() => void) | null = null

/**
 * Envia tempo na página atual antes de limpar a sessão (logout).
 * Deve ser chamado do authStore enquanto ainda há token.
 */
export function flushPageDwellBeforeLogout(): void {
  flushBeforeLogout?.()
}

function postPageTime(
  token: string,
  userId: string,
  path: string,
  seconds: number,
  source: string,
  keepalive?: boolean
): void {
  if (seconds < MIN_DWELL_SECONDS) return
  const body = JSON.stringify({
    userId,
    action: 'page_time',
    page: path || '/',
    duration: seconds,
    metadata: { source }
  })
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
  try {
    void fetch(MONITORING_ACTIVITY_URL, {
      method: 'POST',
      headers,
      body,
      keepalive: keepalive === true
    })
  } catch {
    /* ignore */
  }
}

/**
 * Mede tempo em cada rota: cada troca de página encerra a "sessão" na página anterior
 * e envia a duração (segundos) com action `page_time`.
 */
export function usePageDwellTracking(): void {
  const location = useLocation()
  const { user, token } = useAuthStore()
  const dwellRef = useRef<DwellRef | null>(null)

  useEffect(() => {
    flushBeforeLogout = () => {
      const d = dwellRef.current
      const { user: u, token: t } = useAuthStore.getState()
      if (!d || !u || !t) return
      const sec = Math.floor((Date.now() - d.startedAt) / 1000)
      postPageTime(t, u.id, d.path, sec, 'page_dwell_logout', true)
      dwellRef.current = null
    }
    return () => {
      flushBeforeLogout = null
    }
  }, [])

  useEffect(() => {
    if (!user || !token) {
      dwellRef.current = null
      return
    }

    const path = `${location.pathname}${location.search || ''}`
    const prev = dwellRef.current

    if (prev && prev.path !== path) {
      const sec = Math.floor((Date.now() - prev.startedAt) / 1000)
      postPageTime(token, user.id, prev.path, sec, 'page_dwell_navigate')
    }

    dwellRef.current = { path, startedAt: Date.now() }
  }, [location.pathname, location.search, user?.id, token])

  /**
   * Envia tempo na página ao ocultar a aba (troca de aba, minimizar).
   * Sem isso, quem fica na mesma rota só gerava page_time no unload (pouco confiável) ou ao navegar.
   */
  useEffect(() => {
    if (!user || !token) return

    const onVisibility = () => {
      const { user: u, token: t } = useAuthStore.getState()
      if (!u || !t) return

      if (document.hidden) {
        const d = dwellRef.current
        if (d) {
          const sec = Math.floor((Date.now() - d.startedAt) / 1000)
          postPageTime(t, u.id, d.path, sec, 'page_dwell_tab_hidden')
        }
        dwellRef.current = null
      } else {
        const path = `${window.location.pathname}${window.location.search || ''}`
        dwellRef.current = { path, startedAt: Date.now() }
      }
    }

    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [user?.id, token])

  useEffect(() => {
    if (!user || !token) return

    const onUnload = () => {
      const d = dwellRef.current
      const { user: u, token: t } = useAuthStore.getState()
      if (!d || !u || !t) return
      const sec = Math.floor((Date.now() - d.startedAt) / 1000)
      postPageTime(t, u.id, d.path, sec, 'page_dwell_unload', true)
    }

    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [user?.id, token])
}
