/**
 * Limita jobs pesados (import, anexo) no mesmo processo da API.
 * Local: 2 em paralelo. Ajuste com PLACEMENT_HEAVY_CONCURRENCY.
 */

const MAX = Math.max(1, Math.min(8, Number(process.env.PLACEMENT_HEAVY_CONCURRENCY || 2) || 2))

let active = 0
const waiters: Array<() => void> = []

function acquire(): Promise<void> {
  if (active < MAX) {
    active += 1
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    waiters.push(() => {
      active += 1
      resolve()
    })
  })
}

function release(): void {
  active = Math.max(0, active - 1)
  const next = waiters.shift()
  if (next) next()
}

export async function runPlacementHeavy<T>(fn: () => Promise<T>): Promise<T> {
  await acquire()
  try {
    return await fn()
  } finally {
    release()
  }
}
