import { useCallback, useEffect, useRef } from 'react'
import { getBaseUrl } from '../../../config/api'

const LOG_ID_KEY = 'placementShareAccessLogId'
const START_KEY = 'placementShareAccessStartedAt'

export type ShareClickEvent = {
  at: string
  t: number
  kind: 'click' | 'pane'
  label: string
  pane?: string
}

export function setPlacementShareAccessSession(accessLogId: string) {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.setItem(LOG_ID_KEY, accessLogId)
  sessionStorage.setItem(START_KEY, String(Date.now()))
}

export function clearPlacementShareAccessSession() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(LOG_ID_KEY)
  sessionStorage.removeItem(START_KEY)
}

function elapsedSeconds(): number {
  const started = sessionStorage.getItem(START_KEY)
  if (!started) return 0
  return Math.max(0, Math.floor((Date.now() - Number(started)) / 1000))
}

function postJson(path: string, body: unknown, keepalive?: boolean) {
  const url = `${getBaseUrl()}${path}`
  try {
    void fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: keepalive === true,
    })
  } catch {
    /* ignore */
  }
}

function postDuration(token: string, accessLogId: string, durationSeconds: number, keepalive?: boolean) {
  if (durationSeconds < 2) return
  postJson(
    `/share/placement/${encodeURIComponent(token)}/access/end`,
    { accessLogId, durationSeconds: Math.floor(durationSeconds) },
    keepalive
  )
}

function postEvents(token: string, accessLogId: string, events: ShareClickEvent[], keepalive?: boolean) {
  if (!events.length) return
  postJson(
    `/share/placement/${encodeURIComponent(token)}/access/events`,
    { accessLogId, events },
    keepalive
  )
}

function readableClickLabel(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  let el: Element | null = target
  for (let i = 0; i < 10 && el; i += 1) {
    const aria = el.getAttribute('aria-label')?.trim()
    if (aria) return aria.slice(0, 160)
    if (el instanceof HTMLElement) {
      const title = el.getAttribute('title')?.trim()
      if (title) return title.slice(0, 160)
    }
    const tag = el.tagName.toLowerCase()
    if (
      tag === 'button' ||
      tag === 'a' ||
      el.getAttribute('role') === 'button' ||
      el.getAttribute('role') === 'tab' ||
      el.classList.contains('MuiToggleButton-root') ||
      el.classList.contains('MuiTab-root') ||
      el.classList.contains('MuiChip-root')
    ) {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (text) return text.slice(0, 160)
    }
    el = el.parentElement
  }
  if (target instanceof Element) {
    const text = (target as HTMLElement).innerText?.replace(/\s+/g, ' ').trim()
    if (text) return text.slice(0, 80)
  }
  return null
}

/** Mede tempo na apresentação pública, cliques e troca de abas. */
export function usePlacementShareAccessTracking(
  token: string | undefined,
  accessLogId: string | undefined
) {
  const lastSentRef = useRef(0)
  const queueRef = useRef<ShareClickEvent[]>([])
  const paneRef = useRef<string | undefined>()

  const flushEvents = useCallback(
    (keepalive?: boolean) => {
      if (!token || !accessLogId) return
      const batch = queueRef.current.splice(0, queueRef.current.length)
      if (!batch.length) return
      postEvents(token, accessLogId, batch, keepalive)
    },
    [token, accessLogId]
  )

  const enqueue = useCallback((event: Omit<ShareClickEvent, 'at' | 't'> & { t?: number }) => {
    queueRef.current.push({
      at: new Date().toISOString(),
      t: event.t ?? elapsedSeconds(),
      kind: event.kind,
      label: event.label.slice(0, 160),
      ...(event.pane ? { pane: event.pane } : {}),
    })
    if (queueRef.current.length >= 8) {
      flushEvents(false)
    }
  }, [flushEvents])

  const trackPane = useCallback(
    (paneId: string, paneLabel: string) => {
      if (!token || !accessLogId) return
      if (paneRef.current === paneId) return
      paneRef.current = paneId
      enqueue({ kind: 'pane', label: paneLabel, pane: paneId })
    },
    [token, accessLogId, enqueue]
  )

  useEffect(() => {
    if (!token || !accessLogId) return

    setPlacementShareAccessSession(accessLogId)
    lastSentRef.current = 0
    queueRef.current = []
    paneRef.current = undefined

    const flushDuration = (keepalive?: boolean) => {
      const logId = sessionStorage.getItem(LOG_ID_KEY)
      if (!logId) return
      const sec = elapsedSeconds()
      if (sec < 2 || sec <= lastSentRef.current) return
      lastSentRef.current = sec
      postDuration(token, logId, sec, keepalive)
    }

    const lastClickRef = { label: '', at: 0 }

    const onClick = (ev: MouseEvent) => {
      const label = readableClickLabel(ev.target)
      if (!label) return
      const now = Date.now()
      if (label === lastClickRef.label && now - lastClickRef.at < 800) return
      lastClickRef.label = label
      lastClickRef.at = now
      enqueue({
        kind: 'click',
        label,
        pane: paneRef.current,
      })
    }

    const onHide = () => {
      if (document.hidden) {
        flushEvents(true)
        flushDuration(true)
      }
    }

    const onLeave = () => {
      flushEvents(true)
      flushDuration(true)
    }

    document.addEventListener('click', onClick, true)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('beforeunload', onLeave)
    document.addEventListener('visibilitychange', onHide)

    const interval = window.setInterval(() => {
      flushEvents(false)
      flushDuration(false)
    }, 15_000)

    return () => {
      flushEvents(true)
      flushDuration(true)
      window.clearInterval(interval)
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('beforeunload', onLeave)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [token, accessLogId, enqueue, flushEvents])

  return { trackPane }
}

export function formatShareAccessDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  if (minutes < 60) {
    return rest > 0 ? `${minutes} min ${rest}s` : `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const minRest = minutes % 60
  return minRest > 0 ? `${hours}h ${minRest}min` : `${hours}h`
}

export function formatShareAccessDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function formatShareAccessElapsed(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

