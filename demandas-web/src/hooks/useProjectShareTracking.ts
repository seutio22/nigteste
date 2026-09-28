import { useEffect, useRef } from 'react'
import { getBaseUrl } from '../config/api'

const VISITOR_KEY = 'projectShareVisitorId'

/** Identificador anônimo e persistente do navegador, usado para contar visitantes únicos. */
export function getShareVisitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_KEY)
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
      localStorage.setItem(VISITOR_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

type Stats = { seconds: number; clicks: number }

/** Mede o tempo com a página visível, os cliques e o tempo/cliques por aba do link público. */
export function useProjectShareTracking(token: string | undefined, accessLogId: string | undefined, sectionKey: string | undefined) {
  const sectionRef = useRef(sectionKey)
  const stateRef = useRef({
    totalMs: 0,
    clicks: 0,
    lastTick: Date.now(),
    visible: true,
    sections: {} as Record<string, { ms: number; clicks: number }>,
  })

  const accumulate = () => {
    const s = stateRef.current
    const now = Date.now()
    if (s.visible) {
      const delta = now - s.lastTick
      s.totalMs += delta
      const key = sectionRef.current
      if (key) {
        const cur = s.sections[key] ?? { ms: 0, clicks: 0 }
        cur.ms += delta
        s.sections[key] = cur
      }
    }
    s.lastTick = now
  }

  useEffect(() => {
    if (sectionRef.current === sectionKey) return
    accumulate()
    sectionRef.current = sectionKey
  }, [sectionKey])

  useEffect(() => {
    if (!token || !accessLogId) return
    stateRef.current = { totalMs: 0, clicks: 0, lastTick: Date.now(), visible: !document.hidden, sections: {} }
    let lastSent = ''

    const flush = (keepalive: boolean) => {
      accumulate()
      const s = stateRef.current
      const sections: Record<string, Stats> = {}
      for (const [k, v] of Object.entries(s.sections)) sections[k] = { seconds: Math.floor(v.ms / 1000), clicks: v.clicks }
      const body = JSON.stringify({ accessLogId, durationSeconds: Math.floor(s.totalMs / 1000), clicks: s.clicks, sections })
      if (body === lastSent || (s.totalMs < 1000 && s.clicks === 0)) return
      lastSent = body
      try {
        void fetch(`${getBaseUrl()}/share/${encodeURIComponent(token)}/access/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive,
        }).catch(() => {})
      } catch {
        /* ignore */
      }
    }

    const onClick = () => {
      const s = stateRef.current
      s.clicks += 1
      const key = sectionRef.current
      if (key) {
        const cur = s.sections[key] ?? { ms: 0, clicks: 0 }
        cur.clicks += 1
        s.sections[key] = cur
      }
    }
    const onVisibility = () => {
      accumulate()
      stateRef.current.visible = !document.hidden
      if (document.hidden) flush(true)
    }
    const onLeave = () => flush(true)

    document.addEventListener('click', onClick, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onLeave)
    const interval = window.setInterval(() => flush(false), 15_000)

    return () => {
      flush(true)
      window.clearInterval(interval)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onLeave)
    }
  }, [token, accessLogId])
}
