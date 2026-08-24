/**
 * Estado compartilhado de interação / ociosidade para monitoramento.
 */

const IDLE_AFTER_MS = 60_000

let lastInteractionAt = Date.now()
let idleStartedAt: number | null = null
const idleEndedListeners = new Set<(idleSeconds: number) => void>()

export function getIdleAfterMs(): number {
  return IDLE_AFTER_MS
}

export function markUserInteraction(): void {
  const now = Date.now()
  if (idleStartedAt != null) {
    const sec = Math.max(0, Math.floor((now - idleStartedAt) / 1000))
    idleStartedAt = null
    lastInteractionAt = now
    if (sec > 0) idleEndedListeners.forEach((fn) => fn(sec))
    return
  }
  lastInteractionAt = now
}

export function tickIdleCheck(now = Date.now()): { justBecameIdle: boolean } {
  if (idleStartedAt != null) return { justBecameIdle: false }
  if (now - lastInteractionAt >= IDLE_AFTER_MS) {
    idleStartedAt = lastInteractionAt + IDLE_AFTER_MS
    return { justBecameIdle: true }
  }
  return { justBecameIdle: false }
}

export function isCurrentlyIdle(now = Date.now()): boolean {
  if (idleStartedAt != null) return true
  return now - lastInteractionAt >= IDLE_AFTER_MS
}

/** Consome ociosidade em andamento (troca de página, unload). */
export function consumeIdleSeconds(now = Date.now()): number {
  if (idleStartedAt != null) {
    const sec = Math.max(0, Math.floor((now - idleStartedAt) / 1000))
    idleStartedAt = null
    lastInteractionAt = now
    return sec
  }
  if (now - lastInteractionAt >= IDLE_AFTER_MS) {
    const started = lastInteractionAt + IDLE_AFTER_MS
    const sec = Math.max(0, Math.floor((now - started) / 1000))
    lastInteractionAt = now
    return sec
  }
  return 0
}

export function getLastInteractionAt(): number {
  return lastInteractionAt
}

export function onIdleEnded(fn: (idleSeconds: number) => void): () => void {
  idleEndedListeners.add(fn)
  return () => idleEndedListeners.delete(fn)
}
