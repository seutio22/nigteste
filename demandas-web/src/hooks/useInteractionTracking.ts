import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { MONITORING_ACTIVITY_URL } from '../lib/monitoringClient'
import {
  consumeIdleSeconds,
  getIdleAfterMs,
  isCurrentlyIdle,
  markUserInteraction,
  onIdleEnded,
  tickIdleCheck
} from './interactionIdleState'

const CLICK_FLUSH_MS = 8_000
const MAX_CLICK_BUFFER = 25
const MIN_IDLE_REPORT_SECONDS = 15
const IDLE_CHECK_MS = 5_000

type ClickBuf = {
  label: string
  tag: string
  page: string
  at: string
}

function postActivity(
  token: string,
  userId: string,
  payload: Record<string, unknown>,
  keepalive?: boolean
): void {
  try {
    void fetch(MONITORING_ACTIVITY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ userId, ...payload }),
      keepalive: keepalive === true
    })
  } catch {
    /* ignore */
  }
}

function readableClickLabel(target: EventTarget | null): { label: string; tag: string } | null {
  if (!(target instanceof Element)) return null
  let el: Element | null = target
  for (let i = 0; i < 12 && el; i += 1) {
    const dataTrack = el.getAttribute('data-track')?.trim()
    if (dataTrack) return { label: dataTrack.slice(0, 160), tag: el.tagName.toLowerCase() }

    const aria = el.getAttribute('aria-label')?.trim()
    if (aria) return { label: aria.slice(0, 160), tag: el.tagName.toLowerCase() }

    if (el instanceof HTMLElement) {
      const title = el.getAttribute('title')?.trim()
      if (title) return { label: title.slice(0, 160), tag: el.tagName.toLowerCase() }
    }

    const tag = el.tagName.toLowerCase()
    const role = el.getAttribute('role')
    const isInteractive =
      tag === 'button' ||
      tag === 'a' ||
      tag === 'input' ||
      tag === 'select' ||
      tag === 'textarea' ||
      role === 'button' ||
      role === 'tab' ||
      role === 'menuitem' ||
      role === 'link' ||
      el.classList.contains('MuiButton-root') ||
      el.classList.contains('MuiIconButton-root') ||
      el.classList.contains('MuiTab-root') ||
      el.classList.contains('MuiListItemButton-root') ||
      el.classList.contains('MuiChip-root') ||
      el.classList.contains('MuiToggleButton-root') ||
      el.classList.contains('MuiMenuItem-root')

    if (isInteractive) {
      if (tag === 'input') {
        const input = el as HTMLInputElement
        const name = input.name || input.placeholder || input.type || 'input'
        return { label: `Campo: ${String(name).slice(0, 120)}`, tag }
      }
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (text) return { label: text.slice(0, 160), tag }
      if (tag === 'a') {
        const href = el.getAttribute('href')
        if (href) return { label: `Link: ${href.slice(0, 120)}`, tag }
      }
      return { label: `${tag}${role ? ` [${role}]` : ''}`, tag }
    }
    el = el.parentElement
  }
  return null
}

/**
 * Registra cliques significativos e períodos ociosos (sem interação).
 * Alimenta a jornada detalhada no Monitoramento de Usuários.
 */
export function useInteractionTracking(): void {
  const { user, token } = useAuthStore()
  const location = useLocation()
  const clickBufRef = useRef<ClickBuf[]>([])
  const lastClickKeyRef = useRef('')

  const flushClicks = (keepalive?: boolean) => {
    const { user: u, token: t } = useAuthStore.getState()
    const buf = clickBufRef.current
    if (!u || !t || buf.length === 0) return
    const batch = buf.splice(0, buf.length)
    postActivity(
      t,
      u.id,
      {
        action: 'ui_click_batch',
        page: `${window.location.pathname}${window.location.search || ''}`,
        metadata: { clicks: batch, count: batch.length }
      },
      keepalive
    )
  }

  const postIdle = (sec: number, source: string, keepalive?: boolean) => {
    const { user: u, token: t } = useAuthStore.getState()
    if (!u || !t || sec < MIN_IDLE_REPORT_SECONDS) return
    postActivity(
      t,
      u.id,
      {
        action: 'idle_time',
        page: `${window.location.pathname}${window.location.search || ''}`,
        duration: sec,
        metadata: { source, idleAfterMs: getIdleAfterMs() }
      },
      keepalive
    )
  }

  const reportIdleIfAny = (source: string, keepalive?: boolean) => {
    postIdle(consumeIdleSeconds(), source, keepalive)
  }

  // Interações → marca ativo; cliques em controles → buffer
  useEffect(() => {
    if (!user || !token) return

    const mark = () => markUserInteraction()

    const onClick = (e: MouseEvent) => {
      markUserInteraction()
      const info = readableClickLabel(e.target)
      if (!info) return
      const page = `${window.location.pathname}${window.location.search || ''}`
      const key = `${page}|${info.label}`
      // Evita spam do mesmo botão em sequência rápida
      if (key === lastClickKeyRef.current && clickBufRef.current.length > 0) {
        const last = clickBufRef.current[clickBufRef.current.length - 1]
        if (last && Date.now() - new Date(last.at).getTime() < 800) return
      }
      lastClickKeyRef.current = key
      clickBufRef.current.push({
        label: info.label,
        tag: info.tag,
        page,
        at: new Date().toISOString()
      })
      if (clickBufRef.current.length >= MAX_CLICK_BUFFER) flushClicks()
    }

    const events: Array<[string, EventListener]> = [
      ['mousedown', mark],
      ['keydown', mark],
      ['scroll', mark],
      ['touchstart', mark],
      ['mousemove', mark]
    ]
    events.forEach(([name, fn]) =>
      document.addEventListener(name, fn, { capture: true, passive: true })
    )
    document.addEventListener('click', onClick, true)

    const flushId = window.setInterval(() => flushClicks(), CLICK_FLUSH_MS)

    return () => {
      events.forEach(([name, fn]) => document.removeEventListener(name, fn, true))
      document.removeEventListener('click', onClick, true)
      window.clearInterval(flushId)
      flushClicks(true)
    }
  }, [user?.id, token])

  // Detector de ociosidade
  useEffect(() => {
    if (!user || !token) return

    const unsub = onIdleEnded((sec) => postIdle(sec, 'idle_ended'))

    const id = window.setInterval(() => {
      tickIdleCheck()
    }, IDLE_CHECK_MS)

    return () => {
      unsub()
      window.clearInterval(id)
      reportIdleIfAny('idle_unmount', true)
    }
  }, [user?.id, token])

  // Troca de rota: flush cliques + idle pendente
  useEffect(() => {
    if (!user || !token) return
    flushClicks()
    if (isCurrentlyIdle()) {
      reportIdleIfAny('page_navigate')
    }
  }, [location.pathname, location.search, user?.id, token])

  useEffect(() => {
    if (!user || !token) return
    const onVis = () => {
      if (document.hidden) {
        flushClicks(true)
        reportIdleIfAny('tab_hidden', true)
      } else {
        markUserInteraction()
      }
    }
    const onUnload = () => {
      flushClicks(true)
      reportIdleIfAny('unload', true)
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [user?.id, token])
}
