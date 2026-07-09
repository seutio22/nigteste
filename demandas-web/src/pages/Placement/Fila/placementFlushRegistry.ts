const flushCallbacks = new Set<() => void>()
const pendingSaveFlushes = new Set<() => void | Promise<void>>()

/** Registra flush de draft local (ex.: ao sair da página). */
export function registerPlacementFlush(fn: () => void): () => void {
  flushCallbacks.add(fn)
  return () => {
    flushCallbacks.delete(fn)
  }
}

/** Registra flush de autosave pendente (ex.: kickOff debounced). */
export function registerPlacementPendingSaveFlush(fn: () => void | Promise<void>): () => void {
  pendingSaveFlushes.add(fn)
  return () => {
    pendingSaveFlushes.delete(fn)
  }
}

export function flushAllRegisteredPlacementDrafts(): void {
  for (const fn of flushCallbacks) {
    try {
      fn()
    } catch {
      /* noop */
    }
  }
}

/** Commita drafts locais e aguarda autosaves pendentes antes de salvar/avancar workflow. */
export async function flushAllPlacementPendingSaves(): Promise<void> {
  flushAllRegisteredPlacementDrafts()
  await Promise.all(
    [...pendingSaveFlushes].map(async (fn) => {
      try {
        await fn()
      } catch {
        /* noop */
      }
    })
  )
}

let beforeUnloadInstalled = false

export function ensurePlacementBeforeUnloadFlush(): void {
  if (beforeUnloadInstalled || typeof window === 'undefined') return
  beforeUnloadInstalled = true
  window.addEventListener('beforeunload', () => {
    flushAllRegisteredPlacementDrafts()
  })
}
