const isPerfEnabled = () => {
  if (typeof window === 'undefined') return false
  if (window.location.search.includes('perf=1')) return true
  try {
    return localStorage.getItem('perf:trace') === '1'
  } catch {
    return false
  }
}

export const createPerfLogger = (scope: string) => {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now()
  const log = (label: string, extra?: Record<string, unknown>) => {
    if (!isPerfEnabled()) return
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const delta = (now - start).toFixed(1)
    if (extra) {
      console.log(`[perf] ${scope} ${label} +${delta}ms`, extra)
      return
    }
    console.log(`[perf] ${scope} ${label} +${delta}ms`)
  }
  return { log }
}
